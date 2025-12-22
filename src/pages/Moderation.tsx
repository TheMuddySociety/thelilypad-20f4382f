import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Flag, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Clock,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";

interface Report {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  comment?: {
    id: string;
    content: string;
    user_id: string;
    clip_id: string;
    created_at: string;
    clip?: {
      id: string;
      title: string;
    };
  };
}

export default function Moderation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // First get all clips owned by the user
      const { data: userClips } = await supabase
        .from("clips")
        .select("id")
        .eq("user_id", user.id);

      if (!userClips || userClips.length === 0) {
        setReports([]);
        setIsLoading(false);
        return;
      }

      const clipIds = userClips.map(c => c.id);

      // Get all comments on user's clips
      const { data: clipComments } = await supabase
        .from("clip_comments")
        .select("id, content, user_id, clip_id, created_at")
        .in("clip_id", clipIds);

      if (!clipComments || clipComments.length === 0) {
        setReports([]);
        setIsLoading(false);
        return;
      }

      const commentIds = clipComments.map(c => c.id);

      // Get reports for those comments
      const { data: reportsData, error } = await supabase
        .from("comment_reports")
        .select("*")
        .in("comment_id", commentIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get clip info for the comments
      const { data: clipsData } = await supabase
        .from("clips")
        .select("id, title")
        .in("id", clipIds);

      // Map reports with comment and clip data
      const reportsWithData = (reportsData || []).map(report => {
        const comment = clipComments.find(c => c.id === report.comment_id);
        const clip = clipsData?.find(c => c.id === comment?.clip_id);
        return {
          ...report,
          comment: comment ? {
            ...comment,
            clip: clip
          } : undefined
        };
      });

      setReports(reportsWithData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from("comment_reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus } : r
      ));

      toast({
        title: "Status updated",
        description: `Report marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    }
    setActionLoading(null);
  };

  const handleDeleteComment = async () => {
    if (!selectedReport?.comment_id) return;
    
    setActionLoading(selectedReport.id);
    try {
      const { error } = await supabase
        .from("clip_comments")
        .delete()
        .eq("id", selectedReport.comment_id);

      if (error) throw error;

      // Remove reports for the deleted comment
      setReports(prev => prev.filter(r => r.comment_id !== selectedReport.comment_id));

      toast({
        title: "Comment deleted",
        description: "The comment and associated reports have been removed",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
    setActionLoading(null);
    setDeleteDialogOpen(false);
    setSelectedReport(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "reviewed":
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Reviewed</Badge>;
      case "resolved":
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = reports.filter(r => r.status === "pending").length;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
                <Shield className="w-7 h-7" />
                Moderation Dashboard
              </h1>
              <p className="text-muted-foreground">Review and manage reported comments on your clips</p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="w-fit">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </div>

        {/* Reports List */}
        <Card className="glass-card border-border/50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Reported Comments
            </CardTitle>
            <CardDescription>
              {reports.length} total report{reports.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      {report.comment?.clip && (
                        <Badge variant="secondary" className="text-xs w-fit">
                          Clip: {report.comment.clip.title}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium text-destructive mb-1 flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        Reason: {report.reason}
                      </div>
                      {report.details && (
                        <p className="text-sm text-muted-foreground">
                          Details: {report.details}
                        </p>
                      )}
                    </div>

                    {report.comment && (
                      <div className="p-3 rounded-md bg-background border border-border mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Reported comment:</span>
                        </div>
                        <p className="text-sm">{report.comment.content}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {report.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(report.id, "reviewed")}
                            disabled={actionLoading === report.id}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mark Reviewed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(report.id, "dismissed")}
                            disabled={actionLoading === report.id}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Dismiss
                          </Button>
                        </>
                      )}
                      {report.status === "reviewed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(report.id, "resolved")}
                          disabled={actionLoading === report.id}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Resolved
                        </Button>
                      )}
                      {report.comment && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedReport(report);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={actionLoading === report.id}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete Comment
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No reports yet</p>
                <p className="text-sm">Reported comments on your clips will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the comment and all associated reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
