import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useAllIssues } from '@/hooks/useIssues';
import { Plus, FolderOpen, TrendingUp, CheckCircle2, Clock, AlertCircle, TreePine, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="space-y-8 animate-fade-in">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] p-6 text-white animate-slide-up">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#D4A373]" />
            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl font-semibold font-display" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Welcome back, {state.currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · {totalIssues} total issue{totalIssues !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 animate-float" />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Issues', value: totalIssues, icon: FolderOpen, color: '#1B4332', bg: 'from-[#1B4332]/5 to-[#1B4332]/10' },
          { label: 'Open Issues', value: openIssues, icon: AlertCircle, color: '#2196F3', bg: 'from-[#2196F3]/5 to-[#2196F3]/10' },
          { label: 'Resolved This Week', value: resolvedThisWeek, icon: CheckCircle2, color: '#40916C', bg: 'from-[#40916C]/5 to-[#40916C]/10' },
          { label: 'My Open Issues', value: myIssues.length, icon: Clock, color: '#D4A373', bg: 'from-[#D4A373]/5 to-[#D4A373]/10' },
        ].map((stat, i) => (
          <Card key={stat.label} className={cn('card-hover animate-slide-up border-border/40 overflow-hidden', `stagger-${i + 1}`)}>
            <CardContent className="p-4 relative">
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', stat.bg)} />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1.5 font-display animate-count-up" style={{ fontFamily: "'Space Grotesk'", animationDelay: `${(i + 1) * 100 + 200}ms` }}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110" style={{ backgroundColor: `${stat.color}12` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Projects - Takes 3 columns */}
        <Card className="lg:col-span-3 animate-slide-up stagger-5 border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2" style={{ fontFamily: "'Space Grotesk'" }}>
                <div className="w-1.5 h-5 rounded-full bg-[#1B4332]" />
                Projects
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-muted-foreground hover:text-foreground group">
                View all
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {projects.slice(0, 5).map((project, idx) => {
              const projectIssues = allIssues.filter(i => i.projectId === project.id);
              const doneCount = projectIssues.filter(i => i.status === 'done').length;
              const progress = projectIssues.length > 0 ? (doneCount / projectIssues.length) * 100 : 0;
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project.id);
                    navigate(`/project/${project.id}/board`);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-all duration-200 text-left group',
                    'animate-slide-up'
                  )}
                  style={{ animationDelay: `${400 + idx * 60}ms` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: project.color || '#1B4332' }}
                  >
                    {project.icon || project.key.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {project.key} · {projectIssues.length} issues
                      </p>
                      {projectIssues.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#40916C] rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
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

        {/* My Issues - Takes 2 columns */}
        <Card className="lg:col-span-2 animate-slide-up stagger-6 border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2" style={{ fontFamily: "'Space Grotesk'" }}>
                <div className="w-1.5 h-5 rounded-full bg-[#D4A373]" />
                Assigned to Me
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-mono tabular-nums">{myIssues.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {myIssues.slice(0, 8).map((issue, idx) => (
              <button
                key={issue.id}
                onClick={() => {
                  if (issue.projectId) {
                    navigate(`/project/${issue.projectId}/issues/${issue.id}`);
                  } else {
                    navigate(`/issues/${issue.id}`);
                  }
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/60 transition-all duration-150 text-left group animate-slide-up"
                style={{ animationDelay: `${450 + idx * 50}ms` }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: issueTypeColors[issue.type] || '#8896A6' }} />
                <span className="text-xs text-muted-foreground font-mono shrink-0">{issue.key}</span>
                <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">{issue.summary}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColors[issue.priority] || '#8896A6' }} />
              </button>
            ))}
            {myIssues.length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mb-2 text-[#40916C]/40" />
                <p>No issues assigned to you</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreateIssue}>
                  <Plus className="w-3 h-3 mr-1" />
                  Create Issue
                </Button>
              </div>
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
      <div className="text-center space-y-8 animate-scale-in max-w-lg px-6">
        {/* Logo with animated glow */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-2 rounded-2xl bg-[#1B4332] opacity-20 blur-xl" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center animate-slide-up shadow-lg">
            <TreePine className="w-12 h-12 text-[#D4A373] animate-float" />
          </div>
        </div>

        <div className="animate-slide-up stagger-1 space-y-3">
          <h1 className="text-4xl font-bold font-display tracking-tight" style={{ fontFamily: "'Space Grotesk'" }}>
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B4332] to-[#40916C]">Canopy</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            Manage your projects with clarity and purpose. Start by creating your first project.
          </p>
        </div>

        <div className="animate-slide-up stagger-2 flex flex-col items-center gap-3">
          <Button
            onClick={onCreateProject}
            size="lg"
            className="bg-gradient-to-r from-[#D4A373] to-[#c49363] hover:from-[#c49363] hover:to-[#b38353] text-white px-8 shadow-md hover:shadow-lg transition-all duration-200 h-12 text-base"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create your first project
          </Button>
          <span className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border/50">C</kbd> to quick-create an issue
          </span>
        </div>
      </div>
    </div>
  );
}
