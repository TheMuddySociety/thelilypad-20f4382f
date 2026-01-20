import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MoveUp, MoveDown, Twitter } from "lucide-react";

interface Testimonial {
    id: string;
    username: string;
    handle: string;
    content: string;
    avatar_url: string | null;
    verified: boolean;
    likes: number;
    retweets: number;
    tweet_url: string | null;
    display_order: number;
    is_active: boolean;
}

export const TestimonialsManager = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

    const [formData, setFormData] = useState({
        username: "",
        handle: "",
        content: "",
        avatar_url: "",
        verified: false,
        likes: 0,
        retweets: 0,
        tweet_url: "",
        is_active: true,
    });

    // Fetch testimonials
    const { data: testimonials, isLoading } = useQuery({
        queryKey: ['admin-testimonials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('testimonials' as any)
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as Testimonial[];
        },
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (editingTestimonial) {
                const { error } = await supabase
                    .from('testimonials' as any)
                    .update(data as any)
                    .eq('id', editingTestimonial.id);
                if (error) throw error;
            } else {
                const maxOrder = testimonials?.reduce((max, t) => Math.max(max, t.display_order), 0) || 0;
                const { error } = await supabase
                    .from('testimonials' as any)
                    .insert({ ...data, display_order: maxOrder + 1 } as any);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            queryClient.invalidateQueries({ queryKey: ['testimonials'] });
            setIsDialogOpen(false);
            resetForm();
            toast({
                title: editingTestimonial ? "Testimonial updated" : "Testimonial created",
                description: "Changes saved successfully",
            });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('testimonials' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            queryClient.invalidateQueries({ queryKey: ['testimonials'] });
            toast({
                title: "Testimonial deleted",
                description: "The testimonial has been removed",
            });
        },
    });

    // Reorder mutation
    const reorderMutation = useMutation({
        mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
            const { error } = await supabase
                .from('testimonials' as any)
                .update({ display_order: newOrder } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            queryClient.invalidateQueries({ queryKey: ['testimonials'] });
        },
    });

    const resetForm = () => {
        setFormData({
            username: "",
            handle: "",
            content: "",
            avatar_url: "",
            verified: false,
            likes: 0,
            retweets: 0,
            tweet_url: "",
            is_active: true,
        });
        setEditingTestimonial(null);
    };

    const handleEdit = (testimonial: Testimonial) => {
        setEditingTestimonial(testimonial);
        setFormData({
            username: testimonial.username,
            handle: testimonial.handle,
            content: testimonial.content,
            avatar_url: testimonial.avatar_url || "",
            verified: testimonial.verified,
            likes: testimonial.likes,
            retweets: testimonial.retweets,
            tweet_url: testimonial.tweet_url || "",
            is_active: testimonial.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleMoveUp = (testimonial: Testimonial) => {
        if (!testimonials) return;
        const currentIndex = testimonials.findIndex(t => t.id === testimonial.id);
        if (currentIndex > 0) {
            const prevTestimonial = testimonials[currentIndex - 1];
            reorderMutation.mutate({ id: testimonial.id, newOrder: prevTestimonial.display_order });
            reorderMutation.mutate({ id: prevTestimonial.id, newOrder: testimonial.display_order });
        }
    };

    const handleMoveDown = (testimonial: Testimonial) => {
        if (!testimonials) return;
        const currentIndex = testimonials.findIndex(t => t.id === testimonial.id);
        if (currentIndex < testimonials.length - 1) {
            const nextTestimonial = testimonials[currentIndex + 1];
            reorderMutation.mutate({ id: testimonial.id, newOrder: nextTestimonial.display_order });
            reorderMutation.mutate({ id: nextTestimonial.id, newOrder: testimonial.display_order });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Twitter className="h-5 w-5" />
                        Testimonials Management
                    </CardTitle>
                    <CardDescription>
                        Manage Twitter-style testimonials displayed on the landing page
                    </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Testimonial
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
                            </DialogTitle>
                            <DialogDescription>
                                Create or update testimonial cards for the landing page
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="Sarah Chen"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="handle">Handle</Label>
                                    <Input
                                        id="handle"
                                        value={formData.handle}
                                        onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                                        placeholder="@sarahchen"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="This is amazing! 🔥 Absolutely loving what the team is building here."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="avatar_url">Avatar URL</Label>
                                <Input
                                    id="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                    placeholder="https://images.unsplash.com/photo-..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use Unsplash or similar for profile images
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tweet_url">Tweet URL</Label>
                                <Input
                                    id="tweet_url"
                                    value={formData.tweet_url}
                                    onChange={(e) => setFormData({ ...formData, tweet_url: e.target.value })}
                                    placeholder="https://x.com/username/status/..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="likes">Likes</Label>
                                    <Input
                                        id="likes"
                                        type="number"
                                        value={formData.likes}
                                        onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="retweets">Retweets</Label>
                                    <Input
                                        id="retweets"
                                        type="number"
                                        value={formData.retweets}
                                        onChange={(e) => setFormData({ ...formData, retweets: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="verified"
                                        checked={formData.verified}
                                        onCheckedChange={(checked) => setFormData({ ...formData, verified: checked })}
                                    />
                                    <Label htmlFor="verified">Verified Badge</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label htmlFor="is_active">Active</Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => saveMutation.mutate(formData)}>
                                {editingTestimonial ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : testimonials && testimonials.length > 0 ? (
                    <div className="space-y-4">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={testimonial.id}
                                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                {testimonial.avatar_url && (
                                    <img
                                        src={testimonial.avatar_url}
                                        alt={testimonial.username}
                                        className="size-12 rounded-full object-cover"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold">{testimonial.username}</p>
                                        {testimonial.verified && (
                                            <svg className="size-4 text-[#1d9bf0]" viewBox="0 0 22 22" fill="currentColor">
                                                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                            </svg>
                                        )}
                                        <span className="text-sm text-muted-foreground">{testimonial.handle}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{testimonial.content}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>❤️ {testimonial.likes}</span>
                                        <span>🔄 {testimonial.retweets}</span>
                                        {!testimonial.is_active && (
                                            <span className="text-yellow-500">● Inactive</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMoveUp(testimonial)}
                                        disabled={index === 0}
                                    >
                                        <MoveUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMoveDown(testimonial)}
                                        disabled={index === testimonials.length - 1}
                                    >
                                        <MoveDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(testimonial)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteMutation.mutate(testimonial.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <Twitter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-2">No testimonials yet</p>
                        <p className="text-sm">Add testimonials to display on the landing page</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
