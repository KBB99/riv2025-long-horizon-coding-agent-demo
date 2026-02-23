import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useAllIssues } from '@/hooks/useIssues';
import { Plus, FolderOpen, TrendingUp, CheckCircle2, Clock, AlertCircle, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, issueTypeColors, priorityColors, formatRelativeDate } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, setCurrentProject, openCreateIssue } = useApp();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: allIssues = [] } = useAllIssues();

  const myIssues = allIssues.filter(i => i.assigneeId === state.currentUser.id && i.status !== 'done');
  const totalIssues = allIssues.length;
  const openIssues = allIssues.filter(i => i.status !== 'done').length;
  const resolvedThisWeek = allIssues.filter(i => {
    if (!i.resolvedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(i.resolvedAt) > weekAgo;
  }).length;

  if (projects.length === 0 && !projectsLoading) {
    return <WelcomeScreen onCreateProject={() => navigate('/projects/new')} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold font-display" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Welcome back, {state.currentUser.name.split(' ')[0]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Issues', value: totalIssues, icon: FolderOpen, color: '#1B4332' },
          { label: 'Open Issues', value: openIssues, icon: AlertCircle, color: '#2196F3' },
          { label: 'Resolved This Week', value: resolvedThisWeek, icon: CheckCircle2, color: '#40916C' },
          { label: 'My Open Issues', value: myIssues.length, icon: Clock, color: '#D4A373' },
        ].map((stat, i) => (
          <Card key={stat.label} className={cn('animate-slide-up border-border/50', `stagger-${i + 1}`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1 font-display" style={{ fontFamily: "'Space Grotesk'" }}>{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="animate-slide-up stagger-3 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display" style={{ fontFamily: "'Space Grotesk'" }}>Projects</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.slice(0, 5).map((project) => {
              const projectIssues = allIssues.filter(i => i.projectId === project.id);
              const doneCount = projectIssues.filter(i => i.status === 'done').length;
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project.id);
                    navigate(`/project/${project.id}/board`);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: project.color || '#1B4332' }}
                  >
                    {project.icon || project.key.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.key} · {projectIssues.length} issues · {doneCount} done
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
            {projects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No projects yet</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/projects/new')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Create Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Issues */}
        <Card className="animate-slide-up stagger-4 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display" style={{ fontFamily: "'Space Grotesk'" }}>Assigned to Me</CardTitle>
              <Badge variant="secondary" className="text-xs">{myIssues.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {myIssues.slice(0, 8).map((issue) => (
              <button
                key={issue.id}
                onClick={() => navigate(`/issue/${issue.id}`)}
                className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: issueTypeColors[issue.type] || '#8896A6' }} />
                <span className="text-xs text-muted-foreground font-mono shrink-0">{issue.key}</span>
                <span className="text-sm truncate flex-1">{issue.summary}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColors[issue.priority] || '#8896A6' }} />
              </button>
            ))}
            {myIssues.length === 0 && (
              <p className="text-center py-6 text-muted-foreground text-sm">
                No issues assigned to you
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WelcomeScreen({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 animate-scale-in max-w-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-[#1B4332] flex items-center justify-center animate-slide-up">
          <TreePine className="w-10 h-10 text-[#D4A373]" />
        </div>
        <div className="animate-slide-up stagger-1">
          <h1 className="text-3xl font-bold font-display" style={{ fontFamily: "'Space Grotesk'" }}>
            Welcome to Canopy
          </h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            Manage your projects with clarity and purpose. Create your first project to get started.
          </p>
        </div>
        <div className="animate-slide-up stagger-2">
          <Button
            onClick={onCreateProject}
            size="lg"
            className="bg-[#D4A373] hover:bg-[#c49363] text-white px-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first project
          </Button>
        </div>
      </div>
    </div>
  );
}
