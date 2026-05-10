<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { BodySystem } from '../../scene/BodySystem';
  import { DataService } from '../../services/dataservice';
  import { SimulationEngine } from '../../body/SimulationEngine';
  import { SpacecraftTrajectoryUpdater } from '../../body/SpacecraftTrajectoryUpdater';
  import { LatLon } from '../../system/LatLon';
  import LocationBar from '../LocationBar';
  import { SimpleUI, userNotify } from '../ui';
  import config from '../../configuration';
  import TimeControlBar from './TimeControlBar.svelte';
  import SceneDateOverlay from './SceneDateOverlay.svelte';
  import TargetIndicator from './TargetIndicator.svelte';
  import SpacecraftBrowser from './SpacecraftBrowser.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import type GUI from 'lil-gui';

  let sceneRoot: HTMLDivElement;
  let bodySystem: BodySystem | undefined = $state(undefined);
  let gui: GUI | undefined = $state(undefined);
  let loading = $state(true);
  let error: string | undefined = $state(undefined);

  onMount(async () => {
    try {
      const dataService = new DataService(config.spacefieldBaseURL, config.baseUrl);
      const simulationEngine = new SimulationEngine();
      const options = LocationBar.getState();
      const date = options.date ? new Date(options.date) : new Date();
      options.location = options.location || (await getLocation());
      const bodies = await dataService.loadSolarSystem(date);
      const bs = new BodySystem(sceneRoot, bodies, dataService, simulationEngine, options);
      bs.addUpdater(new SpacecraftTrajectoryUpdater());
      bs.setCameraUp(bs.getBody('earth').get_orbital_plane_normal());
      const ui = new SimpleUI(bs, dataService);
      gui = ui.gui;
      bs.start();
      bodySystem = bs;
      loading = false;
    } catch (e: any) {
      console.error(e);
      error = e?.message ?? String(e);
      loading = false;
    }
  });

  onDestroy(() => {
    bodySystem?.stop();
  });

  async function getLocation(): Promise<LatLon | undefined> {
    try {
      return await LatLon.fromBrowser();
    } catch (e: any) {
      userNotify.showWarning(
        'Could not get your location!',
        e.toString().concat('.<p>You will need to add your coordinates manually in the settings.</p>')
      );
      return undefined;
    }
  }
</script>

<div class="fixed inset-0 bg-[#0A0E20] overflow-hidden">
  <div bind:this={sceneRoot} class="absolute inset-0"></div>

  {#if loading}
    <div class="absolute inset-0 flex items-center justify-center text-white/70 font-mono text-sm pointer-events-none">
      Loading…
    </div>
  {/if}

  {#if error}
    <div class="absolute inset-0 flex items-center justify-center text-red-400 font-mono text-sm p-4 text-center">
      Failed to load: {error}
    </div>
  {/if}

  {#if bodySystem}
    <!-- Top control-panel strip: each overlay is its own "instrument" panel. -->
    <div class="absolute top-3 left-3 right-3 flex flex-wrap items-start gap-2 z-30 pointer-events-none">
      <SceneDateOverlay {bodySystem} />
      <TargetIndicator {bodySystem} />
      <div class="ml-auto flex gap-2">
        <SpacecraftBrowser {bodySystem} />
        <SettingsPanel {bodySystem} {gui} />
      </div>
    </div>

    <TimeControlBar {bodySystem} />
  {/if}
</div>
