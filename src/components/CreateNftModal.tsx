import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMplCore } from '@/hooks/useMplCore';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const CreateNftModal: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [uri, setUri] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { createCoreNft } = useMplCore();

    const handleCreate = async () => {
        if (!name || !uri) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const { assetAddress } = await createCoreNft({ name, uri });
            toast.success('NFT Created!', {
                description: `Asset Address: ${assetAddress.toString()}`,
            });
            setOpen(false);
            setName('');
            setUri('');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to create NFT', {
                description: error.message || 'Unknown error occurred',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create NFT
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create MPL Core NFT</DialogTitle>
                    <DialogDescription>
                        Enter the details for your new Core NFT asset.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Cool NFT"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="uri">Metadata URI</Label>
                        <Input
                            id="uri"
                            value={uri}
                            onChange={(e) => setUri(e.target.value)}
                            placeholder="https://example.com/metadata.json"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
