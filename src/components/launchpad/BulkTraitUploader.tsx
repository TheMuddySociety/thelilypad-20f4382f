import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FolderOpen,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Zap,
  Trash2,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trait } from "./LayerManager";
import { useContentModeration } from "@/hooks/useContentModeration";
import { toast } from "sonner";

interface BulkTraitUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerName: string;
  existingTraits: Trait[];
  onTraitsAdd: (traits: Trait[]) => void;
}

interface PendingTrait {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  rarity: number;
  status: "pending" | "ready" | "duplicate" | "scanning" | "blocked" | "flagged";
  moderationReason?: string;
}

interface ScanCacheEntry {
  allowed: boolean;
  reason?: string;
}

// Generate a simple hash from file content for caching
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export function BulkTraitUploader({
  open,
  onOpenChange,
  layerName,
  existingTraits,
  onTraitsAdd,
}: BulkTraitUploaderProps) {
  const [pendingTraits, setPendingTraits] = useState<PendingTrait[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0 });
  const [concurrencyLimit, setConcurrencyLimit] = useState(5);
  const [cacheHits, setCacheHits] = useState(0);
  const [skipModeration, setSkipModeration] = useState(true); // Default to skip for speed
  const scanCacheRef = useRef<Map<string, ScanCacheEntry>>(new Map());
  const { moderateImage, isChecking } = useContentModeration();

  const cleanFileName = (filename: string): string => {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    // Replace underscores and dashes with spaces, then capitalize each word
    return nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = useCallback(
    async (files: FileList | File[], currentConcurrency: number, shouldSkipModeration: boolean) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      const existingNames = new Set([
        ...existingTraits.map((t) => t.name.toLowerCase()),
        ...pendingTraits.map((t) => t.name.toLowerCase()),
      ]);

      // Add all files - if skipping moderation, mark as ready immediately
      const newPending: PendingTrait[] = imageFiles.map((file) => {
        const name = cleanFileName(file.name);
        const isDuplicate = existingNames.has(name.toLowerCase());
        existingNames.add(name.toLowerCase());

        return {
          id: crypto.randomUUID(),
          file,
          name,
          previewUrl: URL.createObjectURL(file),
          rarity: Math.round(100 / (existingTraits.length + imageFiles.length)),
          status: isDuplicate ? "duplicate" : shouldSkipModeration ? "ready" : "scanning",
        };
      });

      setPendingTraits((prev) => [...prev, ...newPending]);

      // If skipping moderation, we're done
      if (shouldSkipModeration) {
        toast.success(`Added ${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''} (moderation skipped)`);
        return;
      }

      // Now scan each image for inappropriate content in parallel
      const toScan = newPending.filter((t) => t.status !== "duplicate" && t.status !== "ready");
      if (toScan.length === 0) return;
      
      setIsScanning(true);
      setScanProgress({ scanned: 0, total: toScan.length });
      
      const CONCURRENCY = currentConcurrency;
      let scannedCount = 0;
      let sessionCacheHits = 0;
      
      const scanTrait = async (trait: PendingTrait) => {
        try {
          // Check cache first
          const fileHash = await generateFileHash(trait.file);
          const cachedResult = scanCacheRef.current.get(fileHash);
          
          if (cachedResult) {
            // Use cached result
            sessionCacheHits++;
            setCacheHits(prev => prev + 1);
            
            setPendingTraits((prev) =>
              prev.map((t) =>
                t.id === trait.id
                  ? {
                      ...t,
                      status: cachedResult.allowed ? "ready" : "blocked",
                      moderationReason: cachedResult.reason,
                    }
                  : t
              )
            );
            
            if (!cachedResult.allowed) {
              toast.error(`"${trait.name}" blocked: ${cachedResult.reason}`);
            }
            return;
          }
          
          // Not cached, perform scan
          const base64 = await fileToBase64(trait.file);
          const result = await moderateImage(base64, trait.name);
          
          // Cache the result
          scanCacheRef.current.set(fileHash, {
            allowed: result.allowed,
            reason: result.reason,
          });
          
          setPendingTraits((prev) =>
            prev.map((t) =>
              t.id === trait.id
                ? {
                    ...t,
                    status: result.allowed ? "ready" : "blocked",
                    moderationReason: result.reason,
                  }
                : t
            )
          );
          
          if (!result.allowed) {
            toast.error(`"${trait.name}" blocked: ${result.reason}`);
          }
        } catch (err) {
          console.error("Moderation error for", trait.name, err);
          setPendingTraits((prev) =>
            prev.map((t) =>
              t.id === trait.id ? { ...t, status: "ready" } : t
            )
          );
        } finally {
          scannedCount++;
          setScanProgress({ scanned: scannedCount, total: toScan.length });
        }
      };
      
      // Process in batches with concurrency limit
      for (let i = 0; i < toScan.length; i += CONCURRENCY) {
        const batch = toScan.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(scanTrait));
      }
      
      if (sessionCacheHits > 0) {
        toast.success(`${sessionCacheHits} image${sessionCacheHits > 1 ? 's' : ''} loaded from cache`);
      }
      
      setIsScanning(false);
      setScanProgress({ scanned: 0, total: 0 });
    },
    [existingTraits, pendingTraits, moderateImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const files: File[] = [];

      // Handle folder drops
      const processEntry = async (entry: FileSystemEntry): Promise<void> => {
        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          return new Promise((resolve) => {
            fileEntry.file((file) => {
              if (file.type.startsWith("image/")) {
                files.push(file);
              }
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry;
          const reader = dirEntry.createReader();
          return new Promise((resolve) => {
            reader.readEntries(async (entries) => {
              await Promise.all(entries.map(processEntry));
              resolve();
            });
          });
        }
      };

      const processItems = async () => {
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry();
          if (entry) entries.push(entry);
        }

        if (entries.length > 0) {
          await Promise.all(entries.map(processEntry));
          if (files.length > 0) {
            processFiles(files, concurrencyLimit, skipModeration);
          }
        } else {
          // Fallback for simple file drops
          processFiles(e.dataTransfer.files, concurrencyLimit, skipModeration);
        }
      };

      processItems();
    },
    [processFiles, concurrencyLimit, skipModeration]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files, concurrencyLimit, skipModeration);
      }
    },
    [processFiles, concurrencyLimit, skipModeration]
  );

  const updatePendingTrait = (id: string, updates: Partial<PendingTrait>) => {
    setPendingTraits((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const removePendingTrait = (id: string) => {
    setPendingTraits((prev) => {
      const trait = prev.find((t) => t.id === id);
      if (trait) {
        URL.revokeObjectURL(trait.previewUrl);
      }
      return prev.filter((t) => t.id !== id);
    });
  };

  const handleConfirm = async () => {
    const readyTraits = pendingTraits.filter((t) => t.status === "ready");

    // Convert files to base64 for storage
    const newTraits: Trait[] = await Promise.all(
      readyTraits.map(async (pt) => {
        const base64 = await fileToBase64(pt.file);
        return {
          id: pt.id,
          name: pt.name,
          preview: base64,
          imageUrl: base64,
          rarity: pt.rarity,
        };
      })
    );

    onTraitsAdd(newTraits);

    // Clean up
    pendingTraits.forEach((t) => URL.revokeObjectURL(t.previewUrl));
    setPendingTraits([]);
    onOpenChange(false);
  };


  const handleClose = () => {
    pendingTraits.forEach((t) => URL.revokeObjectURL(t.previewUrl));
    setPendingTraits([]);
    onOpenChange(false);
  };

  const readyCount = pendingTraits.filter((t) => t.status === "ready").length;
  const duplicateCount = pendingTraits.filter(
    (t) => t.status === "duplicate"
  ).length;
  const blockedCount = pendingTraits.filter((t) => t.status === "blocked").length;
  const scanningCount = pendingTraits.filter((t) => t.status === "scanning").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Bulk Upload Traits - {layerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <p className="font-medium mb-1">
              {isDragging
                ? "Drop images here..."
                : "Drag & drop images or a folder"}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Supports PNG, JPG, WEBP • Names auto-generated from filenames
            </p>
            <Button
              variant="outline"
              onClick={() => document.getElementById("bulk-file-input")?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
            <input
              id="bulk-file-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Speed Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className={`w-4 h-4 ${skipModeration ? 'text-muted-foreground' : 'text-green-500'}`} />
              <div className="space-y-0.5">
                <Label htmlFor="skip-moderation" className="text-sm font-medium cursor-pointer">
                  {skipModeration ? "Fast Mode (No Scanning)" : "Safe Mode (Content Moderation)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {skipModeration 
                    ? "Images added instantly without AI content checks" 
                    : "Each image is scanned for inappropriate content"}
                </p>
              </div>
            </div>
            <Switch
              id="skip-moderation"
              checked={!skipModeration}
              onCheckedChange={(checked) => setSkipModeration(!checked)}
              disabled={isScanning}
            />
          </div>

          {/* Concurrency Slider - Only show when moderation enabled */}
          {!skipModeration && (
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Zap className="w-4 h-4" />
                <span>Scan Speed:</span>
              </div>
              <Slider
                value={[concurrencyLimit]}
                onValueChange={([value]) => setConcurrencyLimit(value)}
                min={1}
                max={10}
                step={1}
                disabled={isScanning}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-right">
                {concurrencyLimit} {concurrencyLimit === 1 ? "image" : "images"}
              </span>
              {cacheHits > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    {cacheHits} cached
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      scanCacheRef.current.clear();
                      setCacheHits(0);
                      toast.success("Scan cache cleared");
                    }}
                    disabled={isScanning}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pending Traits */}
          {pendingTraits.length > 0 && (
            <>
              {/* Batch Progress Indicator */}
              {isScanning && scanProgress.total > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="font-medium">Scanning for inappropriate content...</span>
                    </div>
                    <span className="text-muted-foreground">
                      {scanProgress.scanned} / {scanProgress.total}
                    </span>
                  </div>
                  <Progress 
                    value={(scanProgress.scanned / scanProgress.total) * 100} 
                    className="h-2"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{pendingTraits.length} files</Badge>
                  {scanningCount > 0 && (
                    <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {scanningCount} scanning
                    </Badge>
                  )}
                  {readyCount > 0 && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <Check className="w-3 h-3 mr-1" />
                      {readyCount} ready
                    </Badge>
                  )}
                  {blockedCount > 0 && (
                    <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      {blockedCount} blocked
                    </Badge>
                  )}
                  {duplicateCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-yellow-600 border-yellow-500/30"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {duplicateCount} duplicates
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    pendingTraits.forEach((t) => URL.revokeObjectURL(t.previewUrl));
                    setPendingTraits([]);
                  }}
                >
                  Clear All
                </Button>
              </div>

              <ScrollArea className="flex-1 max-h-[280px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pendingTraits.map((trait) => (
                    <Card
                      key={trait.id}
                      className={`overflow-hidden ${
                        trait.status === "duplicate"
                          ? "border-yellow-500/50"
                          : trait.status === "blocked"
                          ? "border-red-500/50 opacity-60"
                          : trait.status === "scanning"
                          ? "border-blue-500/50"
                          : ""
                      }`}
                    >
                      <div className="aspect-square relative bg-muted/30">
                        <img
                          src={trait.previewUrl}
                          alt={trait.name}
                          className={`w-full h-full object-cover ${
                            trait.status === "blocked" ? "blur-sm" : ""
                          }`}
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removePendingTrait(trait.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        {trait.status === "scanning" && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                        {trait.status === "blocked" && (
                          <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center">
                            <div className="text-center p-2">
                              <ShieldAlert className="w-6 h-6 text-red-500 mx-auto mb-1" />
                              <span className="text-[10px] text-red-400 block">
                                {trait.moderationReason || "Blocked"}
                              </span>
                            </div>
                          </div>
                        )}
                        {trait.status === "duplicate" && (
                          <div className="absolute bottom-1 left-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                            >
                              Duplicate
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <input
                          type="text"
                          value={trait.name}
                          onChange={(e) =>
                            updatePendingTrait(trait.id, {
                              name: e.target.value,
                              status:
                                existingTraits.some(
                                  (t) =>
                                    t.name.toLowerCase() ===
                                    e.target.value.toLowerCase()
                                )
                                  ? "duplicate"
                                  : "ready",
                            })
                          }
                          className="w-full text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                        />
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            Rarity:
                          </span>
                          <input
                            type="number"
                            value={trait.rarity}
                            onChange={(e) =>
                              updatePendingTrait(trait.id, {
                                rarity: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-12 text-[10px] bg-muted/50 border-none rounded px-1"
                            min={0}
                            max={100}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            %
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={readyCount === 0 || isScanning}>
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Add {readyCount} Trait{readyCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
