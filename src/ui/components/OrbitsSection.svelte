<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { OrbitLengthType } from '../../mesh/OrbitOutline';
  import { throttle } from '../../system/throttle';
  import { TimeUnit, unitsToMs } from '../../system/time';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let outlinesEnabled = $state(false);
  let selectedOpacity = $state(0.5);
  let unselectedOpacity = $state(0.2);
  let lengthType = $state<OrbitLengthType>(OrbitLengthType.AngleDegrees);
  let angleValue = $state(355);
  let timeDaysValue = $state(355);

  const handler = untrack(() => bodySystem.orbitOutlinesStateHandler);

  const setAngleLength = throttle(100, undefined, (degrees: number) => {
    handler.setOrbitalOutlineLength({ value: degrees, lengthType: OrbitLengthType.AngleDegrees });
  });

  const setTimeLength = throttle(100, undefined, (days: number) => {
    handler.setOrbitalOutlineLength({ value: unitsToMs(days, TimeUnit.Days), lengthType: OrbitLengthType.Time });
  });

  onMount(() => {
    outlinesEnabled = handler.getOrbitalOutlinesEnabled();
    selectedOpacity = handler.getSelectedOrbitalOutlinesOpacity();
    unselectedOpacity = handler.getUnselectedOrbitalOutlinesOpacity();
    const current = handler.getOrbitalOutlineLength();
    lengthType = current.lengthType;
    if (current.lengthType === OrbitLengthType.AngleDegrees) {
      angleValue = current.value;
      timeDaysValue = 355;
    } else {
      timeDaysValue = current.value / unitsToMs(1, TimeUnit.Days);
      angleValue = 355;
    }
  });

  function onEnabled(event: Event) {
    outlinesEnabled = (event.target as HTMLInputElement).checked;
    handler.setOrbitalOutlinesEnabled(outlinesEnabled);
  }

  function onSelectedOpacity(event: Event) {
    selectedOpacity = parseFloat((event.target as HTMLInputElement).value);
    handler.setSelectedOrbitalOutlinesOpacity(selectedOpacity);
  }

  function onUnselectedOpacity(event: Event) {
    unselectedOpacity = parseFloat((event.target as HTMLInputElement).value);
    handler.setUnselectedOrbitalOutlinesOpacity(unselectedOpacity);
  }

  function onLengthType(event: Event) {
    const value = (event.target as HTMLSelectElement).value as OrbitLengthType;
    lengthType = value;
    if (value === OrbitLengthType.AngleDegrees) {
      setAngleLength(angleValue);
    } else {
      setTimeLength(timeDaysValue);
    }
  }

  function onAngle(event: Event) {
    angleValue = parseFloat((event.target as HTMLInputElement).value);
    setAngleLength(angleValue);
  }

  function onTimeDays(event: Event) {
    timeDaysValue = parseFloat((event.target as HTMLInputElement).value);
    setTimeLength(timeDaysValue);
  }
</script>

<div class="flex flex-col gap-3">
  <label class="apollo-row">
    <span class="apollo-label">Show outlines</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={outlinesEnabled}
      onchange={onEnabled}
    />
  </label>

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <span class="apollo-label">Selected opacity</span>
      <span class="apollo-readout">{selectedOpacity.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={selectedOpacity}
      oninput={onSelectedOpacity}
      aria-label="Selected outline opacity"
      class="apollo-slider w-full touch-pan-x"
    />
  </div>

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <span class="apollo-label">Unselected opacity</span>
      <span class="apollo-readout">{unselectedOpacity.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={unselectedOpacity}
      oninput={onUnselectedOpacity}
      aria-label="Unselected outline opacity"
      class="apollo-slider w-full touch-pan-x"
    />
  </div>

  <label class="apollo-row">
    <span class="apollo-label">Length by</span>
    <select class="apollo-select" value={lengthType} onchange={onLengthType}>
      <option value={OrbitLengthType.AngleDegrees}>Angle</option>
      <option value={OrbitLengthType.Time}>Time</option>
    </select>
  </label>

  {#if lengthType === OrbitLengthType.AngleDegrees}
    <div class="flex flex-col gap-1">
      <div class="flex items-baseline justify-between">
        <span class="apollo-label">Angle</span>
        <span class="apollo-readout">{angleValue.toFixed(1)}°</span>
      </div>
      <input
        type="range"
        min="0.001"
        max="355"
        step="0.01"
        value={angleValue}
        oninput={onAngle}
        aria-label="Orbit angle (degrees)"
        class="apollo-slider w-full touch-pan-x"
      />
    </div>
  {:else}
    <div class="flex flex-col gap-1">
      <div class="flex items-baseline justify-between">
        <span class="apollo-label">Days</span>
        <span class="apollo-readout">{timeDaysValue.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min="0.01"
        max={365 * 248}
        step="0.01"
        value={timeDaysValue}
        oninput={onTimeDays}
        aria-label="Orbit length (days)"
        class="apollo-slider w-full touch-pan-x"
      />
    </div>
  {/if}
</div>
