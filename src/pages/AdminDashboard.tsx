import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useSEO } from '@/hooks/useSEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import FrogLoader from '@/components/FrogLoader';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  Image, 
  Video, 
  Search,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Collection {
  id: string;
  name: string;
  symbol: string;
  creator_address: string;
  status: string;
  total_supply: number;
  minted: number;
  created_at: string;
}

interface Stream {
  id: string;
  title: string;
  user_id: string;
  is_live: boolean;
  total_views: number;
  created_at: string;
}

interface ModerationItem {
  id: string;
  content_type: string;
  content_text: string | null;
  status: string;
  ai_score: number | null;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCollections: 0,
    totalStreams: 0,
    pendingModeration: 0
  });

  useSEO({
    title: 'Admin Dashboard | The Lily Pad',
    description: 'Admin dashboard for managing users, collections, and content'
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCollections(),
        fetchStreams(),
        fetchModerationQueue(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching collections:', error);
    } else {
      setCollections(data || []);
    }
  };

  const fetchStreams = async () => {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching streams:', error);
    } else {
      setStreams(data || []);
    }
  };

  const fetchModerationQueue = async () => {
    const { data, error } = await supabase
      .from('moderation_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching moderation queue:', error);
    } else {
      setModerationQueue(data || []);
    }
  };

  const fetchStats = async () => {
    const [collectionsCount, streamsCount, moderationCount] = await Promise.all([
      supabase.from('collections').select('id', { count: 'exact', head: true }),
      supabase.from('streams').select('id', { count: 'exact', head: true }),
      supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    setStats({
      totalUsers: 0, // We can't directly count auth.users from client
      totalCollections: collectionsCount.count || 0,
      totalStreams: streamsCount.count || 0,
      pendingModeration: moderationCount.count || 0
    });
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete collection',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Collection deleted successfully'
      });
      fetchCollections();
    }
  };

  const handleModerationAction = async (id: string, action: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('moderation_queue')
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update moderation status',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Content ${action} successfully`
      });
      fetchModerationQueue();
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FrogLoader text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredCollections = collections.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStreams = streams.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, collections, streams, and moderation across the platform.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalCollections}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalStreams}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Moderation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="text-2xl font-bold">{stats.pendingModeration}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Live Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-2xl font-bold">
                  {streams.filter(s => s.is_live).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search collections, streams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="collections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="collections" className="gap-2">
              <Layers className="w-4 h-4" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="streams" className="gap-2">
              <Video className="w-4 h-4" />
              Streams
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Moderation
            </TabsTrigger>
          </TabsList>

          {/* Collections Tab */}
          <TabsContent value="collections">
            <Card>
              <CardHeader>
                <CardTitle>All Collections</CardTitle>
                <CardDescription>
                  Manage NFT collections across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supply</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCollections.map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell className="font-medium">{collection.name}</TableCell>
                          <TableCell>{collection.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={collection.status === 'live' ? 'default' : 'secondary'}>
                              {collection.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {collection.minted}/{collection.total_supply}
                          </TableCell>
                          <TableCell>
                            {format(new Date(collection.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/launchpad/${collection.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCollection(collection.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCollections.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No collections found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Streams Tab */}
          <TabsContent value="streams">
            <Card>
              <CardHeader>
                <CardTitle>All Streams</CardTitle>
                <CardDescription>
                  View and manage streams across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStreams.map((stream) => (
                        <TableRow key={stream.id}>
                          <TableCell className="font-medium">{stream.title}</TableCell>
                          <TableCell>
                            {stream.is_live ? (
                              <Badge className="bg-green-500">Live</Badge>
                            ) : (
                              <Badge variant="secondary">Offline</Badge>
                            )}
                          </TableCell>
                          <TableCell>{stream.total_views.toLocaleString()}</TableCell>
                          <TableCell>
                            {format(new Date(stream.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/streamer/${stream.user_id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStreams.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No streams found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle>Moderation Queue</CardTitle>
                <CardDescription>
                  Review and moderate flagged content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>AI Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moderationQueue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.content_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.content_text || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {item.ai_score !== null ? (
                              <span className={item.ai_score > 0.7 ? 'text-destructive' : ''}>
                                {(item.ai_score * 100).toFixed(0)}%
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                item.status === 'approved' ? 'default' : 
                                item.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {item.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleModerationAction(item.id, 'approved')}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleModerationAction(item.id, 'rejected')}
                                >
                                  <XCircle className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {moderationQueue.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No items in moderation queue
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
