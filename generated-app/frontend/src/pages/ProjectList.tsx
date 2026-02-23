import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useAllIssues } from '@/hooks/useIssues';
import { Plus, MoreHorizontal, Trash2, Settings, Columns3, ArrowUpRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectList() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();
  const { data: projects = [], isLoading } = useProjects();
  const { data: allIssues = [] } = useAllIssues();
  const deleteProject = useDeleteProject();

  const projectStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; open: number }> = {};
    projects.forEach(p => { stats[p.id] = { total: 0, done: 0, open: 0 }; });
    allIssues.forEach(issue => {
      if (stats[issue.projectId]) {
        stats[issue.projectId].total++;
        if (issue.status === 'done') stats[issue.projectId].done++;
        else stats[issue.projectId].open++;
      }
    });
    return stats;
  }, [projects, allIssues]);

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
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk'" }}>
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <Button onClick={() => navigate('/projects/new')} className="bg-[#D4A373] hover:bg-[#c49363] text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-11 w-11 bg-muted rounded-xl" />
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-1.5 w-full bg-muted rounded-full mt-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-border/50 border-dashed border-2">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-medium text-lg mb-1" style={{ fontFamily: "'Space Grotesk'" }}>No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Create your first project to start organizing your work and tracking issues.
            </p>
            <Button onClick={() => navigate('/projects/new')} className="bg-[#D4A373] hover:bg-[#c49363] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, i) => {
            const stats = projectStats[project.id] || { total: 0, done: 0, open: 0 };
            const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

            return (
              <Card
                key={project.id}
                className={cn(
                  'border-border/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-250 cursor-pointer group animate-slide-up overflow-hidden relative',
                  i < 6 && `stagger-${i + 1}`
                )}
                onClick={() => {
                  setCurrentProject(project.id);
                  navigate(`/project/${project.id}/board`);
                }}
              >
                {/* Top color accent */}
                <div
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${project.color || '#1B4332'}, ${project.color || '#1B4332'}80, transparent)` }}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:rotate-1"
                      style={{
                        backgroundColor: project.color || '#1B4332',
                        boxShadow: `0 4px 12px ${project.color || '#1B4332'}30`,
                      }}
                    >
                      {project.icon || project.key.slice(0, 2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                          <DropdownMenuItem onClick={() => { setCurrentProject(project.id); navigate(`/project/${project.id}/settings`); }}>
                            <Settings className="w-4 h-4 mr-2" /> Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(project.id, project.name)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <h3 className="font-medium text-[15px] leading-tight">{project.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{project.key}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{stats.total} issue{stats.total !== 1 ? 's' : ''}</span>
                    {stats.done > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-[#40916C] font-mono">{stats.done} done</span>
                      </>
                    )}
                    {stats.open > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <span className="font-mono">{stats.open} open</span>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  {stats.total > 0 && (
                    <div className="mt-3">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: progressPercent === 100 ? '#40916C' : (project.color || '#D4A373'),
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-[10px] text-muted-foreground/60">
                    Created {formatDate(project.createdAt)}
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
