import { getDb, notifyTableChanged } from '$lib/db';
const decoder = new TextDecoder();
import { logger } from "$lib/logger"

import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import xxdk from 'xxdk-wasm';
import { xxdkStore } from '../../store';
import { SERVER_PUB_CREDS } from './contants';
const { createKVStore, GetDefaultNDF, dmIndexedDbWorkerPath } = xxdk;
class Progress {
    value = $state('')
}
export const progress = new Progress();
export const initWasm = async () => {
    xxdk.setXXDKBasePath(`${window.location.origin}/xxdk-wasm`);

    await createKVStore('privllm');
    xxdkStore.utils = await xxdk.InitXXDK();
    xxdkStore.encryptedPassword = await xxdkStore.utils.GetOrInitPassword('password');

    await xxdkStore.utils.NewCmix(GetDefaultNDF(), 'privllm', xxdkStore.encryptedPassword, '');

    const params = xxdkStore.utils.GetDefaultCMixParams();
    // Enable immediate sending (matches speakeasy-web v0.4)
    const decoded = JSON.parse(decoder.decode(params));
    decoded.Network.EnableImmediateSending = true;
    const encodedParams = new TextEncoder().encode(JSON.stringify(decoded));
    progress.value = 'loading cmix...';

    xxdkStore.cmix = await xxdkStore.utils.LoadCmix(
        'privllm',
        xxdkStore.encryptedPassword,
        encodedParams
    );
    progress.value = 'starting network follower...';
    await xxdkStore.cmix.StartNetworkFollower(50000);
    progress.value = 'waiting for network...';

    await xxdkStore.cmix.WaitForNetwork(10 * 60 * 1000);
    xxdkStore.cmixId = xxdkStore.cmix.GetID();
    // xxdkStore.cmix.AddHealthCallback({
    //     Callback: (healthy: boolean) => {
    //         progress.value = healthy ? 'connected' : 'disconnected';
    //     }
    // });
    setTimeout(() => {
        const interval = setInterval(async () => {
            const statusResult = await xxdkStore.cmix!.GetNodeRegistrationStatus();
            if (statusResult && statusResult instanceof Uint8Array && statusResult.length > 0) {
                const report = JSON.parse(decoder.decode(statusResult));
                const registered = report.NumberOfNodesRegistered ?? 0;
                const total = report.NumberOfNodes ?? 1;
                progress.value = `Node registration progress: ${registered}/${total}`;
                logger.log(`[privllm] Node registration progress: ${registered}/${total} nodes`);

                if (total > 0 && registered / total >= 0.2) {
                    progress.value = `Node registration threshold met: ${registered}/${total}`;
                    logger.log(`[privllm] Node registration threshold met (${0.2})`);
                    clearInterval(interval);
                    initChat();
                }
            }
        }, 5000)
    }, 10_000)
};


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
        const raw = await xxdkStore.utils.GenerateChannelIdentity(xxdkStore.cmixId);
        const notifications = await xxdkStore.utils.LoadNotificationsDummy(xxdkStore.cmixId);
        let i = 0;
        const intervalA = setInterval(async () => {
            if (await xxdkStore.cmix!.ReadyToSend()) {
                clearInterval(intervalA);
                progress.value = `ready to send`;

                xxdkStore.dbCipher = await xxdkStore.utils!.NewDatabaseCipher(
                    xxdkStore.cmixId!,
                    xxdkStore.encryptedPassword!,
                    725
                );
                xxdkStore.dm = await xxdkStore.utils!.NewDMClientWithIndexedDb(
                    xxdkStore.cmixId!,
                    notifications.GetID(),
                    xxdkStore.dbCipher.GetID(),
                    (await dmIndexedDbWorkerPath()).toString(),
                    raw,
                    {
                        EventUpdate: (eventType: number, data: unknown) => {
                            logger.log({ eventType, data });

                            // DmMessageReceived = 3000 — WASM has just written a new
                            // message row to IndexedDB. Poke Dexie's storagemutated
                            // event so any liveQuery on the messages table re-runs.
                            if (eventType === 3000) {
                                getDb(xxdkStore.dm!.GetDatabaseName()).then((db) => {
                                    notifyTableChanged(db, 'messages');
                                });
                            }
                        }
                    }
                );
                progress.value = `sending`;
                try {
                    await xxdkStore.dm.SendText(
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

