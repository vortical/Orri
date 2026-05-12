<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import PanelLeft from 'lucide-svelte/icons/panel-left';
  import type { BodySystem } from '../../scene/BodySystem';
  import { BODY_SELECT_TOPIC } from '../../system/event-types';
  import PreferencesSection from './PreferencesSection.svelte';
  import ViewSection from './ViewSection.svelte';
  import ObserverSection from './ObserverSection.svelte';
  import LabelsSection from './LabelsSection.svelte';
  import OrbitsSection from './OrbitsSection.svelte';
  import ShadowsSection from './ShadowsSection.svelte';
  import ToolsSection from './ToolsSection.svelte';

  type Props = {
    bodySystem: BodySystem;
  };

  let { bodySystem }: Props = $props();

  let open = $state(false);
  let toolsOpen = $state(false);
  // OBSERVER section only makes sense when targeting a body OTHER than Earth,
  // because the location pin is fixed on Earth (you're on Earth looking out
  // at the target). When target is Earth, hide the section.
  let targetIsEarth = $state(true);
  let targetSub: any;

  function isEarth(name: string | undefined | null): boolean {
    return (name ?? '').toLowerCase() === 'earth';
  }

  onMount(() => {
    targetIsEarth = isEarth(bodySystem.getRenderableBodyTarget()?.getName());
    targetSub = PubSub.subscribe(BODY_SELECT_TOPIC, (_msg: any, e: { body: any }) => {
      targetIsEarth = isEarth(e?.body?.getName?.());
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(targetSub);
  });
</script>

<div class="pointer-events-auto">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-pressed={open}
    aria-label={open ? 'Close sidebar' : 'Open sidebar'}
    title={open ? 'Close sidebar' : 'Open sidebar'}
    class="apollo-icon-button"
  >
    <PanelLeft size={16} strokeWidth={2} />
  </button>
</div>

<aside class="sidebar" class:sidebar-open={open} aria-hidden={!open}>
  <PreferencesSection {bodySystem} />

  <h3 class="apollo-section-header">View</h3>
  <div class="apollo-section-body">
    <ViewSection {bodySystem} />
  </div>

  {#if !targetIsEarth}
    <h3 class="apollo-section-header">Observer</h3>
    <div class="apollo-section-body">
      <ObserverSection {bodySystem} />
    </div>
  {/if}

  <LabelsSection {bodySystem} />

  <OrbitsSection {bodySystem} />

  <ShadowsSection {bodySystem} />

  {#if toolsOpen}
    <h3 class="apollo-section-header">Tools</h3>
    <div class="apollo-section-body">
      <ToolsSection {bodySystem} />
    </div>
  {/if}

  <button
    type="button"
    class="apollo-debug-toggle"
    onclick={() => (toolsOpen = !toolsOpen)}
  >
    {toolsOpen ? 'hide debug tools' : 'show debug tools'}
  </button>
</aside>
