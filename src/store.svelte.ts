import type { XXDK } from "$lib/xxdk/index.svelte";
import type { CMix, XXDKUtils, DatabaseCipher, DMClient } from "xxdk-wasm";

class XXDKStore {
    utils: XXDKUtils | undefined = undefined;
    cmixId: number | undefined = undefined;
    cmix: CMix | undefined = undefined;
    encryptedPassword: Uint8Array | undefined = undefined;
    dbCipher: DatabaseCipher | undefined = undefined;
    notifications: Awaited<ReturnType<XXDKUtils["LoadNotificationsDummy"]>> | undefined = undefined
    dm: DMClient | undefined = undefined
    xxdk: XXDK | undefined = undefined
    totalChats: number = $state(0)
}

class ChatStore {
    selectedChat: number = 0
}
export const xxdkStore = new XXDKStore();
export const chatStore = new ChatStore();