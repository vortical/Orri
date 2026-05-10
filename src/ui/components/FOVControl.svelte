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

<style>
  .apollo-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    height: 24px;
    cursor: pointer;
  }
  .apollo-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: linear-gradient(#1a1a1a, #2a2a2a);
    border: 1px solid rgba(0, 0, 0, 0.6);
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .apollo-slider::-moz-range-track {
    height: 4px;
    background: linear-gradient(#1a1a1a, #2a2a2a);
    border: 1px solid rgba(0, 0, 0, 0.6);
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .apollo-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 22px;
    margin-top: -10px;
    border-radius: 2px;
    background: linear-gradient(#e8e8e8 0%, #b8b8b8 50%, #888 100%);
    border: 1px solid #2a2a2a;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  }
  .apollo-slider::-moz-range-thumb {
    width: 14px;
    height: 22px;
    border-radius: 2px;
    background: linear-gradient(#e8e8e8 0%, #b8b8b8 50%, #888 100%);
    border: 1px solid #2a2a2a;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  }
  .apollo-slider:focus { outline: none; }
  .apollo-slider:focus::-webkit-slider-thumb { border-color: #d4a04a; }
  .apollo-slider:focus::-moz-range-thumb { border-color: #d4a04a; }

  .slider-wrap {
    position: relative;
    width: 100%;
  }
  .tick {
    position: absolute;
    top: 50%;
    width: 2px;
    height: 10px;
    border-radius: 1px;
    background: #d4a04a;
    opacity: 0.55;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.18);
    transition: opacity 0.15s ease;
  }
  .slider-wrap:hover .tick,
  .slider-wrap:focus-within .tick {
    opacity: 0.9;
  }
</style>
