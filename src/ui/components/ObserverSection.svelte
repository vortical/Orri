<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { LatLon } from '../../system/LatLon';
  import { userNotify } from '../notify';
  import Crosshair from 'lucide-svelte/icons/crosshair';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let locationText = $state('');

  onMount(() => {
    locationText = bodySystem.getLocation()?.toString() ?? '';
  });

  function commitLocation() {
    if (locationText.trim() === '') {
      bodySystem.setLocation(undefined);
      return;
    }
    try {
      const latlon = LatLon.fromString(locationText);
      bodySystem.setLocation(latlon);
      locationText = bodySystem.getLocation()?.toString() ?? '';
    } catch (error) {
      userNotify.showWarning("Can't process your location!", (error as Error).message);
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
    } catch (error) {
      userNotify.showWarning(
        'Could not get your location!',
        (error as Error).toString().concat(', You will need to add your coordinates manually.')
      );
    }
  }
</script>

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
