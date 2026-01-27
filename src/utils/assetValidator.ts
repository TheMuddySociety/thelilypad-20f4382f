export interface ValidationError {
    file: string;
    error: string;
}

export interface AssetFile {
    name: string;
    file: File;
}

export const validateAssets = (files: AssetFile[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const jsonExtension = 'json';

    const images = files.filter(f => imageExtensions.some(ext => f.name.toLowerCase().endsWith(`.${ext}`)));
    const jsons = files.filter(f => f.name.toLowerCase().endsWith(`.${jsonExtension}`));

    // 1. Check for matching pairs
    // e.g. 1.png needs 1.json

    // Create a set of base names for images
    const imageBaseNames = new Set(images.map(f => f.name.substring(0, f.name.lastIndexOf('.'))));

    // Create a set of base names for JSONs
    const jsonBaseNames = new Set(jsons.map(f => f.name.substring(0, f.name.lastIndexOf('.'))));

    // Find images without JSON
    for (const baseName of imageBaseNames) {
        if (!jsonBaseNames.has(baseName)) {
            errors.push({
                file: `${baseName}.(image)`,
                error: `Missing corresponding JSON metadata file (expected ${baseName}.json)`
            });
        }
    }

    // Find JSONs without images
    for (const baseName of jsonBaseNames) {
        if (!imageBaseNames.has(baseName)) {
            errors.push({
                file: `${baseName}.json`,
                error: `Missing corresponding image file (expected ${baseName}.png/jpg/etc)`
            });
        }
    }

    // 2. Validate JSON structure (lightweight check)
    // We can't easily read File content synchronously here without FileReader, 
    // so typically we'd do this async. For now, strict file matching is the primary check.

    return errors;
};

export const getAssetPairs = (files: AssetFile[]) => {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const pairs: { name: string; image: File, json: File }[] = [];

    const images = files.filter(f => imageExtensions.some(ext => f.name.toLowerCase().endsWith(`.${ext}`)));

    for (const img of images) {
        const baseName = img.name.substring(0, img.name.lastIndexOf('.'));
        const jsonFile = files.find(f => f.name === `${baseName}.json`);

        if (jsonFile) {
            pairs.push({
                name: baseName,
                image: img.file,
                json: jsonFile.file
            });
        }
    }

    return pairs.sort((a, b) => {
        // Try numeric sort first
        const numA = parseInt(a.name);
        const numB = parseInt(b.name);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.name.localeCompare(b.name);
    });
};
