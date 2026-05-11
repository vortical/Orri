<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodySystem } from '../../scene/BodySystem';
  import { ShadowType } from '../../domain/models';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let castShadows = $state(true);
  let shadowType = $state<ShadowType>(ShadowType.Penumbra);

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

<div class="flex flex-col gap-2">
  <label class="apollo-row">
    <span class="apollo-label">Cast shadows</span>
    <input
      type="checkbox"
      class="apollo-toggle"
      checked={castShadows}
      onchange={onCastShadows}
    />
  </label>

  <label class="apollo-row">
    <span class="apollo-label">Shadow type</span>
    <select class="apollo-select" value={shadowType} onchange={onShadowType}>
      <option value={ShadowType.Umbra}>Umbra</option>
      <option value={ShadowType.Penumbra}>Penumbra</option>
    </select>
  </label>
</div>
