// import { Dexie } from 'dexie';
const decoder = new TextDecoder();

const log = (...message: unknown[]) => {
    console.log(`[privllm][xxdk]`, ...message);
};
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
    log('KV store ready before InitXXDK');
    xxdkStore.utils = await xxdk.InitXXDK();
    xxdkStore.encryptedPassword = await xxdkStore.utils.GetOrInitPassword('password');

    const rawNdf = GetDefaultNDF();

    await xxdkStore.utils.NewCmix(rawNdf, 'privllm', xxdkStore.encryptedPassword, '');

    const params = xxdkStore.utils.GetDefaultCMixParams();
    // Enable immediate sending (matches speakeasy-web v0.4)
    const encoder = new TextEncoder();
    const decoded = JSON.parse(decoder.decode(params));
    decoded.Network.EnableImmediateSending = true;
    const encodedParams = encoder.encode(JSON.stringify(decoded));
    progress.value = 'loading cmix...';

    xxdkStore.cmix = await xxdkStore.utils.LoadCmix(
        'privllm',
        xxdkStore.encryptedPassword,
        encodedParams
    );
    progress.value = 'starting network follower...';
    xxdkStore.cmix.StartNetworkFollower(50000);
    progress.value = 'waiting for network...';

    await xxdkStore.cmix.WaitForNetwork(10 * 60 * 1000);
    xxdkStore.cmixId = xxdkStore.cmix.GetID();
    xxdkStore.cmix.AddHealthCallback({
        Callback: (healthy: boolean) => {
            progress.value = healthy ? 'connected' : 'disconnected';
        }
    });
    while (true) {
        const statusResult = await xxdkStore.cmix.GetNodeRegistrationStatus();
        if (statusResult && statusResult instanceof Uint8Array && statusResult.length > 0) {
            const report = JSON.parse(decoder.decode(statusResult));
            const registered = report.NumberOfNodesRegistered ?? 0;
            const total = report.NumberOfNodes ?? 1;
            progress.value = `Node registration progress: ${registered}/${total}`;
            log(`[privllm] Node registration progress: ${registered}/${total} nodes`);

            if (total > 0 && registered / total >= 0.1) {
                progress.value = `Node registration threshold met: ${registered}/${total}`;
                log(`[privllm] Node registration threshold met (${0.1})`);
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
    initChat();
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
        while (!xxdkStore.cmix.ReadyToSend()) {
            log(++i, 'not ready to send, waiting...');
            progress.value = `not ready to send, waiting... (${i})`;
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        progress.value = `ready to send`;

        xxdkStore.dbCipher = await xxdkStore.utils.NewDatabaseCipher(
            xxdkStore.cmixId,
            xxdkStore.encryptedPassword,
            725
        );
        const dm = await xxdkStore.utils.NewDMClientWithIndexedDb(
            xxdkStore.cmixId,
            notifications.GetID(),
            xxdkStore.dbCipher.GetID(),
            (await dmIndexedDbWorkerPath()).toString(),
            raw,
            {
                EventUpdate: (eventType: number, data: unknown) => {
                    log({ eventType, data });

                    // this.handleDmEvent(chatId, eventType, data, cipher);
                }
            }
        );
        progress.value = `sending`;
        // const dbName = dm.GetDatabaseName();
        // const db = new Dexie(dbName);
        // await db.open();
        // const tableName = db.tables.find(
        //     (t) => t.name.toLowerCase().includes('message') || t.name === 'messages'
        // )?.name;
        // if (!tableName) {
        //     db.close();
        //     return [];
        // }

        // const rows = (await db.table(tableName).toArray()) as Record<string, unknown>[];
        // db.close();

        // const botPubKeyB64 = btoa(String.fromCharCode(...SERVER_PUB_CREDS.pubKey));
        // interface DisplayMessage {
        //     id: string;
        //     role: 'user' | 'assistant';
        //     ts: number;
        //     body: string;
        //     rich?: boolean;
        //     type?: MessageType;
        //     part?: number;
        //     totalParts?: number;
        // }
        // const messages: DisplayMessage[] = [];
        // for (const row of rows) {
        //     const senderPubKey = String(row.sender_pub_key ?? '');
        //     const isFromBot = senderPubKey === botPubKeyB64;
        //     const { type, body, part, totalParts } = await decodeDmText(row.text, xxdkStore.dbCipher);
        //     if (!type && !body) continue;
        //     messages.push({
        //         id: String(row.id ?? row.message_id ?? ''),
        //         role: isFromBot ? 'assistant' : 'user',
        //         ts: new Date(String(row.timestamp ?? '')).getTime() || Date.now(),
        //         body,
        //         rich: isFromBot && (!type || type === 'LLM' || type === 'PART'),
        //         ...(type ? { type } : {}),
        //         ...(part !== undefined ? { part } : {}),
        //         ...(totalParts !== undefined ? { totalParts } : {})
        //     });
        // }

        // messages.sort((a, b) => a.ts - b.ts);
        dm.SendText(
            SERVER_PUB_CREDS.pubKey,
            SERVER_PUB_CREDS.token,
            'Hello from SvelteKit!',
            30_000,
            new Uint8Array()
        )
            .then(() => {
                progress.value = `Message sent!`;
            })
            .catch(() => {
                progress.value = 'message sent failed';
            });
    }
};
type DbCipher = { GetID: () => number; Decrypt: (encrypted: string) => Promise<Uint8Array> };
type MessageType =
    | 'AUTH_SUCCESS'
    | 'AUTH_FAILED'
    | 'AUTH_REQUIRED'
    | 'AUTH_TOKEN'
    | 'BALANCE'
    | 'INSUFFICIENT_BALANCE'
    | 'WELCOME'
    | 'LLM'
    | 'PART';
// async function decodeDmText(
//     rawText: unknown,
//     dbCipher: DbCipher
// ): Promise<{ type?: MessageType; body: string; part?: number; totalParts?: number }> {
//     let text: string;
//     if (typeof rawText === 'string') {
//         text = rawText;
//     } else if (rawText instanceof Uint8Array) {
//         text = decoder.decode(rawText);
//     } else if (rawText instanceof ArrayBuffer) {
//         text = decoder.decode(new Uint8Array(rawText));
//     } else {
//         return { body: '' };
//     }
//     try {
//         const decrypted = await dbCipher.Decrypt(text);
//         const decoded = decoder.decode(decrypted);
//         try {
//             const compressed = base64ToUint8Array(decoded);
//             const decompressed = pako.inflate(compressed);
//             return parseMessageType(sanitizeHtml(decoder.decode(decompressed)));
//         } catch {
//             return parseMessageType(decoded);
//         }
//     } catch {
//         // Decryption failed — don't show raw encrypted text
//         return { body: '' };
//     }
// }