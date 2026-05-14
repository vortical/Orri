<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { CameraModes, type CameraMode } from '../../scene/CameraTargetingState';
  import { userNotify } from '../notify';
  import FOVControl from './FOVControl.svelte';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  type CameraModeKey = keyof typeof CameraModes;

  // Only Look-At and Follow are exposed; ViewTargetFromSurface is hidden
  // until the multi-pin "view from pin" UX lands.
  const exposedCameraModeKeys: CameraModeKey[] = ['LookAtTarget', 'FollowTarget'];

  // Native range thumb width — the tick position is offset by half a thumb
  // on each end so the tick centre aligns with the thumb centre when the
  // value matches the default.
  const THUMB_WIDTH = 14;
  const THUMB_RADIUS = THUMB_WIDTH / 2;

  const SUN_DEFAULT = 2.5;
  const SUN_MIN = 0.5;
  const SUN_MAX = 5;
  const sunTickPosition = (SUN_DEFAULT - SUN_MIN) / (SUN_MAX - SUN_MIN);

  const AMBIENT_DEFAULT = 0.02;
  const AMBIENT_MIN = 0;
  const AMBIENT_MAX = 0.4;
  const ambientTickPosition = (AMBIENT_DEFAULT - AMBIENT_MIN) / (AMBIENT_MAX - AMBIENT_MIN);

  let sunIntensity = $state(1.5);
  let ambientLight = $state(0.025);
  let cameraModeKey = $state<CameraModeKey>('FollowTarget');

  onMount(() => {
    sunIntensity = bodySystem.getSunLightIntensity();
    ambientLight = bodySystem.getAmbiantLightLevel();
    cameraModeKey = currentCameraModeKey();
  });

  function onSunIntensityInput(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    sunIntensity = value;
    bodySystem.setSunLightIntensity(value);
  }

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
    } catch (error) {
      userNotify.showWarning('You tried something weird...', (error as Error).message);
      cameraModeKey = previous;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <FOVControl {bodySystem} />

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <span class="apollo-label">Sun intensity</span>
      <span class="apollo-readout">{sunIntensity.toFixed(1)}</span>
    </div>
    <div class="slider-wrap">
      <span
        class="tick"
        style="left: calc({THUMB_RADIUS}px + {sunTickPosition} * (100% - {THUMB_WIDTH}px));"
        title="Default ({SUN_DEFAULT})"
        aria-hidden="true"
      ></span>
      <input
        type="range"
        min={SUN_MIN}
        max={SUN_MAX}
        step="0.1"
        value={sunIntensity}
        oninput={onSunIntensityInput}
        aria-label="Sun intensity"
        class="apollo-slider w-full touch-pan-x"
      />
    </div>
  </div>

  <div class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between">
      <span class="apollo-label">Ambient light</span>
      <span class="apollo-readout">{ambientLight.toFixed(2)}</span>
    </div>
    <div class="slider-wrap">
      <span
        class="tick"
        style="left: calc({THUMB_RADIUS}px + {ambientTickPosition} * (100% - {THUMB_WIDTH}px));"
        title="Default ({AMBIENT_DEFAULT})"
        aria-hidden="true"
      ></span>
      <input
        type="range"
        min={AMBIENT_MIN}
        max={AMBIENT_MAX}
        step="0.01"
        value={ambientLight}
        oninput={onAmbientLightInput}
        aria-label="Ambient light"
        class="apollo-slider w-full touch-pan-x"
      />
    </div>
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
