import type { CMix, XXDKUtils, DatabaseCipher, DMClient } from "xxdk-wasm";

class XXDKStore {
    utils: XXDKUtils | undefined = undefined;
    cmixId: number | undefined = undefined;
    cmix: CMix | undefined = undefined;
    encryptedPassword: Uint8Array | undefined = undefined;
    dbCipher: DatabaseCipher | undefined = undefined;
    dm: DMClient | undefined = undefined
}
export const xxdkStore = new XXDKStore();