<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { SYSTEM_TIME_TOPIC, TIME_DISPLAY_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';
  import type { TimeDisplay } from '../../system/time';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  let timeMs = $state(0);
  let display: TimeDisplay = $state('local');
  let timeSub: any;
  let displaySub: any;

  onMount(() => {
    timeMs = bodySystem.clock.getTime();
    display = bodySystem.getTimeDisplay();
    timeSub = PubSub.subscribe(SYSTEM_TIME_TOPIC, (_msg: any, t: number) => {
      timeMs = t;
    });
    displaySub = PubSub.subscribe(TIME_DISPLAY_TOPIC, (_msg: any, v: TimeDisplay) => {
      display = v;
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(timeSub);
    PubSub.unsubscribe(displaySub);
  });

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function localZoneAbbrev(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d);
    return parts.find(p => p.type === 'timeZoneName')?.value ?? 'LOCAL';
  }

  function format(ms: number, mode: TimeDisplay): string {
    const d = new Date(ms);
    if (mode === 'utc') {
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${localZoneAbbrev(d)}`;
  }
</script>

<div class="scene-date">
  {format(timeMs, display)}
</div>

<style>
  .scene-date {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 112px;
    text-align: center;
    pointer-events: none;
    user-select: none;
    color: rgba(255, 255, 255, 0.85);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-shadow:
      1px 1px 3px rgba(0, 0, 0, 0.95),
      0 0 1em rgba(0, 0, 0, 0.95),
      0 0 0.2em rgba(0, 0, 0, 0.95);
    z-index: 30;
  }
</style>
