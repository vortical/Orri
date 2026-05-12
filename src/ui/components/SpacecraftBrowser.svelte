<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Rocket from 'lucide-svelte/icons/rocket';
  import type { BodySystem } from '../../scene/BodySystem';
  import type { Body } from '../../body/Body';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let open = $state(false);
  let query = $state('');
  let highlightIndex = $state(0);
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let listEl = $state<HTMLDivElement | undefined>(undefined);

  const allCraft: Body[] = untrack(() =>
    bodySystem.bodies
      .filter((b) => b.type === 'spacecraft' && b.missionWindow)
      .sort((a, b) => a.missionWindow!.startMs - b.missionWindow!.startMs)
  );

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCraft;
    return allCraft.filter((b) => {
      const hay = (b.name + ' ' + (b.summary ?? '')).toLowerCase();
      return hay.includes(q);
    });
  });

  $effect(() => {
    filtered;
    highlightIndex = 0;
  });

  $effect(() => {
    highlightIndex;
    if (!listEl) return;
    const el = listEl.querySelector<HTMLElement>(`[data-row-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  });

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function fmtDate(ms: number): string {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
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

  function commit(i: number) {
    const c = filtered[i];
    if (!c?.missionWindow) return;
    const start = new Date(c.missionWindow.startMs);
    bodySystem.setSystemTime(start);
    const rb = bodySystem.getRenderableBody(c.name);
    if (rb) bodySystem.moveToTarget(rb);
    open = false;
    query = '';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIndex = Math.min(filtered.length - 1, highlightIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(0, highlightIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(highlightIndex);
    }
  }

  $effect(() => {
    if (open) {
      tick().then(() => inputEl?.focus());
    }
  });
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="relative pointer-events-auto">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-label="Browse spacecraft"
    title="Browse spacecraft"
    class="min-w-[40px] min-h-[40px] px-2.5 rounded-md bg-black/40 backdrop-blur-sm text-white/85 ring-1 ring-white/10 hover:bg-black/60 transition flex items-center justify-center"
  >
    <Rocket size={16} strokeWidth={2} />
  </button>

  {#if open}
    <button
      type="button"
      class="fixed inset-0 z-[65] cursor-default"
      aria-label="Close spacecraft browser"
      onclick={() => (open = false)}
    ></button>

    <div
      class="absolute right-0 top-full mt-1 w-[min(92vw,460px)] max-h-[70vh] overflow-hidden rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-[70]"
    >
      <input
        bind:this={inputEl}
        type="text"
        bind:value={query}
        placeholder="Search spacecraft…"
        spellcheck="false"
        autocomplete="off"
        class="px-3 py-2 bg-black/40 text-white/90 font-mono text-sm placeholder-white/30 focus:outline-none border-b border-white/10"
      />
      <div bind:this={listEl} class="overflow-y-auto py-1">
        {#each filtered as craft, i}
          <button
            type="button"
            data-row-index={i}
            onclick={() => commit(i)}
            onmouseenter={() => (highlightIndex = i)}
            class="w-full text-left px-3 py-2 flex flex-col gap-0.5 font-mono text-xs sm:text-sm transition border-b border-white/5"
            class:row-active={i === highlightIndex}
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
  {/if}
</div>

<style>
  .row-active {
    background-color: rgba(212, 160, 74, 0.18);
  }
</style>
