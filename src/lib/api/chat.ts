import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { logger } from "$lib/logger";
import { progress } from "$lib/xxdk/index.svelte";
import { xxdkStore } from "../../store";
import { SERVER_PUB_CREDS } from "./contants";

var initChatStarted = false;
export const initChat = async () => {
    if (
        xxdkStore.utils &&
        xxdkStore.cmixId != undefined &&
        xxdkStore.cmix &&
        xxdkStore.encryptedPassword &&
        !initChatStarted
    ) {
        initChatStarted = true;

        let i = 0;
        const intervalA = setInterval(async () => {
            if (await xxdkStore.cmix!.ReadyToSend()) {
                clearInterval(intervalA);
                progress.value = `ready to send`;
                progress.value = `sending`;
                try {
                    await xxdkStore.dm!.SendText(
                        SERVER_PUB_CREDS.pubKey,
                        SERVER_PUB_CREDS.token,
                        'Hello from SvelteKit!',
                        30_000,
                        new Uint8Array()
                    )
                    progress.value = `Message sent!`;
                    await goto(resolve('/chat'));
                } catch (error) {
                    progress.value = 'message sent failed';
                }
                return
            }

            logger.log(++i, 'not ready to send, waiting...', await xxdkStore.cmix!.ReadyToSend());
            progress.value = `not ready to send, waiting... (${i})`;
        }, 5000)
    }
};
