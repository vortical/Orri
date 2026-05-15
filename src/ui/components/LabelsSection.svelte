<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { CameraLayer } from '../../scene/CameraLayer';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let showNames = $state(true);
  let showDistances = $state(true);
  let showAltAz = $state(false);
  let optionsOpen = $state(false);

  // Snapshot captured when master is toggled OFF, so toggling ON restores
  // the user's previous individual layer configuration.
  let snapshot = $state({ names: true, distances: true, altAz: false });

  let masterOn = $derived(showNames || showDistances || showAltAz);

  onMount(() => {
    showNames = bodySystem.isLayerEnabled(CameraLayer.NameLabel);
    showDistances = bodySystem.isLayerEnabled(CameraLayer.DistanceLabel);
    showAltAz = bodySystem.isLayerEnabled(CameraLayer.ElevationAzimuthLabel);
    if (showNames || showDistances || showAltAz) {
      snapshot = { names: showNames, distances: showDistances, altAz: showAltAz };
    }
  });

  function applyLayerStates(next: { names: boolean; distances: boolean; altAz: boolean }) {
    showNames = next.names;
    showDistances = next.distances;
    showAltAz = next.altAz;
    bodySystem.setLayerEnabled(next.names, CameraLayer.NameLabel);
    bodySystem.setLayerEnabled(next.distances, CameraLayer.DistanceLabel);
    bodySystem.setLayerEnabled(next.altAz, CameraLayer.ElevationAzimuthLabel);
  }

  function onMaster(event: Event) {
    const on = (event.target as HTMLInputElement).checked;
    if (on) {
      const anySaved = snapshot.names || snapshot.distances || snapshot.altAz;
      applyLayerStates(anySaved ? snapshot : { names: true, distances: false, altAz: false });
    } else {
      snapshot = { names: showNames, distances: showDistances, altAz: showAltAz };
      applyLayerStates({ names: false, distances: false, altAz: false });
    }
  }

  function onShowNames(event: Event) {
    showNames = (event.target as HTMLInputElement).checked;
    bodySystem.setLayerEnabled(showNames, CameraLayer.NameLabel);
  }

  function onShowDistances(event: Event) {
    showDistances = (event.target as HTMLInputElement).checked;
    bodySystem.setLayerEnabled(showDistances, CameraLayer.DistanceLabel);
  }

  function onShowAltAz(event: Event) {
    showAltAz = (event.target as HTMLInputElement).checked;
    bodySystem.setLayerEnabled(showAltAz, CameraLayer.ElevationAzimuthLabel);
  }
</script>

<header class="apollo-section-header apollo-section-header-with-controls">
  <span class="apollo-section-title">Labels</span>
  <input
    type="checkbox"
    class="apollo-toggle"
    checked={masterOn}
    onchange={onMaster}
    aria-label="Labels"
  />
  <button
    type="button"
    class="apollo-options-toggle"
    aria-expanded={optionsOpen}
    aria-label={optionsOpen ? 'Hide options' : 'Show options'}
    onclick={() => (optionsOpen = !optionsOpen)}
  >
    <span class="apollo-options-chevron" aria-hidden="true"></span>
  </button>
</header>

{#if optionsOpen}
  <div class="apollo-section-body apollo-options-body" class:is-disabled={!masterOn}>
    <label class="apollo-row">
      <span class="apollo-label">Names</span>
      <input
        type="checkbox"
        class="apollo-toggle"
        checked={showNames}
        onchange={onShowNames}
      />
    </label>

    <label class="apollo-row">
      <span class="apollo-label">Distances</span>
      <input
        type="checkbox"
        class="apollo-toggle"
        checked={showDistances}
        onchange={onShowDistances}
      />
    </label>

    <label class="apollo-row">
      <span class="apollo-label">Alt/azimuth</span>
      <input
        type="checkbox"
        class="apollo-toggle"
        checked={showAltAz}
        onchange={onShowAltAz}
      />
    </label>
  </div>
{/if}
