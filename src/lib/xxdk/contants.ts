const _botPubKeyRaw = atob('rU8lyaG3t7PB0pjGSryuE4ooOSlAGZZ/Q9BDdM8Syw4');
const _botPubKeyBytes = new Uint8Array(_botPubKeyRaw.length);
for (let i = 0; i < _botPubKeyRaw.length; i++) _botPubKeyBytes[i] = _botPubKeyRaw.charCodeAt(i);

export const SERVER_PUB_CREDS = {
    token: 115934850,
    pubKey: _botPubKeyBytes,
    codename: 'sergeantRunawayBathysphere'
};