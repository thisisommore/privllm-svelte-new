<script lang="ts">
	import { initChat } from '$lib/api/chat';
	import { logger } from '$lib/logger';
	import { initXXDK, progress } from '$lib/xxdk/index.svelte';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<br />
	<button
		onclick={async () => {
			await initXXDK();
			logger.log('[privllm] initXXDK completed');
			initChat();
		}}>Done</button
	>

	<div class="m-4 border-[0.1px] border-green-500">
		Status: <span id="status">{progress.status}</span>
	</div>
	<div class="m-4 border-[0.1px] border-green-500">
		Network is: <span id="status">{progress.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
	</div>
</div>
