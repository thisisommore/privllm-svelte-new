<script lang="ts">
	import { initWasm, progress } from '$lib/xxdk/index.svelte';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<h1>Password</h1>
	<input type="text" placeholder="Enter your password" />
	<br />
	<button onclick={initWasm}>Done</button>

	<div class="m-4 bg-green-500">
		Status: <span id="status">{progress.value}</span>
	</div>
</div>
