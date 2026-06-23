declare module 'xxdk-wasm' {
	export type CMix = {
		AddHealthCallback: (callback: { Callback: (healthy: boolean) => void }) => number;
		EKVGet: (key: string) => Promise<Uint8Array>;
		EKVSet: (key: string, value: Uint8Array) => Promise<void>;
		GetID: () => number;
		IsReady: (threshold: number) => Uint8Array;
		ReadyToSend: () => Promise<boolean>;
		StartNetworkFollower: (timeoutMilliseconds: number) => Promise<void>;
		StopNetworkFollower: () => void;
		WaitForNetwork: (timeoutMilliseconds: number) => Promise<void>;
		GetNodeRegistrationStatus: () => Promise<Uint8Array>;
		SetTrackNetworkPeriod: (trackingMs: number) => void;
	};

	export type ChannelManager = {
		GetID: () => number;
		SendMessage: (channelId: Uint8Array, message: string, timeout: number, params: Uint8Array) => Promise<Uint8Array>;
		JoinChannel: (channelId: string) => Promise<Uint8Array>;
		LeaveChannel: (channelId: Uint8Array) => Promise<void>;
		GetIdentity: () => Promise<Uint8Array>;
		ExportPrivateIdentity: (password: string) => Promise<Uint8Array>;
		GetNickname: (channelId: Uint8Array) => Promise<string>;
		SetNickname: (nickname: string, channel: Uint8Array) => Promise<void>;
		GetStorageTag: () => string | undefined;
	};

	export type DMClient = {
		GetPublicKey: () => Uint8Array;
		GetToken: () => number;
		GetIdentity: () => Promise<Uint8Array>;
		ExportPrivateIdentity: (password: string) => Promise<Uint8Array>;
		GetNickname: () => Promise<string>;
		SetNickname: (nickname: string) => Promise<void>;
		GetDatabaseName: () => string;
		SendText: (pubkey: Uint8Array, dmToken: number, message: string, leaseTimeMs: number, cmixParams: Uint8Array) => Promise<Uint8Array>;
		SendReply: (pubkey: Uint8Array, dmToken: number, message: string, replyToId: Uint8Array, leaseTimeMs: number, cmixParams: Uint8Array) => Promise<Uint8Array>;
		SendReaction: (pubkey: Uint8Array, dmToken: number, message: string, reactToId: Uint8Array, cmixParams: Uint8Array) => Promise<Uint8Array>;
	};
	export type DatabaseCipher = {
		GetID: () => number;
		Decrypt: (encrypted: string) => Promise<Uint8Array>;
	};
	export type XXDKUtils = {
		NewCmix: (ndf: string, storageDir: string, password: Uint8Array, registrationCode: string) => Promise<void>;
		LoadCmix: (storageDirectory: string, password: Uint8Array, cmixParams: Uint8Array) => Promise<CMix>;
		GetDefaultCMixParams: () => Uint8Array;
		GenerateChannelIdentity: (cmixId: number) => Promise<Uint8Array>;
		NewChannelsManagerWithIndexedDb: (
			cmixId: number,
			wasmJsPath: string,
			privateIdentity: Uint8Array,
			extensionBuilderIDsJSON: Uint8Array,
			notificationsId: number,
			callbacks: { EventUpdate: (eventType: number, data: unknown) => void },
			channelDbCipher: number
		) => Promise<ChannelManager>;
		NewDMClientWithIndexedDb: (
			cmixId: number,
			notificationsId: number,
			cipherId: number,
			wasmJsPath: string,
			privateIdentity: Uint8Array,
			eventCallback: { EventUpdate: (eventType: number, data: unknown) => void }
		) => Promise<DMClient>;
		GetPublicChannelIdentityFromPrivate: (privateKey: Uint8Array) => Promise<Uint8Array>;
		GetOrInitPassword: (password: string) => Promise<Uint8Array>;
		ImportPrivateIdentity: (password: string, privateIdentity: Uint8Array) => Promise<Uint8Array>;
		NewDatabaseCipher: (cmixId: number, storagePassword: Uint8Array, payloadMaximumSize: number) => Promise<DatabaseCipher>;
		NewDummyTrafficManager: (cmixId: number, maxPerCycle: number, waitBetweenSends: number, upperBoundInterval: number) => Promise<{ GetStatus: () => boolean; Pause: () => void; Start: () => void }>;
		ConstructIdentity: (publicKey: Uint8Array, codesetVersion: number) => Promise<Uint8Array>;
		Base64ToUint8Array: (base64: string) => Promise<Uint8Array>;
		LoadNotificationsDummy: (cmixId: number) => Promise<{ GetID: () => number }>;
		LoadNotifications: (cmixId: number) => Promise<{ GetID: () => number; AddToken: (newToken: string, app: string) => void; RemoveToken: () => void; SetMaxState: (maxState: number) => void; GetMaxState: () => number }>;
		GetVersion: () => Promise<Uint8Array>;
		GetClientVersion: () => Promise<string>;
		GetChannelInfo: (prettyPrint: string) => Promise<Uint8Array>;
		GetChannelJSON: (prettyPrint: string) => Promise<Uint8Array>;
		GetShareUrlType: (url: string) => Promise<number>;
		IsNicknameValid: (nickname: string) => Promise<null>;
		DecodePrivateURL: (url: string, password: string) => Promise<string>;
		DecodePublicURL: (url: string) => Promise<string>;
		ValidForever: () => Promise<number>;
		Purge: (userPassword: string) => Promise<void>;
		GetWasmSemanticVersion: () => Promise<Uint8Array>;
	};

	export function InitXXDK(): Promise<XXDKUtils>;
	export function setXXDKBasePath(newPath: string): void;
	export function GetDefaultNDF(): string;
	export function channelsIndexedDbWorkerPath(): Promise<URL>;
	export function dmIndexedDbWorkerPath(): Promise<URL>;
	export function stateIndexedDbWorkerPath(): Promise<URL>;
	export function createKVStore(storageDir: string): Promise<{ Get(key: string): Promise<string>; Set(key: string, value: string): Promise<void>; Delete(key: string): Promise<void>; Keys(): Promise<string[]>; Clear(): Promise<void> }>;
}
