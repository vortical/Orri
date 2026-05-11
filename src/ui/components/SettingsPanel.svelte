<script lang="ts">
  import Settings from 'lucide-svelte/icons/settings';
  import type { BodySystem } from '../../scene/BodySystem';
  import ViewSection from './ViewSection.svelte';
  import LabelsSection from './LabelsSection.svelte';
  import ShadowsSection from './ShadowsSection.svelte';
  import CameraSection from './CameraSection.svelte';
  import OrbitsSection from './OrbitsSection.svelte';
  import ToolsSection from './ToolsSection.svelte';

  type Props = {
    bodySystem: BodySystem;
  };

  let { bodySystem }: Props = $props();

  let open = $state(false);

  // Track which section is expanded. VIEW open by default.
  let sectionsOpen = $state<Record<string, boolean>>({ view: true });

  function toggleSection(key: string) {
    sectionsOpen[key] = !sectionsOpen[key];
  }

  function closePanel() {
    open = false;
  }
</script>

<div class="relative pointer-events-auto">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-label="Settings"
    title="Settings"
    class="min-w-[40px] min-h-[40px] px-2.5 rounded-md bg-black/40 backdrop-blur-sm text-white/85 ring-1 ring-white/10 hover:bg-black/60 transition flex items-center justify-center"
  >
    <Settings size={16} strokeWidth={2} />
  </button>

  {#if open}
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      aria-label="Close settings"
      onclick={closePanel}
    ></button>

    <div
      class="absolute right-0 top-full mt-1 w-[min(92vw,320px)] max-h-[80vh] overflow-y-auto rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-50"
    >
      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.view}
          onclick={() => toggleSection('view')}
        >
          <span>View</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.view}
          <div class="apollo-section-body">
            <ViewSection {bodySystem} />
          </div>
        {/if}
      </div>

      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.camera}
          onclick={() => toggleSection('camera')}
        >
          <span>Camera</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.camera}
          <div class="apollo-section-body">
            <CameraSection {bodySystem} />
          </div>
        {/if}
      </div>

      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.labels}
          onclick={() => toggleSection('labels')}
        >
          <span>Labels</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.labels}
          <div class="apollo-section-body">
            <LabelsSection {bodySystem} />
          </div>
        {/if}
      </div>

      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.orbits}
          onclick={() => toggleSection('orbits')}
        >
          <span>Orbits</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.orbits}
          <div class="apollo-section-body">
            <OrbitsSection {bodySystem} />
          </div>
        {/if}
      </div>

      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.shadows}
          onclick={() => toggleSection('shadows')}
        >
          <span>Shadows</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.shadows}
          <div class="apollo-section-body">
            <ShadowsSection {bodySystem} />
          </div>
        {/if}
      </div>

      <div class="apollo-section">
        <button
          type="button"
          class="apollo-section-header"
          aria-expanded={sectionsOpen.tools}
          onclick={() => toggleSection('tools')}
        >
          <span>Tools</span>
          <span class="apollo-section-chevron" aria-hidden="true"></span>
        </button>
        {#if sectionsOpen.tools}
          <div class="apollo-section-body">
            <ToolsSection {bodySystem} />
          </div>
        {/if}
      </div>

    </div>
  {/if}
</div>
