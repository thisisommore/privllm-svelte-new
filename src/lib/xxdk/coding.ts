
import DOMPurify from 'dompurify';

import pako from 'pako';
import { xxdkStore } from '../../store.svelte';
import { SANITIZE_CONFIG } from './domSanitize';


const decoder = new TextDecoder();

export async function decodeDmText(
    text: string
): Promise<string> {
    try {
        const decrypted = await xxdkStore.dbCipher!.Decrypt(text);
        const decoded = decoder.decode(decrypted);
        try {
            const decompressed = pako.inflate(Uint8Array.fromBase64(decoded));
            return DOMPurify.sanitize(decoder.decode(decompressed), SANITIZE_CONFIG);
        } catch {
            return decoded;
        }
    } catch {
        // Decryption failed — don't show raw encrypted text
        //TODO show error to user
        return '';
    }
}

