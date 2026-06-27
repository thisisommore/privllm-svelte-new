<script lang="ts">
	import { onMount } from 'svelte';
	import { globalStore } from '../../store.svelte';
	import { progress } from '$lib/xxdk/index.svelte';
	let timeAgo = $state('-');
	let timeAgoEvents = $state(['-', '-', '-', '-', '-']);
	function getTimeAgo(ts?: Date) {
		if (!ts) return '-';
		const diff = Date.now() - ts.getTime();
		const seconds = Math.floor(diff / 1000);
		if (seconds < 10) return 'just now';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		if (mins < 60) return `${mins}m`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h`;
		const days = Math.floor(hrs / 24);
		return `${days}d`;
	}
	onMount(() => {
		setInterval(() => {
			timeAgo = getTimeAgo(globalStore.xxdk?.upTime);
			for (let index = 0; index < 5; index++) {
				timeAgoEvents[index] = getTimeAgo(globalStore.xxdk?.events[index]?.time);
			}
		}, 1000);
	});
</script>

<div
	class="absolute right-0 bottom-[calc(100%+8px)] z-50 hidden w-[280px] flex-col rounded-[10px] border border-(--line) bg-(--bg-elev) p-3.5 px-4 shadow-(--shadow) group-hover:flex"
>
	<div
		class="mb-2.5 border-b border-(--line) pb-2 font-mono text-[10px] tracking-[0.12em] text-(--fg-3) uppercase"
	>
		Network Diagnostics
	</div>
	<div class="flex flex-col gap-[5px] py-1.5">
		<div class="flex items-center justify-between gap-2">
			<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
				>Status</span
			>
			<span
				class={[
					'text-right font-mono text-[11px]',
					progress.isHealthy ? ' text-green-500' : 'text-orange-400'
				]}
			>
				{globalStore.xxdk?.events.at(-1)?.event}
			</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
				>Uptime</span
			>
			<span class="text-right font-mono text-[11px] text-(--fg)">{timeAgo}</span>
		</div>
	</div>
	<div class="my-1 h-px bg-(--line-2)"></div>
	<div class="flex flex-col gap-[5px] py-1.5">
		<div class="flex items-center justify-between gap-2">
			<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
				>Transport</span
			>
			<span class="text-right font-mono text-[11px] text-(--fg)">cMix / xx network</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
				>Protocol</span
			>
			<span class="text-right font-mono text-[11px] text-(--fg)">elixxir DM</span>
		</div>
	</div>
	<div class="my-1 h-px bg-(--line-2)"></div>
	<div class="flex flex-col gap-[5px] py-1.5">
		<div class="flex items-center justify-between gap-2">
			<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
				>xxdk Version</span
			>
			<span class="text-right font-mono text-[11px] text-(--fg)"
				>{await globalStore.xxdk?.utils.GetClientVersion()}</span
			>
		</div>
	</div>
	<div class="my-1 h-px bg-(--line-2)"></div>
	<div class="flex flex-col gap-[5px] py-1.5">
		<div class="mb-1 font-mono text-[10px] tracking-[0.1em] text-(--fg-3) uppercase">
			Recent State Changes
		</div>
		{#each globalStore.xxdk?.events.toReversed() as e, idx (e.id)}
			<div class="flex items-center justify-between gap-2 opacity-80">
				<span class="shrink-0 font-mono text-[10px] tracking-[0.08em] text-(--fg-3) uppercase"
					>{e.event}</span
				>
				<span class="text-right font-mono text-[11px] text-(--fg)"
					>{timeAgoEvents[globalStore.xxdk!.events.length - idx - 1]}</span
				>
			</div>
		{/each}
	</div>
</div>
