import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import type { UpdateProject } from '@canopy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowLeft, Settings, Trash2, Archive, Palette, Loader2 } from 'lucide-react';

const PROJECT_COLORS = [
  '#1B4332',
  '#2D6A4F',
  '#40916C',
  '#52796F',
  '#D4A373',
  '#BC6C25',
  '#E9C46A',
  '#9B59B6',
  '#2196F3',
  '#8896A6',
];

export default function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading, isError } = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [isArchived, setIsArchived] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setColor(project.color ?? PROJECT_COLORS[0]);
      setIsArchived(project.isArchived ?? false);
    }
  }, [project]);

  const hasChanges =
    project &&
    (name !== project.name ||
      description !== (project.description ?? '') ||
      color !== (project.color ?? PROJECT_COLORS[0]) ||
      isArchived !== (project.isArchived ?? false));

  const handleSave = () => {
    if (!projectId) return;

    if (!name.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }

    updateProject.mutate(
      {
        id: projectId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          isArchived,
        } as UpdateProject,
      },
      {
        onSuccess: (updated) => {
          toast.success(`Project "${updated.name}" settings saved`);
        },
        onError: (err) => {
          toast.error(`Failed to save settings: ${err.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!projectId || !project) return;

    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success(`Project "${project.name}" has been deleted`);
        navigate('/projects');
      },
      onError: (err) => {
        toast.error(`Failed to delete project: ${err.message}`);
      },
    });
  };

  const handleArchiveToggle = (checked: boolean) => {
    setIsArchived(checked);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Project not found or failed to load.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/projects')}
            >
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h1
              className="text-xl font-semibold text-foreground"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Project Settings
            </h1>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="font-mono text-xs tracking-wider"
          style={{ backgroundColor: `${project.color ?? PROJECT_COLORS[0]}20`, color: project.color ?? PROJECT_COLORS[0] }}
        >
          {project.key}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle
              className="text-base font-medium"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Enter project name"
              />
            </div>

            {/* Project Key (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="project-key">Project Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="project-key"
                  value={project.key}
                  readOnly
                  disabled
                  className="font-mono uppercase max-w-[140px] bg-muted"
                />
                <span className="text-xs text-muted-foreground">
                  Cannot be changed after creation
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this project..."
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Picker */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle
              className="text-base font-medium flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              <Palette className="w-4 h-4 text-muted-foreground" />
              Project Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-3">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-full aspect-square rounded-lg transition-all duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      c === color && 'ring-2 ring-offset-2 ring-offset-background scale-105'
                    )}
                    style={{
                      backgroundColor: c,
                      ringColor: c === color ? '#D4A373' : undefined,
                      outline: c === color ? `2px solid #D4A373` : 'none',
                      outlineOffset: '2px',
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-5 h-5 rounded-md border border-border/50"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground font-mono">{color}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archive */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle
              className="text-base font-medium flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              <Archive className="w-4 h-4 text-muted-foreground" />
              Archive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="archive-toggle" className="text-sm font-medium">
                  Archive this project
                </Label>
                <p className="text-xs text-muted-foreground">
                  Archived projects are hidden from the main project list and board views.
                  Issues remain accessible but cannot be modified.
                </p>
              </div>
              <Switch
                id="archive-toggle"
                checked={isArchived}
                onCheckedChange={handleArchiveToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateProject.isPending}
            className="bg-[#D4A373] hover:bg-[#c49363] text-white min-w-[120px]"
          >
            {updateProject.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-red-300/50 dark:border-red-900/50">
          <CardHeader>
            <CardTitle
              className="text-base font-medium text-red-600 dark:text-red-400"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Delete this project</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this project and all of its issues, sprints, and boards.
                  This action cannot be undone.
                </p>
              </div>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600 dark:text-red-400">
                      Delete Project
                    </DialogTitle>
                    <DialogDescription>
                      This will permanently delete <strong>{project.name}</strong> and all
                      associated data including issues, sprints, and boards. This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="delete-confirm" className="text-sm">
                      Type <span className="font-mono font-semibold">{project.key}</span> to
                      confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={project.key}
                      className="font-mono"
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteConfirmText('')}
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirmText !== project.key || deleteMutation.isPending}
                      onClick={handleDelete}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Permanently'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
