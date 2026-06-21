<script lang="ts">
	import { initChat } from '$lib/api/chat';
	import { initWasm, progress } from '$lib/xxdk/index.svelte';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<button
		onclick={async () => {
			await initWasm();
			initChat();
		}}>Done</button
	>

	<div class="m-4 bg-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 bg-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>
</div>
