/**
 * Image Thumbnail Generator
 *
 * Client-side image processing using browser-image-compression.
 * Generates multiple resolution variants for NFT uploads:
 *   - Thumbnail (512×512) → grid views, mobile, previews
 *   - Preview   (1200×1200) → detail views, medium-res display
 *   - Full/Original → on-chain metadata, permanent storage
 *
 * All resized outputs use WebP format for 50-80% smaller files vs PNG.
 */

import imageCompression from "browser-image-compression";

// ── Size presets ─────────────────────────────────────────────────────────

export interface ThumbnailPreset {
    key: "thumb" | "preview";
    maxWidthOrHeight: number;
    maxSizeMB: number;
    quality: number;
}

export const THUMBNAIL_PRESETS: ThumbnailPreset[] = [
    { key: "thumb", maxWidthOrHeight: 512, maxSizeMB: 0.3, quality: 0.8 },
    { key: "preview", maxWidthOrHeight: 1200, maxSizeMB: 1.5, quality: 0.85 },
];

// ── Types ────────────────────────────────────────────────────────────────

export interface ProcessedImage {
    /** Original file, untouched */
    original: File;
    /** 512×512 WebP thumbnail (~100-300 KB) */
    thumb: File;
    /** 1200×1200 WebP preview (~500 KB - 1.5 MB) */
    preview: File;
}

// ── Core function ────────────────────────────────────────────────────────

/**
 * Generate thumbnail + preview variants of an image file.
 *
 * Uses a Web Worker (via browser-image-compression) so it doesn't block
 * the main thread. Falls back to main-thread processing if Web Workers
 * are not available.
 *
 * @param file   The original image file (PNG, JPG, WebP, etc.)
 * @returns      Object with { original, thumb, preview } File objects
 */
export async function generateThumbnails(file: File): Promise<ProcessedImage> {
    // Don't process non-image files
    if (!file.type.startsWith("image/")) {
        return { original: file, thumb: file, preview: file };
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");

    const [thumbBlob, previewBlob] = await Promise.all(
        THUMBNAIL_PRESETS.map(async (preset) => {
            try {
                const compressed = await imageCompression(file, {
                    maxSizeMB: preset.maxSizeMB,
                    maxWidthOrHeight: preset.maxWidthOrHeight,
                    useWebWorker: true,
                    fileType: "image/webp",
                    initialQuality: preset.quality,
                });
                return compressed;
            } catch (err) {
                console.warn(
                    `[Thumbnails] Failed to generate ${preset.key} for ${file.name}, using original:`,
                    err
                );
                return file;
            }
        })
    );

    return {
        original: file,
        thumb: new File([thumbBlob], `${baseName}_thumb.webp`, { type: "image/webp" }),
        preview: new File([previewBlob], `${baseName}_preview.webp`, { type: "image/webp" }),
    };
}

/**
 * Generate thumbnails for a batch of files with progress callback.
 * Processes files sequentially to avoid overwhelming the browser
 * with too many concurrent Web Workers.
 */
export async function generateThumbnailsBatch(
    files: File[],
    onProgress?: (completed: number, total: number) => void,
    concurrency = 3,
): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = new Array(files.length);

    for (let i = 0; i < files.length; i += concurrency) {
        const window = files.slice(i, i + concurrency);
        const windowResults = await Promise.all(
            window.map((file) => generateThumbnails(file))
        );

        for (let j = 0; j < windowResults.length; j++) {
            results[i + j] = windowResults[j];
        }

        onProgress?.(Math.min(i + concurrency, files.length), files.length);

        // Yield to event loop
        await new Promise((r) => setTimeout(r, 0));
    }

    return results;
}
