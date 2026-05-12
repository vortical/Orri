<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { CameraModes, type CameraMode } from '../../scene/CameraTargetingState';
  import { userNotify } from '../ui';
  import FOVControl from './FOVControl.svelte';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  type CameraModeKey = keyof typeof CameraModes;

  // Only Look-At and Follow are exposed; ViewTargetFromSurface is hidden
  // until the multi-pin "view from pin" UX lands.
  const exposedCameraModeKeys: CameraModeKey[] = ['LookAtTarget', 'FollowTarget'];

  let ambientLight = $state(0.025);
  let cameraModeKey = $state<CameraModeKey>('FollowTarget');

  onMount(() => {
    ambientLight = bodySystem.getAmbiantLightLevel();
    cameraModeKey = currentCameraModeKey();
  });

  function currentCameraModeKey(): CameraModeKey {
    const current = bodySystem.getCameraTargetingMode();
    for (const key of exposedCameraModeKeys) {
      if (CameraModes[key] === current) return key;
    }
    return 'FollowTarget';
  }

  function onAmbientLightInput(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    ambientLight = value;
    bodySystem.setAmbiantLightLevel(value);
  }

  function onCameraMode(event: Event) {
    const key = (event.target as HTMLSelectElement).value as CameraModeKey;
    const previous = cameraModeKey;
    const mode: CameraMode = CameraModes[key];
    try {
      bodySystem.setCameraTargetingMode(mode);
      cameraModeKey = key;
    } catch (e) {
      userNotify.showWarning('You tried something weird...', (e as Error).message);
      cameraModeKey = previous;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <FOVControl {bodySystem} />

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <span class="apollo-label">Ambient light</span>
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

  <label class="apollo-row">
    <span class="apollo-label">Camera mode</span>
    <select class="apollo-select" value={cameraModeKey} onchange={onCameraMode}>
      {#each exposedCameraModeKeys as key}
        <option value={key}>{CameraModes[key].name}</option>
      {/each}
    </select>
  </label>
</div>
