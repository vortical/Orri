<script lang="ts">
  import Share2 from 'lucide-svelte/icons/share-2';
  import LocationBar from '../LocationBar';
  import type { BodySystem } from '../../scene/BodySystem';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let toast = $state<{ message: string; error: boolean } | undefined>(undefined);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  async function share() {
    LocationBar.pushState(bodySystem.getState());
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Copied', false);
    } catch {
      showToast('Cannot copy', true);
    }
  }

  function showToast(message: string, error: boolean) {
    if (toastTimer) clearTimeout(toastTimer);
    toast = { message, error };
    toastTimer = setTimeout(() => {
      toast = undefined;
      toastTimer = undefined;
    }, 1500);
  }
</script>

<div class="relative pointer-events-auto">
  <button
    type="button"
    onclick={share}
    aria-label="Share scene link"
    title="Copy share link"
    class="min-w-[40px] min-h-[40px] px-2.5 rounded-md bg-black/40 backdrop-blur-sm text-white/85 ring-1 ring-white/10 hover:bg-black/60 transition flex items-center justify-center"
  >
    <Share2 size={16} strokeWidth={2} />
  </button>
  {#if toast}
    <span
      role="status"
      class="toast"
      class:toast-error={toast.error}
    >
      {toast.message}
    </span>
  {/if}
</div>

<style>
  .toast {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    color: #d4a04a;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: toast-fade 1.5s ease forwards;
  }
  .toast-error {
    color: rgb(239, 110, 110);
  }
  @keyframes toast-fade {
    0%, 80% { opacity: 1; }
    100% { opacity: 0; }
  }
</style>
