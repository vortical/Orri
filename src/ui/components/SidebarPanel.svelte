<script lang="ts">
  import type { BodySystem } from '../../scene/BodySystem';
  import type { CameraMode } from '../../scene/CameraTargetingState';
  import PreferencesSection from './PreferencesSection.svelte';
  import ViewSection from './ViewSection.svelte';
  import ObserverSection from './ObserverSection.svelte';
  import LabelsSection from './LabelsSection.svelte';
  import OrbitsSection from './OrbitsSection.svelte';
  import ShadowsSection from './ShadowsSection.svelte';
  import ToolsSection from './ToolsSection.svelte';

  type Props = {
    bodySystem: BodySystem;
    targetIsEarth: boolean;
    cameraMode: CameraMode;
    surfaceViewActive: boolean;
    onSelectCameraMode: (mode: CameraMode) => void;
    onSetSurfaceView: (active: boolean) => void;
  };

  let {
    bodySystem,
    targetIsEarth,
    cameraMode,
    surfaceViewActive,
    onSelectCameraMode,
    onSetSurfaceView,
  }: Props = $props();

  // Debug-tools is a section-internal disclosure, not an app-level open state.
  let toolsOpen = $state(false);
</script>

<aside class="sidebar">
  <PreferencesSection {bodySystem} />

  <h3 class="apollo-section-header">View</h3>
  <div class="apollo-section-body">
    <ViewSection
      {bodySystem}
      {cameraMode}
      cameraLocked={surfaceViewActive}
      {onSelectCameraMode}
    />
  </div>

  {#if !targetIsEarth}
    <h3 class="apollo-section-header">Observer</h3>
    <div class="apollo-section-body">
      <ObserverSection {bodySystem} {surfaceViewActive} {onSetSurfaceView} />
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
