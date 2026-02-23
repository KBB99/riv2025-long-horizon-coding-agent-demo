import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useIssues, useUpdateIssue, useCreateIssue } from '@/hooks/useIssues';
import { useSprints, useCreateSprint, useUpdateSprint } from '@/hooks/useSprints';
import { useProject } from '@/hooks/useProjects';
import { Plus, GripVertical, ChevronDown, ChevronRight, Play, CheckCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn, issueTypeColors, priorityColors, getInitials } from '@/lib/utils';
import type { Issue, Sprint } from '@canopy/shared';
import { toast } from 'sonner';

export default function BacklogView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, openCreateIssue } = useApp();
  const { data: project } = useProject(projectId);
  const { data: issues = [] } = useIssues(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const updateIssue = useUpdateIssue();
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();

  const [filterText, setFilterText] = useState('');
  const [openSprints, setOpenSprints] = useState<Set<string>>(new Set(sprints.map(s => s.id)));

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (!filterText) return issues;
    const lower = filterText.toLowerCase();
    return issues.filter(i =>
      i.summary.toLowerCase().includes(lower) ||
      i.key.toLowerCase().includes(lower)
    );
  }, [issues, filterText]);

  // Group by sprint
  const sprintIssues = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    sprints.filter(s => s.status !== 'completed').forEach(s => { map[s.id] = []; });
    map['backlog'] = [];

    filteredIssues.forEach(issue => {
      if (issue.sprintId && map[issue.sprintId]) {
        map[issue.sprintId].push(issue);
      } else {
        map['backlog'].push(issue);
      }
    });

    return map;
  }, [filteredIssues, sprints]);

  const handleCreateSprint = () => {
    if (!projectId) return;
    const sprintNum = sprints.length + 1;
    createSprint.mutate(
      { projectId, name: `Sprint ${sprintNum}` },
      {
        onSuccess: (sprint) => {
          toast.success(`Created ${sprint.name}`);
          setOpenSprints(prev => new Set([...prev, sprint.id]));
        },
      }
    );
  };

  const handleStartSprint = (sprint: Sprint) => {
    if (!projectId) return;
    updateSprint.mutate(
      { id: sprint.id, projectId, data: { status: 'active' } },
      { onSuccess: () => toast.success(`Started ${sprint.name}`) }
    );
  };

  const handleCompleteSprint = (sprint: Sprint) => {
    if (!projectId) return;
    updateSprint.mutate(
      { id: sprint.id, projectId, data: { status: 'completed' } },
      { onSuccess: () => toast.success(`Completed ${sprint.name}`) }
    );
  };

  const handleMoveToSprint = (issueId: string, sprintId: string | null) => {
    updateIssue.mutate(
      { id: issueId, data: { sprintId: sprintId || undefined } },
      { onSuccess: () => toast.success('Issue moved') }
    );
  };

  const toggleSprint = (id: string) => {
    setOpenSprints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSprintPoints = (issues: Issue[]) => {
    return issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display" style={{ fontFamily: "'Space Grotesk'" }}>
            Backlog
          </h1>
          <p className="text-sm text-muted-foreground">{issues.length} issues</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="h-8 pl-8 w-40 text-sm"
            />
          </div>
          <Button onClick={handleCreateSprint} variant="outline" size="sm" className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Sprint
          </Button>
          <Button onClick={openCreateIssue} size="sm" className="bg-[#D4A373] hover:bg-[#c49363] text-white h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Issue
          </Button>
        </div>
      </div>

      {/* Sprint sections */}
      {sprints.filter(s => s.status !== 'completed').map(sprint => (
        <SprintSection
          key={sprint.id}
          sprint={sprint}
          issues={sprintIssues[sprint.id] || []}
          isOpen={openSprints.has(sprint.id)}
          onToggle={() => toggleSprint(sprint.id)}
          onStart={() => handleStartSprint(sprint)}
          onComplete={() => handleCompleteSprint(sprint)}
          onIssueClick={(id) => navigate(`/issue/${id}`)}
          onRemoveFromSprint={(issueId) => handleMoveToSprint(issueId, null)}
          users={state.users}
        />
      ))}

      {/* Backlog section */}
      <div className="border border-border/50 rounded-lg">
        <div className="p-3 flex items-center justify-between bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Backlog</span>
            <Badge variant="secondary" className="text-xs">{(sprintIssues['backlog'] || []).length}</Badge>
            <span className="text-xs text-muted-foreground">
              {getSprintPoints(sprintIssues['backlog'] || [])} pts
            </span>
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {(sprintIssues['backlog'] || []).map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onClick={() => navigate(`/issue/${issue.id}`)}
              users={state.users}
              sprints={sprints.filter(s => s.status !== 'completed')}
              onMoveToSprint={(sprintId) => handleMoveToSprint(issue.id, sprintId)}
            />
          ))}
          {(sprintIssues['backlog'] || []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <p>Backlog is empty</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={openCreateIssue}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Issue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SprintSection({
  sprint,
  issues,
  isOpen,
  onToggle,
  onStart,
  onComplete,
  onIssueClick,
  onRemoveFromSprint,
  users,
}: {
  sprint: Sprint;
  issues: Issue[];
  isOpen: boolean;
  onToggle: () => void;
  onStart: () => void;
  onComplete: () => void;
  onIssueClick: (id: string) => void;
  onRemoveFromSprint: (id: string) => void;
  users: { id: string; name: string; color: string }[];
}) {
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
  const donePoints = issues.filter(i => i.status === 'done').reduce((sum, i) => sum + (i.storyPoints || 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border border-border/50 rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="p-3 flex items-center justify-between bg-muted/30 rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium text-sm">{sprint.name}</span>
              <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">
                {sprint.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">{issues.length}</Badge>
              <span className="text-xs text-muted-foreground">
                {donePoints}/{totalPoints} pts
              </span>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {sprint.status === 'future' && issues.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onStart}>
                  <Play className="w-3 h-3 mr-1" />
                  Start Sprint
                </Button>
              )}
              {sprint.status === 'active' && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onComplete}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y divide-border/30">
            {issues.map(issue => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue.id)}
                users={users}
              />
            ))}
            {issues.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No issues in this sprint
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function IssueRow({
  issue,
  onClick,
  users,
  sprints,
  onMoveToSprint,
}: {
  issue: Issue;
  onClick: () => void;
  users: { id: string; name: string; color: string }[];
  sprints?: Sprint[];
  onMoveToSprint?: (sprintId: string) => void;
}) {
  const assignee = users.find(u => u.id === issue.assigneeId);
  const typeColor = issueTypeColors[issue.type] || '#8896A6';
  const prioColor = priorityColors[issue.priority] || '#8896A6';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors group"
    >
      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${typeColor}15` }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColor }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{issue.key}</span>
      <span className="text-sm flex-1 truncate">{issue.summary}</span>
      {issue.storyPoints && (
        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full font-mono">{issue.storyPoints}</span>
      )}
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: prioColor }} title={issue.priority} />
      {issue.labels.slice(0, 2).map(label => (
        <Badge key={label} variant="secondary" className="text-[10px] h-5">{label}</Badge>
      ))}
      {assignee && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
          style={{ backgroundColor: assignee.color }}
          title={assignee.name}
        >
          {getInitials(assignee.name)}
        </div>
      )}
      {sprints && onMoveToSprint && sprints.length > 0 && (
        <select
          onClick={e => e.stopPropagation()}
          onChange={e => e.target.value && onMoveToSprint(e.target.value)}
          className="text-xs bg-transparent border border-border/50 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          defaultValue=""
        >
          <option value="" disabled>Move to...</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
