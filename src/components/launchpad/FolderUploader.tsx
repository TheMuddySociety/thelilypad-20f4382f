import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FolderOpen, FileJson, CheckCircle, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { toast } from 'sonner';

interface FolderUploaderProps {
    onAssetsLoaded: (assets: { name: string; uri: string; file: File }[]) => void;
}

export function FolderUploader({ onAssetsLoaded }: FolderUploaderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ images: 0, jsons: 0, matched: 0 });
    const [files, setFiles] = useState<any[]>([]);

    const processFiles = useCallback(async (fileList: File[]) => {
        setIsLoading(true);
        try {
            const imageMap = new Map<string, File>();
            const jsonMap = new Map<string, File>();

            // Separate images and JSONs
            fileList.forEach(file => {
                // webkitRelativePath example: "my-collection/assets/1.png"
                const pathParts = file.webkitRelativePath.split('/');
                const filename = pathParts[pathParts.length - 1];
                const cleanName = filename.substring(0, filename.lastIndexOf('.'));

                if (file.type.startsWith('image/')) {
                    imageMap.set(cleanName, file);
                } else if (file.name.endsWith('.json')) {
                    jsonMap.set(cleanName, file);
                }
            });

            setStats({
                images: imageMap.size,
                jsons: jsonMap.size,
                matched: 0 // calc below
            });

            // Match pairs
            const matchedAssets: { name: string; uri: string; file: File; jsonFile: File }[] = [];

            for (const [name, imgFile] of imageMap) {
                if (jsonMap.has(name)) {
                    // For now, uri is placeholder. We need to upload these later.
                    // Ideally we simulate the "URI" or just pass the File objects up.
                    // The backend/hook needs to handle IPFS upload.
                    // For this "No Code" user flow, we are preparing them for the "Insert Items" step.
                    // But Insert Items takes strings. 
                    // We might need a separate step to upload files to storage (Arweave/IPFS).

                    // For now, let's assume valid JSONs have the metadata.
                    matchedAssets.push({
                        name: name,
                        // This is a temporary blob URI for preview
                        uri: URL.createObjectURL(imgFile),
                        file: imgFile,
                        jsonFile: jsonMap.get(name)!
                    });
                }
            }

            setStats(prev => ({ ...prev, matched: matchedAssets.length }));

            if (matchedAssets.length === 0) {
                toast.error("No matching image/json pairs found. Ensure filenames match (e.g. 1.png and 1.json)");
            } else {
                toast.success(`Found ${matchedAssets.length} valid asset pairs!`);
                // Pass up the simplified Asset object (usually we need to upload first)
                // We'll pass the files so the parent can handle the upload strategy
                onAssetsLoaded(matchedAssets.map(a => ({
                    name: a.name,
                    uri: a.uri,
                    file: a.file,
                    jsonFile: a.jsonFile
                })));
            }

            setFiles(matchedAssets);

        } catch (e) {
            console.error(e);
            toast.error("Failed to process folder.");
        } finally {
            setIsLoading(false);
        }
    }, [onAssetsLoaded]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: processFiles,
        // @ts-ignore - directory support is non-standard but works in dropzone with custom input attributes
        noClick: false,
        noKeyboard: false
    });

    return (
        <div className="space-y-6">
            <Card className={`border-2 border-dashed transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
                <div {...getRootProps()} className="p-10 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input {...getInputProps({ webkitdirectory: "true" } as any)} />
                    <FolderOpen className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                        {isDragActive ? "Drop folder here..." : "Drag & Drop Collection Folder"}
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                        Upload a folder containing your images and JSON metadata files.
                        We'll automatically match them by filename (e.g., <code>1.png</code> + <code>1.json</code>).
                    </p>
                    <Button variant="outline">Browse Files</Button>
                </div>
            </Card>

            {/* Stats */}
            {(stats.images > 0 || stats.jsons > 0) && (
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">{stats.images}</div>
                            <p className="text-xs text-muted-foreground">Images Found</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">{stats.jsons}</div>
                            <p className="text-xs text-muted-foreground">JSONs Found</p>
                        </CardContent>
                    </Card>
                    <Card className={stats.matched > 0 ? "border-green-500/50 bg-green-500/5" : ""}>
                        <CardContent className="pt-6 text-center">
                            <div className={`text-2xl font-bold ${stats.matched > 0 ? "text-green-500" : ""}`}>
                                {stats.matched}
                            </div>
                            <p className="text-xs text-muted-foreground">Pairs Matched</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Preview */}
            {files.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Asset Preview</CardTitle>
                        <CardDescription>Review matched assets before uploading</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {files.slice(0, 20).map((file) => (
                                    <div key={file.name} className="relative group rounded-lg overflow-hidden border">
                                        <img
                                            src={file.uri}
                                            alt={file.name}
                                            className="w-full h-full aspect-square object-cover"
                                        />
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-xs truncate">
                                            {file.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {files.length > 20 && (
                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    + {files.length - 20} more items...
                                </p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
