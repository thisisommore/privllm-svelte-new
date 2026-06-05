const _botPubKeyRaw = atob('hsBBntRdQgMExz5mviwDKiWak7A6FuiiwMTJ9f7vjL4=');
const _botPubKeyBytes = new Uint8Array(_botPubKeyRaw.length);
for (let i = 0; i < _botPubKeyRaw.length; i++) _botPubKeyBytes[i] = _botPubKeyRaw.charCodeAt(i);

export const SERVER_PUB_CREDS = {
    token: 2929633605,
    pubKey: _botPubKeyBytes,
    codename: 'theAsteriatedProfundity'
};