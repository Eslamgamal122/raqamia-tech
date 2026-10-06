export function bucket(): {
 get(key: string): Promise<{body: Uint8Array<ArrayBuffer>} | null>;
 put(key: string, bytes: Uint8Array, options?: unknown): Promise<void>;
 delete(key: string): Promise<void>;
};
