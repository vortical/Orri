<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { SpacecraftModes, type SpacecraftMode } from '../../scene/BodySystem';
  import { CameraModes, type CameraMode } from '../../scene/CameraTargetingState';
  import { LatLon } from '../../system/LatLon';
  import { userNotify } from '../ui';
  import Crosshair from 'lucide-svelte/icons/crosshair';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  type CameraModeKey = keyof typeof CameraModes;

  let cameraModeKey = $state<CameraModeKey>('FollowTarget');
  let spacecraftMode = $state<SpacecraftMode>(SpacecraftModes.NBody);
  let locationText = $state('');

  const cameraModeKeys = Object.keys(CameraModes) as CameraModeKey[];

  onMount(() => {
    cameraModeKey = currentCameraModeKey();
    spacecraftMode = bodySystem.getSpacecraftMode();
    locationText = bodySystem.getLocation()?.toString() ?? '';
  });

  function currentCameraModeKey(): CameraModeKey {
    const current = bodySystem.getCameraTargetingMode();
    for (const key of cameraModeKeys) {
      if (CameraModes[key] === current) return key;
    }
    return 'FollowTarget';
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

  function onSpacecraftMode(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SpacecraftMode;
    spacecraftMode = value;
    bodySystem.setSpacecraftMode(value);
  }

  function commitLocation() {
    if (locationText.trim() === '') {
      bodySystem.setLocation(undefined);
      return;
    }
    try {
      const latlon = LatLon.fromString(locationText);
      bodySystem.setLocation(latlon);
      locationText = bodySystem.getLocation()?.toString() ?? '';
    } catch (e) {
      userNotify.showWarning("Can't process your location!", (e as Error).message);
      locationText = bodySystem.getLocation()?.toString() ?? '';
    }
  }

  function onLocationKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
  }

  async function useBrowserLocation() {
    try {
      const latlon = await LatLon.fromBrowser();
      locationText = `${latlon.lat}, ${latlon.lon}`;
      bodySystem.setLocation(latlon);
    } catch (e) {
      userNotify.showWarning(
        'Could not get your location!',
        (e as Error).toString().concat(', You will need to add your coordinates manually.')
      );
    }
  }
</script>

<div class="flex flex-col gap-2">
  <label class="apollo-row">
    <span class="apollo-label">Camera mode</span>
    <select class="apollo-select" value={cameraModeKey} onchange={onCameraMode}>
      {#each cameraModeKeys as key}
        <option value={key}>{CameraModes[key].name}</option>
      {/each}
    </select>
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Spacecraft mode</span>
    <select class="apollo-select" value={spacecraftMode} onchange={onSpacecraftMode}>
      <option value={SpacecraftModes.NBody}>N-Body</option>
      <option value={SpacecraftModes.Trajectory}>Trajectory</option>
    </select>
  </label>

  <div class="flex flex-col gap-1">
    <span class="apollo-label">Location (lat, lon)</span>
    <div class="flex gap-2">
      <input
        type="text"
        class="apollo-text flex-1 min-w-0"
        bind:value={locationText}
        onblur={commitLocation}
        onkeydown={onLocationKey}
        placeholder="45.5, -73.6"
        aria-label="Observer location"
      />
      <button
        type="button"
        class="apollo-button flex items-center gap-1"
        onclick={useBrowserLocation}
        aria-label="Use browser location"
        title="Use browser location"
      >
        <Crosshair size={12} strokeWidth={2} />
        <span>Use mine</span>
      </button>
    </div>
  </div>
</div>
