"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useHITLRequest } from "@/hooks/useHITL";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Vote,
  ArrowUp,
  AlertTriangle,
  FileText,
  Calendar,
  Activity,
  Users,
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface HITLRequestViewerProps {
  requestId: string;
  open: boolean;
  onClose: () => void;
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  DELEGATED: "bg-purple-100 text-purple-800 border-purple-200",
};

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
  URGENT: "bg-red-200 text-red-900",
};

export function HITLRequestViewer({
  requestId,
  open,
  onClose,
}: HITLRequestViewerProps) {
  const {
    request,
    loading,
    error,
    resolveRequest,
    assignRequest,
    delegateRequest,
    escalateRequest,
    castVote,
    addComment,
  } = useHITLRequest(requestId);

  const [activeTab, setActiveTab] = useState("details");
  const [resolveData, setResolveData] = useState({
    approved: true,
    reason: "",
    comments: "",
  });
  const [commentText, setCommentText] = useState("");
  const [voteData, setVoteData] = useState({
    vote: "approve" as "approve" | "reject" | "abstain",
    reason: "",
  });
  const [assignData, setAssignData] = useState({
    assigneeId: "",
    reason: "",
  });
  const [escalateData, setEscalateData] = useState({
    reason: "MANUAL_ESCALATION" as any,
    description: "",
  });

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !request) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64 text-red-600">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {error || "Request not found"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleResolve = async (approved: boolean) => {
    try {
      await resolveRequest({
        approved,
        reason: resolveData.reason,
        comments: resolveData.comments,
      });
      onClose();
    } catch (error) {
      console.error("Failed to resolve request:", error);
    }
  };

  const handleVote = async () => {
    try {
      await castVote(voteData);
      setVoteData({ vote: "approve", reason: "" });
    } catch (error) {
      console.error("Failed to cast vote:", error);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ content: commentText });
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleEscalate = async () => {
    try {
      await escalateRequest(escalateData);
    } catch (error) {
      console.error("Failed to escalate request:", error);
    }
  };

  const canResolve =
    request.status === "PENDING" || request.status === "IN_PROGRESS";
  const canVote = request.votingData && canResolve;
  const isExpired = new Date() > new Date(request.expiresAt);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{request.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {request.description}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={priorityColors[request.priority]}>
                {request.priority}
              </Badge>
              <Badge className={statusColors[request.status]}>
                {request.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline">{request.type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Source:
                    </span>
                    <Badge variant="outline">{request.sourceType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created:
                    </span>
                    <span className="text-sm">
                      {format(
                        new Date(request.createdAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Expires:
                    </span>
                    <span
                      className={`text-sm ${isExpired ? "text-red-600" : ""}`}
                    >
                      {format(
                        new Date(request.expiresAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </span>
                  </div>
                  {request.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Completed:
                      </span>
                      <span className="text-sm">
                        {format(
                          new Date(request.completedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Requester:
                    </span>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{request.requester.name}</span>
                    </div>
                  </div>
                  {request.assignee && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Assignee:
                      </span>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm">{request.assignee.name}</span>
                      </div>
                    </div>
                  )}
                  {request.assigneeRoles &&
                    request.assigneeRoles.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Roles:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {request.assigneeRoles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>

            {request.performanceMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(
                          request.performanceMetrics.responseTimeMs / 1000 / 60,
                        )}
                        m
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Response Time
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {request.performanceMetrics.escalationCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Escalations
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {request.performanceMetrics.discussionMessages}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Messages
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {request.decisionData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {request.decisionData.approved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {request.decisionData.approved ? "Approved" : "Rejected"}
                    </span>
                  </div>
                  {request.decisionData.reason && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Reason:
                      </span>
                      <p className="text-sm mt-1">
                        {request.decisionData.reason}
                      </p>
                    </div>
                  )}
                  {request.decisionData.comments && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Comments:
                      </span>
                      <p className="text-sm mt-1">
                        {request.decisionData.comments}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Discussion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {request.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-l-2 border-gray-200 pl-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            {comment.user.name}
                          </span>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                  {request.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  )}
                </div>
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleComment}
                        disabled={!commentText.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            {canVote ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cast Your Vote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Vote</Label>
                    <Select
                      value={voteData.vote}
                      onValueChange={(value: any) =>
                        setVoteData({ ...voteData, vote: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve">
                          <div className="flex items-center space-x-2">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <span>Approve</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="reject">
                          <div className="flex items-center space-x-2">
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <span>Reject</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="abstain">
                          <div className="flex items-center space-x-2">
                            <Minus className="w-4 h-4 text-gray-600" />
                            <span>Abstain</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      placeholder="Explain your vote..."
                      value={voteData.reason}
                      onChange={(e) =>
                        setVoteData({ ...voteData, reason: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleVote} className="w-full">
                    <Vote className="w-4 h-4 mr-2" />
                    Cast Vote
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Voting is not available for this request
                  </p>
                </CardContent>
              </Card>
            )}

            {request.votingData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Voting Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {request.votingData.approvalVotes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Approve
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {request.votingData.rejectionVotes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reject
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {request.votingData.abstainVotes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Abstain
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {request.votingData.totalVotes} of{" "}
                      {request.votingData.requiredVotes} required votes
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {request.auditTrail?.map((entry: { action: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined; timestamp: string | number | Date; userId: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined; details: {}; }, index: React.Key | null | undefined) => (
                    <div
                      key={index}
                      className="border-l-2 border-blue-200 pl-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {entry.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), "MMM dd, HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        User ID: {entry.userId}
                      </p>
                      {entry.details &&
                        Object.keys(entry.details).length > 0 && (
                          <div className="text-xs bg-gray-50 p-2 rounded">
                            <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                          </div>
                        )}
                    </div>
                  )) || (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No audit trail available
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {canResolve && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Resolve Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Reason</Label>
                    <Input
                      placeholder="Reason for decision..."
                      value={resolveData.reason}
                      onChange={(e) =>
                        setResolveData({
                          ...resolveData,
                          reason: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Comments</Label>
                    <Textarea
                      placeholder="Additional comments..."
                      value={resolveData.comments}
                      onChange={(e) =>
                        setResolveData({
                          ...resolveData,
                          comments: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve this request? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleResolve(true)}
                          >
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex-1">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject this request? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleResolve(false)}
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Escalate Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Escalation Reason</Label>
                  <Select
                    value={escalateData.reason}
                    onValueChange={(value: any) =>
                      setEscalateData({ ...escalateData, reason: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIMEOUT">Timeout</SelectItem>
                      <SelectItem value="COMPLEXITY">Complexity</SelectItem>
                      <SelectItem value="CONFLICT">Conflict</SelectItem>
                      <SelectItem value="EXPERTISE_REQUIRED">
                        Expertise Required
                      </SelectItem>
                      <SelectItem value="POLICY_VIOLATION">
                        Policy Violation
                      </SelectItem>
                      <SelectItem value="MANUAL_ESCALATION">
                        Manual Escalation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe why this needs escalation..."
                    value={escalateData.description}
                    onChange={(e) =>
                      setEscalateData({
                        ...escalateData,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleEscalate}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Escalate Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
