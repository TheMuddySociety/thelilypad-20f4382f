/**
 * NFT Storage Supabase Client
 *
 * This is a DEDICATED second Supabase instance used exclusively for:
 *   • NFT image storage  (bucket: "nft-images")
 *   • NFT metadata storage (bucket: "nft-metadata")
 *   • Collection cover images (bucket: "collection-images")
 *
 * It is intentionally NOT used for:
 *   • Authentication
 *   • User profiles
 *   • Database queries
 *   • Any application logic
 *
 * Project: jlkupdukwgsadvzxafed  (thelilypad-storage)
 * Import:  import { storageClient, NFT_BUCKETS } from "@/integrations/supabase/storageClient";
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_URL = import.meta.env.VITE_STORAGE_SUPABASE_URL;
const STORAGE_KEY = import.meta.env.VITE_STORAGE_SUPABASE_KEY;

if (!STORAGE_URL || !STORAGE_KEY) {
    console.error(
        '[storageClient] Missing VITE_STORAGE_SUPABASE_URL or VITE_STORAGE_SUPABASE_KEY. ' +
        'NFT image/metadata uploads will fail. Check your .env file.'
    );
}

/**
 * Storage-only Supabase client.
 * No auth, no realtime, no database — pure storage.
 */
export const storageClient = createClient(STORAGE_URL, STORAGE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    global: {
        headers: {
            'x-client-info': 'lilypad-nft-storage/1.0',
        },
    },
});

/** Canonical bucket names on the NFT Storage project */
export const NFT_BUCKETS = {
    /** Composited NFT images — PNG/WEBP/GIF */
    IMAGES: 'nft-images',
    /** ERC-721 / XLS-20 JSON metadata files */
    METADATA: 'nft-metadata',
    /** Collection card cover images */
    COVERS: 'collection-images',
} as const;

export type NftBucket = typeof NFT_BUCKETS[keyof typeof NFT_BUCKETS];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the public URL for a file in the NFT storage project.
 */
export function getStoragePublicUrl(bucket: NftBucket, path: string): string {
    const { data } = storageClient.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Upload a file to the NFT storage project.
 * Returns the public URL on success, throws on failure.
 */
export async function uploadToNftStorage(
    bucket: NftBucket,
    path: string,
    file: File | Blob | string,
    options?: { contentType?: string; upsert?: boolean }
): Promise<string> {
    const { error } = await storageClient.storage
        .from(bucket)
        .upload(path, file, {
            upsert: options?.upsert ?? true,
            contentType: options?.contentType,
        });

    if (error) {
        throw new Error(`[NFT Storage] Upload failed for ${bucket}/${path}: ${error.message}`);
    }

    return getStoragePublicUrl(bucket, path);
}

/**
 * Generate a signed URL for a file (useful for private buckets).
 * Default expiry: 1 hour.
 */
export async function getSignedNftUrl(
    bucket: NftBucket,
    path: string,
    expiresInSeconds = 3600
): Promise<string> {
    const { data, error } = await storageClient.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
        throw new Error(`[NFT Storage] Signed URL failed for ${bucket}/${path}: ${error?.message}`);
    }

    return data.signedUrl;
}

/**
 * Delete a file from NFT storage.
 */
export async function deleteFromNftStorage(
    bucket: NftBucket,
    paths: string[]
): Promise<void> {
    const { error } = await storageClient.storage.from(bucket).remove(paths);
    if (error) {
        console.warn(`[NFT Storage] Delete failed for ${bucket}:`, error.message);
    }
}

/**
 * Check whether the NFT storage client is properly configured.
 */
export function isNftStorageConfigured(): boolean {
    return Boolean(STORAGE_URL && STORAGE_KEY);
}
