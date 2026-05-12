<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import type { Body } from '../../body/Body';

  type Props = {
    bodySystem: BodySystem;
    onselect: (name: string) => void;
    onclose: () => void;
  };

  let { bodySystem, onselect, onclose }: Props = $props();

  type Row = {
    body: Body;
    depth: number;
    section: 'celestial' | 'spacecraft';
  };

  function buildRows(): Row[] {
    const bodies = bodySystem.bodies;
    const out: Row[] = [];
    for (const b of bodies) {
      if (b.type === 'star') out.push({ body: b, depth: 0, section: 'celestial' });
    }
    for (const b of bodies) {
      if (b.type !== 'planet') continue;
      out.push({ body: b, depth: 0, section: 'celestial' });
      for (const m of bodies) {
        if (m.type === 'moon' && m.parentName === b.name) {
          out.push({ body: m, depth: 1, section: 'celestial' });
        }
      }
    }
    const t = bodySystem.clock.getTime();
    for (const b of bodies) {
      if (b.type === 'spacecraft' && b.isActiveAt(t)) {
        out.push({ body: b, depth: 0, section: 'spacecraft' });
      }
    }
    return out;
  }

  const allRows = buildRows();

  let query = $state('');
  let highlightIndex = $state(0);
  let inputEl: HTMLInputElement;
  let listEl: HTMLDivElement;

  let filteredRows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => {
      const hay = (r.body.name + ' ' + (r.body.summary ?? '')).toLowerCase();
      return hay.includes(q);
    });
  });

  $effect(() => {
    filteredRows;
    highlightIndex = 0;
  });

  $effect(() => {
    highlightIndex;
    if (!listEl) return;
    const el = listEl.querySelector<HTMLElement>(`[data-row-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  });

  function typeGlyph(t: string): string {
    switch (t) {
      case 'star':       return '★';
      case 'planet':     return '●';
      case 'moon':       return '○';
      case 'spacecraft': return '▲';
    }
    return '·';
  }

  function commit(i: number) {
    const row = filteredRows[i];
    if (row) onselect(row.body.name);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIndex = Math.min(filteredRows.length - 1, highlightIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(0, highlightIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(highlightIndex);
    }
  }

  onMount(async () => {
    await tick();
    inputEl?.focus();
  });
</script>

<svelte:window onkeydown={onKeyDown} />

<div
  class="absolute left-0 top-full mt-1 w-[min(92vw,440px)] max-h-[70vh] overflow-hidden rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-[70]"
>
  <input
    bind:this={inputEl}
    type="text"
    bind:value={query}
    placeholder="Search target…"
    spellcheck="false"
    autocomplete="off"
    class="px-3 py-2 bg-black/40 text-white/90 font-mono text-sm placeholder-white/30 focus:outline-none border-b border-white/10"
  />
  <div bind:this={listEl} class="overflow-y-auto py-1">
    {#each filteredRows as row, i}
      {#if i === 0 || row.section !== filteredRows[i - 1].section}
        <div class="px-3 pt-2 pb-1 text-[10px] uppercase text-white/40 font-mono tracking-widest">
          {row.section === 'spacecraft' ? 'Active spacecraft' : 'Solar system'}
        </div>
      {/if}
      <button
        type="button"
        data-row-index={i}
        onclick={() => commit(i)}
        onmouseenter={() => (highlightIndex = i)}
        class="w-full text-left py-1.5 flex items-center gap-2 font-mono text-xs sm:text-sm transition"
        class:row-active={i === highlightIndex}
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
