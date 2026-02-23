import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useCreateIssue } from '@/hooks/useIssues';
import { useSprints } from '@/hooks/useSprints';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreateIssue, IssueTypeValue, PriorityValue } from '@canopy/shared';

const ISSUE_TYPES: IssueTypeValue[] = ['Story', 'Bug', 'Task', 'Epic', 'Sub-task'];
const PRIORITIES: PriorityValue[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export function CreateIssueModal() {
  const { state, closeCreateIssue } = useApp();
  const { data: projects = [] } = useProjects();
  const createIssue = useCreateIssue();
  const projectId = state.currentProjectId || projects[0]?.id || '';
  const { data: sprints = [] } = useSprints(projectId);

  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueTypeValue>('Task');
  const [priority, setPriority] = useState<PriorityValue>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [createAnother, setCreateAnother] = useState(false);

  // Sync selectedProjectId when the current project changes (e.g. after navigation)
  useEffect(() => {
    if (projectId && selectedProjectId !== projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  const resetForm = () => {
    setSummary('');
    setDescription('');
    setType('Task');
    setPriority('Medium');
    setAssigneeId('');
    setSprintId('');
    setStoryPoints('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      toast.error('Summary is required');
      return;
    }

    const effectiveProjectId = selectedProjectId || projectId;
    if (!effectiveProjectId) {
      toast.error('Please select a project');
      return;
    }

    const data: CreateIssue = {
      projectId: effectiveProjectId,
      type,
      summary: summary.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeId: (assigneeId && assigneeId !== 'none') ? assigneeId : undefined,
      sprintId: (sprintId && sprintId !== 'none') ? sprintId : undefined,
      storyPoints: storyPoints ? parseFloat(storyPoints) : undefined,
      labels: [],
      components: [],
    };

    createIssue.mutate(data, {
      onSuccess: (issue) => {
        toast.success(`Created ${issue.key}: ${issue.summary}`);
        if (createAnother) {
          resetForm();
        } else {
          resetForm();
          closeCreateIssue();
        }
      },
      onError: (err) => {
        toast.error(`Failed to create issue: ${err.message}`);
      },
    });
  };

  const activeSprints = sprints.filter(s => s.status !== 'completed');

  return (
    <Dialog open={state.createIssueOpen} onOpenChange={(open) => !open && closeCreateIssue()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display" style={{ fontFamily: "'Space Grotesk'" }}>
            Create Issue
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project selector if no current project */}
          {!state.currentProjectId && projects.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.key})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as IssueTypeValue)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PriorityValue)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Summary</Label>
            <Input
              placeholder="What needs to be done?"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              autoFocus
              maxLength={255}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Add more details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {state.users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Story Points</Label>
              <Input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                placeholder="0"
                value={storyPoints}
                onChange={e => setStoryPoints(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {activeSprints.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Backlog" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Backlog</SelectItem>
                  {activeSprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={e => setCreateAnother(e.target.checked)}
                className="rounded"
              />
              Create another
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeCreateIssue} size="sm">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#D4A373] hover:bg-[#c49363] text-white"
                size="sm"
                disabled={createIssue.isPending}
              >
                {createIssue.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
