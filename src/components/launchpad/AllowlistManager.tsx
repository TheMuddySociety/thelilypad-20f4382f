import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Upload,
  Download,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy,
  X,
  Edit2,
  Shield,
  Hash,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

interface AllowlistEntry {
  id: string;
  walletAddress: string;
  maxMint: number;
  notes?: string;
  addedAt: Date;
}

interface MintPhase {
  id: string;
  name: string;
  entries: AllowlistEntry[];
  merkleRoot?: string;
}

interface MerkleProof {
  address: string;
  proof: string[];
  leaf: string;
}

// Generate leaf for Merkle tree (address only - standard approach)
const generateLeaf = (address: string): Buffer => {
  return keccak256(address.toLowerCase());
};

// Generate leaf with max mint amount for more complex allowlists
const generateLeafWithAmount = (address: string, maxMint: number): Buffer => {
  // Pack address and amount similar to Solidity's abi.encodePacked
  const packed = address.toLowerCase() + maxMint.toString(16).padStart(64, '0');
  return keccak256(packed);
};

interface AllowlistManagerProps {
  collectionId?: string;
  phases?: { id: string; name: string }[];
  onAllowlistChange?: (phases: MintPhase[]) => void;
}

// Validate Ethereum address
const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate ENS name (basic check)
const isValidENS = (name: string): boolean => {
  return /^[a-zA-Z0-9-]+\.eth$/.test(name);
};

export function AllowlistManager({
  collectionId,
  phases: initialPhases = [
    { id: "whitelist", name: "Whitelist" },
    { id: "presale", name: "Presale" },
  ],
  onAllowlistChange,
}: AllowlistManagerProps) {
  const [mintPhases, setMintPhases] = useState<MintPhase[]>(
    initialPhases.map((p) => ({ ...p, entries: [] }))
  );
  const [activePhase, setActivePhase] = useState(initialPhases[0]?.id || "whitelist");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AllowlistEntry | null>(null);

  // Single add form state
  const [newWallet, setNewWallet] = useState("");
  const [newMaxMint, setNewMaxMint] = useState("1");
  const [newNotes, setNewNotes] = useState("");

  // Bulk add form state
  const [bulkInput, setBulkInput] = useState("");
  const [bulkMaxMint, setBulkMaxMint] = useState("1");
  
  // CSV import state
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvImportResults, setCsvImportResults] = useState<{
    valid: { address: string; maxMint: number; notes?: string }[];
    invalid: { line: number; content: string; reason: string }[];
    duplicates: string[];
  } | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  
  // Merkle tree state
  const [isMerkleDialogOpen, setIsMerkleDialogOpen] = useState(false);
  const [merkleIncludeAmount, setMerkleIncludeAmount] = useState(false);
  const [proofSearchAddress, setProofSearchAddress] = useState("");
  const [foundProof, setFoundProof] = useState<MerkleProof | null>(null);

  const currentPhase = mintPhases.find((p) => p.id === activePhase);
  const filteredEntries = currentPhase?.entries.filter(
    (e) =>
      e.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Generate Merkle tree for current phase
  const currentMerkleData = useMemo(() => {
    if (!currentPhase || currentPhase.entries.length === 0) {
      return null;
    }
    
    // Filter only valid ETH addresses
    const validEntries = currentPhase.entries.filter(e => isValidEthAddress(e.walletAddress));
    
    if (validEntries.length === 0) {
      return null;
    }
    
    const leaves = validEntries.map(entry => 
      merkleIncludeAmount 
        ? generateLeafWithAmount(entry.walletAddress, entry.maxMint)
        : generateLeaf(entry.walletAddress)
    );
    
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();
    
    return {
      tree,
      root,
      leaves,
      entries: validEntries,
    };
  }, [currentPhase, merkleIncludeAmount]);
  
  // Generate proof for a specific address
  const generateProofForAddress = useCallback((address: string) => {
    if (!currentMerkleData || !isValidEthAddress(address)) {
      setFoundProof(null);
      return;
    }
    
    const entry = currentMerkleData.entries.find(
      e => e.walletAddress.toLowerCase() === address.toLowerCase()
    );
    
    if (!entry) {
      setFoundProof(null);
      toast.error("Address not found in allowlist");
      return;
    }
    
    const leaf = merkleIncludeAmount
      ? generateLeafWithAmount(entry.walletAddress, entry.maxMint)
      : generateLeaf(entry.walletAddress);
    
    const proof = currentMerkleData.tree.getHexProof(leaf);
    
    setFoundProof({
      address: entry.walletAddress,
      proof,
      leaf: '0x' + leaf.toString('hex'),
    });
    
    toast.success("Proof generated successfully");
  }, [currentMerkleData, merkleIncludeAmount]);
  
  // Export all proofs
  const exportAllProofs = useCallback(() => {
    if (!currentMerkleData || !currentPhase) {
      toast.error("No Merkle tree data available");
      return;
    }
    
    const proofs: { 
      address: string; 
      maxMint: number;
      leaf: string;
      proof: string[];
    }[] = [];
    
    currentMerkleData.entries.forEach((entry) => {
      const leaf = merkleIncludeAmount
        ? generateLeafWithAmount(entry.walletAddress, entry.maxMint)
        : generateLeaf(entry.walletAddress);
      
      const proof = currentMerkleData.tree.getHexProof(leaf);
      
      proofs.push({
        address: entry.walletAddress,
        maxMint: entry.maxMint,
        leaf: '0x' + leaf.toString('hex'),
        proof,
      });
    });
    
    const exportData = {
      phase: currentPhase.name,
      merkleRoot: currentMerkleData.root,
      includesAmount: merkleIncludeAmount,
      totalAddresses: proofs.length,
      generatedAt: new Date().toISOString(),
      proofs,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentPhase.name.toLowerCase()}-merkle-proofs.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${proofs.length} Merkle proofs`);
  }, [currentMerkleData, currentPhase, merkleIncludeAmount]);
  
  // Copy Merkle root to clipboard
  const copyMerkleRoot = useCallback(() => {
    if (!currentMerkleData) return;
    navigator.clipboard.writeText(currentMerkleData.root);
    toast.success("Merkle root copied to clipboard");
  }, [currentMerkleData]);
  
  // Parse CSV file
  const handleCsvFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessingCsv(true);
    setCsvImportResults(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error("CSV file is empty");
          setIsProcessingCsv(false);
          return;
        }
        
        // Detect header row
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('address') || 
                          firstLine.includes('wallet') || 
                          firstLine.includes('max') ||
                          !isValidEthAddress(lines[0].split(',')[0]?.trim() || '');
        
        const dataLines = hasHeader ? lines.slice(1) : lines;
        
        // Get existing addresses for duplicate check
        const existingAddresses = new Set(
          currentPhase?.entries.map(e => e.walletAddress.toLowerCase()) || []
        );
        
        const valid: { address: string; maxMint: number; notes?: string }[] = [];
        const invalid: { line: number; content: string; reason: string }[] = [];
        const duplicates: string[] = [];
        const seenInFile = new Set<string>();
        
        dataLines.forEach((line, index) => {
          const lineNum = hasHeader ? index + 2 : index + 1;
          const trimmedLine = line.trim();
          
          if (!trimmedLine) return;
          
          // Parse CSV columns
          const columns = trimmedLine.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
          const address = columns[0] || '';
          const maxMintStr = columns[1] || '1';
          const notes = columns[2] || '';
          
          // Validate address
          if (!address) {
            invalid.push({ line: lineNum, content: trimmedLine, reason: 'Empty address' });
            return;
          }
          
          if (!isValidEthAddress(address) && !isValidENS(address)) {
            invalid.push({ line: lineNum, content: trimmedLine, reason: 'Invalid address format' });
            return;
          }
          
          // Check for duplicates
          const lowerAddress = address.toLowerCase();
          if (existingAddresses.has(lowerAddress) || seenInFile.has(lowerAddress)) {
            duplicates.push(address);
            return;
          }
          
          seenInFile.add(lowerAddress);
          
          // Parse max mint
          const maxMint = parseInt(maxMintStr) || 1;
          if (maxMint < 1) {
            invalid.push({ line: lineNum, content: trimmedLine, reason: 'Invalid max mint value' });
            return;
          }
          
          valid.push({
            address,
            maxMint,
            notes: notes || undefined,
          });
        });
        
        setCsvImportResults({ valid, invalid, duplicates });
        
        if (valid.length === 0 && invalid.length === 0 && duplicates.length === 0) {
          toast.error("No data found in CSV file");
        }
      } catch (error) {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      } finally {
        setIsProcessingCsv(false);
        // Reset file input
        event.target.value = '';
      }
    };
    
    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsProcessingCsv(false);
    };
    
    reader.readAsText(file);
  }, [currentPhase]);
  
  // Download CSV template
  const downloadCsvTemplate = () => {
    const template = `wallet_address,max_mint,notes
0x1234567890123456789012345678901234567890,3,OG Holder
0xabcdefabcdefabcdefabcdefabcdefabcdefabcd,2,Early Supporter
0x9876543210987654321098765432109876543210,1,Contest Winner`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allowlist-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  // Update parent component
  const updatePhases = useCallback((newPhases: MintPhase[]) => {
    setMintPhases(newPhases);
    onAllowlistChange?.(newPhases);
  }, [onAllowlistChange]);
  
  // Confirm CSV import
  const confirmCsvImport = useCallback(() => {
    if (!csvImportResults || csvImportResults.valid.length === 0) {
      toast.error("No valid entries to import");
      return;
    }
    
    const newEntries: AllowlistEntry[] = csvImportResults.valid.map(item => ({
      id: crypto.randomUUID(),
      walletAddress: item.address,
      maxMint: item.maxMint,
      notes: item.notes,
      addedAt: new Date(),
    }));
    
    const newPhases = mintPhases.map((p) =>
      p.id === activePhase ? { ...p, entries: [...p.entries, ...newEntries] } : p
    );
    
    updatePhases(newPhases);
    setCsvImportResults(null);
    setIsCsvDialogOpen(false);
    toast.success(`Imported ${newEntries.length} wallet addresses`);
  }, [csvImportResults, mintPhases, activePhase, updatePhases]);

  // Add single wallet
  const handleAddWallet = () => {
    const trimmedWallet = newWallet.trim();
    
    if (!trimmedWallet) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!isValidEthAddress(trimmedWallet) && !isValidENS(trimmedWallet)) {
      toast.error("Invalid wallet address or ENS name");
      return;
    }

    // Check for duplicates
    if (currentPhase?.entries.some((e) => e.walletAddress.toLowerCase() === trimmedWallet.toLowerCase())) {
      toast.error("This wallet is already in the allowlist");
      return;
    }

    const newEntry: AllowlistEntry = {
      id: crypto.randomUUID(),
      walletAddress: trimmedWallet,
      maxMint: parseInt(newMaxMint) || 1,
      notes: newNotes.trim() || undefined,
      addedAt: new Date(),
    };

    const newPhases = mintPhases.map((p) =>
      p.id === activePhase ? { ...p, entries: [...p.entries, newEntry] } : p
    );

    updatePhases(newPhases);
    setNewWallet("");
    setNewMaxMint("1");
    setNewNotes("");
    setIsAddDialogOpen(false);
    toast.success("Wallet added to allowlist");
  };

  // Bulk add wallets
  const handleBulkAdd = () => {
    const lines = bulkInput
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      toast.error("No valid addresses found");
      return;
    }

    const validAddresses: string[] = [];
    const invalidAddresses: string[] = [];
    const duplicates: string[] = [];

    const existingAddresses = new Set(
      currentPhase?.entries.map((e) => e.walletAddress.toLowerCase()) || []
    );

    lines.forEach((line) => {
      const address = line.trim();
      if (isValidEthAddress(address) || isValidENS(address)) {
        if (existingAddresses.has(address.toLowerCase()) || validAddresses.includes(address.toLowerCase())) {
          duplicates.push(address);
        } else {
          validAddresses.push(address);
          existingAddresses.add(address.toLowerCase());
        }
      } else {
        invalidAddresses.push(address);
      }
    });

    if (validAddresses.length === 0) {
      toast.error("No valid addresses to add");
      return;
    }

    const newEntries: AllowlistEntry[] = validAddresses.map((address) => ({
      id: crypto.randomUUID(),
      walletAddress: address,
      maxMint: parseInt(bulkMaxMint) || 1,
      addedAt: new Date(),
    }));

    const newPhases = mintPhases.map((p) =>
      p.id === activePhase ? { ...p, entries: [...p.entries, ...newEntries] } : p
    );

    updatePhases(newPhases);
    setBulkInput("");
    setBulkMaxMint("1");
    setIsBulkDialogOpen(false);

    let message = `Added ${validAddresses.length} addresses`;
    if (duplicates.length > 0) {
      message += `, ${duplicates.length} duplicates skipped`;
    }
    if (invalidAddresses.length > 0) {
      message += `, ${invalidAddresses.length} invalid`;
    }
    toast.success(message);
  };

  // Remove wallet
  const handleRemoveWallet = (entryId: string) => {
    const newPhases = mintPhases.map((p) =>
      p.id === activePhase
        ? { ...p, entries: p.entries.filter((e) => e.id !== entryId) }
        : p
    );
    updatePhases(newPhases);
    toast.success("Wallet removed from allowlist");
  };

  // Edit wallet
  const handleEditWallet = () => {
    if (!editingEntry) return;

    const trimmedWallet = editingEntry.walletAddress.trim();
    if (!isValidEthAddress(trimmedWallet) && !isValidENS(trimmedWallet)) {
      toast.error("Invalid wallet address or ENS name");
      return;
    }

    const newPhases = mintPhases.map((p) =>
      p.id === activePhase
        ? {
            ...p,
            entries: p.entries.map((e) =>
              e.id === editingEntry.id ? editingEntry : e
            ),
          }
        : p
    );

    updatePhases(newPhases);
    setEditingEntry(null);
    setIsEditDialogOpen(false);
    toast.success("Entry updated");
  };

  // Clear all entries for current phase
  const handleClearAll = () => {
    const newPhases = mintPhases.map((p) =>
      p.id === activePhase ? { ...p, entries: [] } : p
    );
    updatePhases(newPhases);
    toast.success("Allowlist cleared");
  };

  // Export allowlist
  const handleExport = (format: "csv" | "json") => {
    if (!currentPhase || currentPhase.entries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = "wallet_address,max_mint,notes,added_at";
      const rows = currentPhase.entries.map(
        (e) =>
          `${e.walletAddress},${e.maxMint},"${e.notes || ""}",${e.addedAt.toISOString()}`
      );
      content = [headers, ...rows].join("\n");
      filename = `${currentPhase.name.toLowerCase()}-allowlist.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(
        {
          phase: currentPhase.name,
          totalEntries: currentPhase.entries.length,
          exportedAt: new Date().toISOString(),
          entries: currentPhase.entries.map((e) => ({
            address: e.walletAddress,
            maxMint: e.maxMint,
            notes: e.notes,
          })),
        },
        null,
        2
      );
      filename = `${currentPhase.name.toLowerCase()}-allowlist.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${currentPhase.entries.length} entries as ${format.toUpperCase()}`);
  };

  // Copy all addresses
  const handleCopyAll = () => {
    if (!currentPhase || currentPhase.entries.length === 0) {
      toast.error("No entries to copy");
      return;
    }
    const addresses = currentPhase.entries.map((e) => e.walletAddress).join("\n");
    navigator.clipboard.writeText(addresses);
    toast.success(`Copied ${currentPhase.entries.length} addresses to clipboard`);
  };

  // Add new phase
  const [newPhaseName, setNewPhaseName] = useState("");
  const [isAddPhaseDialogOpen, setIsAddPhaseDialogOpen] = useState(false);

  const handleAddPhase = () => {
    const trimmedName = newPhaseName.trim();
    if (!trimmedName) {
      toast.error("Please enter a phase name");
      return;
    }

    if (mintPhases.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Phase with this name already exists");
      return;
    }

    const newPhase: MintPhase = {
      id: trimmedName.toLowerCase().replace(/\s+/g, "-"),
      name: trimmedName,
      entries: [],
    };

    updatePhases([...mintPhases, newPhase]);
    setNewPhaseName("");
    setIsAddPhaseDialogOpen(false);
    setActivePhase(newPhase.id);
    toast.success(`Added phase: ${trimmedName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Allowlist Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage wallet addresses for whitelist minting phases
          </p>
        </div>
        <Dialog open={isAddPhaseDialogOpen} onOpenChange={setIsAddPhaseDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Phase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Mint Phase</DialogTitle>
              <DialogDescription>
                Create a new allowlist phase for your collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Phase Name</Label>
                <Input
                  placeholder="e.g., OG Holders, Early Access"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPhaseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPhase}>Add Phase</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Phase Tabs */}
      <Tabs value={activePhase} onValueChange={setActivePhase}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {mintPhases.map((phase) => (
            <TabsTrigger key={phase.id} value={phase.id} className="gap-2">
              {phase.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {phase.entries.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {mintPhases.map((phase) => (
          <TabsContent key={phase.id} value={phase.id} className="mt-4 space-y-4">
            {/* Actions Bar */}
            <div className="flex flex-wrap gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Wallet to Allowlist</DialogTitle>
                    <DialogDescription>
                      Add a single wallet address to the {phase.name} phase
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Wallet Address or ENS</Label>
                      <Input
                        placeholder="0x... or name.eth"
                        value={newWallet}
                        onChange={(e) => setNewWallet(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Mint Allowed</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newMaxMint}
                        onChange={(e) => setNewMaxMint(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Input
                        placeholder="e.g., OG holder, Contest winner"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddWallet}>Add Wallet</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="w-4 h-4 mr-1" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Wallets</DialogTitle>
                    <DialogDescription>
                      Paste wallet addresses, one per line or comma-separated
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Wallet Addresses</Label>
                      <Textarea
                        placeholder="0x1234...&#10;0x5678...&#10;0xABCD..."
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {bulkInput.split(/[\n,]/).filter((l) => l.trim()).length} addresses detected
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Mint (applies to all)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={bulkMaxMint}
                        onChange={(e) => setBulkMaxMint(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAdd}>Import All</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* CSV Import Dialog */}
              <Dialog open={isCsvDialogOpen} onOpenChange={(open) => {
                setIsCsvDialogOpen(open);
                if (!open) setCsvImportResults(null);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-1" />
                    CSV Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with wallet addresses. Expected columns: wallet_address, max_mint (optional), notes (optional)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {!csvImportResults ? (
                      <>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleCsvFileUpload}
                            className="hidden"
                            id="csv-upload"
                            disabled={isProcessingCsv}
                          />
                          <label htmlFor="csv-upload" className="cursor-pointer">
                            {isProcessingCsv ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Processing CSV...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-muted-foreground" />
                                <p className="text-sm font-medium">Click to upload CSV file</p>
                                <p className="text-xs text-muted-foreground">
                                  or drag and drop
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadCsvTemplate}
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download CSV Template
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        {/* Import Summary */}
                        <div className="grid grid-cols-3 gap-2">
                          <Card className="border-green-500/30 bg-green-500/5">
                            <CardContent className="p-3 text-center">
                              <p className="text-xl font-bold text-green-600">{csvImportResults.valid.length}</p>
                              <p className="text-xs text-muted-foreground">Valid</p>
                            </CardContent>
                          </Card>
                          <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardContent className="p-3 text-center">
                              <p className="text-xl font-bold text-amber-600">{csvImportResults.duplicates.length}</p>
                              <p className="text-xs text-muted-foreground">Duplicates</p>
                            </CardContent>
                          </Card>
                          <Card className="border-red-500/30 bg-red-500/5">
                            <CardContent className="p-3 text-center">
                              <p className="text-xl font-bold text-red-600">{csvImportResults.invalid.length}</p>
                              <p className="text-xs text-muted-foreground">Invalid</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Valid entries preview */}
                        {csvImportResults.valid.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Valid addresses to import
                            </Label>
                            <ScrollArea className="h-[100px] border rounded p-2">
                              <div className="space-y-1">
                                {csvImportResults.valid.slice(0, 10).map((item, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="font-mono truncate max-w-[200px]">{item.address}</span>
                                    <Badge variant="secondary" className="text-xs">Max: {item.maxMint}</Badge>
                                  </div>
                                ))}
                                {csvImportResults.valid.length > 10 && (
                                  <p className="text-xs text-muted-foreground text-center pt-1">
                                    ...and {csvImportResults.valid.length - 10} more
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {/* Invalid entries */}
                        {csvImportResults.invalid.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Invalid entries (will be skipped)
                            </Label>
                            <ScrollArea className="h-[80px] border border-red-500/20 rounded p-2 bg-red-500/5">
                              <div className="space-y-1">
                                {csvImportResults.invalid.slice(0, 5).map((item, i) => (
                                  <div key={i} className="text-xs">
                                    <span className="text-muted-foreground">Line {item.line}:</span>{" "}
                                    <span className="text-red-600">{item.reason}</span>
                                  </div>
                                ))}
                                {csvImportResults.invalid.length > 5 && (
                                  <p className="text-xs text-muted-foreground">
                                    ...and {csvImportResults.invalid.length - 5} more
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setCsvImportResults(null)}
                            className="flex-1"
                          >
                            Upload Different File
                          </Button>
                          <Button
                            onClick={confirmCsvImport}
                            disabled={csvImportResults.valid.length === 0}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Import {csvImportResults.valid.length} Addresses
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setIsCsvDialogOpen(false);
                      setCsvImportResults(null);
                    }}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="flex-1" />

              <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport("json")}>
                <FileText className="w-4 h-4 mr-1" />
                JSON
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyAll}>
                <Copy className="w-4 h-4 mr-1" />
                Copy All
              </Button>
              {phase.entries.length > 0 && (
                <Button size="sm" variant="destructive" onClick={handleClearAll}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by address or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{phase.entries.length}</p>
                  <p className="text-xs text-muted-foreground">Total Wallets</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">
                    {phase.entries.reduce((sum, e) => sum + e.maxMint, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Allocation</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">
                    {phase.entries.length > 0
                      ? (phase.entries.reduce((sum, e) => sum + e.maxMint, 0) / phase.entries.length).toFixed(1)
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg per Wallet</p>
                </CardContent>
              </Card>
            </div>

            {/* Merkle Tree Section */}
            {phase.entries.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Merkle Tree Verification
                    </CardTitle>
                    <Dialog open={isMerkleDialogOpen} onOpenChange={setIsMerkleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Hash className="w-4 h-4 mr-1" />
                          Get Proof
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Generate Merkle Proof</DialogTitle>
                          <DialogDescription>
                            Get the Merkle proof for a specific wallet address for on-chain verification
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Wallet Address</Label>
                            <Input
                              placeholder="0x..."
                              value={proofSearchAddress}
                              onChange={(e) => setProofSearchAddress(e.target.value)}
                              className="font-mono"
                            />
                          </div>
                          <Button 
                            onClick={() => generateProofForAddress(proofSearchAddress)}
                            disabled={!proofSearchAddress}
                            className="w-full"
                          >
                            Generate Proof
                          </Button>
                          
                          {foundProof && (
                            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Address</Label>
                                <p className="font-mono text-xs break-all">{foundProof.address}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Leaf Hash</Label>
                                <p className="font-mono text-xs break-all">{foundProof.leaf}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Proof ({foundProof.proof.length} elements)</Label>
                                <ScrollArea className="h-[100px]">
                                  <div className="space-y-1">
                                    {foundProof.proof.map((p, i) => (
                                      <p key={i} className="font-mono text-xs break-all bg-background/50 p-1 rounded">
                                        {p}
                                      </p>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(foundProof.proof));
                                  toast.success("Proof copied to clipboard");
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy Proof Array
                              </Button>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsMerkleDialogOpen(false)}>
                            Close
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentMerkleData ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="include-amount"
                            checked={merkleIncludeAmount}
                            onChange={(e) => setMerkleIncludeAmount(e.target.checked)}
                            className="rounded border-input"
                          />
                          <Label htmlFor="include-amount" className="text-xs cursor-pointer">
                            Include max mint amount in leaf hash
                          </Label>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Merkle Root</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all border">
                            {currentMerkleData.root}
                          </code>
                          <Button size="icon" variant="outline" className="shrink-0 h-8 w-8" onClick={copyMerkleRoot}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        {currentMerkleData.entries.length} valid addresses included
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={exportAllProofs} className="flex-1">
                          <Download className="w-3 h-3 mr-1" />
                          Export All Proofs
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Use this Merkle root in your smart contract to verify allowlist membership.
                        The proof array can be used with OpenZeppelin's MerkleProof library.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Add valid wallet addresses to generate a Merkle tree
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Entries Table */}
            {filteredEntries.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Wallet Address</TableHead>
                          <TableHead className="w-24 text-center">Max Mint</TableHead>
                          <TableHead className="w-32">Notes</TableHead>
                          <TableHead className="w-20 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                {isValidEthAddress(entry.walletAddress) ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                )}
                                <span className="truncate max-w-[200px]">
                                  {entry.walletAddress}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{entry.maxMint}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
                                {entry.notes || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingEntry(entry);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveWallet(entry.id)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery
                      ? "No wallets match your search"
                      : "No wallets in this allowlist yet"}
                  </p>
                  {!searchQuery && (
                    <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Wallet
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allowlist Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={editingEntry.walletAddress}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, walletAddress: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Mint Allowed</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingEntry.maxMint}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      maxMint: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editingEntry.notes || ""}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, notes: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWallet}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
