<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { BODY_SELECT_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';
  import TargetSearch from './TargetSearch.svelte';
  import Sun from 'lucide-svelte/icons/sun';
  import Globe from 'lucide-svelte/icons/globe';
  import Moon from 'lucide-svelte/icons/moon';
  import Rocket from 'lucide-svelte/icons/rocket';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let currentName = $state('');
  let currentType = $state('planet');
  let searchOpen = $state(false);
  let sub: any;

  onMount(() => {
    const target = bodySystem.getRenderableBodyTarget();
    if (target) {
      currentName = target.getName();
      currentType = target.body.type;
    }
    sub = PubSub.subscribe(BODY_SELECT_TOPIC, (_msg: any, e: { body: any }) => {
      if (e?.body) {
        currentName = e.body.getName();
        currentType = e.body.body?.type ?? 'planet';
      }
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
    aria-pressed={searchOpen}
    class="apollo-icon-button apollo-target-button"
  >
    {#if currentType === 'star'}
      <Sun size={14} strokeWidth={2} />
    {:else if currentType === 'moon'}
      <Moon size={14} strokeWidth={2} />
    {:else if currentType === 'spacecraft'}
      <Rocket size={14} strokeWidth={2} />
    {:else}
      <Globe size={14} strokeWidth={2} />
    {/if}
    <span class="target-name">{currentName || '—'}</span>
    <ChevronDown size={14} strokeWidth={2} />
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

<style>
  .target-name {
    color: #d4a04a;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    letter-spacing: 0.05em;
  }
</style>
