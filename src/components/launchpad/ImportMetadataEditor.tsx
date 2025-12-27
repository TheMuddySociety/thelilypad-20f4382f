import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileJson, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { ArtworkTrait, OneOfOneArtwork } from "./ArtworkMetadataEditor";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportMetadataEditorProps {
  artworks: OneOfOneArtwork[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (artworks: OneOfOneArtwork[]) => void;
}

interface ParsedMetadata {
  tokenId?: number;
  name?: string;
  description?: string;
  attributes?: ArtworkTrait[];
}

export function ImportMetadataEditor({
  artworks,
  open,
  onOpenChange,
  onApply,
}: ImportMetadataEditorProps) {
  const [parsedData, setParsedData] = useState<ParsedMetadata[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [matchMode, setMatchMode] = useState<"order" | "tokenId">("order");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      if (file.name.endsWith(".json")) {
        parseJSON(content);
      } else if (file.name.endsWith(".csv")) {
        parseCSV(content);
      } else {
        setParseError("Unsupported file format. Please use .json or .csv files.");
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = "";
  };

  const parseJSON = (content: string) => {
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      
      const parsed: ParsedMetadata[] = items.map((item: any) => ({
        tokenId: item.tokenId ?? item.token_id ?? item.id,
        name: item.name,
        description: item.description,
        attributes: normalizeAttributes(item.attributes ?? item.traits ?? item.properties),
      }));

      setParsedData(parsed);
    } catch (err) {
      setParseError("Invalid JSON format. Please check the file structure.");
    }
  };

  const parseCSV = (content: string) => {
    try {
      const lines = content.trim().split("\n");
      if (lines.length < 2) {
        setParseError("CSV file must have a header row and at least one data row.");
        return;
      }

      // Parse header
      const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const tokenIdIdx = header.findIndex(h => ["tokenid", "token_id", "id", "#"].includes(h));
      const nameIdx = header.findIndex(h => h === "name");
      const descIdx = header.findIndex(h => ["description", "desc"].includes(h));
      
      // Find trait columns (any column that's not tokenId, name, or description)
      const traitColumns: { idx: number; name: string }[] = [];
      header.forEach((h, idx) => {
        if (idx !== tokenIdIdx && idx !== nameIdx && idx !== descIdx && h) {
          traitColumns.push({ idx, name: h });
        }
      });

      const parsed: ParsedMetadata[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        const attributes: ArtworkTrait[] = [];
        
        traitColumns.forEach(({ idx, name }) => {
          const value = values[idx]?.trim();
          if (value) {
            attributes.push({ 
              trait_type: name.charAt(0).toUpperCase() + name.slice(1), 
              value 
            });
          }
        });

        parsed.push({
          tokenId: tokenIdIdx >= 0 ? parseInt(values[tokenIdIdx]) : undefined,
          name: nameIdx >= 0 ? values[nameIdx]?.trim() : undefined,
          description: descIdx >= 0 ? values[descIdx]?.trim() : undefined,
          attributes,
        });
      }

      setParsedData(parsed);
    } catch (err) {
      setParseError("Error parsing CSV. Please check the file format.");
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const normalizeAttributes = (attrs: any): ArtworkTrait[] => {
    if (!attrs) return [];
    if (Array.isArray(attrs)) {
      return attrs.map((a: any) => ({
        trait_type: a.trait_type ?? a.traitType ?? a.type ?? a.key ?? "Unknown",
        value: String(a.value ?? a.val ?? ""),
      })).filter(a => a.value);
    }
    if (typeof attrs === "object") {
      return Object.entries(attrs).map(([key, value]) => ({
        trait_type: key,
        value: String(value),
      }));
    }
    return [];
  };

  const handleApply = () => {
    if (parsedData.length === 0) {
      toast.error("No metadata to import");
      return;
    }

    const updatedArtworks = artworks.map((artwork, index) => {
      let matchingData: ParsedMetadata | undefined;
      
      if (matchMode === "tokenId") {
        matchingData = parsedData.find(p => p.tokenId === index + 1);
      } else {
        matchingData = parsedData[index];
      }

      if (!matchingData) return artwork;

      const existingTraits = artwork.metadata?.traits || [];
      const newTraits = matchingData.attributes || [];
      
      // Merge traits: new traits override existing ones with same type
      const mergedTraits = [...existingTraits];
      newTraits.forEach(newTrait => {
        const existingIdx = mergedTraits.findIndex(
          t => t.trait_type.toLowerCase() === newTrait.trait_type.toLowerCase()
        );
        if (existingIdx >= 0) {
          mergedTraits[existingIdx] = newTrait;
        } else {
          mergedTraits.push(newTrait);
        }
      });

      return {
        ...artwork,
        name: matchingData.name || artwork.name,
        metadata: {
          description: matchingData.description || artwork.metadata?.description || "",
          traits: mergedTraits,
        },
      };
    });

    onApply(updatedArtworks);
    onOpenChange(false);
    
    const matched = matchMode === "tokenId" 
      ? parsedData.filter(p => p.tokenId && p.tokenId <= artworks.length).length
      : Math.min(parsedData.length, artworks.length);
    
    toast.success(`Imported metadata for ${matched} artwork${matched !== 1 ? 's' : ''}`);
    
    // Reset state
    setParsedData([]);
    setFileName("");
    setParseError("");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setParsedData([]);
      setFileName("");
      setParseError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Metadata
          </DialogTitle>
          <DialogDescription>
            Import names, descriptions, and traits from a JSON or CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File format examples */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">JSON Format</span>
              </div>
              <pre className="text-[10px] text-muted-foreground overflow-x-auto">
{`[
  {
    "tokenId": 1,
    "name": "Art #1",
    "description": "...",
    "attributes": [
      {"trait_type": "Artist", "value": "..."}
    ]
  }
]`}
              </pre>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">CSV Format</span>
              </div>
              <pre className="text-[10px] text-muted-foreground overflow-x-auto">
{`tokenId,name,Artist,Rarity
1,Art #1,John,Rare
2,Art #2,Jane,Common`}
              </pre>
            </div>
          </div>

          {/* Upload area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary/50 ${
              fileName ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${fileName ? "text-primary" : "text-muted-foreground"}`} />
            {fileName ? (
              <>
                <p className="font-medium text-sm text-primary">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to select a different file</p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm mb-1">Click to select file</p>
                <p className="text-xs text-muted-foreground">JSON or CSV files supported</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json,.csv"
              className="hidden" 
              onChange={handleFileUpload}
            />
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{parseError}</p>
            </div>
          )}

          {/* Parsed preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Preview ({parsedData.length} entries found)</Label>
              </div>
              
              {/* Match mode */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Match by:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={matchMode === "order" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMatchMode("order")}
                  >
                    File Order
                  </Button>
                  <Button
                    type="button"
                    variant={matchMode === "tokenId" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMatchMode("tokenId")}
                  >
                    Token ID
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[150px] rounded-lg border border-border">
                <div className="p-2 space-y-2">
                  {parsedData.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                      <span className="text-muted-foreground w-8">
                        #{item.tokenId ?? idx + 1}
                      </span>
                      <span className="font-medium truncate flex-1">
                        {item.name || "No name"}
                      </span>
                      {item.attributes && item.attributes.length > 0 && (
                        <span className="text-muted-foreground">
                          {item.attributes.length} trait{item.attributes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      ... and {parsedData.length - 10} more
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Summary */}
          {parsedData.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm">
                Will import metadata for up to{" "}
                <span className="font-medium">
                  {Math.min(parsedData.length, artworks.length)} artwork{Math.min(parsedData.length, artworks.length) !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={parsedData.length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              Import Metadata
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
