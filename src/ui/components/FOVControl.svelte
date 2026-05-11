<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { FOV_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  // Exponential mapping. FOV_MIN of 0.05° gives ~1000× zoom (apparent FOV ~50°).
  const FOV_MIN = 0.05;
  const FOV_MAX = 90;
  const RATIO = FOV_MAX / FOV_MIN;
  const FOV_DEFAULT = 30;

  // Native range thumb width (matches the ::-webkit-slider-thumb rule below).
  // The thumb's center traverses [thumbRadius, trackWidth - thumbRadius], so a
  // tick placed by raw percent drifts away from the thumb near the edges.
  const THUMB_WIDTH = 14;
  const THUMB_RADIUS = THUMB_WIDTH / 2;

  function fovFromPosition(position: number): number {
    return FOV_MIN * Math.pow(RATIO, position);
  }
  function positionFromFov(fov: number): number {
    const clamped = Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
    return Math.log(clamped / FOV_MIN) / Math.log(RATIO);
  }

  const defaultTickPosition = positionFromFov(FOV_DEFAULT);

  let fov = $state(FOV_DEFAULT);
  let sliderPosition = $state(positionFromFov(FOV_DEFAULT));
  let subscription: any;

  onMount(() => {
    fov = bodySystem.getFov();
    sliderPosition = positionFromFov(fov);
    subscription = PubSub.subscribe(FOV_TOPIC, (_msg: any, value: number) => {
      fov = value;
      sliderPosition = positionFromFov(value);
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(subscription);
  });

  function onSlider(event: Event) {
    const position = parseFloat((event.target as HTMLInputElement).value);
    sliderPosition = position;
    bodySystem.setFOV(fovFromPosition(position));
  }

  function formatFov(value: number): string {
    if (value >= 10) return value.toFixed(1) + '°';
    if (value >= 1) return value.toFixed(2) + '°';
    if (value >= 0.01) return value.toFixed(3) + '°';
    return value.toExponential(1) + '°';
  }
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-baseline justify-between font-mono text-[11px] tracking-widest">
    <span class="text-[#d4a04a]">FOV</span>
    <span class="text-white/85">{formatFov(fov)}</span>
  </div>
  <div class="slider-wrap">
    <span
      class="tick"
      style="left: calc({THUMB_RADIUS}px + {defaultTickPosition} * (100% - {THUMB_WIDTH}px));"
      title="Default FOV ({FOV_DEFAULT}°)"
      aria-hidden="true"
    ></span>
    <input
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={sliderPosition}
      oninput={onSlider}
      aria-label="Field of view"
      class="apollo-slider w-full touch-pan-x"
    />
  </div>
</div>

<!-- Slider chrome lives in apollo-controls.css (shared with TimeControlBar
     and any future apollo-styled sliders). -->

