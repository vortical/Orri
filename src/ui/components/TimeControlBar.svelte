<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PubSub from 'pubsub-js';
  import { TIME_SCALE_TOPIC } from '../../system/event-types';
  import type { BodySystem } from '../../scene/BodySystem';
  import { TimeUnit, formatPeriod, unitsToTimePeriod, timePeriodToUnits, timeEquals } from '../../system/time';
  import DateTimeInput from './DateTimeInput.svelte';
  import Play from 'lucide-svelte/icons/play';
  import Pause from 'lucide-svelte/icons/pause';
  import Calendar from 'lucide-svelte/icons/calendar';
  import Clock from 'lucide-svelte/icons/clock';

  type Props = { bodySystem: BodySystem };
  let { bodySystem }: Props = $props();

  // Discrete signed scale ladder (simulated seconds per real second).
  const ladder = [
    0,
    timePeriodToUnits({ seconds: 1 }, TimeUnit.Seconds),
    timePeriodToUnits({ seconds: 5 }, TimeUnit.Seconds),
    timePeriodToUnits({ seconds: 10 }, TimeUnit.Seconds),
    timePeriodToUnits({ seconds: 30 }, TimeUnit.Seconds),
    timePeriodToUnits({ minutes: 1 }, TimeUnit.Seconds),
    timePeriodToUnits({ minutes: 5 }, TimeUnit.Seconds),
    timePeriodToUnits({ minutes: 10 }, TimeUnit.Seconds),
    timePeriodToUnits({ minutes: 30 }, TimeUnit.Seconds),
    timePeriodToUnits({ hours: 1 }, TimeUnit.Seconds),
    timePeriodToUnits({ hours: 3 }, TimeUnit.Seconds),
    timePeriodToUnits({ hours: 6 }, TimeUnit.Seconds),
    timePeriodToUnits({ hours: 12 }, TimeUnit.Seconds),
    timePeriodToUnits({ days: 1 }, TimeUnit.Seconds),
    timePeriodToUnits({ days: 2 }, TimeUnit.Seconds),
    timePeriodToUnits({ days: 7 }, TimeUnit.Seconds),
    timePeriodToUnits({ days: 14 }, TimeUnit.Seconds),
    timePeriodToUnits({ days: 28 }, TimeUnit.Seconds),
  ];
  const N = ladder.length - 1;

  // Track positions of the ±1× anchors (percent from slider's left edge).
  const realtimeBackPct = ((-1 + N) / (2 * N)) * 100;
  const realtimeFwdPct = ((1 + N) / (2 * N)) * 100;

  function scaleToIndex(s: number): number {
    if (s === 0) return 0;
    
    const abs = Math.abs(s);
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < ladder.length; i++) {
      const diff = Math.abs(ladder[i] - abs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return Math.sign(s) * bestIdx;
  }

  function indexToScale(i: number): number {
    return Math.sign(i) * ladder[Math.abs(i)];
  }

  let paused = $state(false);
  let scale = $state(1);
  let sliderIndex = $state(0);
  let showDatePicker = $state(false);

  let scaleSub: any;

  onMount(() => {
    paused = bodySystem.isPaused();
    scale = bodySystem.getTimeScale();
    sliderIndex = scaleToIndex(scale);
    scaleSub = PubSub.subscribe(TIME_SCALE_TOPIC, (_msg: any, s: number) => {
      scale = s;
      sliderIndex = scaleToIndex(s);
      paused = bodySystem.isPaused();
    });
  });

  onDestroy(() => {
    PubSub.unsubscribe(scaleSub);
  });

  function onSliderInput(e: Event) {
    const idx = parseInt((e.target as HTMLInputElement).value, 10);
    sliderIndex = idx;
    bodySystem.setTimeScale(indexToScale(idx));
  }

  function togglePause() {
    bodySystem.setPaused(!bodySystem.isPaused());
    paused = bodySystem.isPaused();
  }

  function now() {
    const wallNow = new Date();
    const sysNow = new Date(bodySystem.clock.getTime());
    if (timeEquals(wallNow, sysNow, TimeUnit.Seconds)) return;
    const s = bodySystem.getTimeScale();
    bodySystem.setTimeScale(1);
    bodySystem.setSystemTime(wallNow);
    bodySystem.setTimeScale(s);
  }

  function onDateSet(d: Date) {
    bodySystem.setSystemTime(d);
    // Don't auto-close the editor here. Chromium fires `change` per field-commit, so
    // closing on first commit kicks the user out mid-edit. The user closes via the
    // Date button toggle.
  }

  let scaleText = $derived.by(() => {
    if (scale === 0) return '0×';
    const period = formatPeriod(unitsToTimePeriod(scale, TimeUnit.Seconds));
    return period ? `${period}/s` : `${scale.toLocaleString()}×`;
  });
</script>

<div class="fixed bottom-0 left-0 right-0 px-2 pb-2 sm:px-4 sm:pb-4 pointer-events-none z-40">
  <div
    class="mx-auto max-w-3xl flex flex-wrap items-center gap-2 bg-black/30 text-white rounded-xl p-2 pointer-events-auto ring-1 ring-white/10"
  >
    <button
      type="button"
      onclick={togglePause}
      class="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition flex items-center justify-center"
      aria-label={paused ? 'Play' : 'Pause'}
    >
      {#if paused}
        <Play size={18} strokeWidth={2} />
      {:else}
        <Pause size={18} strokeWidth={2} />
      {/if}
    </button>

    <div class="flex-1 min-w-[160px] flex flex-col items-stretch px-1">
      <div class="slider-wrap">
        <span class="tick" style="left: {realtimeBackPct}%" aria-hidden="true"></span>
        <span class="tick" style="left: {realtimeFwdPct}%" aria-hidden="true"></span>
        <input
          type="range"
          min={-N}
          max={N}
          step="1"
          value={sliderIndex}
          oninput={onSliderInput}
          class="apollo-slider w-full touch-pan-x"
          aria-label="Time scale"
        />
      </div>
      <div class="text-[11px] sm:text-xs text-center font-mono mt-0.5 truncate">
        {#if paused}
          <span class="paused-indicator text-[#d4a04a]">PAUSED</span>
          <!-- <span class="text-white/40">·</span> -->
        {/if}
        <span class="text-white/70">{scaleText}</span>
      </div>
    </div>

    <button
      type="button"
      onclick={now}
      aria-label="Now"
      title="Jump to current time"
      class="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition flex items-center justify-center gap-1 text-sm"
    >
      <Clock size={16} strokeWidth={2} />
      <span class="hidden sm:inline">Now</span>
    </button>

    <button
      type="button"
      onclick={() => (showDatePicker = !showDatePicker)}
      aria-expanded={showDatePicker}
      aria-label="Set date"
      title="Set scene date/time"
      class="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition flex items-center justify-center"
    >
      <Calendar size={18} strokeWidth={2} />
    </button>

    {#if showDatePicker}
      <div class="basis-full sm:basis-auto flex justify-end">
        <DateTimeInput value={new Date(bodySystem.clock.getTime())} onset={onDateSet} />
      </div>
    {/if}
  </div>
</div>

<style>
  /* Slider + tick chrome live in apollo-controls.css. */

  /* Steady-state warning light for the PAUSED indicator. */
  .paused-indicator {
    animation: blink 1.4s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
</style>
