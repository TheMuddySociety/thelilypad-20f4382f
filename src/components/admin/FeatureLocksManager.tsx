import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Save, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureLocks, FeatureLock } from "@/hooks/useFeatureLocks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const FeatureLocksManager: React.FC = () => {
  const { data: featureLocks, isLoading } = useFeatureLocks();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FeatureLock>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    feature_key: "",
    feature_name: "",
    description: "",
    required_followers: 0,
    required_subscribers: 0,
    is_enabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (lock: FeatureLock) => {
    setEditingId(lock.id);
    setEditValues({
      required_followers: lock.required_followers,
      required_subscribers: lock.required_subscribers,
      is_enabled: lock.is_enabled,
    });
  };

  const handleSave = async (lock: FeatureLock) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("feature_locks")
        .update({
          required_followers: editValues.required_followers,
          required_subscribers: editValues.required_subscribers,
          is_enabled: editValues.is_enabled,
        })
        .eq("id", lock.id);

      if (error) throw error;

      toast.success(`${lock.feature_name} settings updated`);
      queryClient.invalidateQueries({ queryKey: ["feature-locks"] });
      queryClient.invalidateQueries({ queryKey: ["feature-lock", lock.feature_key] });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating feature lock:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (lock: FeatureLock) => {
    try {
      const { error } = await supabase
        .from("feature_locks")
        .update({ is_enabled: !lock.is_enabled })
        .eq("id", lock.id);

      if (error) throw error;

      toast.success(`${lock.feature_name} ${lock.is_enabled ? "disabled" : "enabled"}`);
      queryClient.invalidateQueries({ queryKey: ["feature-locks"] });
      queryClient.invalidateQueries({ queryKey: ["feature-lock", lock.feature_key] });
    } catch (error) {
      console.error("Error toggling feature lock:", error);
      toast.error("Failed to toggle feature");
    }
  };

  const handleAddFeature = async () => {
    if (!newFeature.feature_key || !newFeature.feature_name) {
      toast.error("Feature key and name are required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("feature_locks").insert({
        feature_key: newFeature.feature_key.toLowerCase().replace(/\s+/g, "_"),
        feature_name: newFeature.feature_name,
        description: newFeature.description || null,
        required_followers: newFeature.required_followers,
        required_subscribers: newFeature.required_subscribers,
        is_enabled: newFeature.is_enabled,
      });

      if (error) throw error;

      toast.success("Feature lock added successfully");
      queryClient.invalidateQueries({ queryKey: ["feature-locks"] });
      setIsAddDialogOpen(false);
      setNewFeature({
        feature_key: "",
        feature_name: "",
        description: "",
        required_followers: 0,
        required_subscribers: 0,
        is_enabled: true,
      });
    } catch (error: any) {
      console.error("Error adding feature lock:", error);
      toast.error(error.message || "Failed to add feature lock");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (lock: FeatureLock) => {
    if (!confirm(`Are you sure you want to delete "${lock.feature_name}"?`)) return;

    try {
      const { error } = await supabase
        .from("feature_locks")
        .delete()
        .eq("id", lock.id);

      if (error) throw error;

      toast.success(`${lock.feature_name} deleted`);
      queryClient.invalidateQueries({ queryKey: ["feature-locks"] });
    } catch (error) {
      console.error("Error deleting feature lock:", error);
      toast.error("Failed to delete feature lock");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Locks</h2>
          <p className="text-muted-foreground">
            Configure follower/subscriber requirements for locked features
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Feature Lock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feature Lock</DialogTitle>
              <DialogDescription>
                Create a new feature that requires followers/subscribers to unlock
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feature_key">Feature Key</Label>
                <Input
                  id="feature_key"
                  placeholder="e.g., go_live, create_collection"
                  value={newFeature.feature_key}
                  onChange={(e) =>
                    setNewFeature({ ...newFeature, feature_key: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature_name">Feature Name</Label>
                <Input
                  id="feature_name"
                  placeholder="e.g., Go Live"
                  value={newFeature.feature_name}
                  onChange={(e) =>
                    setNewFeature({ ...newFeature, feature_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this feature unlock?"
                  value={newFeature.description}
                  onChange={(e) =>
                    setNewFeature({ ...newFeature, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="required_followers">Required Followers</Label>
                  <Input
                    id="required_followers"
                    type="number"
                    min={0}
                    value={newFeature.required_followers}
                    onChange={(e) =>
                      setNewFeature({
                        ...newFeature,
                        required_followers: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="required_subscribers">Required Subscribers</Label>
                  <Input
                    id="required_subscribers"
                    type="number"
                    min={0}
                    value={newFeature.required_subscribers}
                    onChange={(e) =>
                      setNewFeature({
                        ...newFeature,
                        required_subscribers: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_enabled"
                  checked={newFeature.is_enabled}
                  onCheckedChange={(checked) =>
                    setNewFeature({ ...newFeature, is_enabled: checked })
                  }
                />
                <Label htmlFor="is_enabled">Lock Enabled</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFeature} disabled={isSaving}>
                {isSaving ? "Adding..." : "Add Feature Lock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {featureLocks?.map((lock) => (
          <Card key={lock.id} className={!lock.is_enabled ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {lock.is_enabled ? (
                    <Lock className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{lock.feature_name}</CardTitle>
                    <CardDescription>
                      {lock.description || `Key: ${lock.feature_key}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lock.is_enabled ? "default" : "secondary"}>
                    {lock.is_enabled ? "Locked" : "Unlocked for All"}
                  </Badge>
                  <Switch
                    checked={lock.is_enabled}
                    onCheckedChange={() => handleToggleEnabled(lock)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingId === lock.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Required Followers
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={editValues.required_followers ?? 0}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            required_followers: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Required Subscribers
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={editValues.required_subscribers ?? 0}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            required_subscribers: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(lock)} disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Followers:</span>
                      <span className="font-medium">{lock.required_followers}</span>
                    </div>
                    {lock.required_subscribers > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Subscribers:</span>
                        <span className="font-medium">{lock.required_subscribers}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(lock)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(lock)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {featureLocks?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No feature locks configured. Click "Add Feature Lock" to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
