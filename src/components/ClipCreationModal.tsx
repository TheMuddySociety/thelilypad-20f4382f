import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Scissors, Clock, Video, Loader2, Pencil } from "lucide-react";

const clipSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  stream_id: z.string().min(1, "Please select a broadcast"),
  start_time_seconds: z.number().min(0, "Start time must be positive"),
  duration_seconds: z.number().min(5, "Clip must be at least 5 seconds").max(60, "Clip must be less than 60 seconds"),
  thumbnail_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  clip_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ClipFormData = z.infer<typeof clipSchema>;

interface Stream {
  id: string;
  title: string;
  duration_seconds: number | null;
  started_at: string;
}

interface ClipData {
  id: string;
  title: string;
  description: string | null;
  stream_id: string | null;
  start_time_seconds: number;
  duration_seconds: number;
  thumbnail_url: string | null;
  clip_url: string | null;
}

interface ClipCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onClipCreated?: () => void;
  editingClip?: ClipData | null;
}

export const ClipCreationModal = ({
  open,
  onOpenChange,
  userId,
  onClipCreated,
  editingClip,
}: ClipCreationModalProps) => {
  const { toast } = useToast();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStreamDuration, setSelectedStreamDuration] = useState<number | null>(null);

  const form = useForm<ClipFormData>({
    resolver: zodResolver(clipSchema),
    defaultValues: {
      title: "",
      description: "",
      stream_id: "",
      start_time_seconds: 0,
      duration_seconds: 30,
      thumbnail_url: "",
      clip_url: "",
    },
  });

  useEffect(() => {
    if (open && userId) {
      fetchStreams();
    }
  }, [open, userId]);

  // Populate form when editing
  useEffect(() => {
    if (open && editingClip) {
      form.reset({
        title: editingClip.title,
        description: editingClip.description || "",
        stream_id: editingClip.stream_id || "",
        start_time_seconds: editingClip.start_time_seconds,
        duration_seconds: editingClip.duration_seconds,
        thumbnail_url: editingClip.thumbnail_url || "",
        clip_url: editingClip.clip_url || "",
      });
      // Find stream duration for editing
      if (editingClip.stream_id) {
        supabase
          .from("streams")
          .select("duration_seconds")
          .eq("id", editingClip.stream_id)
          .maybeSingle()
          .then(({ data }) => {
            setSelectedStreamDuration(data?.duration_seconds || null);
          });
      }
    } else if (open && !editingClip) {
      form.reset({
        title: "",
        description: "",
        stream_id: "",
        start_time_seconds: 0,
        duration_seconds: 30,
        thumbnail_url: "",
        clip_url: "",
      });
      setSelectedStreamDuration(null);
    }
  }, [open, editingClip, form]);

  const fetchStreams = async () => {
    const { data, error } = await supabase
      .from("streams")
      .select("id, title, duration_seconds, started_at")
      .eq("user_id", userId)
      .eq("is_live", false)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching streams:", error);
      return;
    }

    setStreams(data || []);
  };

  const handleStreamChange = (streamId: string) => {
    const stream = streams.find((s) => s.id === streamId);
    setSelectedStreamDuration(stream?.duration_seconds || null);
    form.setValue("stream_id", streamId);
    form.setValue("start_time_seconds", 0);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onSubmit = async (data: ClipFormData) => {
    setLoading(true);

    try {
      if (editingClip) {
        // Update existing clip
        const { error } = await supabase
          .from("clips")
          .update({
            stream_id: data.stream_id,
            title: data.title,
            description: data.description || null,
            start_time_seconds: data.start_time_seconds,
            duration_seconds: data.duration_seconds,
            thumbnail_url: data.thumbnail_url || null,
            clip_url: data.clip_url || null,
          })
          .eq("id", editingClip.id);

        if (error) throw error;

        toast({
          title: "Clip updated!",
          description: "Your changes have been saved.",
        });
      } else {
        // Create new clip
        const { error } = await supabase.from("clips").insert({
          user_id: userId,
          stream_id: data.stream_id,
          title: data.title,
          description: data.description || null,
          start_time_seconds: data.start_time_seconds,
          duration_seconds: data.duration_seconds,
          thumbnail_url: data.thumbnail_url || null,
          clip_url: data.clip_url || null,
        });

        if (error) throw error;

        toast({
          title: "Clip created!",
          description: "Your highlight clip has been saved successfully.",
        });
      }

      form.reset();
      onOpenChange(false);
      onClipCreated?.();
    } catch (error) {
      console.error("Error saving clip:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingClip ? "update" : "create"} clip. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startTime = form.watch("start_time_seconds");
  const duration = form.watch("duration_seconds");
  const maxStartTime = selectedStreamDuration ? Math.max(0, selectedStreamDuration - duration) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingClip ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Clip
              </>
            ) : (
              <>
                <Scissors className="h-5 w-5 text-primary" />
                Create Clip
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {editingClip 
              ? "Update your clip details and timestamps."
              : "Create a highlight clip from one of your past broadcasts."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Stream Selection */}
            <FormField
              control={form.control}
              name="stream_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Broadcast</FormLabel>
                  <Select onValueChange={handleStreamChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a past broadcast" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {streams.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No past broadcasts found
                        </div>
                      ) : (
                        streams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{stream.title}</span>
                              <span className="text-xs text-muted-foreground">
                                • {formatDate(stream.started_at)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clip Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Epic moment!" {...field} maxLength={100} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What makes this moment special?"
                      className="resize-none"
                      rows={2}
                      {...field}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timestamp Selection */}
            {selectedStreamDuration && (
              <>
                <FormField
                  control={form.control}
                  name="start_time_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Start Time
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Slider
                            value={[field.value]}
                            onValueChange={(val) => field.onChange(val[0])}
                            max={maxStartTime}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{formatTime(field.value)}</span>
                            <span>{formatTime(selectedStreamDuration)}</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select where the clip should start
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clip Duration</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Slider
                            value={[field.value]}
                            onValueChange={(val) => field.onChange(val[0])}
                            min={5}
                            max={60}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">5s</span>
                            <span className="font-medium text-primary">{field.value}s</span>
                            <span className="text-muted-foreground">60s</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Clips can be 5-60 seconds long
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview info */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Clip preview: <span className="font-medium text-foreground">{formatTime(startTime)}</span> to{" "}
                    <span className="font-medium text-foreground">{formatTime(startTime + duration)}</span>
                  </p>
                </div>
              </>
            )}

            {/* Optional URLs */}
            <div className="space-y-4 pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Optional: Add custom media URLs</p>
              
              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clip_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clip Video URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingClip ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {editingClip ? (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Scissors className="h-4 w-4 mr-2" />
                        Create Clip
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
