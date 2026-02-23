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
import { Plus, GripVertical, MoreHorizontal, Filter, Bug, Bookmark, Zap, CircleDot, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, issueTypeColors, priorityColors, getInitials, getAvatarColor, statusColors } from '@/lib/utils';
import type { Issue, BoardColumn } from '@canopy/shared';
import { toast } from 'sonner';

/* ---------------------------------------------------------------------------
 * Issue type -> icon mapping
 * -------------------------------------------------------------------------*/
const issueTypeIcons: Record<string, typeof Bug> = {
  Bug,
  Story: Bookmark,
  Task: CircleDot,
  Epic: Zap,
  'Sub-task': Layers,
};

/* ---------------------------------------------------------------------------
 * Priority labels for badge rendering
 * -------------------------------------------------------------------------*/
const priorityLabels: Record<string, string> = {
  Highest: 'P0',
  High: 'P1',
  Medium: 'P2',
  Low: 'P3',
  Lowest: 'P4',
};

/* ---------------------------------------------------------------------------
 * Column header gradient colours (extended from statusColors)
 * -------------------------------------------------------------------------*/
const columnGradientColors: Record<string, string> = {
  todo: '#8896A6',
  in_progress: '#2196F3',
  done: '#40916C',
};

/* ===========================================================================
 * BoardView (root component) -- all drag logic kept intact
 * =========================================================================*/
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
          <h1
            className="text-xl font-semibold font-display tracking-tight"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Board
          </h1>
          {activeSprint && (
            <p className="text-sm text-muted-foreground mt-0.5">{activeSprint.name}</p>
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
            <BoardColumnComponent
              key={column.id}
              column={column}
              issues={issuesByColumn[column.id] || []}
              onIssueClick={(id) => navigate(`/project/${projectId}/issues/${id}`)}
              users={state.users}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeIssue && <IssueCard issue={activeIssue} users={state.users} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ===========================================================================
 * BoardColumnComponent -- enhanced column visuals
 * =========================================================================*/
function BoardColumnComponent({
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
  const gradientColor = columnGradientColors[column.statusCategory] || statusColor;

  return (
    <div className="w-[310px] shrink-0 flex flex-col rounded-xl overflow-hidden bg-muted/20 backdrop-blur-sm border border-border/30">
      {/* Gradient top border accent */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${gradientColor}, ${gradientColor}88 60%, transparent)`,
        }}
      />

      {/* Column header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}44` }}
          />
          <span className="text-[13px] font-semibold tracking-tight">{column.name}</span>
          <span
            className="text-[11px] font-semibold min-w-[22px] h-[22px] flex items-center justify-center rounded-full"
            style={{
              backgroundColor: `${statusColor}15`,
              color: statusColor,
            }}
          >
            {issues.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {column.wipLimit && issues.length > column.wipLimit && (
            <Badge variant="destructive" className="text-[10px] h-5 font-mono">
              WIP {issues.length}/{column.wipLimit}
            </Badge>
          )}
          <button className="p-1 rounded-md hover:bg-muted/60 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground/60" />
          </button>
        </div>
      </div>

      {/* Issue cards */}
      <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy} id={column.id}>
        <div className="flex-1 px-2 pb-2 space-y-1.5 min-h-[120px]" data-column-id={column.id}>
          {issues.map(issue => (
            <SortableIssueCard
              key={issue.id}
              issue={issue}
              users={users}
              onClick={() => onIssueClick(issue.id)}
            />
          ))}
          {issues.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-border/30 mx-1 mt-1 transition-colors">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: `${statusColor}10` }}
              >
                <Plus className="w-4 h-4" style={{ color: `${statusColor}60` }} />
              </div>
              <span className="text-[11px] text-muted-foreground/50 font-medium">
                No issues yet
              </span>
              <span className="text-[10px] text-muted-foreground/35 mt-0.5">
                Drag items here
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ===========================================================================
 * SortableIssueCard -- wraps IssueCard with dnd-kit sortable
 * =========================================================================*/
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
    opacity: isDragging ? 0.4 : 1,
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

/* ===========================================================================
 * IssueCard -- the core enhanced card with Jira-style left border,
 * Linear-clean aesthetics, PS5 depth, and Swiss-grid precision
 * =========================================================================*/
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
  const TypeIcon = issueTypeIcons[issue.type] || CircleDot;
  const prioLabel = priorityLabels[issue.priority] || '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-lg overflow-hidden cursor-pointer',
        'border border-border/40',
        'transition-all duration-250 ease-out',
        'hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.06)]',
        'hover:-translate-y-[2px] hover:border-border/60',
        isDragging && [
          'shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1)]',
          'rotate-[2deg] scale-[1.04]',
          'border-border/70',
          'ring-2 ring-[#D4A373]/20',
        ]
      )}
    >
      {/* Jira-style coloured left border bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: typeColor }}
      />

      {/* Card body */}
      <div className="pl-4 pr-3 py-2.5">
        {/* Top row: type icon, key, drag handle */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${typeColor}14` }}
          >
            <TypeIcon className="w-3 h-3" style={{ color: typeColor }} />
          </div>
          <span className="text-[11px] text-muted-foreground font-mono font-medium tracking-wide">
            {issue.key}
          </span>

          {/* Drag handle -- revealed on hover */}
          <div
            {...dragListeners}
            className={cn(
              'ml-auto cursor-grab active:cursor-grabbing p-0.5 -mr-1 rounded transition-opacity duration-200',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-muted/50'
            )}
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
        </div>

        {/* Summary */}
        <p className="text-[13px] leading-[1.45] line-clamp-2 font-medium text-foreground/90 pr-1">
          {issue.summary}
        </p>

        {/* Bottom metadata row */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Priority badge */}
            {prioLabel && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-[2px] rounded font-mono leading-none"
                style={{
                  backgroundColor: `${prioColor}14`,
                  color: prioColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: prioColor }}
                />
                {prioLabel}
              </span>
            )}

            {/* Story points */}
            {issue.storyPoints != null && issue.storyPoints > 0 && (
              <span className="inline-flex items-center justify-center text-[10px] font-bold font-mono w-5 h-5 rounded-full bg-muted text-muted-foreground leading-none">
                {issue.storyPoints}
              </span>
            )}

            {/* Labels (max 2) */}
            {issue.labels.slice(0, 2).map(label => (
              <span
                key={label}
                className="text-[10px] px-1.5 py-[2px] bg-[#D4A373]/8 text-[#D4A373] rounded font-medium leading-none truncate max-w-[72px]"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Assignee avatar */}
          {assignee && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ring-2 ring-background transition-transform duration-200 group-hover:scale-110"
              style={{
                backgroundColor: assignee.color,
                boxShadow: `0 0 0 1px ${assignee.color}30`,
              }}
              title={assignee.name}
            >
              {getInitials(assignee.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
