<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { ShadowType } from '../../domain/models';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let castShadows = $state(true);
  let shadowType = $state<ShadowType>(ShadowType.Penumbra);
  let optionsOpen = $state(false);

  onMount(() => {
    castShadows = bodySystem.getShadowsEnabled();
    shadowType = bodySystem.getShadowType();
  });

  function onCastShadows(event: Event) {
    castShadows = (event.target as HTMLInputElement).checked;
    bodySystem.setShadowsEnabled(castShadows);
  }

  function onShadowType(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ShadowType;
    shadowType = value;
    bodySystem.setShadowType(value);
  }
</script>

<header class="apollo-section-header apollo-section-header-with-controls">
  <span class="apollo-section-title">Eclipses</span>
  <input
    type="checkbox"
    class="apollo-toggle"
    checked={castShadows}
    onchange={onCastShadows}
    aria-label="Eclipses"
  />
  <button
    type="button"
    class="apollo-options-toggle"
    aria-expanded={optionsOpen}
    aria-label={optionsOpen ? 'Hide options' : 'Show options'}
    onclick={() => (optionsOpen = !optionsOpen)}
  >
    <span class="apollo-options-chevron" aria-hidden="true"></span>
  </button>
</header>

{#if optionsOpen}
  <div class="apollo-section-body apollo-options-body" class:is-disabled={!castShadows}>
    <label class="apollo-row">
      <span class="apollo-label">Shadow type</span>
      <select class="apollo-select" value={shadowType} onchange={onShadowType}>
        <option value={ShadowType.Umbra}>Umbra</option>
        <option value={ShadowType.Penumbra}>Penumbra</option>
      </select>
    </label>
  </div>
{/if}
