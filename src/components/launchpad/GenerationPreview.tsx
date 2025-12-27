import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Eye, Download, Sparkles, Info, Image as ImageIcon, FileJson, Package, Loader2, Images, FolderArchive, BarChart3, Crown, Gem, Star, Circle, Archive } from "lucide-react";
import { Layer, Trait, BlendMode } from "./LayerManager";
import { TraitRule, RuleType } from "./TraitRulesManager";
import { NFTImageCompositor } from "./NFTImageCompositor";
import { toast } from "sonner";
import JSZip from "jszip";

interface GenerationPreviewProps {
  layers: Layer[];
  rules: TraitRule[];
  totalSupply: string;
  collectionName?: string;
  collectionDescription?: string;
}

interface GeneratedNFT {
  id: number;
  traits: { layerId: string; layerName: string; traitId: string; traitName: string; imageUrl?: string; blendMode?: BlendMode; opacity?: number }[];
}

interface GeneratedNFTWithImage extends GeneratedNFT {
  imageDataUrl?: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

// Rarity tier definitions
type RarityTier = "legendary" | "rare" | "uncommon" | "common";

interface RarityTierConfig {
  name: string;
  maxPercentage: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Crown;
}

const RARITY_TIERS: Record<RarityTier, RarityTierConfig> = {
  legendary: {
    name: "Legendary",
    maxPercentage: 5,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/50",
    icon: Crown,
  },
  rare: {
    name: "Rare",
    maxPercentage: 15,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    icon: Gem,
  },
  uncommon: {
    name: "Uncommon",
    maxPercentage: 35,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/50",
    icon: Star,
  },
  common: {
    name: "Common",
    maxPercentage: 100,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted",
    icon: Circle,
  },
};

// Get rarity tier based on percentage
const getRarityTier = (percentage: number): RarityTier => {
  if (percentage <= RARITY_TIERS.legendary.maxPercentage) return "legendary";
  if (percentage <= RARITY_TIERS.rare.maxPercentage) return "rare";
  if (percentage <= RARITY_TIERS.uncommon.maxPercentage) return "uncommon";
  return "common";
};

// Rarity Badge Component
const RarityBadge = ({ tier, showLabel = true, size = "default" }: { tier: RarityTier; showLabel?: boolean; size?: "sm" | "default" }) => {
  const config = RARITY_TIERS[tier];
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses}`}>
      <Icon className={iconSize} />
      {showLabel && config.name}
    </span>
  );
};

interface RarityReport {
  totalGenerated: number;
  layerDistributions: {
    layerName: string;
    traits: {
      traitName: string;
      count: number;
      percentage: number;
      expectedPercentage: number;
      tier: RarityTier;
    }[];
  }[];
  rarestCombinations: {
    nftId: number;
    rarityScore: number;
    traits: string[];
    overallTier: RarityTier;
  }[];
  tierSummary: {
    tier: RarityTier;
    traitCount: number;
    nftCount: number;
  }[];
}

export function GenerationPreview({
  layers,
  rules,
  totalSupply,
  collectionName = "My Collection",
  collectionDescription = "",
}: GenerationPreviewProps) {
  const [previewCount, setPreviewCount] = useState("5");
  const [generatedPreviews, setGeneratedPreviews] = useState<GeneratedNFT[]>([]);
  const [exportCount, setExportCount] = useState(totalSupply || "100");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [rarityReport, setRarityReport] = useState<RarityReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const selectTraitForLayer = (
    layer: Layer,
    selectedTraits: Map<string, string>,
    allLayers: Layer[]
  ): string | null => {
    // Check if layer is optional and randomly skip
    if (layer.isOptional && Math.random() * 100 > layer.optionalChance) {
      return null;
    }

    if (layer.traits.length === 0) return null;

    // Get applicable rules for already selected traits
    const applicableRules = rules.filter((rule) => {
      // Check if source trait was selected
      const sourceSelected = selectedTraits.get(rule.sourceLayerId);
      return sourceSelected === rule.sourceTraitId;
    });

    // Find forced traits for this layer
    const forcedTraits = applicableRules
      .filter(
        (r) => r.type === "forces" && r.targetLayerId === layer.id
      )
      .map((r) => r.targetTraitId);

    if (forcedTraits.length > 0) {
      return forcedTraits[0]; // Return first forced trait
    }

    // Filter out incompatible traits
    const incompatibleTraits = applicableRules
      .filter(
        (r) => r.type === "incompatible" && r.targetLayerId === layer.id
      )
      .map((r) => r.targetTraitId);

    const availableTraits = layer.traits.filter(
      (t) => !incompatibleTraits.includes(t.id)
    );

    if (availableTraits.length === 0) {
      // If all traits are incompatible, just pick from original
      const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
      let random = Math.random() * totalRarity;
      for (const trait of layer.traits) {
        random -= trait.rarity;
        if (random <= 0) return trait.id;
      }
      return layer.traits[0].id;
    }

    // Weighted random selection from available traits
    const totalRarity = availableTraits.reduce((sum, t) => sum + t.rarity, 0);
    let random = Math.random() * totalRarity;
    for (const trait of availableTraits) {
      random -= trait.rarity;
      if (random <= 0) return trait.id;
    }

    return availableTraits[0].id;
  };

  // Generate a unique trait combination hash for duplicate detection
  const getTraitHash = (traits: GeneratedNFT["traits"]): string => {
    return traits
      .map((t) => `${t.layerId}:${t.traitId}`)
      .sort()
      .join("|");
  };

  // Generate a single NFT
  const generateSingleNFT = (id: number, sortedLayers: Layer[]): GeneratedNFT => {
    const selectedTraits = new Map<string, string>();
    const nftTraits: GeneratedNFT["traits"] = [];

    for (const layer of sortedLayers) {
      const selectedTraitId = selectTraitForLayer(layer, selectedTraits, layers);
      if (selectedTraitId) {
        selectedTraits.set(layer.id, selectedTraitId);
        const trait = layer.traits.find((t) => t.id === selectedTraitId);
        if (trait) {
          nftTraits.push({
            layerId: layer.id,
            layerName: layer.name,
            traitId: trait.id,
            traitName: trait.name,
            imageUrl: trait.imageUrl,
            blendMode: layer.blendMode,
            opacity: layer.opacity,
          });
        }
      }
    }

    return { id, traits: nftTraits };
  };

  const generateNFTBatch = (count: number, ensureUnique: boolean = true): { nfts: GeneratedNFT[]; duplicatesAvoided: number } => {
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    const previews: GeneratedNFT[] = [];
    const seenHashes = new Set<string>();
    let duplicatesAvoided = 0;
    const maxAttempts = count * 10; // Prevent infinite loops
    let attempts = 0;

    while (previews.length < count && attempts < maxAttempts) {
      attempts++;
      const nft = generateSingleNFT(previews.length + 1, sortedLayers);
      const hash = getTraitHash(nft.traits);

      if (!ensureUnique || !seenHashes.has(hash)) {
        seenHashes.add(hash);
        previews.push({ ...nft, id: previews.length + 1 });
      } else {
        duplicatesAvoided++;
      }
    }

    if (previews.length < count) {
      toast.warning(
        `Only ${previews.length} unique combinations possible. Add more traits for ${count} unique NFTs.`
      );
    }

    return { nfts: previews, duplicatesAvoided };
  };

  const [duplicatesAvoided, setDuplicatesAvoided] = useState(0);

  const generatePreviews = () => {
    const count = parseInt(previewCount) || 5;
    const { nfts, duplicatesAvoided: avoided } = generateNFTBatch(count);
    setGeneratedPreviews(nfts);
    setDuplicatesAvoided(avoided);
    if (avoided > 0) {
      toast.info(`Avoided ${avoided} duplicate combinations`);
    }
  };

  // Load image helper
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Composite a single NFT image
  const compositeNFTImage = async (nft: GeneratedNFT, canvasSize: number = 512): Promise<string | null> => {
    const hasImages = nft.traits.some((t) => t.imageUrl);
    if (!hasImages) return null;

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    for (const trait of nft.traits) {
      if (trait.imageUrl) {
        try {
          const img = await loadImage(trait.imageUrl);
          ctx.save();
          ctx.globalCompositeOperation = trait.blendMode || "source-over";
          ctx.globalAlpha = (trait.opacity ?? 100) / 100;
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          ctx.restore();
        } catch (error) {
          console.warn(`Failed to load image for trait: ${trait.traitName}`, error);
        }
      }
    }

    return canvas.toDataURL("image/png");
  };

  // Export images with metadata
  const exportImagesWithMetadata = async () => {
    const count = Math.min(parseInt(exportCount) || 10, 100); // Limit to 100 for browser
    const hasImages = layers.some((l) => l.traits.some((t) => t.imageUrl));
    
    if (!hasImages) {
      toast.error("No images found. Add images to your traits first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Generating NFTs...");

    try {
      const { nfts } = generateNFTBatch(count);
      const results: { id: number; imageDataUrl: string; metadata: NFTMetadata }[] = [];

      for (let i = 0; i < nfts.length; i++) {
        setExportStatus(`Compositing image ${i + 1} of ${count}...`);
        setExportProgress(((i + 1) / count) * 80);

        const imageDataUrl = await compositeNFTImage(nfts[i]);
        if (imageDataUrl) {
          results.push({
            id: nfts[i].id,
            imageDataUrl,
            metadata: nftToMetadata(nfts[i]),
          });
        }

        // Small delay to prevent browser freeze
        await new Promise((r) => setTimeout(r, 10));
      }

      setExportStatus("Preparing download...");
      setExportProgress(90);

      // Create export package
      const exportPackage = {
        collection: {
          name: collectionName,
          description: collectionDescription,
          total_generated: results.length,
          generated_at: new Date().toISOString(),
        },
        nfts: results.map((r) => ({
          id: r.id,
          metadata: r.metadata,
          image_data: r.imageDataUrl,
        })),
      };

      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-full-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus("Complete!");
      toast.success(`Exported ${results.length} NFTs with images and metadata`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 1500);
    }
  };

  // Download individual images
  const downloadIndividualImages = async () => {
    const count = Math.min(parseInt(exportCount) || 10, 20); // Limit to 20 for individual downloads
    const hasImages = layers.some((l) => l.traits.some((t) => t.imageUrl));
    
    if (!hasImages) {
      toast.error("No images found. Add images to your traits first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Generating images...");

    try {
      const { nfts } = generateNFTBatch(count);

      for (let i = 0; i < nfts.length; i++) {
        setExportStatus(`Downloading image ${i + 1} of ${count}...`);
        setExportProgress(((i + 1) / count) * 100);

        const imageDataUrl = await compositeNFTImage(nfts[i]);
        if (imageDataUrl) {
          const link = document.createElement("a");
          link.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-${nfts[i].id}.png`;
          link.href = imageDataUrl;
          link.click();
          
          // Delay between downloads
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(`Downloaded ${count} NFT images`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus("");
    }
  };

  // Convert generated NFT to ERC-721 metadata format
  const nftToMetadata = (nft: GeneratedNFT, baseImageUri: string = ""): NFTMetadata => {
    return {
      name: `${collectionName} #${nft.id}`,
      description: collectionDescription || `${collectionName} NFT #${nft.id}`,
      image: baseImageUri ? `${baseImageUri}/${nft.id}.png` : `ipfs://YOUR_CID/${nft.id}.png`,
      attributes: nft.traits.map((trait) => ({
        trait_type: trait.layerName,
        value: trait.traitName,
      })),
    };
  };

  // Export single metadata JSON
  const exportSingleMetadata = (nft: GeneratedNFT) => {
    const metadata = nftToMetadata(nft);
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nft.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported metadata for NFT #${nft.id}`);
  };

  // Export all metadata as a zip-like bundle (individual files in a folder structure)
  const exportAllMetadata = () => {
    const count = parseInt(exportCount) || parseInt(totalSupply) || 100;
    const { nfts } = generateNFTBatch(count);
    
    // Create metadata array
    const allMetadata = nfts.map((nft) => nftToMetadata(nft));
    
    // Export as single JSON file with all metadata
    const exportData = {
      name: collectionName,
      description: collectionDescription,
      total_supply: count,
      generated_at: new Date().toISOString(),
      metadata: allMetadata,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} NFT metadata files`);
  };

  // Export individual metadata files (for IPFS folder upload)
  const exportIndividualFiles = () => {
    const count = parseInt(exportCount) || parseInt(totalSupply) || 100;
    const { nfts } = generateNFTBatch(count);
    
    // Create a downloadable text file with instructions
    const metadataFiles: { filename: string; content: NFTMetadata }[] = nfts.map((nft) => ({
      filename: `${nft.id}.json`,
      content: nftToMetadata(nft),
    }));

    // Export as a single file with array of all metadata for easy parsing
    const exportData = metadataFiles.map((f) => ({
      filename: f.filename,
      ...f.content,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-individual-metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} individual metadata entries`);
  };

  // Export as ZIP file with organized folder structure
  const exportAsZip = async () => {
    const count = Math.min(parseInt(exportCount) || 100, 500); // Limit to 500 for memory
    const hasImages = layers.some((l) => l.traits.some((t) => t.imageUrl));
    
    if (!hasImages) {
      toast.error("No images found. Add images to your traits first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Generating NFTs...");

    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder("images");
      const metadataFolder = zip.folder("metadata");
      
      if (!imagesFolder || !metadataFolder) {
        throw new Error("Failed to create ZIP folders");
      }

      const { nfts } = generateNFTBatch(count);

      // Generate images and metadata
      for (let i = 0; i < nfts.length; i++) {
        setExportStatus(`Generating NFT ${i + 1} of ${count}...`);
        setExportProgress(((i + 1) / count) * 80);

        const imageDataUrl = await compositeNFTImage(nfts[i]);
        
        if (imageDataUrl) {
          // Convert base64 to binary
          const base64Data = imageDataUrl.split(",")[1];
          imagesFolder.file(`${nfts[i].id}.png`, base64Data, { base64: true });
          
          // Create metadata with correct image path
          const metadata = {
            name: `${collectionName} #${nfts[i].id}`,
            description: collectionDescription || `${collectionName} NFT #${nfts[i].id}`,
            image: `ipfs://YOUR_CID/${nfts[i].id}.png`,
            attributes: nfts[i].traits.map((trait) => ({
              trait_type: trait.layerName,
              value: trait.traitName,
            })),
          };
          
          metadataFolder.file(`${nfts[i].id}.json`, JSON.stringify(metadata, null, 2));
        }

        // Small delay to prevent browser freeze
        if (i % 10 === 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      // Add collection metadata
      const collectionMetadata = {
        name: collectionName,
        description: collectionDescription,
        total_supply: count,
        generated_at: new Date().toISOString(),
      };
      zip.file("_collection.json", JSON.stringify(collectionMetadata, null, 2));

      setExportStatus("Creating ZIP file...");
      setExportProgress(90);

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      // Download ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-collection.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus("Complete!");
      toast.success(`Exported ${count} NFTs as ZIP file`);
    } catch (error) {
      console.error("ZIP export failed:", error);
      toast.error("ZIP export failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 1500);
    }
  };

  // Calculate rarity statistics
  const rarityStats = useMemo(() => {
    const stats: { layer: string; trait: string; rarity: number }[] = [];
    layers.forEach((layer) => {
      const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
      layer.traits.forEach((trait) => {
        const effectiveRarity = totalRarity > 0 ? (trait.rarity / totalRarity) * 100 : 0;
        const layerMultiplier = layer.isOptional ? layer.optionalChance / 100 : 1;
        stats.push({
          layer: layer.name,
          trait: trait.name,
          rarity: effectiveRarity * layerMultiplier,
        });
      });
    });
    return stats.sort((a, b) => a.rarity - b.rarity);
  }, [layers]);

  const rareTraits = rarityStats.slice(0, 5);

  // Generate rarity report
  const generateRarityReport = useCallback(() => {
    setIsGeneratingReport(true);
    
    try {
      const reportSize = Math.min(parseInt(totalSupply) || 100, 500);
      const { nfts } = generateNFTBatch(reportSize);
      
      // Calculate trait distributions per layer
      const layerTraitCounts = new Map<string, Map<string, number>>();
      
      // Initialize counts
      layers.forEach((layer) => {
        const traitCounts = new Map<string, number>();
        layer.traits.forEach((trait) => traitCounts.set(trait.name, 0));
        layerTraitCounts.set(layer.name, traitCounts);
      });
      
      // Count occurrences
      nfts.forEach((nft) => {
        nft.traits.forEach((trait) => {
          const layerCounts = layerTraitCounts.get(trait.layerName);
          if (layerCounts) {
            layerCounts.set(trait.traitName, (layerCounts.get(trait.traitName) || 0) + 1);
          }
        });
      });
      
      // Build layer distributions with tier assignment
      const layerDistributions = layers.map((layer) => {
        const traitCounts = layerTraitCounts.get(layer.name) || new Map();
        const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        
        return {
          layerName: layer.name,
          traits: layer.traits.map((trait) => {
            const count = traitCounts.get(trait.name) || 0;
            const expectedPercentage = totalRarity > 0 ? (trait.rarity / totalRarity) * 100 : 0;
            const actualPercentage = (count / reportSize) * 100;
            return {
              traitName: trait.name,
              count,
              percentage: actualPercentage,
              expectedPercentage,
              tier: getRarityTier(actualPercentage),
            };
          }).sort((a, b) => a.percentage - b.percentage),
        };
      });
      
      // Calculate tier summary for traits
      const traitTierCounts: Record<RarityTier, number> = {
        legendary: 0,
        rare: 0,
        uncommon: 0,
        common: 0,
      };
      
      layerDistributions.forEach((layer) => {
        layer.traits.forEach((trait) => {
          traitTierCounts[trait.tier]++;
        });
      });
      
      // Calculate rarity scores for each NFT and assign overall tier
      const nftRarityScores = nfts.map((nft) => {
        const rarityScore = nft.traits.reduce((score, trait) => {
          const layer = layers.find((l) => l.name === trait.layerName);
          if (!layer) return score;
          
          const traitData = layer.traits.find((t) => t.name === trait.traitName);
          if (!traitData) return score;
          
          const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
          const traitRarity = totalRarity > 0 ? traitData.rarity / totalRarity : 1;
          
          // Lower rarity value = rarer = higher score (inverse)
          return score + (1 / traitRarity);
        }, 0);
        
        return {
          nftId: nft.id,
          rarityScore,
          traits: nft.traits.map((t) => t.traitName),
        };
      });
      
      // Normalize scores and assign tiers to NFTs
      const maxScore = Math.max(...nftRarityScores.map((n) => n.rarityScore));
      const minScore = Math.min(...nftRarityScores.map((n) => n.rarityScore));
      const scoreRange = maxScore - minScore || 1;
      
      const nftTierCounts: Record<RarityTier, number> = {
        legendary: 0,
        rare: 0,
        uncommon: 0,
        common: 0,
      };
      
      const nftsWithTiers = nftRarityScores.map((nft) => {
        // Normalize score to 0-100 (higher score = rarer)
        const normalizedScore = ((nft.rarityScore - minScore) / scoreRange) * 100;
        // Convert to "percentage-like" value (lower = rarer for tier assignment)
        const tierPercentage = 100 - normalizedScore;
        const overallTier = getRarityTier(tierPercentage);
        nftTierCounts[overallTier]++;
        
        return {
          ...nft,
          overallTier,
        };
      });
      
      // Get top 10 rarest
      const rarestCombinations = nftsWithTiers
        .sort((a, b) => b.rarityScore - a.rarityScore)
        .slice(0, 10);
      
      // Build tier summary
      const tierSummary: RarityReport["tierSummary"] = [
        { tier: "legendary" as RarityTier, traitCount: traitTierCounts.legendary, nftCount: nftTierCounts.legendary },
        { tier: "rare" as RarityTier, traitCount: traitTierCounts.rare, nftCount: nftTierCounts.rare },
        { tier: "uncommon" as RarityTier, traitCount: traitTierCounts.uncommon, nftCount: nftTierCounts.uncommon },
        { tier: "common" as RarityTier, traitCount: traitTierCounts.common, nftCount: nftTierCounts.common },
      ];
      
      setRarityReport({
        totalGenerated: reportSize,
        layerDistributions,
        rarestCombinations,
        tierSummary,
      });
      
      toast.success(`Generated rarity report for ${reportSize} NFTs`);
    } catch (error) {
      console.error("Failed to generate rarity report:", error);
      toast.error("Failed to generate rarity report");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [layers, totalSupply, generateNFTBatch]);

  // Export rarity report as JSON
  const exportRarityReport = () => {
    if (!rarityReport) return;
    
    const blob = new Blob([JSON.stringify(rarityReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-rarity-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported rarity report");
  };

  // Check if any layer has images
  const hasAnyImages = layers.some((l) => l.traits.some((t) => t.imageUrl));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Generation Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Preview how your NFTs will be generated with current rules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{layers.length}</p>
            <p className="text-xs text-muted-foreground">Layers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {layers.reduce((sum, l) => sum + l.traits.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Traits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{rules.length}</p>
            <p className="text-xs text-muted-foreground">Rules</p>
          </CardContent>
        </Card>
        {duplicatesAvoided > 0 && (
          <Card className="col-span-3 border-primary/50 bg-primary/5">
            <CardContent className="p-3 text-center">
              <p className="text-sm text-primary font-medium">
                ✓ {duplicatesAvoided} duplicate combinations avoided
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Potential Combinations */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Combination Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Supply</span>
            <span className="font-medium">{totalSupply} NFTs</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unique Combinations</span>
            <span className="font-medium">
              {layers.reduce(
                (acc, l) => acc * Math.max(l.traits.length, 1),
                1
              ).toLocaleString()}+
            </span>
          </div>
          {rareTraits.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Rarest Traits:
              </p>
              <div className="flex flex-wrap gap-1">
                {rareTraits.map((trait, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {trait.trait} ({trait.rarity.toFixed(1)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Preview Section */}
      <Tabs defaultValue={hasAnyImages ? "visual" : "text"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="text" className="gap-2">
            <Shuffle className="w-4 h-4" />
            Text
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="rarity" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Rarity
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4 space-y-4">
          {/* Generate Previews */}
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={previewCount}
              onChange={(e) => setPreviewCount(e.target.value)}
              min="1"
              max="20"
              className="w-20"
            />
            <Button onClick={generatePreviews} className="flex-1">
              <Shuffle className="w-4 h-4 mr-2" />
              Generate {previewCount} Previews
            </Button>
          </div>

          {/* Preview Results */}
          {generatedPreviews.length > 0 && (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {generatedPreviews.map((nft) => (
                  <Card key={nft.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-lg font-bold">
                          #{nft.id}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-1">
                            {nft.traits.map((trait, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {trait.layerName}: {trait.traitName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {generatedPreviews.length === 0 && layers.length > 0 && (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click generate to preview NFT combinations
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
          <NFTImageCompositor
            layers={layers}
            rules={rules}
          />
        </TabsContent>

        <TabsContent value="rarity" className="mt-4 space-y-4">
          {/* Generate Report Button */}
          <Button 
            onClick={generateRarityReport} 
            disabled={isGeneratingReport || layers.length === 0}
            className="w-full"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Collection...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Rarity Report ({Math.min(parseInt(totalSupply) || 100, 500)} NFTs)
              </>
            )}
          </Button>

          {rarityReport && (
            <div className="space-y-4">
              {/* Report Summary */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Report Summary</CardTitle>
                    <Button size="sm" variant="outline" onClick={exportRarityReport}>
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyzed <span className="font-semibold text-foreground">{rarityReport.totalGenerated}</span> NFTs across{" "}
                    <span className="font-semibold text-foreground">{rarityReport.layerDistributions.length}</span> layers
                  </p>
                </CardContent>
              </Card>

              {/* Tier Summary */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Rarity Tier Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {rarityReport.tierSummary.map((summary) => {
                      const config = RARITY_TIERS[summary.tier];
                      const Icon = config.icon;
                      const nftPercentage = (summary.nftCount / rarityReport.totalGenerated) * 100;
                      
                      return (
                        <div
                          key={summary.tier}
                          className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            <span className={`font-medium text-sm ${config.color}`}>{config.name}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Traits</span>
                              <span className="font-medium">{summary.traitCount}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">NFTs</span>
                              <span className="font-medium">{summary.nftCount} ({nftPercentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Legendary: ≤5% | Rare: ≤15% | Uncommon: ≤35% | Common: &gt;35%
                  </p>
                </CardContent>
              </Card>

              {/* Trait Distributions */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Trait Distributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-4">
                      {rarityReport.layerDistributions.map((layer) => (
                        <div key={layer.layerName} className="space-y-2">
                          <p className="text-sm font-medium">{layer.layerName}</p>
                          <div className="space-y-2">
                            {layer.traits.map((trait) => {
                              const tierConfig = RARITY_TIERS[trait.tier];
                              
                              return (
                                <div key={trait.traitName} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <RarityBadge tier={trait.tier} showLabel={false} size="sm" />
                                      <span className="text-muted-foreground truncate">{trait.traitName}</span>
                                    </div>
                                    <span className="font-mono shrink-0">
                                      {trait.count} ({trait.percentage.toFixed(1)}%)
                                      {Math.abs(trait.percentage - trait.expectedPercentage) > 5 && (
                                        <span className={trait.percentage < trait.expectedPercentage ? "text-orange-500 ml-1" : "text-green-500 ml-1"}>
                                          {trait.percentage < trait.expectedPercentage ? "↓" : "↑"}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`absolute inset-y-0 left-0 rounded-full ${
                                        trait.tier === "legendary" ? "bg-amber-500" :
                                        trait.tier === "rare" ? "bg-purple-500" :
                                        trait.tier === "uncommon" ? "bg-blue-500" :
                                        "bg-muted-foreground"
                                      }`}
                                      style={{ width: `${Math.min(trait.percentage, 100)}%` }}
                                    />
                                    <div
                                      className="absolute inset-y-0 w-0.5 bg-foreground/50"
                                      style={{ left: `${Math.min(trait.expectedPercentage, 100)}%` }}
                                      title={`Expected: ${trait.expectedPercentage.toFixed(1)}%`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Rarest NFTs */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Top 10 Rarest NFTs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2">
                      {rarityReport.rarestCombinations.map((nft, index) => {
                        const tierConfig = RARITY_TIERS[nft.overallTier];
                        
                        return (
                          <div 
                            key={nft.nftId} 
                            className={`flex items-center gap-3 p-2 rounded-lg border ${tierConfig.bgColor} ${tierConfig.borderColor}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tierConfig.bgColor} ${tierConfig.color} border ${tierConfig.borderColor}`}>
                              #{index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">NFT #{nft.nftId}</p>
                                <RarityBadge tier={nft.overallTier} size="sm" />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {nft.traits.join(", ")}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {nft.rarityScore.toFixed(1)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {!rarityReport && layers.length > 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Generate a rarity report to see trait distribution statistics
              </p>
            </div>
          )}

          {layers.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Add layers and traits first
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="mt-4 space-y-4">
          {/* Export Progress */}
          {isExporting && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{exportStatus}</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(exportProgress)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Export Settings */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Number of NFTs to Generate</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={exportCount}
                    onChange={(e) => setExportCount(e.target.value)}
                    min="1"
                    max="10000"
                    className="w-32"
                    disabled={isExporting}
                  />
                  <span className="text-sm text-muted-foreground">
                    / {totalSupply} total supply
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ZIP Export - Primary Option */}
          <Card className="border-primary/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Archive className="w-4 h-4 text-primary" />
                Download as ZIP
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download your collection as a ZIP file with organized folders for images and metadata, ready for IPFS/Arweave deployment.
              </p>

              <Button 
                onClick={exportAsZip} 
                disabled={isExporting || !hasAnyImages}
                className="w-full gap-2"
                size="lg"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                Download Collection ZIP
              </Button>

              {!hasAnyImages && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  ⚠️ Add images to your traits to enable ZIP export
                </p>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                <p className="text-muted-foreground mb-2">ZIP structure:</p>
                <div className="space-y-0.5 text-foreground">
                  <p>📁 {collectionName.toLowerCase().replace(/\s+/g, "-")}-collection.zip</p>
                  <p className="pl-4">📁 images/</p>
                  <p className="pl-8">🖼️ 1.png, 2.png, ...</p>
                  <p className="pl-4">📁 metadata/</p>
                  <p className="pl-8">📄 1.json, 2.json, ...</p>
                  <p className="pl-4">📄 _collection.json</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Export */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Images className="w-4 h-4" />
                Other Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={exportImagesWithMetadata} 
                  disabled={isExporting || !hasAnyImages}
                  variant="outline"
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderArchive className="w-4 h-4" />
                  )}
                  Full Export (JSON)
                </Button>
                <Button 
                  onClick={downloadIndividualImages} 
                  variant="outline"
                  disabled={isExporting || !hasAnyImages}
                  className="gap-2"
                >
                  <Images className="w-4 h-4" />
                  Download Images Only
                </Button>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Full Export:</strong> JSON file with all metadata + embedded base64 images (up to 100 NFTs)
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Download Images:</strong> Individual PNG files downloaded to your device (up to 20)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Only Export */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Export Metadata Only
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export ERC-721 compatible metadata JSON without images. Use when you have images hosted elsewhere.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={exportAllMetadata} variant="outline" disabled={isExporting} className="gap-2">
                  <Package className="w-4 h-4" />
                  Collection Bundle
                </Button>
                <Button onClick={exportIndividualFiles} variant="outline" disabled={isExporting} className="gap-2">
                  <FileJson className="w-4 h-4" />
                  Individual Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sample Metadata Preview */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Sample Metadata Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {layers.length > 0 && layers.some((l) => l.traits.length > 0) ? (
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-48">
                  {JSON.stringify(
                    nftToMetadata(generateNFTBatch(1)[0] || { id: 1, traits: [] }),
                    null,
                    2
                  )}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add layers and traits to preview metadata format
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
