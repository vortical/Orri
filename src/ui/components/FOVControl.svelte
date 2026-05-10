<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { FOV_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  // Exponential mapping: slider t in [0,1] → fov = 0.0001 * 900000^t.
  // t=0 → 0.0001°, t=0.5 → ~0.0949°, t=1 → 90°. Lets the user pick tiny
  // telephoto FOVs that the linear slider made unreachable.
  const FOV_MIN = 0.0001;
  const FOV_MAX = 90;
  const RATIO = FOV_MAX / FOV_MIN; // 900_000

  function fovFromT(t: number): number {
    return FOV_MIN * Math.pow(RATIO, t);
  }
  function tFromFov(fov: number): number {
    const clamped = Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
    return Math.log(clamped / FOV_MIN) / Math.log(RATIO);
  }

  let fov = $state(35);
  let sliderT = $state(0.5);
  let sub: any;

  onMount(() => {
    fov = bodySystem.getFov();
    sliderT = tFromFov(fov);
    sub = PubSub.subscribe(FOV_TOPIC, (_msg: any, v: number) => {
      fov = v;
      sliderT = tFromFov(v);
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(sub);
  });

  function onSlider(e: Event) {
    const t = parseFloat((e.target as HTMLInputElement).value);
    sliderT = t;
    bodySystem.setFOV(fovFromT(t));
  }

  function fmtFov(v: number): string {
    if (v >= 10) return v.toFixed(1) + '°';
    if (v >= 1) return v.toFixed(2) + '°';
    if (v >= 0.01) return v.toFixed(3) + '°';
    return v.toExponential(1) + '°';
  }
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-baseline justify-between font-mono text-[11px] tracking-widest">
    <span class="text-[#d4a04a]">FOV</span>
    <span class="text-white/85">{fmtFov(fov)}</span>
  </div>
  <input
    type="range"
    min="0"
    max="1"
    step="0.001"
    value={sliderT}
    oninput={onSlider}
    aria-label="Field of view"
    class="apollo-slider w-full touch-pan-x"
  />
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
</style>
