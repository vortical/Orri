<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import LocationBar from '../LocationBar';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let showAxes = $state(false);
  let showStats = $state(false);

  onMount(() => {
    showAxes = bodySystem.hasAxesHelper();
    showStats = bodySystem.hasStats();
  });

  function onShowAxes(event: Event) {
    showAxes = (event.target as HTMLInputElement).checked;
    bodySystem.setAxesHelper(showAxes);
  }

  function onShowStats(event: Event) {
    showStats = (event.target as HTMLInputElement).checked;
    bodySystem.showStats(showStats);
  }

  function pushState() {
    LocationBar.pushState(bodySystem.getState());
  }

  function reloadState() {
    LocationBar.reload();
  }
</script>

<div class="flex flex-col gap-2">
  <label class="apollo-row">
    <span class="apollo-label">ICRS axes</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={showAxes}
      onchange={onShowAxes}
    />
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Perf stats</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={showStats}
      onchange={onShowStats}
    />
  </label>

  <div class="flex gap-2">
    <button
      type="button"
      class="apollo-button flex-1"
      onclick={pushState}
      title="Freeze current state into the URL bar"
    >
      Push state
    </button>
    <button
      type="button"
      class="apollo-button flex-1"
      onclick={reloadState}
      title="Reload from current URL state"
    >
      Reload state
    </button>
  </div>
</div>
