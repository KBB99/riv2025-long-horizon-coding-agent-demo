import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProject } from '@/hooks/useProjects';
import { useIssues, useUpdateIssue, useCreateIssue } from '@/hooks/useIssues';
import { useBoard } from '@/hooks/useBoard';
import { useSprints } from '@/hooks/useSprints';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, MoreHorizontal, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, issueTypeColors, priorityColors, getInitials, getAvatarColor, statusColors } from '@/lib/utils';
import type { Issue, BoardColumn } from '@canopy/shared';
import { toast } from 'sonner';

export default function BoardView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, openCreateIssue } = useApp();
  const { data: project } = useProject(projectId);
  const { data: issues = [] } = useIssues(projectId);
  const { data: board } = useBoard(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const updateIssue = useUpdateIssue();
  const [filterText, setFilterText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeSprint = sprints.find(s => s.status === 'active');

  const columns = board?.columns || [
    { id: 'col-todo', name: 'To Do', statusCategory: 'todo' as const, sortOrder: 0 },
    { id: 'col-in-progress', name: 'In Progress', statusCategory: 'in_progress' as const, sortOrder: 1 },
    { id: 'col-in-review', name: 'In Review', statusCategory: 'in_progress' as const, sortOrder: 2 },
    { id: 'col-done', name: 'Done', statusCategory: 'done' as const, sortOrder: 3 },
  ];

  // Map status names to columns
  const statusToColumnId = useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach(col => {
      map[col.name.toLowerCase().replace(/\s+/g, '_')] = col.id;
      map[col.name.toLowerCase().replace(/\s+/g, '-')] = col.id;
      map[col.name.toLowerCase()] = col.id;
    });
    // Also map common status values
    map['todo'] = columns[0]?.id || '';
    map['in_progress'] = columns[1]?.id || '';
    map['in_review'] = columns[2]?.id || columns[1]?.id || '';
    map['done'] = columns[columns.length - 1]?.id || '';
    return map;
  }, [columns]);

  const columnIdToStatus = useMemo(() => {
    const map: Record<string, string> = {};
    columns.forEach(col => {
      map[col.id] = col.name.toLowerCase().replace(/\s+/g, '_');
    });
    return map;
  }, [columns]);

  // Filter and group issues by column
  const filteredIssues = useMemo(() => {
    let filtered = issues;
    if (activeSprint) {
      filtered = filtered.filter(i => i.sprintId === activeSprint.id || i.status === 'done');
    }
    if (filterText) {
      const lower = filterText.toLowerCase();
      filtered = filtered.filter(i =>
        i.summary.toLowerCase().includes(lower) ||
        i.key.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [issues, activeSprint, filterText]);

  const issuesByColumn = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    columns.forEach(col => { map[col.id] = []; });

    filteredIssues.forEach(issue => {
      const colId = statusToColumnId[issue.status] || columns[0]?.id || '';
      if (map[colId]) {
        map[colId].push(issue);
      } else if (columns[0]) {
        map[columns[0].id] = map[columns[0].id] || [];
        map[columns[0].id].push(issue);
      }
    });

    // Sort by sortOrder within each column
    Object.keys(map).forEach(colId => {
      map[colId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });

    return map;
  }, [filteredIssues, columns, statusToColumnId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeIssue = activeId ? issues.find(i => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumnId = overId;
    // Check if we dropped on another issue
    const isOverIssue = issues.some(i => i.id === overId);
    if (isOverIssue) {
      // Find which column this issue belongs to
      for (const [colId, colIssues] of Object.entries(issuesByColumn)) {
        if (colIssues.some(i => i.id === overId)) {
          targetColumnId = colId;
          break;
        }
      }
    }

    const newStatus = columnIdToStatus[targetColumnId];
    if (!newStatus) return;

    const issue = issues.find(i => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    updateIssue.mutate(
      { id: issueId, data: { status: newStatus } },
      {
        onSuccess: () => toast.success(`Moved to ${columns.find(c => c.id === targetColumnId)?.name || newStatus}`),
        onError: () => toast.error('Failed to move issue'),
      }
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-display" style={{ fontFamily: "'Space Grotesk'" }}>
            Board
          </h1>
          {activeSprint && (
            <p className="text-sm text-muted-foreground">{activeSprint.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter issues..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="h-8 pl-8 w-48 text-sm"
            />
          </div>
          <Button onClick={openCreateIssue} size="sm" className="bg-[#D4A373] hover:bg-[#c49363] text-white h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {columns.sort((a, b) => a.sortOrder - b.sortOrder).map(column => (
            <BoardColumn
              key={column.id}
              column={column}
              issues={issuesByColumn[column.id] || []}
              onIssueClick={(id) => navigate(`/issue/${id}`)}
              users={state.users}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && <IssueCard issue={activeIssue} users={state.users} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  column,
  issues,
  onIssueClick,
  users,
}: {
  column: BoardColumn;
  issues: Issue[];
  onIssueClick: (id: string) => void;
  users: { id: string; name: string; color: string }[];
}) {
  const statusColor = statusColors[column.statusCategory] || '#8896A6';

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg">
      {/* Column header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-sm font-medium">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>
        {column.wipLimit && issues.length > column.wipLimit && (
          <Badge variant="destructive" className="text-[10px] h-5">
            WIP {issues.length}/{column.wipLimit}
          </Badge>
        )}
      </div>

      {/* Issue cards */}
      <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy} id={column.id}>
        <div className="flex-1 p-2 pt-0 space-y-2 min-h-[100px]" data-column-id={column.id}>
          {issues.map(issue => (
            <SortableIssueCard
              key={issue.id}
              issue={issue}
              users={users}
              onClick={() => onIssueClick(issue.id)}
            />
          ))}
          {issues.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-border/50 rounded-md">
              Drop issues here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableIssueCard({
  issue,
  users,
  onClick,
}: {
  issue: Issue;
  users: { id: string; name: string; color: string }[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <IssueCard
        issue={issue}
        users={users}
        onClick={onClick}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}

function IssueCard({
  issue,
  users,
  onClick,
  dragListeners,
  isDragging,
}: {
  issue: Issue;
  users: { id: string; name: string; color: string }[];
  onClick?: () => void;
  dragListeners?: any;
  isDragging?: boolean;
}) {
  const assignee = users.find(u => u.id === issue.assigneeId);
  const typeColor = issueTypeColors[issue.type] || '#8896A6';
  const prioColor = priorityColors[issue.priority] || '#8896A6';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg p-3 shadow-sm border border-border/50 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        isDragging && 'shadow-lg rotate-1 scale-[1.02]'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-3 h-3 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${typeColor}20` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor }} />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{issue.key}</span>
        <div {...dragListeners} className="ml-auto cursor-grab active:cursor-grabbing p-0.5 -mr-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
          <GripVertical className="w-3 h-3 text-muted-foreground/50" />
        </div>
      </div>
      <p className="text-sm line-clamp-2 leading-snug">{issue.summary}</p>
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          {issue.storyPoints && (
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full font-mono font-medium">
              {issue.storyPoints}
            </span>
          )}
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: prioColor }} title={issue.priority} />
          {issue.labels.slice(0, 2).map(label => (
            <span key={label} className="text-[10px] px-1.5 py-0.5 bg-[#D4A373]/10 text-[#D4A373] rounded-full">
              {label}
            </span>
          ))}
        </div>
        {assignee && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: assignee.color }}
            title={assignee.name}
          >
            {getInitials(assignee.name)}
          </div>
        )}
      </div>
    </div>
  );
}
