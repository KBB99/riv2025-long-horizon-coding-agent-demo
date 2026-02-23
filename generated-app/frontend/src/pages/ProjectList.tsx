import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useAllIssues } from '@/hooks/useIssues';
import { Plus, MoreHorizontal, Trash2, Settings, Columns3, FolderOpen, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectList() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();
  const { data: projects = [], isLoading } = useProjects();
  const { data: allIssues = [] } = useAllIssues();
  const deleteProject = useDeleteProject();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    deleteProject.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}"`),
      onError: () => toast.error('Failed to delete project'),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ fontFamily: "'Space Grotesk'" }}>
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Manage your team&apos;s work
          </p>
        </div>
        <Button onClick={() => navigate('/projects/new')} className="bg-gradient-to-r from-[#D4A373] to-[#c49363] hover:from-[#c49363] hover:to-[#b38353] text-white shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-10 w-10 shimmer rounded-lg" />
                  <div className="h-4 w-32 shimmer rounded" />
                  <div className="h-3 w-24 shimmer rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-border/40 border-dashed">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
            <Button onClick={() => navigate('/projects/new')} className="bg-gradient-to-r from-[#D4A373] to-[#c49363] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => {
            const projectIssues = allIssues.filter(issue => issue.projectId === project.id);
            const doneCount = projectIssues.filter(issue => issue.status === 'done').length;
            const openCount = projectIssues.filter(issue => issue.status !== 'done').length;

            return (
              <Card
                key={project.id}
                className={cn(
                  'card-hover border-border/40 cursor-pointer group animate-slide-up overflow-hidden',
                  `stagger-${Math.min(i + 1, 6)}`
                )}
                onClick={() => {
                  setCurrentProject(project.id);
                  navigate(`/project/${project.id}/board`);
                }}
              >
                <CardContent className="p-5 relative">
                  {/* Subtle top border accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: project.color || '#1B4332' }} />

                  <div className="flex items-start justify-between">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105"
                      style={{ backgroundColor: project.color || '#1B4332' }}
                    >
                      {project.icon || project.key.slice(0, 2)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setCurrentProject(project.id); navigate(`/project/${project.id}/board`); }}>
                          <Columns3 className="w-4 h-4 mr-2" /> Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCurrentProject(project.id); navigate(`/project/${project.id}/backlog`); }}>
                          <List className="w-4 h-4 mr-2" /> Backlog
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCurrentProject(project.id); navigate(`/project/${project.id}/settings`); }}>
                          <Settings className="w-4 h-4 mr-2" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(project.id, project.name)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{project.key}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
                    )}
                  </div>

                  {/* Issue stats */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {projectIssues.length > 0 ? (
                        <>
                          <span>{openCount} open</span>
                          <span className="text-border">·</span>
                          <span>{doneCount} done</span>
                        </>
                      ) : (
                        <span>No issues</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{formatDate(project.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
