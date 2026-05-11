<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { CameraLayer } from '../../scene/CameraLayer';
  import { DistanceUnits, type DistanceUnit } from '../../system/distance';
  import type { TimeDisplay } from '../../system/time';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let showNames = $state(true);
  let showDistances = $state(true);
  let showAltAz = $state(false);
  let distanceAbbrev = $state<keyof typeof DistanceUnits>('km');
  let timeDisplay = $state<TimeDisplay>('local');

  onMount(() => {
    showNames = bodySystem.isLayerEnabled(CameraLayer.NameLabel);
    showDistances = bodySystem.isLayerEnabled(CameraLayer.DistanceLabel);
    showAltAz = bodySystem.isLayerEnabled(CameraLayer.ElevationAzimuthLabel);
    distanceAbbrev = bodySystem.getDistanceUnit().abbrev as keyof typeof DistanceUnits;
    timeDisplay = bodySystem.getTimeDisplay();
  });

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

  function onDistanceUnit(event: Event) {
    const abbrev = (event.target as HTMLSelectElement).value as keyof typeof DistanceUnits;
    distanceAbbrev = abbrev;
    const unit: DistanceUnit = DistanceUnits[abbrev];
    bodySystem.setDistanceUnit(unit);
  }

  function onTimeDisplay(event: Event) {
    const value = (event.target as HTMLSelectElement).value as TimeDisplay;
    timeDisplay = value;
    bodySystem.setTimeDisplay(value);
  }
</script>

<div class="flex flex-col gap-2">
  <label class="apollo-row">
    <span class="apollo-label">Show names</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={showNames}
      onchange={onShowNames}
    />
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Show distances</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={showDistances}
      onchange={onShowDistances}
    />
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Show alt/az</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={showAltAz}
      onchange={onShowAltAz}
    />
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Distance units</span>
    <select class="apollo-select" value={distanceAbbrev} onchange={onDistanceUnit}>
      <option value="au">au</option>
      <option value="mi">mi</option>
      <option value="km">km</option>
      <option value="m">m</option>
    </select>
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Clock</span>
    <select class="apollo-select" value={timeDisplay} onchange={onTimeDisplay}>
      <option value="local">Local</option>
      <option value="utc">UTC</option>
    </select>
  </label>
</div>
