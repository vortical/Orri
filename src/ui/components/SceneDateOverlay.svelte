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

<div
  class="absolute top-3 left-3 px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white/85 font-mono text-xs sm:text-sm tracking-wide pointer-events-none select-none"
>
  {format(timeMs, display)}
</div>
