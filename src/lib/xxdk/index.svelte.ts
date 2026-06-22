import { getDb, notifyTableChanged } from '$lib/db';
const decoder = new TextDecoder();
import { logger } from "$lib/logger"
import { resolve } from '$app/paths';
import { goto } from '$app/navigation';

const setTimeoutPromise = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type XXDKChat = {
    send: (message: string, recipient: { pubKey: Uint8Array<ArrayBuffer>, token: number }) => Promise<void>;
    live: () => Promise<void>
}
type XXDK = {
    newChat: () => Promise<XXDKChat>;
}
import xxdk from 'xxdk-wasm';
import { xxdkStore } from '../../store';
const { createKVStore, GetDefaultNDF, dmIndexedDbWorkerPath } = xxdk;
class Progress {
    status = $state('')
    isHealthy = $state(false)
}
export const progress = new Progress();

const storageDir = 'privllm'
export const initXXDK = async (): Promise<XXDK> => {
    xxdk.setXXDKBasePath(`${window.location.origin}/xxdk-wasm`);

    await createKVStore(storageDir);
    xxdkStore.utils = await xxdk.InitXXDK();
    xxdkStore.encryptedPassword = await xxdkStore.utils.GetOrInitPassword('password');

    await xxdkStore.utils.NewCmix(GetDefaultNDF(), storageDir, xxdkStore.encryptedPassword, '');

    const params = xxdkStore.utils.GetDefaultCMixParams();
    // Enable immediate sending (matches speakeasy-web v0.4)
    const decoded = JSON.parse(decoder.decode(params));
    decoded.Network.EnableImmediateSending = true;
    const encodedParams = new TextEncoder().encode(JSON.stringify(decoded));
    progress.status = 'loading cmix...';

    xxdkStore.cmix = await xxdkStore.utils.LoadCmix(
        storageDir,
        xxdkStore.encryptedPassword,
        encodedParams
    );
    progress.status = 'starting network follower...';
    await xxdkStore.cmix.StartNetworkFollower(50000);
    progress.status = 'waiting for network...';

    await xxdkStore.cmix.WaitForNetwork(10 * 60 * 1000);
    xxdkStore.cmixId = xxdkStore.cmix.GetID();
    xxdkStore.cmix.AddHealthCallback({
        Callback: healthy => progress.isHealthy = healthy
    });

    const notifications = await xxdkStore.utils!.LoadNotificationsDummy(xxdkStore.cmixId!);

    xxdkStore.dbCipher = await xxdkStore.utils!.NewDatabaseCipher(
        xxdkStore.cmixId!,
        xxdkStore.encryptedPassword!,
        725
    );


    await setTimeoutPromise(10_000);
    let statusResult = await xxdkStore.cmix!.GetNodeRegistrationStatus();
    while (!(statusResult && statusResult instanceof Uint8Array && statusResult.length > 0)) {
        statusResult = await xxdkStore.cmix!.GetNodeRegistrationStatus();
        await setTimeoutPromise(5_000);
    }

    const report = JSON.parse(decoder.decode(statusResult));
    const registered = report.NumberOfNodesRegistered;
    const total = report.NumberOfNodes;
    progress.status = `Node registration progress: ${registered}/${total}`;
    logger.log(`[privllm] Node registration progress: ${registered}/${total} nodes`);

    if (total > 0 && registered / total >= 0.2) {
        progress.status = `Node registration threshold met: ${registered}/${total}`;
        logger.log(`[privllm] Node registration threshold met (${0.2})`);
    }

    async function newChat(): Promise<XXDKChat> {
        const raw = await xxdkStore.utils!.GenerateChannelIdentity(xxdkStore.cmixId!);

        xxdkStore.dm = await xxdkStore.utils!.NewDMClientWithIndexedDb(
            xxdkStore.cmixId!,
            notifications.GetID(),
            xxdkStore.dbCipher!.GetID(),
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

        return {
            send: async (message, recipent) => {
                let i = 0;
                const intervalA = setInterval(async () => {
                    if (await xxdkStore.cmix!.ReadyToSend()) {
                        clearInterval(intervalA);
                        progress.status = `ready to send`;
                        progress.status = `sending`;
                        try {
                            await xxdkStore.dm!.SendText(
                                recipent.pubKey,
                                recipent.token,
                                message,
                                30_000,
                                new Uint8Array()
                            )
                            progress.status = `Message sent!`;
                            await goto(resolve('/chat'));
                        } catch (error) {
                            progress.status = 'message sent failed';
                        }
                        return
                    }

                    logger.log(++i, 'not ready to send, waiting...', await xxdkStore.cmix!.ReadyToSend());
                    progress.status = `not ready to send, waiting... (${i})`;
                }, 5000)
            },
            live: async () => { }
        }
    }
    return {
        newChat: newChat
    }
}
