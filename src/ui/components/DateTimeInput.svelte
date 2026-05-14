<script lang="ts">
  import { untrack } from 'svelte';

  type Props = {
    value: Date;
    onset?: (date: Date) => void;
  };

  let { value, onset }: Props = $props();

  function pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  function dateToInput(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // Snapshot once at mount; ignore subsequent prop updates so an externally-changing
  // simulation clock (or any parent re-render) doesn't wipe the user's in-progress edit.
  // The component re-mounts when the parent toggles its visibility, picking up a fresh
  // snapshot on the next open.
  const initialValue = untrack(() => dateToInput(value));

  function handleChange(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    if (!inputValue) return;
    const date = new Date(inputValue);
    if (isNaN(date.getTime())) return;
    onset?.(date);
  }
</script>

<input
  type="datetime-local"
  step="1"
  value={initialValue}
  onchange={handleChange}
  class="bg-black/40 text-white px-2 py-2 rounded-md border border-white/30 focus:outline-none focus:ring-1 focus:ring-amber-300/70 text-sm font-mono min-h-[44px]"
/>

<style>
  /* Render native form chrome (spinners) for dark backgrounds. */
  input {
    color-scheme: dark;
  }
  /* Replace Chromium's calendar-picker indicator with the Lucide "calendar" icon (white). */
  input::-webkit-calendar-picker-indicator {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/></svg>");
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
