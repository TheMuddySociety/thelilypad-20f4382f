import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatErrorForAI } from '@/lib/errorLogging';
import { format } from 'date-fns';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Search,
  Copy,
  Check,
  CheckCircle,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface ErrorLog {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_name: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  wallet_address: string | null;
  severity: string | null;
  category: string | null;
  metadata: unknown;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

const severityConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  critical: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  error: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  info: { icon: <Info className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export const ErrorLogManager: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (resolvedFilter === 'unresolved') {
        query = query.eq('is_resolved', false);
      } else if (resolvedFilter === 'resolved') {
        query = query.eq('is_resolved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Error fetching error logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch error logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [severityFilter, resolvedFilter]);

  const handleCopyForAI = async (error: ErrorLog) => {
    const formattedError = formatErrorForAI(error);
    try {
      await navigator.clipboard.writeText(formattedError);
      setCopiedId(error.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Error details copied to clipboard. Paste to AI to get help.',
      });
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('error_logs')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: resolutionNotes || null,
        })
        .eq('id', selectedError.id);

      if (error) throw error;

      toast({
        title: 'Resolved',
        description: 'Error marked as resolved',
      });
      setResolveOpen(false);
      setResolutionNotes('');
      fetchErrors();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Error log deleted',
      });
      fetchErrors();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete error log',
        variant: 'destructive',
      });
    }
  };

  const filteredErrors = errors.filter((error) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      error.error_message.toLowerCase().includes(query) ||
      error.component_name?.toLowerCase().includes(query) ||
      error.category?.toLowerCase().includes(query) ||
      error.url?.toLowerCase().includes(query)
    );
  });

  const getSeverityBadge = (severity: string | null) => {
    const config = severityConfig[severity || 'error'] || severityConfig.error;
    return (
      <Badge className={`gap-1 ${config.color}`}>
        {config.icon}
        {severity || 'error'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Error Logs
              </CardTitle>
              <CardDescription>
                View and manage application errors. Copy errors to share with AI for debugging.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchErrors} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">
                {errors.filter((e) => e.severity === 'critical' && !e.is_resolved).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-400">
                {errors.filter((e) => e.severity === 'error' && !e.is_resolved).length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">
                {errors.filter((e) => e.severity === 'warning' && !e.is_resolved).length}
              </div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">
                {errors.filter((e) => e.is_resolved).length}
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
          </div>

          {/* Error List */}
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="hidden md:table-cell">Component</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredErrors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No errors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredErrors.map((error) => (
                    <TableRow key={error.id} className={error.is_resolved ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(error.severity)}
                          {error.is_resolved && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate font-mono text-sm">
                          {error.error_message}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground text-sm">
                          {error.component_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {error.category || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(error.created_at), 'MMM d, HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyForAI(error)}
                            title="Copy for AI"
                          >
                            {copiedId === error.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedError(error);
                              setDetailsOpen(true);
                            }}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!error.is_resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedError(error);
                                setResolveOpen(true);
                              }}
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(error.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSeverityBadge(selectedError?.severity || null)}
              Error Details
            </DialogTitle>
            <DialogDescription>
              {selectedError?.created_at &&
                format(new Date(selectedError.created_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Error Message</h4>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all">
                  {selectedError.error_message}
                </div>
              </div>

              {selectedError.component_name && (
                <div>
                  <h4 className="font-medium mb-1">Component</h4>
                  <div className="text-muted-foreground">
                    {selectedError.component_name}
                  </div>
                </div>
              )}

              {selectedError.url && (
                <div>
                  <h4 className="font-medium mb-1">URL</h4>
                  <div className="text-muted-foreground text-sm break-all">
                    {selectedError.url}
                  </div>
                </div>
              )}

              {selectedError.error_stack && (
                <div>
                  <h4 className="font-medium mb-1">Stack Trace</h4>
                  <ScrollArea className="h-40">
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {selectedError.error_stack}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedError.component_stack && (
                <div>
                  <h4 className="font-medium mb-1">Component Stack</h4>
                  <ScrollArea className="h-32">
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      {selectedError.component_stack}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Metadata</h4>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.resolution_notes && (
                <div>
                  <h4 className="font-medium mb-1">Resolution Notes</h4>
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-sm">
                    {selectedError.resolution_notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedError && handleCopyForAI(selectedError)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy for AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Add optional notes about how this error was fixed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Resolution notes (optional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorLogManager;
