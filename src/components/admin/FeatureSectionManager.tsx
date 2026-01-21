import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pencil,
    Trash2,
    Plus,
    MoveUp,
    MoveDown,
    Layers,
    Radio,
    Trophy,
    Gavel,
    Gift,
    Music,
    Zap,
    Star,
    Shield,
    Rocket
} from "lucide-react";

interface FeatureItem {
    id: string;
    title: string;
    description: string;
    icon: string;
    bullets: string[];
    cta_text: string;
    cta_link: string;
    image_url: string | null;
    image_position: string;
    accent: string;
    display_order: number;
    is_active: boolean;
}

const AVAILABLE_ICONS = [
    { value: "Layers", label: "Layers" },
    { value: "Radio", label: "Radio" },
    { value: "Trophy", label: "Trophy" },
    { value: "Gavel", label: "Gavel" },
    { value: "Gift", label: "Gift" },
    { value: "Music", label: "Music" },
    { value: "Zap", label: "Zap" },
    { value: "Star", label: "Star" },
    { value: "Shield", label: "Shield" },
    { value: "Rocket", label: "Rocket" },
];

export const FeatureSectionManager: React.FC = () => {
    const [items, setItems] = useState<FeatureItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FeatureItem | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<FeatureItem>>({
        title: "",
        description: "",
        icon: "Layers",
        bullets: [],
        cta_text: "Learn More",
        cta_link: "/",
        image_url: "",
        image_position: "right",
        accent: "primary",
        is_active: true,
    });

    const [bulletsText, setBulletsText] = useState("");

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("landing_page_features")
                .select("*")
                .order("display_order", { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error("Error fetching features:", error);
            // Don't show error toast on initial load if table doesn't exist yet, just empty
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item?: FeatureItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                description: item.description,
                icon: item.icon,
                bullets: item.bullets,
                cta_text: item.cta_text,
                cta_link: item.cta_link,
                image_url: item.image_url,
                image_position: item.image_position,
                accent: item.accent,
                is_active: item.is_active,
            });
            setBulletsText(item.bullets.join("\n"));
        } else {
            setEditingItem(null);
            setFormData({
                title: "",
                description: "",
                icon: "Layers",
                bullets: [],
                cta_text: "Learn More",
                cta_link: "/",
                image_url: "",
                image_position: "right",
                accent: "primary",
                is_active: true,
            });
            setBulletsText("");
        }
        setIsDialogOpen(true);
    };

    const calculateNextOrder = () => {
        if (items.length === 0) return 0;
        return Math.max(...items.map(i => i.display_order)) + 1;
    };

    const handleSave = async () => {
        try {
            const bullets = bulletsText.split("\n").filter(b => b.trim().length > 0);

            const payload = {
                title: formData.title,
                description: formData.description,
                icon: formData.icon,
                bullets,
                cta_text: formData.cta_text,
                cta_link: formData.cta_link,
                image_url: formData.image_url || null, // Allow empty string to convert to null
                image_position: formData.image_position,
                accent: formData.accent,
                is_active: formData.is_active,
            };

            if (editingItem) {
                const { error } = await supabase
                    .from("landing_page_features")
                    .update(payload)
                    .eq("id", editingItem.id);

                if (error) throw error;
                toast.success("Feature updated successfully");
            } else {
                const { error } = await supabase
                    .from("landing_page_features")
                    .insert({
                        ...payload,
                        display_order: calculateNextOrder(),
                    });

                if (error) throw error;
                toast.success("Feature created successfully");
            }

            setIsDialogOpen(false);
            fetchItems();
        } catch (error: any) {
            console.error("Error saving feature:", error);
            toast.error(error.message || "Failed to save feature");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const { error } = await supabase
                .from("landing_page_features")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Feature deleted");
            fetchItems();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === items.length - 1) return;

        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap display_order
        const currentItem = newItems[index];
        const targetItem = newItems[targetIndex];

        const tempOrder = currentItem.display_order;
        currentItem.display_order = targetItem.display_order;
        targetItem.display_order = tempOrder;

        // Optimistic update
        newItems[index] = targetItem;
        newItems[targetIndex] = currentItem;
        setItems(newItems);

        try {
            // Setup bulk update manually since upsert with diff IDs handles it
            await supabase.from("landing_page_features").upsert([
                { id: currentItem.id, display_order: currentItem.display_order },
                { id: targetItem.id, display_order: targetItem.display_order }
            ].map(i => ({ ...items.find(x => x.id === i.id)!, ...i })));

        } catch (error) {
            console.error("Failed to reorder", error);
            fetchItems(); // revert on error
        }
    };

    const handleToggleActive = async (item: FeatureItem) => {
        try {
            const { error } = await supabase
                .from("landing_page_features")
                .update({ is_active: !item.is_active })
                .eq("id", item.id);

            if (error) throw error;

            setItems(items.map(i => i.id === item.id ? { ...i, is_active: !item.is_active } : i));
            toast.success(`Feature ${!item.is_active ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Landing Page Features</CardTitle>
                    <CardDescription>Manage the "Powerful Features" section on the homepage.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feature
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-4">Loading features...</div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Order</TableHead>
                                    <TableHead>Icon</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>CTA</TableHead>
                                    <TableHead>Image</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No custom features found. Using default content?
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === 0}
                                                        onClick={() => handleMove(index, 'up')}
                                                    >
                                                        <MoveUp className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === items.length - 1}
                                                        onClick={() => handleMove(index, 'down')}
                                                    >
                                                        <MoveDown className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.icon}</TableCell>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell>{item.cta_text}</TableCell>
                                            <TableCell>
                                                {item.image_url ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={item.image_url} alt="Preview" className="w-8 h-8 rounded object-cover border" />
                                                        <span className="text-xs text-muted-foreground w-20 truncate">{item.image_url}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Default Icon</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={item.is_active}
                                                    onCheckedChange={() => handleToggleActive(item)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Feature' : 'Add New Feature'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Feature Title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Details Position</Label>
                                <Select
                                    value={formData.image_position}
                                    onValueChange={(val) => setFormData({ ...formData, image_position: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="right">Image on Right (Text Left)</SelectItem>
                                        <SelectItem value="left">Image on Left (Text Right)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short description of the feature"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Select
                                    value={formData.icon}
                                    onValueChange={(val) => setFormData({ ...formData, icon: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_ICONS.map(i => (
                                            <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Accent Color</Label>
                                <Select
                                    value={formData.accent}
                                    onValueChange={(val) => setFormData({ ...formData, accent: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="primary">Primary (Brand)</SelectItem>
                                        <SelectItem value="secondary">Secondary (Purple/Pink)</SelectItem>
                                        <SelectItem value="accent">Accent (Cyan/Blue)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Feature Bullets (One per line)</Label>
                            <Textarea
                                value={bulletsText}
                                onChange={(e) => setBulletsText(e.target.value)}
                                placeholder="- Feature 1&#10;- Feature 2"
                                className="font-mono text-sm"
                                rows={5}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Custom Image URL (Optional)</Label>
                            <Input
                                value={formData.image_url || ""}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://example.com/image.png"
                            />
                            <p className="text-xs text-muted-foreground">
                                Paste a direct link to an image to override the default icon visualization.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>CTA Text</Label>
                                <Input
                                    value={formData.cta_text}
                                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CTA Link</Label>
                                <Input
                                    value={formData.cta_link}
                                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
