<script lang="ts">
  import Settings from 'lucide-svelte/icons/settings';
  import type { BodySystem } from '../../scene/BodySystem';
  import type GUI from 'lil-gui';
  import FOVControl from './FOVControl.svelte';

  type Props = {
    bodySystem: BodySystem;
    gui?: GUI;
  };

  let { bodySystem, gui }: Props = $props();

  let open = $state(false);
  let advancedOpen = $state(false);

  function toggleAdvanced() {
    advancedOpen = !advancedOpen;
    if (!gui) return;
    if (advancedOpen) gui.show();
    else gui.hide();
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
      class="absolute right-0 top-full mt-1 w-[min(92vw,300px)] rounded-md bg-black/70 backdrop-blur-sm ring-1 ring-white/15 shadow-lg flex flex-col z-50 overflow-hidden"
    >
      <div class="px-3 py-2 border-b border-white/10 text-[10px] uppercase text-white/40 font-mono tracking-widest">
        View
      </div>
      <div class="px-3 py-2">
        <FOVControl {bodySystem} />
      </div>

      <div class="px-3 py-2 border-t border-white/10 flex items-center justify-between">
        <span class="text-[10px] uppercase text-white/40 font-mono tracking-widest">Advanced</span>
        <button
          type="button"
          onclick={toggleAdvanced}
          class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition text-[11px] font-mono text-white/85 uppercase tracking-wide"
        >
          {advancedOpen ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  {/if}
</div>
