<script lang="ts">
	import { progress } from '$lib/xxdk/index.svelte';
	type Props = {
		onDoneClick: () => void;
		password: string;
	};
	let { onDoneClick, password = $bindable() }: Props = $props();
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<input type="text" placeholder="password" bind:value={password} />
	<button onclick={onDoneClick}>Done</button>

	<div class="m-4 border-[0.1px] border-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 border-[0.1px] border-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>
</div>
