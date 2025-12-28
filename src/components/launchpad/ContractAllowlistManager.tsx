import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useContractAllowlist } from "@/hooks/useContractAllowlist";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";

interface Phase {
  id: string;
  name: string;
  price: string;
  maxPerWallet: number;
  supply: number;
  requiresAllowlist: boolean;
}

interface AllowlistEntry {
  id: string;
  wallet_address: string;
  max_mint: number;
  notes: string | null;
  phase_name: string;
}

interface ContractAllowlistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  contractAddress: string | null;
  phases: Phase[];
  creatorId: string;
}

const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const ContractAllowlistManager: React.FC<ContractAllowlistManagerProps> = ({
  open,
  onOpenChange,
  collectionId,
  contractAddress,
  phases,
  creatorId,
}) => {
  const { currentChain, address: userAddress } = useWallet();
  const { isUpdating, txHash, error, setAllowlist, configurePhase, resetState } = useContractAllowlist(contractAddress);
  
  const [activePhase, setActivePhaseState] = useState(phases[0]?.id || "");
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newMaxMint, setNewMaxMint] = useState("1");
  const [bulkAddresses, setBulkAddresses] = useState("");
  const [pendingAddresses, setPendingAddresses] = useState<string[]>([]);

  const allowlistPhases = phases.filter(p => p.requiresAllowlist);
  const currentPhaseData = phases.find(p => p.id === activePhase);
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
      console.error("Error loading allowlist:", err);
      toast.error("Failed to load allowlist");
    } finally {
      setIsLoading(false);
    }
  };

  const addSingleAddress = async () => {
    if (!isValidEthAddress(newAddress)) {
      toast.error("Invalid wallet address");
      return;
    }

    const exists = currentEntries.some(
      e => e.wallet_address.toLowerCase() === newAddress.toLowerCase()
    );
    if (exists) {
      toast.error("Address already in allowlist");
      return;
    }

    try {
      const { error } = await supabase.from("allowlist_entries").insert({
        collection_id: collectionId,
        wallet_address: newAddress,
        max_mint: parseInt(newMaxMint) || 1,
        phase_name: activePhase,
        created_by: creatorId,
      });

      if (error) throw error;

      setPendingAddresses(prev => [...prev, newAddress.toLowerCase()]);
      await loadEntries();
      setNewAddress("");
      toast.success("Address added to allowlist");
    } catch (err) {
      console.error("Error adding address:", err);
      toast.error("Failed to add address");
    }
  };

  const addBulkAddresses = async () => {
    const addresses = bulkAddresses
      .split(/[\n,]/)
      .map(a => a.trim())
      .filter(a => isValidEthAddress(a));

    if (addresses.length === 0) {
      toast.error("No valid addresses found");
      return;
    }

    // Filter out duplicates
    const existingSet = new Set(currentEntries.map(e => e.wallet_address.toLowerCase()));
    const newAddresses = addresses.filter(a => !existingSet.has(a.toLowerCase()));

    if (newAddresses.length === 0) {
      toast.error("All addresses already in allowlist");
      return;
    }

    try {
      const insertData = newAddresses.map(addr => ({
        collection_id: collectionId,
        wallet_address: addr,
        max_mint: 1,
        phase_name: activePhase,
        created_by: creatorId,
      }));

      const { error } = await supabase.from("allowlist_entries").insert(insertData);

      if (error) throw error;

      setPendingAddresses(prev => [...prev, ...newAddresses.map(a => a.toLowerCase())]);
      await loadEntries();
      setBulkAddresses("");
      toast.success(`Added ${newAddresses.length} addresses`);
    } catch (err) {
      console.error("Error adding addresses:", err);
      toast.error("Failed to add addresses");
    }
  };

  const removeAddress = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("allowlist_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;
      await loadEntries();
      toast.success("Address removed");
    } catch (err) {
      console.error("Error removing address:", err);
      toast.error("Failed to remove address");
    }
  };

  const syncToContract = async () => {
    if (!contractAddress) {
      toast.error("No contract deployed");
      return;
    }

    const addresses = currentEntries.map(e => e.wallet_address);
    if (addresses.length === 0) {
      toast.error("No addresses to sync");
      return;
    }

    // Map phase id to phase index (0, 1, 2, etc.)
    const phaseIndex = phases.findIndex(p => p.id === activePhase);
    if (phaseIndex === -1) {
      toast.error("Invalid phase");
      return;
    }

    const txHash = await setAllowlist(addresses, phaseIndex);
    if (txHash) {
      setPendingAddresses([]);
      toast.success("Allowlist synced to contract!");
    }
  };

  const syncPhaseConfig = async () => {
    if (!contractAddress || !currentPhaseData) {
      toast.error("No contract or phase data");
      return;
    }

    const phaseIndex = phases.findIndex(p => p.id === activePhase);
    if (phaseIndex === -1) {
      toast.error("Invalid phase");
      return;
    }

    const txHash = await configurePhase(
      phaseIndex,
      currentPhaseData.price,
      currentPhaseData.maxPerWallet,
      currentPhaseData.supply,
      currentPhaseData.requiresAllowlist
    );

    if (txHash) {
      toast.success("Phase configuration synced to contract!");
    }
  };

  const explorerUrl = currentChain.blockExplorers?.default?.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Allowlist Manager
          </DialogTitle>
          <DialogDescription>
            Manage allowlist for mint phases and sync to smart contract
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Phase Selector */}
          {allowlistPhases.length > 0 ? (
            <Tabs value={activePhase} onValueChange={setActivePhaseState}>
              <TabsList className="w-full">
                {allowlistPhases.map(phase => (
                  <TabsTrigger key={phase.id} value={phase.id} className="flex-1">
                    {phase.name}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {entries.filter(e => e.phase_name === phase.id).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>No phases require allowlist</p>
            </div>
          )}

          {allowlistPhases.length > 0 && (
            <>
              {/* Contract Status */}
              {contractAddress && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Contract deployed</span>
                        {pendingAddresses.length > 0 && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            {pendingAddresses.length} pending sync
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={syncPhaseConfig}
                          disabled={isUpdating}
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Sync Phase Config
                        </Button>
                        <Button
                          size="sm"
                          onClick={syncToContract}
                          disabled={isUpdating || currentEntries.length === 0}
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                          Sync Allowlist
                        </Button>
                      </div>
                    </div>
                    {txHash && (
                      <div className="mt-2 text-xs">
                        <a
                          href={`${explorerUrl}/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View transaction <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {error && (
                      <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!contractAddress && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 text-sm text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Deploy contract first to sync allowlist on-chain</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Addresses */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Single Add */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Single Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Wallet Address</Label>
                        <Input
                          placeholder="0x..."
                          value={newAddress}
                          onChange={e => setNewAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max Mint</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newMaxMint}
                          onChange={e => setNewMaxMint(e.target.value)}
                        />
                      </div>
                      <Button size="sm" className="w-full" onClick={addSingleAddress}>
                        Add Address
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Bulk Add */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Bulk Add
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Addresses (one per line or comma-separated)</Label>
                        <Textarea
                          placeholder="0x123...
0x456...
0x789..."
                          value={bulkAddresses}
                          onChange={e => setBulkAddresses(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button size="sm" className="w-full" onClick={addBulkAddresses}>
                        Add All
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Current Entries */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">
                    Allowlist ({currentEntries.length} addresses)
                  </h4>
                </div>
                <ScrollArea className="h-[200px] border rounded-lg">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : currentEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No addresses in this phase
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {currentEntries.map(entry => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <code className="text-xs">
                              {entry.wallet_address.slice(0, 8)}...{entry.wallet_address.slice(-6)}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              Max: {entry.max_mint}
                            </Badge>
                            {pendingAddresses.includes(entry.wallet_address.toLowerCase()) && (
                              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => removeAddress(entry.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
