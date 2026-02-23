import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Edit3,
  MessageSquare,
  MoreHorizontal,
  Send,
  Tag,
  Trash2,
  X,
  Zap,
  Bug,
  BookOpen,
  Layers,
  CircleDot,
  ChevronRight,
  Keyboard,
} from 'lucide-react';
import type { Issue, UpdateIssue, Comment as IssueComment } from '@canopy/shared';

import { useIssue, useUpdateIssue, useDeleteIssue } from '@/hooks/useIssues';
import { useSprints } from '@/hooks/useSprints';
import { useProject } from '@/hooks/useProjects';
import { useApp } from '@/context/AppContext';
import {
  cn,
  issueTypeColors,
  priorityColors,
  statusColors,
  formatRelativeDate,
  formatDate,
  getInitials,
  getAvatarColor,
} from '@/lib/utils';
import { addComment, listComments } from '@/api/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ISSUE_TYPES = ['Epic', 'Story', 'Bug', 'Task', 'Sub-task'] as const;
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;
const STATUSES = [
  { value: 'todo', label: 'To Do', category: 'todo' },
  { value: 'in_progress', label: 'In Progress', category: 'in_progress' },
  { value: 'in_review', label: 'In Review', category: 'in_progress' },
  { value: 'done', label: 'Done', category: 'done' },
] as const;

const STORY_POINT_OPTIONS = [0.5, 1, 2, 3, 5, 8, 13, 21];

function getIssueTypeIcon(type: string) {
  switch (type) {
    case 'Bug':
      return <Bug className="w-4 h-4" />;
    case 'Story':
      return <BookOpen className="w-4 h-4" />;
    case 'Epic':
      return <Zap className="w-4 h-4" />;
    case 'Sub-task':
      return <Layers className="w-4 h-4" />;
    case 'Task':
    default:
      return <CircleDot className="w-4 h-4" />;
  }
}

function getStatusLabel(status: string): string {
  const found = STATUSES.find((s) => s.value === status);
  return found ? found.label : status;
}

function getStatusCategory(status: string): string {
  const found = STATUSES.find((s) => s.value === status);
  return found ? found.category : 'todo';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IssueDetail() {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state } = useApp();

  // Data fetching
  const { data: issue, isLoading, error } = useIssue(issueId);
  const { data: project } = useProject(issue?.projectId);
  const { data: sprints = [] } = useSprints(issue?.projectId);
  const updateIssueMutation = useUpdateIssue();
  const deleteIssueMutation = useDeleteIssue();

  // Comments
  const { data: comments = [], refetch: refetchComments } = useQuery<IssueComment[]>({
    queryKey: ['comments', issueId],
    queryFn: () => listComments(issueId!),
    enabled: !!issueId,
  });

  const addCommentMutation = useMutation<IssueComment, Error, { issueId: string; body: string }>({
    mutationFn: ({ issueId: iId, body }) => addComment(iId, { issueId: iId, body }),
    onSuccess: () => {
      refetchComments();
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  // Local editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editMode, setEditMode] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Sync editing fields when issue loads
  useEffect(() => {
    if (issue) {
      setEditTitle(issue.summary);
      setEditDescription(issue.description || '');
    }
  }, [issue]);

  // Keyboard shortcut: 'e' to enter edit mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setEditMode((prev) => !prev);
        if (!editMode) {
          setIsEditingTitle(true);
          setTimeout(() => titleInputRef.current?.focus(), 50);
        } else {
          setIsEditingTitle(false);
          setIsEditingDescription(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleUpdateField = useCallback(
    (field: keyof UpdateIssue, value: unknown) => {
      if (!issue) return;
      updateIssueMutation.mutate(
        { id: issue.id, data: { [field]: value } as UpdateIssue },
        {
          onSuccess: () => {
            toast.success('Issue updated');
          },
          onError: () => {
            toast.error('Failed to update issue');
          },
        },
      );
    },
    [issue, updateIssueMutation],
  );

  const handleSaveTitle = useCallback(() => {
    if (!issue || editTitle.trim() === issue.summary) {
      setIsEditingTitle(false);
      return;
    }
    if (!editTitle.trim()) {
      setEditTitle(issue.summary);
      setIsEditingTitle(false);
      return;
    }
    handleUpdateField('summary', editTitle.trim());
    setIsEditingTitle(false);
  }, [issue, editTitle, handleUpdateField]);

  const handleSaveDescription = useCallback(() => {
    if (!issue || editDescription === (issue.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    handleUpdateField('description', editDescription);
    setIsEditingDescription(false);
  }, [issue, editDescription, handleUpdateField]);

  const handleDelete = useCallback(() => {
    if (!issue) return;
    deleteIssueMutation.mutate(
      { id: issue.id, projectId: issue.projectId },
      {
        onSuccess: () => {
          toast.success('Issue deleted');
          if (project) {
            navigate(`/project/${project.id}/board`);
          } else {
            navigate('/');
          }
        },
        onError: () => {
          toast.error('Failed to delete issue');
        },
      },
    );
  }, [issue, project, deleteIssueMutation, navigate]);

  const handleAddComment = useCallback(() => {
    if (!issueId || !newComment.trim()) return;
    addCommentMutation.mutate({ issueId, body: newComment.trim() });
  }, [issueId, newComment, addCommentMutation]);

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="animate-fade-in p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-6">
            <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-32 w-full bg-muted rounded animate-pulse" />
            <div className="h-24 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="animate-fade-in p-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold font-display mb-2">Issue Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The issue you are looking for does not exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const assignee = state.users.find((u) => u.id === issue.assigneeId);
  const reporter = state.users.find((u) => u.id === issue.reporterId);
  const typeColor = issueTypeColors[issue.type] || '#8896A6';
  const prioColor = priorityColors[issue.priority] || '#8896A6';
  const statusCategory = getStatusCategory(issue.status);
  const statusColor = statusColors[statusCategory] || '#8896A6';
  const currentSprint = sprints.find((s) => s.id === issue.sprintId);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-fade-in p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={project ? `/project/${project.id}/board` : '/'}
                  className="text-sm hover:text-primary transition-colors"
                >
                  {project?.name || 'Projects'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3.5 h-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded"
                  style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
                >
                  {getIssueTypeIcon(issue.type)}
                </span>
                <span className="font-mono text-sm font-medium">{issue.key}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditMode((prev) => !prev);
                  if (!editMode) {
                    setIsEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 50);
                  } else {
                    setIsEditingTitle(false);
                    setIsEditingDescription(false);
                  }
                }}
                className={cn(editMode && 'bg-primary/10 text-primary')}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="flex items-center gap-1.5">
                {editMode ? 'Exit edit mode' : 'Edit mode'}
                <kbd className="ml-1 px-1.5 py-0.5 bg-primary-foreground/20 rounded text-[10px] font-mono">
                  E
                </kbd>
              </span>
            </TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* ================================================================ */}
        {/* LEFT COLUMN: Title, Description, Comments                        */}
        {/* ================================================================ */}
        <div className="space-y-6 min-w-0">
          {/* Issue Type Badge + Key */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 text-xs font-medium"
              style={{
                borderColor: `${typeColor}40`,
                color: typeColor,
                backgroundColor: `${typeColor}10`,
              }}
            >
              {getIssueTypeIcon(issue.type)}
              {issue.type}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: `${statusColor}40`,
                color: statusColor,
                backgroundColor: `${statusColor}10`,
              }}
            >
              {getStatusLabel(issue.status)}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: `${prioColor}40`,
                color: prioColor,
                backgroundColor: `${prioColor}10`,
              }}
            >
              {issue.priority}
            </Badge>
          </div>

          {/* Summary / Title */}
          <div className="group">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditTitle(issue.summary);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-xl font-semibold font-display border-primary/30 focus-visible:border-primary h-auto py-2 px-3"
                  style={{ fontFamily: "'Space Grotesk'" }}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveTitle} className="shrink-0 h-9">
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditTitle(issue.summary);
                    setIsEditingTitle(false);
                  }}
                  className="shrink-0 h-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h1
                className={cn(
                  'text-xl font-semibold font-display leading-tight cursor-pointer rounded-md px-1 -mx-1 py-1 transition-colors',
                  'hover:bg-muted/50',
                  editMode && 'ring-1 ring-primary/20 bg-primary/5',
                )}
                style={{ fontFamily: "'Space Grotesk'" }}
                onClick={() => {
                  setIsEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 50);
                }}
                title="Click to edit summary"
              >
                {issue.summary}
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </h3>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setIsEditingDescription(true);
                    setTimeout(() => descriptionRef.current?.focus(), 50);
                  }}
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  ref={descriptionRef}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description... (Markdown supported)"
                  className="min-h-[160px] text-sm leading-relaxed resize-y border-primary/30 focus-visible:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditDescription(issue.description || '');
                      setIsEditingDescription(false);
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveDescription}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditDescription(issue.description || '');
                      setIsEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Markdown supported
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'bg-card border border-border/50 rounded-lg p-4 min-h-[80px] cursor-pointer transition-colors',
                  'hover:border-border',
                  editMode && 'ring-1 ring-primary/20',
                  !issue.description && 'flex items-center justify-center',
                )}
                onClick={() => {
                  setIsEditingDescription(true);
                  setTimeout(() => descriptionRef.current?.focus(), 50);
                }}
              >
                {issue.description ? (
                  <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
                    {issue.description.split('\n').map((line, i) => {
                      if (!line.trim()) return <br key={i} />;

                      // Heading support
                      if (line.startsWith('### ')) {
                        return (
                          <h4 key={i} className="text-sm font-semibold mt-3 mb-1">
                            {line.slice(4)}
                          </h4>
                        );
                      }
                      if (line.startsWith('## ')) {
                        return (
                          <h3 key={i} className="text-base font-semibold mt-4 mb-1">
                            {line.slice(3)}
                          </h3>
                        );
                      }
                      if (line.startsWith('# ')) {
                        return (
                          <h2 key={i} className="text-lg font-bold mt-4 mb-2">
                            {line.slice(2)}
                          </h2>
                        );
                      }

                      // Bullet list support
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return (
                          <div key={i} className="flex items-start gap-2 ml-2">
                            <span className="text-muted-foreground mt-1.5 shrink-0">
                              &bull;
                            </span>
                            <span>{renderInlineMarkdown(line.slice(2))}</span>
                          </div>
                        );
                      }

                      // Numbered list support
                      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
                      if (numberedMatch) {
                        return (
                          <div key={i} className="flex items-start gap-2 ml-2">
                            <span className="text-muted-foreground shrink-0">
                              {numberedMatch[1]}.
                            </span>
                            <span>{renderInlineMarkdown(numberedMatch[2])}</span>
                          </div>
                        );
                      }

                      // Code block line
                      if (line.startsWith('```')) {
                        return null;
                      }

                      return <p key={i}>{renderInlineMarkdown(line)}</p>;
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    Click to add a description...
                  </span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comments
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {comments.length}
              </span>
            </div>

            {/* Add comment form */}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                <AvatarFallback
                  className="text-[10px] font-bold text-white"
                  style={{ backgroundColor: state.currentUser.color }}
                >
                  {getInitials(state.currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  ref={commentRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px] text-sm resize-y"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to submit
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {addCommentMutation.isPending ? 'Sending...' : 'Comment'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-4 mt-4">
                {[...comments]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  )
                  .map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      users={state.users}
                      currentUser={state.currentUser}
                    />
                  ))}
              </div>
            )}

            {comments.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No comments yet. Be the first to add one.
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: Sidebar Details                                     */}
        {/* ================================================================ */}
        <div className="space-y-1">
          <div className="bg-card border border-border/50 rounded-lg shadow-sm animate-slide-in-right">
            {/* Status */}
            <SidebarField label="Status">
              <Select
                value={issue.status}
                onValueChange={(val) => handleUpdateField('status', val)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          statusColors[getStatusCategory(issue.status)] || '#8896A6',
                      }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: statusColors[s.category] || '#8896A6',
                          }}
                        />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Priority */}
            <SidebarField label="Priority">
              <Select
                value={issue.priority}
                onValueChange={(val) => handleUpdateField('priority', val)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: priorityColors[issue.priority] || '#8896A6',
                      }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: priorityColors[p] || '#8896A6' }}
                        />
                        {p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Type */}
            <SidebarField label="Type">
              <Select
                value={issue.type}
                onValueChange={(val) => handleUpdateField('type', val)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: issueTypeColors[issue.type] || '#8896A6' }}>
                      {getIssueTypeIcon(issue.type)}
                    </span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: issueTypeColors[t] || '#8896A6' }}>
                          {getIssueTypeIcon(t)}
                        </span>
                        {t}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Assignee */}
            <SidebarField label="Assignee">
              <Select
                value={issue.assigneeId || 'unassigned'}
                onValueChange={(val) =>
                  handleUpdateField('assigneeId', val === 'unassigned' ? undefined : val)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: assignee.color }}
                        >
                          {getInitials(assignee.name)}
                        </div>
                        <span className="truncate">{assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {state.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: user.color }}
                        >
                          {getInitials(user.name)}
                        </div>
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Reporter */}
            <SidebarField label="Reporter">
              <div className="flex items-center gap-2 px-3 py-1.5">
                {reporter ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: reporter.color }}
                    >
                      {getInitials(reporter.name)}
                    </div>
                    <span className="text-xs">{reporter.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Unknown</span>
                )}
              </div>
            </SidebarField>

            <SidebarDivider />

            {/* Sprint */}
            <SidebarField label="Sprint">
              <Select
                value={issue.sprintId || 'none'}
                onValueChange={(val) =>
                  handleUpdateField('sprintId', val === 'none' ? undefined : val)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No sprint</span>
                  </SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            sprint.status === 'active'
                              ? 'bg-green-500'
                              : sprint.status === 'completed'
                                ? 'bg-muted-foreground'
                                : 'bg-blue-400',
                          )}
                        />
                        {sprint.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Story Points */}
            <SidebarField label="Story Points">
              <Select
                value={issue.storyPoints?.toString() || 'none'}
                onValueChange={(val) =>
                  handleUpdateField(
                    'storyPoints',
                    val === 'none' ? undefined : parseFloat(val),
                  )
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-full h-8 text-xs font-medium border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {STORY_POINT_OPTIONS.map((sp) => (
                    <SelectItem key={sp} value={sp.toString()}>
                      {sp} {sp === 1 ? 'point' : 'points'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            <SidebarDivider />

            {/* Labels */}
            <SidebarField label="Labels">
              <div className="px-3 py-1.5">
                {issue.labels && issue.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="text-[10px] h-5 bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 cursor-default"
                      >
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No labels</span>
                )}
              </div>
            </SidebarField>

            <SidebarDivider />

            {/* Due Date */}
            <SidebarField label="Due Date">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">
                  {issue.dueDate ? (
                    <span
                      className={cn(
                        new Date(issue.dueDate) < new Date() &&
                          issue.status !== 'done' &&
                          'text-destructive font-medium',
                      )}
                    >
                      {formatDate(issue.dueDate)}
                      {new Date(issue.dueDate) < new Date() && issue.status !== 'done' && (
                        <span className="ml-1 text-[10px]">(overdue)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </span>
              </div>
            </SidebarField>

            <SidebarDivider />

            {/* Time Tracking */}
            <SidebarField label="Time Tracking">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="text-xs space-x-2">
                  {issue.timeEstimate ? (
                    <>
                      <span>
                        {formatTimeMinutes(issue.timeSpent || 0)} logged
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">
                        {formatTimeMinutes(issue.timeEstimate)} estimated
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No estimate</span>
                  )}
                </div>
              </div>
              {issue.timeEstimate && issue.timeEstimate > 0 && (
                <div className="px-3 pb-1.5">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          ((issue.timeSpent || 0) / issue.timeEstimate) * 100,
                        )}%`,
                        backgroundColor:
                          (issue.timeSpent || 0) > issue.timeEstimate
                            ? 'var(--destructive)'
                            : 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              )}
            </SidebarField>

            <SidebarDivider />

            {/* Timestamps */}
            <SidebarField label="Created">
              <div className="px-3 py-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-default">
                      {formatRelativeDate(issue.createdAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{formatDate(issue.createdAt)}</TooltipContent>
                </Tooltip>
              </div>
            </SidebarField>

            <SidebarDivider />

            <SidebarField label="Updated">
              <div className="px-3 py-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-default">
                      {formatRelativeDate(issue.updatedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{formatDate(issue.updatedAt)}</TooltipContent>
                </Tooltip>
              </div>
            </SidebarField>

            {issue.resolvedAt && (
              <>
                <SidebarDivider />
                <SidebarField label="Resolved">
                  <div className="px-3 py-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-green-600 cursor-default">
                          {formatRelativeDate(issue.resolvedAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{formatDate(issue.resolvedAt)}</TooltipContent>
                    </Tooltip>
                  </div>
                </SidebarField>
              </>
            )}
          </div>

          {/* Delete button */}
          <div className="pt-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete issue
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete issue {issue.key}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the issue
                    &ldquo;{issue.summary}&rdquo; and all associated comments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deleteIssueMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-1.5 px-2 py-2 text-[10px] text-muted-foreground">
            <Keyboard className="w-3 h-3" />
            <span>
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">E</kbd>{' '}
              to toggle edit mode
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function SidebarField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarDivider() {
  return <div className="mx-4 h-px bg-border/50" />;
}

function CommentCard({
  comment,
  users,
  currentUser,
}: {
  comment: IssueComment;
  users: { id: string; name: string; color: string }[];
  currentUser: { id: string; name: string; color: string };
}) {
  const author = users.find((u) => u.id === comment.authorId);
  const authorName = author?.name || 'Unknown User';
  const authorColor = author?.color || getAvatarColor(authorName);
  const isOwn = comment.authorId === currentUser.id;

  return (
    <div className="flex gap-3 animate-slide-up">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback
          className="text-[10px] font-bold text-white"
          style={{ backgroundColor: authorColor }}
        >
          {getInitials(authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-sm font-medium', isOwn && 'text-primary')}>
            {authorName}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground cursor-default">
                {formatRelativeDate(comment.createdAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{formatDate(comment.createdAt)}</TooltipContent>
          </Tooltip>
          {comment.isEdited && (
            <span className="text-[10px] text-muted-foreground italic">(edited)</span>
          )}
        </div>
        <div className="bg-muted/40 rounded-lg p-3 text-sm leading-relaxed">
          {comment.body.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            return <p key={i}>{renderInlineMarkdown(line)}</p>;
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Markdown Helpers
// ---------------------------------------------------------------------------

/**
 * Renders basic inline markdown: **bold**, *italic*, `code`, ~~strikethrough~~
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Code: `text`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/~~(.+?)~~/);

    // Find the earliest match
    const matches = [
      boldMatch ? { match: boldMatch, type: 'bold' } : null,
      italicMatch ? { match: italicMatch, type: 'italic' } : null,
      codeMatch ? { match: codeMatch, type: 'code' } : null,
      strikeMatch ? { match: strikeMatch, type: 'strike' } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (a!.match.index || 0) - (b!.match.index || 0));

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const earliest = matches[0]!;
    const idx = earliest.match.index || 0;

    // Push text before the match
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    // Push the formatted match
    const content = earliest.match[1];
    switch (earliest.type) {
      case 'bold':
        parts.push(
          <strong key={key++} className="font-semibold">
            {content}
          </strong>,
        );
        break;
      case 'italic':
        parts.push(
          <em key={key++} className="italic">
            {content}
          </em>,
        );
        break;
      case 'code':
        parts.push(
          <code
            key={key++}
            className="px-1 py-0.5 bg-muted rounded text-[12px] font-mono text-primary"
          >
            {content}
          </code>,
        );
        break;
      case 'strike':
        parts.push(
          <span key={key++} className="line-through text-muted-foreground">
            {content}
          </span>,
        );
        break;
    }

    remaining = remaining.slice(idx + earliest.match[0].length);
  }

  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Time formatting helper
// ---------------------------------------------------------------------------

function formatTimeMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
