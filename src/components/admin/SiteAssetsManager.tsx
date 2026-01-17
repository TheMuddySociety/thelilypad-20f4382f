import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSiteAssets, clearAssetCache } from '@/hooks/useSiteAsset';
import { Plus, Pencil, Trash2, Image, ExternalLink, RefreshCw } from 'lucide-react';

// Predefined asset keys for common branding elements
const PREDEFINED_ASSET_KEYS = [
  { key: 'auth_branding', label: 'Auth Page Branding', page: 'auth' },
  { key: 'logo', label: 'Site Logo', page: 'global' },
  { key: 'logo_dark', label: 'Site Logo (Dark Mode)', page: 'global' },
  { key: 'hero_banner', label: 'Landing Hero Banner', page: 'landing' },
  { key: 'footer_logo', label: 'Footer Logo', page: 'footer' },
  { key: 'og_image', label: 'Open Graph Image', page: 'global' },
  { key: 'favicon', label: 'Favicon', page: 'global' },
  { key: 'mobile_banner', label: 'Mobile App Banner', page: 'global' },
];

interface AssetFormData {
  asset_key: string;
  asset_url: string;
  asset_type: string;
  page: string;
  description: string;
}

const initialFormData: AssetFormData = {
  asset_key: '',
  asset_url: '',
  asset_type: 'image',
  page: 'global',
  description: '',
};

export function SiteAssetsManager() {
  const { assets, loading, addAsset, updateAsset, deleteAsset, refetch } = useSiteAssets();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AssetFormData>(initialFormData);
  const [previewError, setPreviewError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openAddModal = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setPreviewError(false);
    setModalOpen(true);
  };

  const openEditModal = (asset: any) => {
    setFormData({
      asset_key: asset.asset_key,
      asset_url: asset.asset_url,
      asset_type: asset.asset_type,
      page: asset.page || 'global',
      description: asset.description || '',
    });
    setEditingId(asset.id);
    setPreviewError(false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.asset_key || !formData.asset_url) {
      toast({
        title: 'Validation Error',
        description: 'Asset key and URL are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAsset(editingId, formData);
        toast({ title: 'Asset Updated', description: 'Site asset updated successfully' });
      } else {
        await addAsset(formData);
        toast({ title: 'Asset Added', description: 'New site asset added successfully' });
      }
      clearAssetCache();
      setModalOpen(false);
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save asset',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, assetKey: string) => {
    try {
      await deleteAsset(id, assetKey);
      clearAssetCache();
      toast({ title: 'Asset Deleted', description: 'Site asset removed successfully' });
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete asset',
        variant: 'destructive',
      });
    }
  };

  const handlePredefinedKeySelect = (key: string) => {
    const preset = PREDEFINED_ASSET_KEYS.find(p => p.key === key);
    setFormData(prev => ({
      ...prev,
      asset_key: key,
      page: preset?.page || 'global',
    }));
  };

  // Get available keys that haven't been used yet
  const availableKeys = PREDEFINED_ASSET_KEYS.filter(
    preset => !assets.some(a => a.asset_key === preset.key) || (editingId && formData.asset_key === preset.key)
  );

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Image className="w-5 h-5" />
              Site Branding Assets
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage branding images using external URLs (e.g., imgbb.com)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-1" />
              Add Asset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No site assets configured yet.</p>
            <p className="text-sm">Click "Add Asset" to add branding images.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={asset.asset_url}
                        alt={asset.asset_key}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asset.asset_key}</p>
                      <p className="text-xs text-muted-foreground truncate">{asset.asset_url}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{asset.page || 'global'}</Badge>
                        <Badge variant="secondary" className="text-xs">{asset.asset_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(asset)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirmId(asset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Preview</TableHead>
                      <TableHead>Asset Key</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                            <img
                              src={asset.asset_url}
                              alt={asset.asset_key}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{asset.asset_key}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 max-w-[200px]">
                            <span className="truncate text-xs text-muted-foreground">
                              {asset.asset_url}
                            </span>
                            <a
                              href={asset.asset_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.page || 'global'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{asset.asset_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(asset)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(asset.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
              <DialogDescription>
                Paste an image URL from imgbb.com or other image hosting service.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Asset Key */}
              <div className="space-y-2">
                <Label>Asset Key</Label>
                {!editingId && availableKeys.length > 0 ? (
                  <Select
                    value={formData.asset_key}
                    onValueChange={handlePredefinedKeySelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type a key..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKeys.map((preset) => (
                        <SelectItem key={preset.key} value={preset.key}>
                          {preset.label} ({preset.key})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Key...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.asset_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, asset_key: e.target.value }))}
                    placeholder="e.g., auth_branding"
                    disabled={!!editingId}
                  />
                )}
                {formData.asset_key === 'custom' && (
                  <Input
                    value=""
                    onChange={(e) => setFormData(prev => ({ ...prev, asset_key: e.target.value }))}
                    placeholder="Enter custom key..."
                    className="mt-2"
                  />
                )}
              </div>

              {/* Asset URL */}
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={formData.asset_url}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, asset_url: e.target.value }));
                    setPreviewError(false);
                  }}
                  placeholder="https://i.ibb.co/..."
                />
                <p className="text-xs text-muted-foreground">
                  Paste a direct image link from imgbb.com or similar service
                </p>
              </div>

              {/* Preview */}
              {formData.asset_url && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="w-full h-32 rounded-lg bg-muted overflow-hidden border">
                    {previewError ? (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Failed to load image
                      </div>
                    ) : (
                      <img
                        src={formData.asset_url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={() => setPreviewError(true)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Type & Page */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.asset_type}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, asset_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Page</Label>
                  <Select
                    value={formData.page}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, page: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="landing">Landing</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this asset used for?"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Add Asset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Asset</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this asset? Components using this asset will fall back to default images.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const asset = assets.find(a => a.id === deleteConfirmId);
                  if (asset && deleteConfirmId) {
                    handleDelete(deleteConfirmId, asset.asset_key);
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
