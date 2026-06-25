import type { XXDK } from "$lib/xxdk/xxdk.svelte";


class GlobalStore {
    xxdk: XXDK | undefined = undefined
}
export const globalStore = new GlobalStore();