<script lang="ts">
  type Props = {
    value: Date;
    onset?: (d: Date) => void;
  };

  let { value, onset }: Props = $props();

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function dateToInput(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function handleChange(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    if (!v) return;
    const d = new Date(v);
    if (isNaN(d.getTime())) return;
    onset?.(d);
  }
</script>

<input
  type="datetime-local"
  value={dateToInput(value)}
  onchange={handleChange}
  class="bg-black/40 text-white px-2 py-2 rounded-md border border-white/30 focus:outline-none focus:ring-1 focus:ring-amber-300/70 text-sm font-mono min-h-[44px]"
/>

<style>
  /* Render native form chrome (spinners) for dark backgrounds. */
  input {
    color-scheme: dark;
  }
  /* Replace Chromium's calendar-picker indicator with a visible white calendar SVG. */
  input::-webkit-calendar-picker-indicator {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2'/><line x1='3' y1='10' x2='21' y2='10'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='16' y1='2' x2='16' y2='6'/></svg>");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 16px 16px;
    width: 20px;
    height: 20px;
    margin-left: 6px;
    opacity: 0.85;
    cursor: pointer;
    filter: none;
  }
  input::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
</style>
