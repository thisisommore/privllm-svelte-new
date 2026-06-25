<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';
	import { logger } from '$lib/logger';
	import { XXDK } from '$lib/xxdk/xxdk.svelte';
	import { onMount } from 'svelte';
	import { globalStore } from '../../store.svelte';
	import UI, { type Props } from './ui.svelte';
	let password = $state('');
	let confirmPassword = $state<Props['confirmPassword']>({
		input: '',
		showConfirmPassword: true
	});

	// prevents ui jump due to initial state setup
	let initiating = $state(true);

	onMount(() => {
		const initDone = localStorage.getItem('INIT_DONE');
		if (initDone == 'true') {
			confirmPassword.showConfirmPassword = false;
		}
		initiating = false;
	});

	let error = $state('');
</script>

<div>
	{#if !initiating}
		<UI
			onDoneClick={async () => {
				const initDone = localStorage.getItem('INIT_DONE');
				let xxdk: XXDK;

				if (initDone != 'true') {
					if (password != confirmPassword.input) {
						error = 'Password do not match :(';
						return;
					}
					xxdk = await XXDK.new(password);
					globalStore.xxdk = xxdk;
					logger.log('[privllm] initXXDK completed');
					localStorage.setItem('INIT_DONE', 'true');
					await xxdk.newChat();
					await xxdk.send('Hello from SvelteKit!', SERVER_PUB_CREDS);
				} else {
					logger.log('[privllm] loadXXDK starting');
					xxdk = await XXDK.load(password);
					globalStore.xxdk = xxdk;
					await xxdk.loadChat(0);
				}
				await goto(resolve('/chat'));
			}}
			bind:password
			bind:confirmPassword
			{error}
		/>
	{/if}
</div>
