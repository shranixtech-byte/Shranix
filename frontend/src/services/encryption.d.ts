declare class EncryptionService {
    private key;
    init(secretKey?: string): Promise<boolean>;
    private deriveKey;
    encrypt(plaintext: string): Promise<string>;
    decrypt(ciphertext: string): Promise<string>;
    private getDefaultKey;
    secureSet(key: string, value: unknown): Promise<void>;
    secureGet<T = unknown>(key: string): Promise<T | null>;
    secureRemove(key: string): void;
    secureClear(): void;
    storeOfflineToken(token: string): Promise<void>;
    getOfflineToken(): Promise<string | null>;
    clearOfflineToken(): void;
}
export declare const encryptionService: EncryptionService;
export default encryptionService;
//# sourceMappingURL=encryption.d.ts.map