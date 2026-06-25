<script lang="ts">
	import { progress } from '$lib/xxdk/index.svelte';
	export type Props = {
		onDoneClick: () => void;
		password: string;
		confirmPassword: {
			input: string;
			showConfirmPassword: boolean;
		};
		error: string;
	};
	let {
		onDoneClick,
		password = $bindable(),
		confirmPassword = $bindable(),
		error
	}: Props = $props();
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<input type="text" placeholder="password" bind:value={password} />
	{#if confirmPassword.showConfirmPassword}
		<input type="text" placeholder="confirm password" bind:value={confirmPassword.input} />
	{/if}
	<button onclick={onDoneClick}>Done</button>

	<div class="m-4 border-[0.1px] border-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 border-[0.1px] border-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>

	{#if error}
		<div class="m-4 border-[0.1px] bg-red-200">
			Error: {error}
		</div>
	{/if}
</div>
