import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, User, Calendar, CheckCircle2 } from "lucide-react";
import type { StepComment } from "@shared/schema";

interface StepCommentsProps {
  stepId: number;
}

export default function StepComments({ stepId }: StepCommentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isCertified, setIsCertified] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch comments for this step
  const { data: comments, isLoading } = useQuery<StepComment[]>({
    queryKey: ["/api/steps", stepId, "comments"],
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, isCertified }: { content: string; isCertified: boolean }) => {
      const response = await apiRequest("POST", `/api/steps/${stepId}/comments`, {
        content,
        isCertified,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/steps", stepId, "comments"] });
      setNewComment("");
      setIsCertified(false);
      setIsDialogOpen(false);
      toast({
        title: "Tip Added",
        description: "Your helpful tip has been added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add tip. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "Empty Tip",
        description: "Please enter a tip before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!isCertified) {
      toast({
        title: "Certification Required",
        description: "Please certify that your tip is helpful to others.",
        variant: "destructive",
      });
      return;
    }

    createCommentMutation.mutate({
      content: newComment.trim(),
      isCertified,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Comment Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquarePlus className="w-5 h-5" />
          Helper Tips
          {comments && comments.length > 0 && (
            <Badge variant="secondary" data-testid={`comment-count-${stepId}`}>
              {comments.length}
            </Badge>
          )}
        </h3>
        
        {isAuthenticated && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-tip">
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Add Tip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add Tip</DialogTitle>
                <DialogDescription>
                  Share helpful information that makes this step easier for other users.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Textarea
                  placeholder="Share tips, clarifications, or helpful insights about this step..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-tip-content"
                />
                
                <div className="flex items-start space-x-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Checkbox
                    id="certification"
                    checked={isCertified}
                    onCheckedChange={(checked) => setIsCertified(checked as boolean)}
                    data-testid="checkbox-certification"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="certification"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I certify this tip is helpful to others
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      This capability is only to be used for information that makes the steps easier for other users.
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || !isCertified || createCommentMutation.isPending}
                  data-testid="button-save-tip"
                >
                  {createCommentMutation.isPending ? "Saving..." : "Save Tip"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tips List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tips...</p>
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id} className="bg-gray-50 dark:bg-gray-800/50" data-testid={`comment-${comment.id}`}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Comment Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span data-testid={`comment-author-${comment.id}`}>
                        User {comment.userId.slice(-6)}
                      </span>
                      <Calendar className="w-4 h-4 ml-2" />
                      <span data-testid={`comment-date-${comment.id}`}>
                        {formatDate(comment.createdAt as string)}
                      </span>
                    </div>
                    
                    {comment.isCertified && (
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Certified Helpful
                      </Badge>
                    )}
                  </div>
                  
                  {/* Comment Content */}
                  <div className="text-sm leading-relaxed" data-testid={`comment-content-${comment.id}`}>
                    {comment.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground" data-testid="no-tips">
          <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>No helper tips yet.</p>
          <p className="text-sm">Be the first to share helpful information about this step!</p>
        </div>
      )}
    </div>
  );
}