'use client';

import { useState } from 'react';
import { useShopItems, ShopItemCategory, CreateShopItemInput } from '@/hooks/useShopItems';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Package, Eye, EyeOff, Lock } from 'lucide-react';
import { useWalletConnection } from '@solana/react-hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function CreatorDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { connected } = useWalletConnection();
    const { items, loading, createItem, deleteItem, toggleActive } = useShopItems();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Form state for creating new item
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<ShopItemCategory>('sticker_pack');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleSignIn = async () => {
        try {
            setIsAuthenticating(true);
            const { data, error } = await supabase.auth.signInWithWeb3({
                chain: 'solana',
                statement: 'Sign in to The Lily Pad Creator Dashboard',
            });
            if (error) toast.error('Authentication failed: ' + error.message);
            else if (data?.user) toast.success('Signed in successfully!');
        } catch (e: any) {
            toast.error('Failed to sign in: ' + e.message);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleCreate = async () => {
        if (!newItemName.trim() || !newItemPrice.trim()) {
            toast.error('Name and Price are required.');
            return;
        }
        const price = parseFloat(newItemPrice);
        if (isNaN(price) || price <= 0) {
            toast.error('Price must be a positive number.');
            return;
        }

        setIsCreating(true);
        const input: CreateShopItemInput = {
            name: newItemName.trim(),
            description: newItemDesc.trim() || undefined,
            category: newItemCategory,
            price,
        };
        const result = await createItem(input);
        setIsCreating(false);

        if (result) {
            setIsDialogOpen(false);
            setNewItemName('');
            setNewItemDesc('');
            setNewItemPrice('');
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto max-w-2xl p-4 pt-20">
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <Lock className="h-5 w-5" />
                            Authentication Required
                        </CardTitle>
                        <CardDescription className="text-foreground/90 font-medium">
                            {connected
                                ? "You are connected to Solana, but not signed in."
                                : "You must connect your wallet and sign in to manage your shop."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {connected ? (
                            <Button onClick={handleSignIn} disabled={isAuthenticating} className="w-full" size="lg">
                                {isAuthenticating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</> : "Sign In"}
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">Use the wallet button in the header to connect.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Creator Dashboard</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create New Item</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Shop Item</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="e.g., Cool Sticker Pack" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Description</Label>
                                <Input id="desc" placeholder="Optional..." value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Select value={newItemCategory} onValueChange={(v: ShopItemCategory) => setNewItemCategory(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sticker_pack">Sticker Pack</SelectItem>
                                        <SelectItem value="emoji_pack">Emoji Pack</SelectItem>
                                        <SelectItem value="blind_box">Blind Box</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="price">Price (SOL)</Label>
                                <Input id="price" type="number" min="0" step="0.01" placeholder="0.5" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">You haven't created any items yet.</p>
                        <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Create Your First Item
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{item.name}</CardTitle>
                                        <CardDescription className="capitalize">{item.category.replace('_', ' ')}</CardDescription>
                                    </div>
                                    <span className="text-lg font-bold text-primary">{item.price} SOL</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {item.description && <p className="text-sm text-muted-foreground mb-4">{item.description}</p>}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => toggleActive(item.id, !item.is_active)}>
                                        {item.is_active ? <><EyeOff className="mr-1 h-4 w-4" />Hide</> : <><Eye className="mr-1 h-4 w-4" />Show</>}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                                        <Trash2 className="mr-1 h-4 w-4" />Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
