import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Plus, Trash2, Search, Loader2, Award, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface Collection {
  id: string;
  name: string;
  symbol: string;
  image_url: string | null;
  creator_id: string;
  creator_address: string;
  minted: number;
  total_supply: number;
  status: string;
}

interface BuybackProgramCollection {
  id: string;
  collection_id: string;
  added_by: string;
  added_at: string;
  reason: string | null;
  is_active: boolean;
  notified_creator: boolean;
  collection: Collection;
}

export function BuybackProgramManager() {
  const [programCollections, setProgramCollections] = useState<BuybackProgramCollection[]>([]);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [addReason, setAddReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch program collections
      const { data: programData, error: programError } = await supabase
        .from('buyback_program_collections')
        .select(`
          *,
          collection:collections(*)
        `)
        .order('added_at', { ascending: false });

      if (programError) {
        console.error('Error fetching program collections:', programError);
      } else {
        setProgramCollections(programData || []);
      }

      // Fetch all live collections not already in program
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('status', 'live')
        .is('deleted_at', null)
        .order('name');

      if (collectionsError) {
        console.error('Error fetching collections:', collectionsError);
      } else {
        // Filter out collections already in program
        const programIds = new Set(programData?.map(p => p.collection_id) || []);
        setAvailableCollections(
          (collectionsData || []).filter(c => !programIds.has(c.id))
        );
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToProgram = async () => {
    if (!selectedCollection) return;

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Add to buyback program
      const { error: insertError } = await supabase
        .from('buyback_program_collections')
        .insert({
          collection_id: selectedCollection.id,
          added_by: user.id,
          reason: addReason.trim() || null,
        });

      if (insertError) throw insertError;

      // Create notification for the creator
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedCollection.creator_id,
          type: 'buyback_program',
          title: '🎉 Congratulations! You\'re in the Buyback Program!',
          message: `Your collection "${selectedCollection.name}" has been selected by The Lily Pad team for the Buyback Program! Top volume movers in this program will receive buyback rewards.`,
          link: `/collection/${selectedCollection.id}`,
          metadata: {
            collection_id: selectedCollection.id,
            collection_name: selectedCollection.name,
            program_type: 'buyback',
          },
        });

      if (notifyError) {
        console.error('Error creating notification:', notifyError);
      }

      // Mark as notified
      await supabase
        .from('buyback_program_collections')
        .update({ notified_creator: true })
        .eq('collection_id', selectedCollection.id);

      toast({
        title: 'Added to Buyback Program',
        description: `${selectedCollection.name} is now part of the buyback program. Creator has been notified.`,
      });

      setAddModalOpen(false);
      setSelectedCollection(null);
      setAddReason('');
      fetchData();
    } catch (error) {
      console.error('Error adding to program:', error);
      toast({
        title: 'Error',
        description: 'Failed to add collection to program',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromProgram = async (programId: string, collectionName: string) => {
    if (!confirm(`Remove "${collectionName}" from the buyback program?`)) return;

    setIsRemoving(programId);
    try {
      const { error } = await supabase
        .from('buyback_program_collections')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast({
        title: 'Removed from Program',
        description: `${collectionName} has been removed from the buyback program.`,
      });

      fetchData();
    } catch (error) {
      console.error('Error removing from program:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove collection from program',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const filteredAvailable = availableCollections.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Buyback Program
            </CardTitle>
            <CardDescription>
              Select collections for the buyback program - top volume movers receive rewards
            </CardDescription>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Collection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : programCollections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No collections in the buyback program yet.</p>
            <p className="text-sm">Add collections to reward top volume movers.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Minted</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programCollections.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.collection?.image_url ? (
                          <img
                            src={item.collection.image_url}
                            alt={item.collection.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.collection?.name}</p>
                          <p className="text-sm text-muted-foreground">{item.collection?.symbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.collection?.minted}/{item.collection?.total_supply}
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.added_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.reason || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromProgram(item.id, item.collection?.name || 'Collection')}
                        disabled={isRemoving === item.id}
                      >
                        {isRemoving === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Add Collection Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Collection to Buyback Program</DialogTitle>
              <DialogDescription>
                Select a collection to include in the buyback program. The creator will be notified.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No available collections found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailable.map((collection) => (
                      <div
                        key={collection.id}
                        onClick={() => setSelectedCollection(collection)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCollection?.id === collection.id
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={collection.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{collection.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {collection.symbol} • {collection.minted}/{collection.total_supply} minted
                          </p>
                        </div>
                        <Badge>{collection.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedCollection && (
                <Textarea
                  placeholder="Optional: Add a reason for selecting this collection..."
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  rows={2}
                />
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToProgram}
                disabled={!selectedCollection || isAdding}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Program
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
