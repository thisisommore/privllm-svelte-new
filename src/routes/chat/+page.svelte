<script lang="ts">
	import { globalStore } from '../../store.svelte';
	import { progress } from '$lib/xxdk/index.svelte';
	import { SERVER_PUB_CREDS } from '$lib/api/contants';

	const newChat = async () => {
		await globalStore.xxdk!.newChat();
	};
	let messageInput = $state('');
	let messageEl: HTMLDivElement;
</script>

<div class="h-full overflow-hidden bg-(--bg) font-sans text-(--fg)">
	<div class="grid h-screen grid-cols-[280px_1fr]">
		<!-- Sidebar -->
		<aside class="flex flex-col border-r border-(--line) bg-(--bg-sunken)">
			<div class="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1.5">
				<div class="flex flex-col gap-0.75 px-1 pt-2 pb-0.5">
					<button
						class="flex w-full cursor-pointer items-center gap-2.5 rounded-[5px] border border-(--line-2) bg-(--bg-elev) px-2.5 py-1.75 text-left text-[13px] leading-tight text-(--fg-2) transition-all duration-150 hover:border-(--line) hover:bg-(--bg-elev-2) hover:text-(--fg)"
						onclick={newChat}
					>
						<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">+ new chat</span>
					</button>
					{#each globalStore.xxdk!.chats as c, i (c.id)}
						{@const isActive = globalStore.xxdk!.activeChatId === c.id}
						<button
							class={[
								'flex w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-2.5 py-1.75 text-left text-[13px] leading-tight transition-all duration-150',
								isActive
									? 'relative border-(--fg) bg-(--fg) font-medium text-(--bg)'
									: 'border-(--line-2) bg-(--bg-elev) text-(--fg-2) hover:border-(--line) hover:bg-(--bg-elev-2) hover:text-(--fg)'
							]}
							onclick={() => {
								globalStore.xxdk?.loadChat(i);
							}}
						>
							{#if isActive}
								<span class="absolute top-1 bottom-1 -left-1.5 w-0.5 rounded-sm bg-(--fg)"></span>
							{/if}
							<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{c.title}</span>
						</button>
					{/each}
				</div>
				<div class="h-4"></div>
			</div>

			<!-- Search -->
			<button
				class="mx-2 mb-0 flex h-9 cursor-text items-center gap-2 rounded-md border border-(--line) bg-(--bg-elev) px-3 text-left text-[13px] text-(--fg-3) transition-all duration-150"
				title="Search"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">Search chats…</span>
				<span
					class="rounded-[3px] border border-(--line) bg-(--bg) px-1.25 py-px font-mono text-[10px] text-(--fg-4)"
					>⌘K</span
				>
			</button>

			<!-- Wallet card -->
			<div
				class="mx-2 mt-2 mb-3.5 flex flex-col overflow-hidden rounded-lg border border-(--line) bg-(--bg-elev)"
			>
				<div class="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5">
					<span class="font-serif text-sm tracking-tight text-(--fg) italic">Wallet</span>
					<div class="flex items-center gap-2">
						<button
							class="cursor-pointer rounded-full border border-[color-mix(in_oklch,var(--line)_35%,oklch(55%_0.18_25)_65%)] bg-(--bg) px-2.5 py-1 font-mono text-[10px] text-[oklch(52%_0.18_25)] lowercase transition-all duration-150 hover:border-[oklch(52%_0.22_25)] hover:bg-[color-mix(in_oklch,var(--bg-elev)_75%,oklch(55%_0.22_25)_12%)] hover:text-[oklch(46%_0.22_25)]"
						>
							disconnect
						</button>
					</div>
				</div>
				<button
					class="relative flex w-full cursor-pointer items-center justify-between gap-2.5 overflow-hidden border-t border-(--line) px-3.5 py-2.5 pb-2.75 text-left font-mono text-[11px] tracking-tight text-(--fg) transition-all duration-150 hover:bg-(--bg-elev-2)"
				>
					<span class="inline-flex shrink-0 items-center gap-1">
						<span class="font-mono text-xs font-medium tracking-tight">12.45</span>
						<span class="font-mono text-[10px] tracking-widest text-(--fg-3) uppercase">XX</span>
					</span>
					<span class="min-w-2 flex-1"></span>
					<span class="relative inline-flex shrink-0 items-center overflow-hidden">
						<span
							class="font-mono text-[11px] tracking-tight whitespace-nowrap text-(--fg) transition-all duration-150"
							>0x7a3f…9c2b</span
						>
					</span>
				</button>
			</div>
		</aside>

		<!-- Main chat -->
		<main class="relative flex h-full min-h-0 min-w-0 flex-col bg-(--bg)">
			<!-- Messages -->
			<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
				<div class="flex flex-1 flex-col pb-40">
					<div class="min-h-0 flex-1"></div>
					<div class="flex flex-none flex-col">
						{#each globalStore.xxdk?.messages as message (message.id)}
							{#if message.sender_pub_key == SERVER_PUB_CREDS.pubKey.toBase64()}
								<!-- AI message -->
								<div class="group relative cursor-pointer bg-(--bg-elev)">
									<div class="mx-auto max-w-185 px-7 py-6">
										<div
											class="mb-2.5 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.14em] uppercase"
										>
											<span class="inline-flex items-center gap-2 font-medium text-(--fg)"
												>privllm</span
											>
											<span class="font-normal text-(--fg-3)"
												>{new Date(message.timestamp).toLocaleTimeString()}</span
											>
											<span class="h-px flex-1 bg-(--line)"></span>
										</div>
										<div
											class="text-[15px] leading-[1.65] tracking-[-0.003em] text-(--fg)"
											bind:this={messageEl}
										>
											{@html message.text}
										</div>
										<div
											class="mt-3.5 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										>
											<button
												class="inline-flex h-6 cursor-pointer items-center gap-1.25 rounded-full border border-(--line) bg-transparent px-2 text-[11px] text-(--fg-3) transition-all duration-150 hover:border-(--fg) hover:text-(--fg)"
												onclick={() => {
													navigator.clipboard.writeText(messageEl.textContent);
												}}
											>
												<svg
													width="12"
													height="12"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
													<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
												</svg>
												<span class="text-[11px]">Copy</span>
											</button>
										</div>
									</div>
								</div>
							{:else}
								<!-- User message -->
								<div class="relative cursor-pointer bg-transparent">
									<div class="mx-auto max-w-185 px-7 py-6">
										<div
											class="mb-2.5 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.14em] uppercase"
										>
											<span class="inline-flex items-center gap-2 font-medium text-(--fg)">You</span
											>
											<span class="font-normal text-(--fg-3)"
												>{new Date(message.timestamp).toLocaleTimeString()}</span
											>
											<span class="h-px flex-1 bg-(--line)"></span>
										</div>
										<div class="text-[15px] leading-[1.65] tracking-[-0.003em] text-(--fg)">
											{message.text}
										</div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>

			<!-- Composer -->
			<div
				class="pointer-events-none absolute right-0 bottom-0 left-0 bg-linear-to-t from-(--bg) from-70% to-transparent px-7 pb-6"
			>
				<div
					class="pointer-events-auto relative mx-auto max-w-185 rounded-[14px] border border-(--line) bg-(--bg-elev) pt-3 pr-3 pb-2.5 pl-4 shadow-(--shadow) transition-colors duration-150"
				>
					<textarea
						class="max-h-75 min-h-6 w-full resize-none border-0 bg-transparent px-0 py-1 font-sans text-[15px] leading-normal text-(--fg) outline-none"
						rows="1"
						placeholder="Ask anything - type / for commands"
						bind:value={messageInput}
					></textarea>
					<div class="mt-1.5 flex items-center justify-between">
						<div class="flex items-center gap-0.5">
							<button
								class="inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-md text-(--fg-3) transition-all duration-150 hover:bg-(--bg-elev-2) hover:text-(--fg)"
								title="Slash commands"
							>
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 4v16" />
									<path d="M4 12h16" />
								</svg>
							</button>
						</div>
						<button
							class="inline-flex h-7.5 cursor-pointer items-center gap-2.5 rounded-md bg-(--fg) px-3 text-xs font-medium text-(--bg) transition-opacity duration-150"
							onclick={() => {
								globalStore.xxdk?.send(messageInput, SERVER_PUB_CREDS);
								messageInput = '';
							}}
						>
							Send
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M12 19V5" />
								<path d="m5 12 7-7 7 7" />
							</svg>
						</button>
					</div>
				</div>
				<div
					class="pointer-events-auto mx-auto mt-2.5 flex max-w-185 items-center justify-between px-1 font-mono text-[10px] text-(--fg-3)"
				>
					<div class="flex gap-3">
						<span class="group relative cursor-default">
							<span
								class={[
									'inline-block h-1.25 w-1.25 rounded-full',
									progress.isHealthy && 'bg-green-500',
									!progress.isHealthy && 'bg-orange-400'
								]}
							></span>
							{progress.isHealthy ? 'Connected' : 'Disconnected'}
						</span>
					</div>
					<div>
						<span>↵ send · ⇧↵ newline · / commands</span>
					</div>
				</div>
			</div>
		</main>
	</div>
</div>
