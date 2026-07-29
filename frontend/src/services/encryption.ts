const STORAGE_KEY_PREFIX = 'shranix_enc_';

class EncryptionService {
  private key: CryptoKey | null = null;

  async init(secretKey?: string): Promise<boolean> {
    try {
      if (secretKey) {
        await this.deriveKey(secretKey);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async deriveKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret.padEnd(32, 'x').slice(0, 32)),
      'AES-GCM',
      false,
      ['encrypt', 'decrypt'],
    );
    this.key = keyMaterial;
    return keyMaterial;
  }

  async encrypt(plaintext: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = this.key || await this.getDefaultKey();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    const binary = Array.from(combined).map((b) => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  async decrypt(ciphertext: string): Promise<string> {
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = this.key || await this.getDefaultKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );

    return new TextDecoder().decode(decrypted);
  }

  private async getDefaultKey(): Promise<CryptoKey> {
    if (this.key) {return this.key;}

    let storedKey = localStorage.getItem(`${STORAGE_KEY_PREFIX}device_key`);
    if (!storedKey) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      storedKey = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}device_key`, storedKey);
    }

    return this.deriveKey(storedKey);
  }

  // ─── Secure Storage ───────────────────

  async secureSet(key: string, value: unknown): Promise<void> {
    try {
      const encrypted = await this.encrypt(JSON.stringify(value));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, encrypted);
    } catch {
      console.warn('Secure storage set failed');
    }
  }

  async secureGet<T = unknown>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
      if (!encrypted) {return null;}
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch {
      return null;
    }
  }

  secureRemove(key: string): void {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
  }

  secureClear(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  // ─── Offline Token Storage ────────────

  async storeOfflineToken(token: string): Promise<void> {
    // Store half the token in sessionStorage (cleared on browser close)
    // and half encrypted in localStorage (persists)
    const half = Math.ceil(token.length / 2);
    sessionStorage.setItem('shranix_token_part1', token.slice(0, half));
    await this.secureSet('token_part2', token.slice(half));
  }

  async getOfflineToken(): Promise<string | null> {
    const part1 = sessionStorage.getItem('shranix_token_part1');
    const part2 = await this.secureGet<string>('token_part2');
    if (part1 && part2) {return part1 + part2;}
    return null;
  }

  clearOfflineToken(): void {
    sessionStorage.removeItem('shranix_token_part1');
    this.secureRemove('token_part2');
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
