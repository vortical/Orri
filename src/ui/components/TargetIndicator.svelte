<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { BODY_SELECT_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';
  import TargetSearch from './TargetSearch.svelte';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let currentName = $state('');
  let searchOpen = $state(false);
  let sub: any;

  onMount(() => {
    currentName = bodySystem.getRenderableBodyTarget()?.getName() ?? '';
    sub = PubSub.subscribe(BODY_SELECT_TOPIC, (_msg: any, e: { body: any }) => {
      if (e?.body) currentName = e.body.getName();
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(sub);
  });

  function onSelect(name: string) {
    const rb = bodySystem.getRenderableBody(name);
    if (rb) bodySystem.moveToTarget(rb);
    searchOpen = false;
  }
</script>

<div class="relative pointer-events-auto">
  <button
    type="button"
    onclick={() => (searchOpen = !searchOpen)}
    aria-expanded={searchOpen}
    aria-haspopup="listbox"
    class="px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white/85 font-mono text-xs sm:text-sm tracking-wide ring-1 ring-white/10 hover:bg-black/60 transition flex items-center gap-2 select-none"
  >
    <span class="text-[#d4a04a]">TGT</span>
    <span class="text-white/40">·</span>
    <span class="uppercase">{currentName || '—'}</span>
  </button>

  {#if searchOpen}
    <!-- Backdrop: closes on click outside the search panel. Sits above the canvas
         (z-40) but below the search panel (z-50). Clicking on the indicator button
         hits the backdrop first, which closes — equivalent to a toggle-off. -->
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      aria-label="Close target search"
      onclick={() => (searchOpen = false)}
    ></button>

    <TargetSearch
      {bodySystem}
      onselect={onSelect}
      onclose={() => (searchOpen = false)}
    />
  {/if}
</div>
