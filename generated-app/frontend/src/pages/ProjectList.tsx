import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { Plus, MoreHorizontal, Trash2, Settings, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectList() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();
  const { data: projects = [], isLoading } = useProjects();
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
          <p className="text-muted-foreground mt-1">Manage your team's projects</p>
        </div>
        <Button onClick={() => navigate('/projects/new')} className="bg-[#D4A373] hover:bg-[#c49363] text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
            <Button onClick={() => navigate('/projects/new')} className="bg-[#D4A373] hover:bg-[#c49363] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <Card
              key={project.id}
              className={`border-border/50 hover:shadow-md transition-all duration-200 cursor-pointer group animate-slide-up stagger-${Math.min(i + 1, 6)}`}
              onClick={() => {
                setCurrentProject(project.id);
                navigate(`/project/${project.id}/board`);
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
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
                      <DropdownMenuItem onClick={() => { setCurrentProject(project.id); navigate(`/project/${project.id}/settings`); }}>
                        <Settings className="w-4 h-4 mr-2" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(project.id, project.name)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3">
                  <h3 className="font-medium text-sm">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{project.key}</p>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Created {formatDate(project.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
