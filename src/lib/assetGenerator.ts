/**
 * Asset Generator for Advanced Mode
 * 
 * Generates unique NFT combinations based on layers and rarity weights.
 * Uses weighted random selection and duplicate checking.
 */

import { Layer, LayerTrait } from "@/components/launchpad/LayerManager";

export interface GeneratedAsset {
    id: string;
    name: string;
    traits: { layer: string; trait: string; file: File }[];
    preview?: string; // Composite image data URL
    metadata: {
        name: string;
        description: string;
        attributes: { trait_type: string; value: string }[];
    };
}

export interface GeneratorConfig {
    collectionName: string;
    collectionSymbol: string;
    description: string;
    totalSupply: number;
    allowDuplicates: boolean;
}

/**
 * Select a trait from a layer based on rarity weights
 */
function selectTraitByRarity(traits: LayerTrait[]): LayerTrait {
    const totalWeight = traits.reduce((sum, t) => sum + t.rarity, 0);
    let random = Math.random() * totalWeight;

    for (const trait of traits) {
        random -= trait.rarity;
        if (random <= 0) {
            return trait;
        }
    }

    // Fallback to last trait
    return traits[traits.length - 1];
}

/**
 * Generate a unique combination hash for duplicate checking
 */
function getCombinationHash(selectedTraits: { layerId: string; traitId: string }[]): string {
    return selectedTraits.map((t) => `${t.layerId}:${t.traitId}`).join("|");
}

/**
 * Generate a single asset combination
 */
function generateSingleCombination(
    layers: Layer[],
    existingHashes: Set<string>,
    maxAttempts: number = 100
): { traits: { layerId: string; traitId: string; trait: LayerTrait }[]; hash: string } | null {
    const visibleLayers = layers.filter((l) => l.visible && l.traits.length > 0);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const selectedTraits = visibleLayers.map((layer) => {
            const trait = selectTraitByRarity(layer.traits);
            return { layerId: layer.id, traitId: trait.id, trait };
        });

        const hash = getCombinationHash(
            selectedTraits.map((t) => ({ layerId: t.layerId, traitId: t.traitId }))
        );

        if (!existingHashes.has(hash)) {
            return { traits: selectedTraits, hash };
        }
    }

    return null; // Could not generate unique combination
}

/**
 * Composite multiple images into one (using canvas)
 */
async function compositeImages(
    traits: { layer: string; trait: LayerTrait }[]
): Promise<string> {
    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Default size (will be set by first image)
    let width = 512;
    let height = 512;

    // Load all images
    const images = await Promise.all(
        traits.map(
            (t) =>
                new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = t.trait.preview;
                })
        )
    );

    // Set canvas size to first image size
    if (images.length > 0) {
        width = images[0].width || 512;
        height = images[0].height || 512;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw each layer in order
    for (const img of images) {
        ctx.drawImage(img, 0, 0, width, height);
    }

    return canvas.toDataURL("image/png");
}

/**
 * Main generator function
 */
export async function generateAssets(
    layers: Layer[],
    config: GeneratorConfig,
    onProgress?: (current: number, total: number) => void
): Promise<GeneratedAsset[]> {
    const assets: GeneratedAsset[] = [];
    const existingHashes = new Set<string>();

    const visibleLayers = layers.filter((l) => l.visible && l.traits.length > 0);

    // Calculate max possible combinations
    const maxCombinations = visibleLayers.reduce(
        (acc, layer) => acc * layer.traits.length,
        1
    );

    // Cap supply at max combinations
    const targetSupply = Math.min(config.totalSupply, maxCombinations);

    for (let i = 0; i < targetSupply; i++) {
        onProgress?.(i + 1, targetSupply);

        const combination = generateSingleCombination(
            layers,
            config.allowDuplicates ? new Set() : existingHashes,
            1000
        );

        if (!combination) {
            console.warn(`Could not generate unique combination at index ${i}`);
            break;
        }

        existingHashes.add(combination.hash);

        // Map to layer names for metadata
        const traitsWithNames = combination.traits.map((t) => {
            const layer = layers.find((l) => l.id === t.layerId)!;
            return {
                layer: layer.name,
                trait: t.trait,
            };
        });

        // Generate composite preview
        const preview = await compositeImages(traitsWithNames);

        const asset: GeneratedAsset = {
            id: crypto.randomUUID(),
            name: `${config.collectionName} #${i + 1}`,
            traits: traitsWithNames.map((t) => ({
                layer: t.layer,
                trait: t.trait.name,
                file: t.trait.file,
            })),
            preview,
            metadata: {
                name: `${config.collectionName} #${i + 1}`,
                description: config.description,
                attributes: traitsWithNames.map((t) => ({
                    trait_type: t.layer,
                    value: t.trait.name,
                })),
            },
        };

        assets.push(asset);
    }

    return assets;
}

/**
 * Export generated assets as a downloadable zip
 * (Requires jszip library - placeholder for now)
 */
export async function exportAssetsAsZip(
    assets: GeneratedAsset[],
    onProgress?: (current: number, total: number) => void
): Promise<Blob> {
    // This would use JSZip to create a downloadable archive
    // For now, returning a placeholder
    throw new Error("JSZip not implemented - use uploadFiles directly instead");
}

/**
 * Estimate rarity distribution for generated collection
 */
export function estimateRarityDistribution(
    layers: Layer[],
    sampleSize: number = 10000
): Map<string, Map<string, number>> {
    const distribution = new Map<string, Map<string, number>>();

    // Initialize
    for (const layer of layers) {
        if (!layer.visible) continue;
        const traitCounts = new Map<string, number>();
        for (const trait of layer.traits) {
            traitCounts.set(trait.name, 0);
        }
        distribution.set(layer.name, traitCounts);
    }

    // Simulate
    for (let i = 0; i < sampleSize; i++) {
        for (const layer of layers) {
            if (!layer.visible) continue;
            const trait = selectTraitByRarity(layer.traits);
            const traitCounts = distribution.get(layer.name)!;
            traitCounts.set(trait.name, (traitCounts.get(trait.name) || 0) + 1);
        }
    }

    // Convert to percentages
    for (const [, traitCounts] of distribution) {
        for (const [traitName, count] of traitCounts) {
            traitCounts.set(traitName, (count / sampleSize) * 100);
        }
    }

    return distribution;
}
