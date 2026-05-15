<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { DistanceUnits, type DistanceUnit } from '../../system/distance';
  import type { TimeDisplay } from '../../system/time';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let distanceAbbrev = $state<keyof typeof DistanceUnits>('km');
  let timeDisplay = $state<TimeDisplay>('local');

  onMount(() => {
    distanceAbbrev = bodySystem.getDistanceUnit().abbrev as keyof typeof DistanceUnits;
    timeDisplay = bodySystem.getTimeDisplay();
  });

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

<div class="apollo-preferences">
  <label class="apollo-row">
    <span class="apollo-label">Clock</span>
    <select class="apollo-select" value={timeDisplay} onchange={onTimeDisplay}>
      <option value="local">Local</option>
      <option value="utc">UTC</option>
    </select>
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
</div>

<style>
  .apollo-preferences {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
</style>
