<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import FOVControl from './FOVControl.svelte';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let sizeScale = $state(1.0);
  let ambientLight = $state(0.025);

  onMount(() => {
    sizeScale = bodySystem.getScale();
    ambientLight = bodySystem.getAmbiantLightLevel();
  });

  function onSizeScaleInput(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    sizeScale = value;
    bodySystem.setScale(value);
  }

  function onAmbientLightInput(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    ambientLight = value;
    bodySystem.setAmbiantLightLevel(value);
  }
</script>

<div class="flex flex-col gap-3">
  <FOVControl {bodySystem} />

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between font-mono text-[11px] tracking-widest">
      <span class="apollo-accent">SIZE SCALE</span>
      <span class="apollo-readout">{sizeScale.toFixed(1)}×</span>
    </div>
    <input
      type="range"
      min="1"
      max="200"
      step="0.1"
      value={sizeScale}
      oninput={onSizeScaleInput}
      aria-label="Body size scale"
      class="apollo-slider w-full touch-pan-x"
    />
  </div>

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between font-mono text-[11px] tracking-widest">
      <span class="apollo-accent">AMBIENT</span>
      <span class="apollo-readout">{ambientLight.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="0.4"
      step="0.01"
      value={ambientLight}
      oninput={onAmbientLightInput}
      aria-label="Ambient light"
      class="apollo-slider w-full touch-pan-x"
    />
  </div>
</div>
