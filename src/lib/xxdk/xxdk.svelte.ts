import { getDb, notifyTableChanged, type DmMessage } from "$lib/db"
import { logger } from "$lib/logger"
import { setTimeoutPromise } from "$lib/utils"
import { decodeDmText } from '$lib/xxdk/coding';

import xxdk from 'xxdk-wasm';
const { createKVStore, GetDefaultNDF, dmIndexedDbWorkerPath, } = xxdk
import { type CMix, type DatabaseCipher, type DMClient, type XXDKUtils } from "xxdk-wasm"
import { progress } from "./index.svelte";
import { liveQuery, type Subscription } from "dexie";

const ErrIncorrectPassword = new Error("Incorrect password")
const storageDir = 'privllm'
const getCMixxParams = (baseParams: Uint8Array<ArrayBufferLike>) => {
    // Enable immediate sending (matches speakeasy-web v0.4)
    const decoded = JSON.parse(new TextDecoder().decode(baseParams));
    decoded.Network.EnableImmediateSending = true;
    const encodedParams = new TextEncoder().encode(JSON.stringify(decoded));
    return encodedParams
}

type ChatsStorage = {
    //base64
    raw: string
    title: string
    id: string
}[]

type Notifications = Awaited<ReturnType<XXDKUtils["LoadNotificationsDummy"]>>
export class XXDK {
    static decoder = new TextDecoder();

    cmix: CMix
    utils: XXDKUtils
    dm: DMClient | undefined
    notifications: Notifications;
    dbCipher: DatabaseCipher;
    chats = $state<ChatsStorage>([])
    activeChatId = $state("")
    constructor(cmix: CMix, utils: XXDKUtils, notifications: Notifications, dbCipher: DatabaseCipher, chats: ChatsStorage = []) {
        this.cmix = cmix
        this.utils = utils
        this.notifications = notifications
        this.dbCipher = dbCipher
        this.chats = chats
    }
    static async new(password: string) {
        return XXDK.setupXXDK(true, password)
    }
    static async load(password: string) {
        return XXDK.setupXXDK(false, password)
    }

    static async setupXXDK(newCmix: boolean, password: string) {
        xxdk.setXXDKBasePath(`${window.location.origin}/xxdk-wasm`);

        await createKVStore(storageDir);
        const utils = await xxdk.InitXXDK();
        let encryptedPassword: Uint8Array<ArrayBufferLike>
        try {
            encryptedPassword = await utils.GetOrInitPassword(password);
        } catch (error) {
            if ((error as Error).message.includes("could not decrypt internal password: cannot decrypt with password: chacha20poly1305: message authentication failed")) {
                throw ErrIncorrectPassword
            }
            throw error
        }

        if (newCmix)
            await utils.NewCmix(GetDefaultNDF(), storageDir, encryptedPassword, '');

        progress.status = 'loading cmix...';

        const cmix = await utils.LoadCmix(
            storageDir,
            encryptedPassword,
            getCMixxParams(utils.GetDefaultCMixParams())
        );


        progress.status = 'starting network follower...';
        await cmix.StartNetworkFollower(50000);
        progress.status = 'waiting for network...';

        if (newCmix)
            await cmix.WaitForNetwork(10 * 60 * 1000);
        cmix.AddHealthCallback({
            Callback: healthy => progress.isHealthy = healthy
        });

        const notifications = await utils!.LoadNotificationsDummy(cmix.GetID());

        const dbCipher = await utils!.NewDatabaseCipher(
            cmix.GetID(),
            encryptedPassword!,
            725
        );

        if (newCmix) {
            let statusResult = await cmix.GetNodeRegistrationStatus();
            while (!(statusResult && statusResult instanceof Uint8Array && statusResult.length > 0)) {
                statusResult = await cmix.GetNodeRegistrationStatus();
                await setTimeoutPromise(5_000);
            }

            const report = JSON.parse(XXDK.decoder.decode(statusResult));
            const registered = report.NumberOfNodesRegistered;
            const total = report.NumberOfNodes;
            progress.status = `Node registration progress: ${registered}/${total}`;

            if (total > 0 && registered / total >= 0.2) {
                progress.status = `Node registration threshold met: ${registered}/${total}`;
            }
        }

        progress.status = `EKV get`;
        if (!newCmix) {
            const encoded = await cmix.EKVGet("xxdk-store")
            const chats = JSON.parse(XXDK.decoder.decode(encoded)) as ChatsStorage;
            progress.status = `EKV get done`;

            return new XXDK(cmix, utils, notifications, dbCipher, chats)
        }
        return new XXDK(cmix, utils, notifications, dbCipher)
    }



    async EKVGet(key: string) {
        try {
            return await this.cmix.EKVGet(key)
        } catch (error) {
            if ((error as Error).message.includes("file does not exist")) {
                logger.log("well error but we handled it", error)
                return undefined
            }
            throw error
        }
    }

    async makeDMClient(auth: Uint8Array<ArrayBufferLike>) {
        return this.utils.NewDMClientWithIndexedDb(
            this.cmix.GetID(),
            this.notifications.GetID(),
            this.dbCipher.GetID(),
            (await dmIndexedDbWorkerPath()).toString(),
            auth,
            {
                EventUpdate: (eventType: number, data: unknown) => {
                    logger.log({ eventType, data });

                    // DmMessageReceived = 3000 — WASM has just written a new
                    // message row to IndexedDB. Poke Dexie's storagemutated
                    // event so any liveQuery on the messages table re-runs.
                    if (eventType === 3000) {
                        getDb(this.dm!.GetDatabaseName()).then((db) => {
                            notifyTableChanged(db, 'messages');
                        });
                    }
                }
            }
        );
    }

    messages = $state<DmMessage[]>([])
    sub: Subscription | undefined
    // Decode encrypted rows into display rows. Runs whenever the live query emits.
    private async decodeRows(rows: DmMessage[]) {
        this.messages = await Promise.all(
            rows.map(async (row) => ({
                ...row,
                text: await decodeDmText(row.text)
            }))
        );
    }

    private async syncMessages() {
        if (this.sub)
            this.sub.unsubscribe()
        const db = await getDb(this.dm!.GetDatabaseName());
        this.sub = liveQuery(() => db.messages.toArray()).subscribe((rows) => this.decodeRows(rows));
    }

    async newChat() {
        const raw = await this.utils!.GenerateChannelIdentity(this.cmix.GetID());
        const id = crypto.randomUUID()
        this.chats.push({ raw: raw.toBase64(), title: new Date().toDateString(), id: id })
        this.activeChatId = id
        const encoded = new TextEncoder().encode(JSON.stringify(this.chats));
        await this.cmix.EKVSet("xxdk-store", encoded)
        this.dm = await this.makeDMClient(raw)
        this.syncMessages()
    }

    async loadChat(i: number) {
        this.dm = await this.makeDMClient(Uint8Array.fromBase64(this.chats[i].raw))
        this.syncMessages()
        this.activeChatId = this.chats[i].id
    }

    async send(message: string, recipient: { pubKey: Uint8Array<ArrayBuffer>; token: number; }) {
        let i = 0;
        while (!await this.cmix.ReadyToSend()) {
            logger.log(++i, 'not ready to send, waiting...', await this.cmix.ReadyToSend());
            progress.status = `not ready to send, waiting... (${i})`;
            setTimeoutPromise(5000)
        }
        if (await this.cmix.ReadyToSend()) {
            progress.status = `sending`;
            try {
                await this.dm!.SendText(
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
    }
}
