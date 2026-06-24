import { getDb, notifyTableChanged, type DmMessage } from '$lib/db';
const decoder = new TextDecoder();
import { logger } from "$lib/logger"
import xxdk from 'xxdk-wasm';
import { globalStore, xxdkStore } from '../../store.svelte';
import { liveQuery } from 'dexie';
import { decodeDmText } from './coding';
import { setTimeoutPromise } from '$lib/utils';
const { createKVStore, GetDefaultNDF, dmIndexedDbWorkerPath } = xxdk;

type TXXDKChat = {
    send: (message: string, recipient: { pubKey: Uint8Array<ArrayBuffer>, token: number }) => Promise<void>;
    live: () => Promise<void>
}

class Progress {
    status = $state('')
    isHealthy = $state(false)
}
export const progress = new Progress();

const waitForNodeRegistrations = async () => {
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

    if (total > 0 && registered / total >= 0.2) {
        progress.status = `Node registration threshold met: ${registered}/${total}`;
    }
}

async function EKVGet(key: string) {
    try {
        return await xxdkStore.cmix!.EKVGet(key)
    } catch (error) {
        if ((error as Error).message.includes("file does not exist")) {
            logger.log("well error but we handled it", error)
            return undefined
        }
        throw error
    }
}

type ChatsStorage = {
    //base64
    raw: string
}[]
async function newChat(): Promise<XXDKChat> {
    const encodedFetch = await globalStore.xxdk?.EKVGet("xxdk-store")
    let chatsStorage: ChatsStorage = []
    if (encodedFetch) {
        chatsStorage = JSON.parse(decoder.decode(encodedFetch)) as ChatsStorage;
    }

    const raw = await xxdkStore.utils!.GenerateChannelIdentity(xxdkStore.cmixId!);
    chatsStorage.push({ raw: raw.toBase64() })
    const encoded = new TextEncoder().encode(JSON.stringify(chatsStorage));
    await xxdkStore.cmix!.EKVSet("xxdk-store", encoded)
    xxdkStore.dm = await xxdkStore.utils!.NewDMClientWithIndexedDb(
        xxdkStore.cmixId!,
        xxdkStore.notifications!.GetID(),
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

    xxdkStore.totalChats += 1

    return new XXDKChat()
}

async function loadChat(i: number): Promise<XXDKChat> {
    const encoded = await xxdkStore.cmix!.EKVGet("xxdk-store")
    const decoded = JSON.parse(decoder.decode(encoded)) as ChatsStorage;
    xxdkStore.totalChats = decoded.length

    xxdkStore.dm = await xxdkStore.utils!.NewDMClientWithIndexedDb(
        xxdkStore.cmixId!,
        xxdkStore.notifications!.GetID(),
        xxdkStore.dbCipher!.GetID(),
        (await dmIndexedDbWorkerPath()).toString(),
        Uint8Array.fromBase64(decoded[i].raw),
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

    return new XXDKChat()
}

async function totalChats() {
    const encoded = await xxdkStore.cmix!.EKVGet("xxdk-store")
    const decoded = JSON.parse(decoder.decode(encoded)) as ChatsStorage;
    return decoded.length
}
class XXDKChat implements TXXDKChat {
    messages = $state<DmMessage[]>([]);
    unsubscribe: (() => void) | undefined = undefined
    live = async () => {
        if (!xxdkStore.dm) return;
        const db = await getDb(xxdkStore.dm.GetDatabaseName());
        const sub = liveQuery(() => db.messages.toArray()).subscribe(async (rows) => {
            if (!xxdkStore.dbCipher) return;
            this.messages = await Promise.all(
                rows.map(async (row) => ({
                    ...row,
                    text: await decodeDmText(row.text)
                }))
            );
        });

        this.unsubscribe = () => sub.unsubscribe();
    }
    send = async (message: string, recipient: { pubKey: Uint8Array<ArrayBuffer>; token: number; }) => {
        let i = 0;
        const intervalA = setInterval(async () => {
            if (await xxdkStore.cmix!.ReadyToSend()) {
                clearInterval(intervalA);
                progress.status = `sending`;
                try {
                    await xxdkStore.dm!.SendText(
                        recipient.pubKey,
                        recipient.token,
                        message,
                        30_000,
                        new Uint8Array()
                    )
                    progress.status = `Message sent!`;
                } catch (error) {
                    progress.status = 'message sent failed';
                }
                return
            }

            logger.log(++i, 'not ready to send, waiting...', await xxdkStore.cmix!.ReadyToSend());
            progress.status = `not ready to send, waiting... (${i})`;
        }, 5000)
    }
}

export type XXDK = {
    newChat: () => Promise<XXDKChat>;
    loadChat: (i: number) => Promise<XXDKChat>;
    totalChats: () => Promise<number>
    EKVGet: (key: string) => Promise<Uint8Array | undefined>
}



const storageDir = 'privllm'

const getCMixxParams = () => {
    const params = xxdkStore.utils!.GetDefaultCMixParams();
    // Enable immediate sending (matches speakeasy-web v0.4)
    const decoded = JSON.parse(decoder.decode(params));
    decoded.Network.EnableImmediateSending = true;
    const encodedParams = new TextEncoder().encode(JSON.stringify(decoded));
    return encodedParams
}
export const initXXDK = async (): Promise<XXDK> => {
    xxdk.setXXDKBasePath(`${window.location.origin}/xxdk-wasm`);

    await createKVStore(storageDir);
    xxdkStore.utils = await xxdk.InitXXDK();
    xxdkStore.encryptedPassword = await xxdkStore.utils.GetOrInitPassword('password');

    await xxdkStore.utils.NewCmix(GetDefaultNDF(), storageDir, xxdkStore.encryptedPassword, '');

    progress.status = 'loading cmix...';

    xxdkStore.cmix = await xxdkStore.utils.LoadCmix(
        storageDir,
        xxdkStore.encryptedPassword,
        getCMixxParams()
    );
    progress.status = 'starting network follower...';
    await xxdkStore.cmix.StartNetworkFollower(50000);
    progress.status = 'waiting for network...';

    await xxdkStore.cmix.WaitForNetwork(10 * 60 * 1000);
    xxdkStore.cmixId = xxdkStore.cmix.GetID();
    xxdkStore.cmix.AddHealthCallback({
        Callback: healthy => progress.isHealthy = healthy
    });

    xxdkStore.notifications = await xxdkStore.utils!.LoadNotificationsDummy(xxdkStore.cmixId!);

    xxdkStore.dbCipher = await xxdkStore.utils!.NewDatabaseCipher(
        xxdkStore.cmixId!,
        xxdkStore.encryptedPassword!,
        725
    );


    await waitForNodeRegistrations()

    return {
        newChat: newChat,
        loadChat: loadChat,
        totalChats: totalChats,
        EKVGet: EKVGet
    }
}
export const loadXXDK = async (): Promise<XXDK> => {
    xxdk.setXXDKBasePath(`${window.location.origin}/xxdk-wasm`);
    await createKVStore(storageDir);

    xxdkStore.utils = await xxdk.InitXXDK();
    xxdkStore.encryptedPassword = await xxdkStore.utils.GetOrInitPassword('password');

    progress.status = 'loading cmix...';
    xxdkStore.cmix = await xxdkStore.utils.LoadCmix(storageDir, xxdkStore.encryptedPassword, getCMixxParams());

    progress.status = 'starting network follower...';
    await xxdkStore.cmix.StartNetworkFollower(50000);
    progress.status = 'waiting for network...';

    await xxdkStore.cmix.WaitForNetwork(10 * 60 * 1000);
    xxdkStore.cmixId = xxdkStore.cmix.GetID();
    xxdkStore.cmix.AddHealthCallback({
        Callback: healthy => progress.isHealthy = healthy
    });

    xxdkStore.notifications = await xxdkStore.utils!.LoadNotificationsDummy(xxdkStore.cmixId!);

    xxdkStore.dbCipher = await xxdkStore.utils!.NewDatabaseCipher(
        xxdkStore.cmixId!,
        xxdkStore.encryptedPassword!,
        725
    );

    await waitForNodeRegistrations()

    return {
        newChat: newChat,
        loadChat: loadChat,
        totalChats: totalChats,
        EKVGet: EKVGet
    }
}
