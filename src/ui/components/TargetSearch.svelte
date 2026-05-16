<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Body } from '../../body/Body';

  type Props = {
    bodies: Body[];
    currentTimeMs: number;
    onSelect: (name: string) => void;
    onClose: () => void;
  };

  let { bodies, currentTimeMs, onSelect, onClose }: Props = $props();

  type Row = {
    body: Body;
    depth: number;
    section: 'celestial' | 'spacecraft';
  };

  function buildRows(): Row[] {
    const out: Row[] = [];
    // Spacecraft first — they aren't always present, so keep them where
    // they're easy to spot rather than buried below the solar system.
    for (const body of bodies) {
      if (body.type === 'spacecraft' && body.isActiveAt(currentTimeMs)) {
        out.push({ body, depth: 0, section: 'spacecraft' });
      }
    }
    for (const body of bodies) {
      if (body.type === 'star') out.push({ body, depth: 0, section: 'celestial' });
    }
    for (const planet of bodies) {
      if (planet.type !== 'planet') continue;
      out.push({ body: planet, depth: 0, section: 'celestial' });
      for (const moon of bodies) {
        if (moon.type === 'moon' && moon.parentName === planet.name) {
          out.push({ body: moon, depth: 1, section: 'celestial' });
        }
      }
    }
    return out;
  }

  const allRows = buildRows();

  let query = $state('');
  let highlightIndex = $state(0);
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let listEl = $state<HTMLDivElement | undefined>(undefined);

  let filteredRows = $derived.by(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) return allRows;
    return allRows.filter((row) => {
      const haystack = (row.body.name + ' ' + (row.body.summary ?? '')).toLowerCase();
      return haystack.includes(lowered);
    });
  });

  // Scroll the highlighted row into view — legitimate state→DOM side-effect.
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

  function typeGlyph(bodyType: string): string {
    switch (bodyType) {
      case 'star':       return '★';
      case 'planet':     return '●';
      case 'moon':       return '○';
      case 'spacecraft': return '▲';
    }
    return '·';
  }

  function onQueryInput(event: Event) {
    query = (event.target as HTMLInputElement).value;
    highlightIndex = 0;
  }

  function commit(index: number) {
    const row = filteredRows[index];
    if (row) onSelect(row.body.name);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlightIndex = Math.min(filteredRows.length - 1, highlightIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlightIndex = Math.max(0, highlightIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit(highlightIndex);
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<button
  type="button"
  class="fixed inset-0 z-[65] cursor-default"
  aria-label="Close target search"
  onclick={onClose}
></button>

<div
  class="fixed top-16 left-3 w-[min(calc(100vw-24px),440px)] max-h-[70vh] overflow-hidden rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-[70] sm:absolute sm:top-full sm:left-3 sm:mt-1 sm:w-[440px]"
>
  <input
    bind:this={inputEl}
    type="text"
    value={query}
    oninput={onQueryInput}
    placeholder="Search target…"
    spellcheck="false"
    autocomplete="off"
    class="px-3 py-2 bg-black/40 text-white/90 font-mono text-sm placeholder-white/30 focus:outline-none border-b border-white/10"
  />
  <div bind:this={listEl} class="overflow-y-auto py-1">
    {#each filteredRows as row, index}
      {#if index === 0 || row.section !== filteredRows[index - 1].section}
        <div class="px-3 pt-2 pb-1 text-[10px] uppercase text-white/40 font-mono tracking-widest">
          {row.section === 'spacecraft' ? 'Active spacecraft' : 'Solar system'}
        </div>
      {/if}
      <button
        type="button"
        data-row-index={index}
        onclick={() => commit(index)}
        onmouseenter={() => (highlightIndex = index)}
        class="w-full text-left py-1.5 flex items-center gap-2 font-mono text-xs sm:text-sm transition"
        class:row-active={index === highlightIndex}
        style="padding-left: {12 + row.depth * 16}px; padding-right: 12px"
      >
        <span class="w-3 text-[#d4a04a]/80 text-center">{typeGlyph(row.body.type)}</span>
        <span class="uppercase tracking-wide whitespace-nowrap text-white/90">{row.body.name}</span>
        {#if row.body.summary}
          <span class="text-white/40 truncate text-[11px]">— {row.body.summary}</span>
        {/if}
      </button>
    {/each}
    {#if filteredRows.length === 0}
      <div class="px-3 py-3 text-white/40 font-mono text-xs">No matches.</div>
    {/if}
  </div>
</div>

<style>
  .row-active {
    background-color: rgba(212, 160, 74, 0.18);
  }
</style>
