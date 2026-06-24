import type { XXDK } from "$lib/xxdk/xxdk.svelte";


class GlobalStore {
    selectedChat: number = 0
    xxdk: XXDK | undefined = undefined
}
export const globalStore = new GlobalStore();