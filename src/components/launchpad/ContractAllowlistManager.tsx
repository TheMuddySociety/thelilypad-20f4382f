import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { toast } from "sonner";
import {
  Users,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { keccak_256 } from "js-sha3";
import MerkleTree from "merkletreejs";

interface Phase {
  id: string;
  name: string;
  requiresAllowlist: boolean;
}

interface AllowlistEntry {
  id: string;
  wallet_address: string;
  phase_name: string;
  max_mint: number | null;
  notes: string | null;
  created_at: string;
}

interface ContractAllowlistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  contractAddress: string | null;
  phases: Phase[];
  creatorId: string;
}

export const ContractAllowlistManager: React.FC<ContractAllowlistManagerProps> = ({
  open,
  onOpenChange,
  collectionId,
  contractAddress,
  phases,
  creatorId,
}) => {
  const { address: userAddress } = useWallet();
  
  const [activePhase, setActivePhaseState] = useState(phases[0]?.id || "");
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newMaxMint, setNewMaxMint] = useState("1");
  const [bulkAddresses, setBulkAddresses] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const allowlistPhases = phases.filter(p => p.requiresAllowlist);
  const currentEntries = entries.filter(e => e.phase_name === activePhase);

  // Load allowlist entries from database
  useEffect(() => {
    if (open && collectionId) {
      loadEntries();
    }
  }, [open, collectionId]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("allowlist_entries")
        .select("*")
        .eq("collection_id", collectionId);
      
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Failed to load entries:", err);
      toast.error("Failed to load allowlist entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newAddress || !newAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("allowlist_entries").insert({
        collection_id: collectionId,
        wallet_address: newAddress.trim(),
        phase_name: activePhase,
        max_mint: parseInt(newMaxMint) || 1,
        created_by: creatorId,
      });

      if (error) throw error;
      
      toast.success("Address added to allowlist");
      setNewAddress("");
      loadEntries();
    } catch (err) {
      console.error("Failed to add entry:", err);
      toast.error("Failed to add address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    const addresses = bulkAddresses
      .split(/[\n,]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);

    if (addresses.length === 0) {
      toast.error("No valid addresses found");
      return;
    }

    setIsSaving(true);
    try {
      const entries = addresses.map(addr => ({
        collection_id: collectionId,
        wallet_address: addr,
        phase_name: activePhase,
        max_mint: 1,
        created_by: creatorId,
      }));

      const { error } = await supabase.from("allowlist_entries").insert(entries);

      if (error) throw error;
      
      toast.success(`Added ${addresses.length} addresses to allowlist`);
      setBulkAddresses("");
      loadEntries();
    } catch (err) {
      console.error("Failed to bulk add:", err);
      toast.error("Failed to add addresses");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("allowlist_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;
      
      toast.success("Address removed from allowlist");
      loadEntries();
    } catch (err) {
      console.error("Failed to delete entry:", err);
      toast.error("Failed to remove address");
    }
  };

  const generateMerkleRoot = () => {
    if (currentEntries.length === 0) {
      toast.error("No addresses to generate merkle root from");
      return;
    }

    const leaves = currentEntries.map(entry => 
      Buffer.from(keccak_256(entry.wallet_address.toLowerCase()), 'hex')
    );

    const tree = new MerkleTree(leaves, keccak_256, { sortPairs: true });
    const root = tree.getHexRoot();

    navigator.clipboard.writeText(root);
    toast.success("Merkle root copied to clipboard!");
  };

  const exportAddresses = () => {
    const csv = currentEntries.map(e => e.wallet_address).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allowlist-${activePhase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manage Allowlist
          </DialogTitle>
          <DialogDescription>
            Add wallet addresses to the allowlist for presale phases
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Phase Selector */}
          {allowlistPhases.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {allowlistPhases.map(phase => (
                <Button
                  key={phase.id}
                  variant={activePhase === phase.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePhaseState(phase.id)}
                >
                  {phase.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {entries.filter(e => e.phase_name === phase.id).length}
                  </Badge>
                </Button>
              ))}
            </div>
          )}

          {allowlistPhases.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                No phases require allowlist. Enable allowlist on a phase to manage entries.
              </span>
            </div>
          )}

          {/* Add Single Address */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Wallet address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Input
                type="number"
                placeholder="Max"
                value={newMaxMint}
                onChange={(e) => setNewMaxMint(e.target.value)}
                className="w-20"
                min={1}
              />
              <Button onClick={handleAddEntry} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Bulk Add */}
          <div className="space-y-2">
            <Textarea
              placeholder="Bulk add addresses (one per line or comma-separated)"
              value={bulkAddresses}
              onChange={(e) => setBulkAddresses(e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleBulkAdd}
              disabled={isSaving || !bulkAddresses.trim()}
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Add Addresses
            </Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateMerkleRoot} disabled={currentEntries.length === 0}>
              Generate Merkle Root
            </Button>
            <Button variant="outline" size="sm" onClick={exportAddresses} disabled={currentEntries.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Entry List */}
          <ScrollArea className="flex-1 max-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : currentEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No addresses in allowlist for this phase
              </div>
            ) : (
              <div className="space-y-2">
                {currentEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <code className="text-xs">
                        {entry.wallet_address.slice(0, 8)}...{entry.wallet_address.slice(-6)}
                      </code>
                      <Badge variant="secondary" className="text-xs">
                        Max: {entry.max_mint || 1}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractAllowlistManager;
