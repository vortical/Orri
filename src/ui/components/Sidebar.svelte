<script lang="ts">
  import PanelLeft from 'lucide-svelte/icons/panel-left';
  import type { BodySystem } from '../../scene/BodySystem';
  import ViewSection from './ViewSection.svelte';
  import LabelsSection from './LabelsSection.svelte';
  import ShadowsSection from './ShadowsSection.svelte';
  import CameraSection from './CameraSection.svelte';
  import OrbitsSection from './OrbitsSection.svelte';
  import ToolsSection from './ToolsSection.svelte';

  type Props = {
    bodySystem: BodySystem;
  };

  let { bodySystem }: Props = $props();

  let open = $state(false);
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
  <h3 class="apollo-section-header">View</h3>
  <div class="apollo-section-body">
    <ViewSection {bodySystem} />
  </div>

  <h3 class="apollo-section-header">Camera</h3>
  <div class="apollo-section-body">
    <CameraSection {bodySystem} />
  </div>

  <h3 class="apollo-section-header">Labels</h3>
  <div class="apollo-section-body">
    <LabelsSection {bodySystem} />
  </div>

  <h3 class="apollo-section-header">Orbits</h3>
  <div class="apollo-section-body">
    <OrbitsSection {bodySystem} />
  </div>

  <h3 class="apollo-section-header">Shadows</h3>
  <div class="apollo-section-body">
    <ShadowsSection {bodySystem} />
  </div>

  <h3 class="apollo-section-header">Tools</h3>
  <div class="apollo-section-body">
    <ToolsSection {bodySystem} />
  </div>
</aside>
