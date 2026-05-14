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
    timeSub = PubSub.subscribe(SYSTEM_TIME_TOPIC, (_msg: any, nextTimeMs: number) => {
      timeMs = nextTimeMs;
    });
    displaySub = PubSub.subscribe(TIME_DISPLAY_TOPIC, (_msg: any, mode: TimeDisplay) => {
      display = mode;
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(timeSub);
    PubSub.unsubscribe(displaySub);
  });

  function pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  function localZoneAbbrev(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date);
    return parts.find(part => part.type === 'timeZoneName')?.value ?? 'LOCAL';
  }

  function format(ms: number, mode: TimeDisplay): string {
    const date = new Date(ms);
    if (mode === 'utc') {
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${localZoneAbbrev(date)}`;
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
