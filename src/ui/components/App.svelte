<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import PanelLeft from 'lucide-svelte/icons/panel-left';
  import Rocket from 'lucide-svelte/icons/rocket';
  import Sun from 'lucide-svelte/icons/sun';
  import Globe from 'lucide-svelte/icons/globe';
  import Moon from 'lucide-svelte/icons/moon';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import { BodySystem } from '../../scene/BodySystem';
  import { CameraModes, type CameraMode } from '../../scene/CameraTargetingState';
  import type { Body } from '../../body/Body';
  import { DataService } from '../../services/dataservice';
  import { SimulationEngine } from '../../body/SimulationEngine';
  import { SpacecraftTrajectoryUpdater } from '../../body/SpacecraftTrajectoryUpdater';
  import { LatLon } from '../../system/LatLon';
  import { BODY_SELECT_TOPIC } from '../../system/event-types';
  import LocationBar from '../LocationBar';
  import { userNotify } from '../notify';
  import config from '../../configuration';
  import TimeControlBar from './TimeControlBar.svelte';
  import SceneDateOverlay from './SceneDateOverlay.svelte';
  import SpacecraftBrowser from './SpacecraftBrowser.svelte';
  import TargetSearch from './TargetSearch.svelte';
  import SidebarPanel from './SidebarPanel.svelte';
  import ShareButton from './ShareButton.svelte';
  import './apollo-controls.css';

  let sceneRoot: HTMLDivElement;

  // BodySystem is intentionally OUT of reactive state — it holds the Three.js
  // scene graph, renderer, ~40 Body instances, and drives a 60Hz render loop.
  // Putting it in $state caused a system crash on 2026-05-13. Keep it as a
  // plain reference; the `ready` flag below is the reactive gate for the UI.
  let bodySystem: BodySystem | undefined;
  let ready = $state(false);

  // Snapshots passed to panels — computed once after BodySystem boots.
  let spacecraftList = $state<Body[]>([]);

  // UI orchestration state owned by the page component.
  let sidebarOpen = $state(false);
  let spacecraftBrowserOpen = $state(false);
  let targetSearchOpen = $state(false);

  // Current target tracking — subscribes to BODY_SELECT_TOPIC once here.
  let currentTargetName = $state('Earth');
  let currentTargetType = $state('planet');

  // Camera-mode state owned by the page component. `cameraMode` holds only the
  // Follow/Look-At choice (the View dropdown); `surfaceViewActive` is an
  // orthogonal override (the Observer toggle). The effective BodySystem mode is
  // ViewTargetFromSurface while the toggle is on, otherwise `cameraMode`.
  let cameraMode = $state<CameraMode>(CameraModes.FollowTarget);
  let surfaceViewActive = $state(false);

  let loading = $state(true);
  let error: string | undefined = $state(undefined);

  let targetIsEarth = $derived(currentTargetName.toLowerCase() === 'earth');

  let targetSub: any;

  onMount(async () => {
    try {
      const dataService = new DataService(config.spacefieldBaseURL, config.baseUrl);
      const simulationEngine = new SimulationEngine();
      const options = LocationBar.getState();
      const date = options.date ? new Date(options.date) : new Date();
      options.location = options.location || (await getLocation());
      const bodies = await dataService.loadSolarSystem(date);
      const system = new BodySystem(sceneRoot, bodies, dataService, simulationEngine, options);
      system.addUpdater(new SpacecraftTrajectoryUpdater());
      system.setCameraUp(system.getBody('earth').get_orbital_plane_normal());
      system.start();

      // Reload-on-back: when the user uses the browser back button after a
      // pushState (Share button), reload to restore the saved scene state.
      window.addEventListener('popstate', (event) => {
        if (event.state) location.href = location.href;
      });
      bodySystem = system;
      const bootMode = system.getCameraTargetingMode();
      if (bootMode === CameraModes.ViewTargetFromSurface) {
        surfaceViewActive = true;
      } else {
        cameraMode = bootMode;
      }
      spacecraftList = system.bodies
        .filter((body) => body.type === 'spacecraft' && body.missionWindow)
        .sort((left, right) => left.missionWindow!.startMs - right.missionWindow!.startMs);

      const target = system.getRenderableBodyTarget();
      if (target) {
        currentTargetName = target.getName();
        currentTargetType = target.body.type;
      }
      targetSub = PubSub.subscribe(BODY_SELECT_TOPIC, (_msg: any, payload: { body: any }) => {
        if (!payload?.body) return;
        currentTargetName = payload.body.getName?.() ?? currentTargetName;
        currentTargetType = payload.body.body?.type ?? currentTargetType;
      });

      ready = true;
      loading = false;
    } catch (caught: any) {
      console.error(caught);
      error = caught?.message ?? String(caught);
      loading = false;
    }
  });

  onDestroy(() => {
    if (targetSub) PubSub.unsubscribe(targetSub);
    bodySystem?.stop();
  });

  function onSpacecraftSelect(craft: Body) {
    if (!bodySystem || !craft.missionWindow) return;
    bodySystem.setSystemTime(new Date(craft.missionWindow.startMs));
    const renderable = bodySystem.getRenderableBody(craft.name);
    // bodySystem.setTarget(renderable);
    bodySystem.moveToTarget(renderable);
  }

  function onBodyTargetSelect(name: string) {
    if (!bodySystem) return;
    const renderable = bodySystem.getRenderableBody(name);
    if (renderable) bodySystem.moveToTarget(renderable);
  }

  function selectCameraMode(mode: CameraMode) {
    if (!bodySystem) return;
    try {
      bodySystem.setCameraTargetingMode(mode);
      cameraMode = mode;
    } catch (caught) {
      userNotify.showWarning('You tried something weird...', (caught as Error).message);
    }
  }

  function setSurfaceView(active: boolean) {
    if (!bodySystem) return;
    try {
      bodySystem.setCameraTargetingMode(
        active ? CameraModes.ViewTargetFromSurface : cameraMode
      );
      surfaceViewActive = active;
    } catch (caught) {
      userNotify.showWarning('You tried something weird...', (caught as Error).message);
    }
  }

  async function getLocation(): Promise<LatLon | undefined> {
    try {
      return await LatLon.fromBrowser();
    } catch (caught: any) {
      userNotify.showWarning(
        'Could not get your location!',
        caught.toString().concat('.<p>You will need to add your coordinates manually in the settings.</p>')
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

  {#if ready && bodySystem}
    <!-- Top-row trigger strip — inline buttons, panels mount/unmount from below. -->
    <div class="absolute top-3 left-3 right-3 flex flex-wrap items-start gap-2 pointer-events-none">
      <div class="pointer-events-auto">
        <button
          type="button"
          onclick={() => (sidebarOpen = !sidebarOpen)}
          aria-pressed={sidebarOpen}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          class="apollo-icon-button"
        >
          <PanelLeft size={16} strokeWidth={2} />
        </button>
      </div>

      <div class="relative pointer-events-auto">
        <button
          type="button"
          onclick={() => (targetSearchOpen = !targetSearchOpen)}
          aria-expanded={targetSearchOpen}
          aria-haspopup="listbox"
          aria-pressed={targetSearchOpen}
          class="apollo-icon-button apollo-target-button"
        >
          {#if currentTargetType === 'star'}
            <Sun size={14} strokeWidth={2} />
          {:else if currentTargetType === 'moon'}
            <Moon size={14} strokeWidth={2} />
          {:else if currentTargetType === 'spacecraft'}
            <Rocket size={14} strokeWidth={2} />
          {:else}
            <Globe size={14} strokeWidth={2} />
          {/if}
          <span class="target-name">{currentTargetName || '—'}</span>
          <ChevronDown size={14} strokeWidth={2} />
        </button>

        {#if targetSearchOpen}
          <TargetSearch
            bodies={bodySystem.bodies}
            currentTimeMs={bodySystem.clock.getTime()}
            onSelect={(name) => { onBodyTargetSelect(name); targetSearchOpen = false; }}
            onClose={() => (targetSearchOpen = false)}
          />
        {/if}
      </div>

      <div class="ml-auto flex gap-2">
        <div class="relative pointer-events-auto">
          <button
            type="button"
            onclick={() => (spacecraftBrowserOpen = !spacecraftBrowserOpen)}
            aria-expanded={spacecraftBrowserOpen}
            aria-pressed={spacecraftBrowserOpen}
            aria-label="Browse spacecraft"
            title="Browse spacecraft"
            class="apollo-icon-button apollo-target-button"
          >
            <Rocket size={16} strokeWidth={2} />
            <span class="font-mono text-xs tracking-wide">Spacecraft</span>
          </button>

          {#if spacecraftBrowserOpen}
            <SpacecraftBrowser
              spacecraft={spacecraftList}
              onSelect={(craft) => { onSpacecraftSelect(craft); spacecraftBrowserOpen = false; }}
              onClose={() => (spacecraftBrowserOpen = false)}
            />
          {/if}
        </div>
        <ShareButton {bodySystem} />
      </div>
    </div>

    {#if sidebarOpen}
      <SidebarPanel
        {bodySystem}
        {targetIsEarth}
        {cameraMode}
        {surfaceViewActive}
        onSelectCameraMode={selectCameraMode}
        onSetSurfaceView={setSurfaceView}
      />
    {/if}

    <SceneDateOverlay {bodySystem} />
    <TimeControlBar {bodySystem} />
  {/if}
</div>

<style>
  .target-name {
    color: #d4a04a;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    letter-spacing: 0.05em;
  }
</style>
