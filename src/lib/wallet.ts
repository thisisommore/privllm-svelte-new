import { Keyring } from '@polkadot/api';
import { mnemonicGenerate, mnemonicValidate, cryptoWaitReady } from '@polkadot/util-crypto';
import { globalStore } from '../store.svelte';

interface StoredWallet {
    mnemonic: string;
    address: string;
}

export async function createWallet(): Promise<StoredWallet> {
    await cryptoWaitReady();
    const mnemonic = mnemonicGenerate();
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 55 });
    const pair = keyring.addFromUri(mnemonic);
    return { mnemonic, address: pair.address };
}

export async function saveWallet(wallet: StoredWallet) {
    const encoder = new TextEncoder()
    await globalStore.xxdk?.cmix.EKVSet("privllm_wallet", encoder.encode(JSON.stringify(wallet)))
}

export async function loadWallet(): Promise<StoredWallet> {
    const decoder = new TextDecoder()
    const encoded = await globalStore.xxdk?.cmix.EKVGet("privllm_wallet")
    const raw = decoder.decode(encoded).toString()
    return JSON.parse(raw) as StoredWallet;
}

export async function keypairFromStored(stored: StoredWallet) {
    await cryptoWaitReady();
    if (!mnemonicValidate(stored.mnemonic)) throw new Error('Invalid mnemonic');
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 55 });
    return keyring.addFromUri(stored.mnemonic);
}

