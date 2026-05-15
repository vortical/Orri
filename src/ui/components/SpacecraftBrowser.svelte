<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Body } from '../../body/Body';

  type Props = {
    spacecraft: Body[];
    onSelect: (craft: Body) => void;
    onClose: () => void;
  };

  let { spacecraft, onSelect, onClose }: Props = $props();

  let query = $state('');
  let highlightIndex = $state(0);
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let listEl = $state<HTMLDivElement | undefined>(undefined);

  let filtered = $derived.by(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return spacecraft;
    return spacecraft.filter((craft) =>
      craft.name.toLowerCase().includes(lowered) ||
      (craft.summary ?? '').toLowerCase().includes(lowered)
    );
  });

  // Scroll the highlighted row into view — a legitimate state→DOM side-effect.
  $effect(() => {
    highlightIndex;
    if (!listEl) return;
    const rowElement = listEl.querySelector<HTMLElement>(`[data-row-index="${highlightIndex}"]`);
    rowElement?.scrollIntoView({ block: 'nearest' });
  });

  onMount(async () => {
    await tick();
    inputEl?.focus();
  });

  function onQueryInput(event: Event) {
    query = (event.target as HTMLInputElement).value;
    highlightIndex = 0;
  }

  function commit(index: number) {
    const craft = filtered[index];
    if (!craft) return;
    onSelect(craft);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlightIndex = Math.min(filtered.length - 1, highlightIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlightIndex = Math.max(0, highlightIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit(highlightIndex);
    }
  }

  function fmtDate(ms: number): string {
    function pad(value: number): string {
      return value.toString().padStart(2, '0');
    }
    const date = new Date(ms);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  function fmtDuration(startMs: number, endMs: number): string {
    const ms = Math.max(0, endMs - startMs);
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    if (days > 0 && hours > 0) return `${days}d ${hours}h`;
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<button
  type="button"
  class="fixed inset-0 z-[65] cursor-default"
  aria-label="Close spacecraft browser"
  onclick={onClose}
></button>

<div
  class="fixed top-16 right-3 w-[min(calc(100vw-24px),460px)] max-h-[70vh] overflow-hidden rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-[70] sm:absolute sm:top-full sm:right-3 sm:mt-1 sm:w-[460px]"
>
  <input
    bind:this={inputEl}
    type="text"
    value={query}
    oninput={onQueryInput}
    placeholder="Search spacecraft…"
    spellcheck="false"
    autocomplete="off"
    class="px-3 py-2 bg-black/40 text-white/90 font-mono text-sm placeholder-white/30 focus:outline-none border-b border-white/10"
  />
  <div bind:this={listEl} class="overflow-y-auto py-1">
    {#each filtered as craft, index}
      <button
        type="button"
        data-row-index={index}
        onclick={() => commit(index)}
        onmouseenter={() => (highlightIndex = index)}
        class="w-full text-left px-3 py-2 flex flex-col gap-0.5 font-mono text-xs sm:text-sm transition border-b border-white/5"
        class:row-active={index === highlightIndex}
      >
        <div class="flex items-center gap-2">
          <span class="w-3 text-[#d4a04a]/80 text-center">▲</span>
          <span class="uppercase tracking-wide whitespace-nowrap text-white/90">{craft.name}</span>
          {#if craft.summary}
            <span class="text-white/50 truncate text-[11px]">— {craft.summary}</span>
          {/if}
        </div>
        <div class="pl-5 text-white/40 text-[11px] tracking-wide flex items-center gap-2">
          <span>{fmtDate(craft.missionWindow!.startMs)}</span>
          <span class="text-white/25">→</span>
          <span>{fmtDate(craft.missionWindow!.endMs)}</span>
          <span class="text-white/25">·</span>
          <span class="text-[#d4a04a]/70">{fmtDuration(craft.missionWindow!.startMs, craft.missionWindow!.endMs)}</span>
        </div>
      </button>
    {/each}
    {#if filtered.length === 0}
      <div class="px-3 py-3 text-white/40 font-mono text-xs">No matches.</div>
    {/if}
  </div>
</div>

<style>
  .row-active {
    background-color: rgba(212, 160, 74, 0.18);
  }
</style>
