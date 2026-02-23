import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useIssues } from '@/hooks/useIssues';
import { useSprints } from '@/hooks/useSprints';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  cn,
  statusColors,
  priorityColors,
  issueTypeColors,
  getInitials,
  getAvatarColor,
  formatRelativeDate,
} from '@/lib/utils';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Users,
  Activity,
  Target,
} from 'lucide-react';
import type { Issue, Sprint } from '@canopy/shared';

// Canopy forest palette
const FOREST_PALETTE = ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D'];
const WARM_PALETTE = ['#D4A373', '#DDA15E', '#BC6C25'];
const EARTH_PALETTE = ['#606C38', '#283618'];
const CHART_COLORS = [...FOREST_PALETTE, ...WARM_PALETTE, ...EARTH_PALETTE];

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#8896A6' },
  in_progress: { label: 'In Progress', color: '#2196F3' },
  in_review: { label: 'In Review', color: '#E9C46A' },
  done: { label: 'Done', color: '#40916C' },
};

// ---- Custom tooltip for Recharts ----
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground font-medium">{entry.value}</span>
          {entry.name && <span className="text-muted-foreground">{entry.name}</span>}
        </div>
      ))}
    </div>
  );
}

// ---- Stat Card ----
function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  index: number;
}) {
  return (
    <Card className={cn('animate-slide-up border-border/50', `stagger-${index + 1}`)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-semibold mt-1" style={{ fontFamily: "'Space Grotesk'" }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Main Reports Component ----
export default function Reports() {
  const { projectId } = useParams<{ projectId: string }>();
  const { state } = useApp();
  const activeProjectId = projectId || state.currentProjectId || undefined;

  const { data: issues = [], isLoading: issuesLoading } = useIssues(activeProjectId);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(activeProjectId);

  // ---- Computed analytics data ----
  const analytics = useMemo(() => {
    const total = issues.length;
    const todoIssues = issues.filter((i) => i.status === 'todo');
    const inProgressIssues = issues.filter((i) => i.status === 'in_progress' || i.status === 'in_review');
    const doneIssues = issues.filter((i) => i.status === 'done');

    const todoCount = todoIssues.length;
    const inProgressCount = inProgressIssues.length;
    const doneCount = doneIssues.length;
    const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    // Status distribution
    const statusMap = new Map<string, number>();
    issues.forEach((i) => {
      statusMap.set(i.status, (statusMap.get(i.status) || 0) + 1);
    });
    const statusData = Array.from(statusMap.entries()).map(([status, count]) => ({
      name: STATUS_DISPLAY[status]?.label || status,
      value: count,
      color: STATUS_DISPLAY[status]?.color || '#8896A6',
    }));

    // Priority distribution
    const priorityMap = new Map<string, number>();
    issues.forEach((i) => {
      priorityMap.set(i.priority, (priorityMap.get(i.priority) || 0) + 1);
    });
    const priorityOrder = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
    const priorityData = priorityOrder
      .filter((p) => priorityMap.has(p))
      .map((p) => ({
        name: p,
        value: priorityMap.get(p) || 0,
        color: priorityColors[p] || '#8896A6',
      }));

    // Type distribution
    const typeMap = new Map<string, number>();
    issues.forEach((i) => {
      typeMap.set(i.type, (typeMap.get(i.type) || 0) + 1);
    });
    const typeData = Array.from(typeMap.entries()).map(([type, count]) => ({
      name: type,
      value: count,
      color: issueTypeColors[type] || '#8896A6',
    }));

    // Assignee workload
    const assigneeMap = new Map<string, { total: number; done: number; inProgress: number; todo: number; storyPoints: number }>();
    issues.forEach((i) => {
      const id = i.assigneeId || 'unassigned';
      const entry = assigneeMap.get(id) || { total: 0, done: 0, inProgress: 0, todo: 0, storyPoints: 0 };
      entry.total += 1;
      if (i.status === 'done') entry.done += 1;
      else if (i.status === 'in_progress' || i.status === 'in_review') entry.inProgress += 1;
      else entry.todo += 1;
      entry.storyPoints += i.storyPoints || 0;
      assigneeMap.set(id, entry);
    });
    const assigneeData = Array.from(assigneeMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    // Sprint velocity
    const completedSprints = sprints
      .filter((s: Sprint) => s.status === 'completed')
      .sort((a: Sprint, b: Sprint) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const velocityData = completedSprints.map((s: Sprint) => {
      const sprintIssues = issues.filter((i) => i.sprintId === s.id);
      const completed = sprintIssues.filter((i) => i.status === 'done');
      const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
      const completedPoints = completed.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
      return {
        name: s.name,
        velocity: s.velocity || completedPoints,
        planned: totalPoints,
        completed: completedPoints,
        issuesDone: completed.length,
        issuesTotal: sprintIssues.length,
      };
    });

    // Sprint completion rates for all sprints (including active)
    const sprintCompletionData = sprints
      .filter((s: Sprint) => s.status !== 'future')
      .sort((a: Sprint, b: Sprint) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((s: Sprint) => {
        const sprintIssues = issues.filter((i) => i.sprintId === s.id);
        const completed = sprintIssues.filter((i) => i.status === 'done').length;
        const total = sprintIssues.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          name: s.name,
          status: s.status,
          completionRate: rate,
          completed,
          total,
        };
      });

    // Recent activity: issues sorted by updatedAt
    const recentActivity = [...issues]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    // Assignee distribution for team chart
    const assigneeChartData = assigneeData.slice(0, 8).map((a, i) => ({
      name: a.id === 'unassigned' ? 'Unassigned' : a.id,
      value: a.total,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return {
      total,
      todoCount,
      inProgressCount,
      doneCount,
      donePercent,
      statusData,
      priorityData,
      typeData,
      assigneeData,
      assigneeChartData,
      velocityData,
      sprintCompletionData,
      recentActivity,
      completedSprints,
    };
  }, [issues, sprints]);

  // ---- Resolve user name from ID ----
  function getUserName(userId: string): string {
    if (userId === 'unassigned') return 'Unassigned';
    const user = state.users.find((u) => u.id === userId);
    return user?.name || 'Unknown User';
  }

  // ---- Loading state ----
  if (issuesLoading || sprintsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">Loading project analytics...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="h-14 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-[#1B4332]" />
          </div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk'" }}>
            No Project Selected
          </h2>
          <p className="text-muted-foreground text-sm">
            Select a project from the sidebar to view its analytics and reports.
          </p>
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">Project analytics and insights</p>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#40916C]/10 flex items-center justify-center">
              <Layers className="w-8 h-8 text-[#40916C]" />
            </div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk'" }}>
              No Issues Yet
            </h2>
            <p className="text-muted-foreground text-sm">
              Create some issues in this project to see analytics and reports here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Reports
        </h1>
        <p className="text-muted-foreground mt-1">Project analytics and insights</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Issues"
          value={analytics.total}
          icon={Layers}
          color="#1B4332"
          index={0}
        />
        <StatCard
          label="Open"
          value={analytics.todoCount}
          subtitle={`${analytics.total > 0 ? Math.round((analytics.todoCount / analytics.total) * 100) : 0}% of total`}
          icon={Clock}
          color="#8896A6"
          index={1}
        />
        <StatCard
          label="In Progress"
          value={analytics.inProgressCount}
          subtitle={`${analytics.total > 0 ? Math.round((analytics.inProgressCount / analytics.total) * 100) : 0}% of total`}
          icon={TrendingUp}
          color="#2196F3"
          index={2}
        />
        <StatCard
          label="Done"
          value={analytics.doneCount}
          subtitle={`${analytics.donePercent}% complete`}
          icon={CheckCircle2}
          color="#40916C"
          index={3}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sprint" className="gap-1.5">
            <Target className="w-4 h-4" />
            Sprint
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution - Horizontal Bar */}
            <Card className="border-border/50 animate-slide-up">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Issues by Status
                </CardTitle>
                <CardDescription>Distribution across workflow stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.statusData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={90}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Issues" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {analytics.statusData.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution - Vertical Bar */}
            <Card className="border-border/50 animate-slide-up stagger-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Issues by Priority
                </CardTitle>
                <CardDescription>Severity breakdown of open and closed issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.priorityData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Issues" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {analytics.priorityData.map((entry, index) => (
                          <Cell key={`priority-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Type Distribution - Donut Chart */}
            <Card className="border-border/50 animate-slide-up stagger-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Issues by Type
                </CardTitle>
                <CardDescription>Breakdown of issue categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {analytics.typeData.map((entry, index) => (
                          <Cell key={`type-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-xs text-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/50 animate-slide-up stagger-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest issue updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 max-h-[260px] overflow-y-auto pr-1">
                  {analytics.recentActivity.map((issue, index) => (
                    <div key={issue.id}>
                      <div className="flex items-start gap-3 py-2.5">
                        <div className="mt-0.5">
                          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground shrink-0">
                              {issue.key}
                            </span>
                            <span className="text-sm truncate">{issue.summary}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                borderColor: STATUS_DISPLAY[issue.status]?.color || '#8896A6',
                                color: STATUS_DISPLAY[issue.status]?.color || '#8896A6',
                              }}
                            >
                              {STATUS_DISPLAY[issue.status]?.label || issue.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(issue.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-2"
                          style={{ backgroundColor: issueTypeColors[issue.type] || '#8896A6' }}
                        />
                      </div>
                      {index < analytics.recentActivity.length - 1 && (
                        <Separator className="ml-6" />
                      )}
                    </div>
                  ))}
                  {analytics.recentActivity.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== SPRINT TAB ==================== */}
        <TabsContent value="sprint" className="space-y-6">
          {sprints.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-16">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-[#2D6A4F]/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-[#2D6A4F]" />
                  </div>
                  <h3 className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk'" }}>
                    No Sprints Yet
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Create sprints in your project backlog to track velocity and completion rates here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Sprint Velocity Chart */}
              <Card className="border-border/50 animate-slide-up">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                    Sprint Velocity
                  </CardTitle>
                  <CardDescription>
                    Story points planned vs. completed per sprint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.velocityData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.velocityData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value: string) => (
                              <span className="text-xs text-foreground">{value}</span>
                            )}
                          />
                          <Bar
                            dataKey="planned"
                            name="Planned Points"
                            fill="#2D6A4F"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                          <Bar
                            dataKey="completed"
                            name="Completed Points"
                            fill="#52B788"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <p>Complete a sprint to see velocity data.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sprint Completion Rates */}
              <Card className="border-border/50 animate-slide-up stagger-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                    Sprint Completion Rates
                  </CardTitle>
                  <CardDescription>
                    Percentage of issues completed per sprint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.sprintCompletionData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.sprintCompletionData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v: number) => `${v}%`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const data = payload[0].payload as (typeof analytics.sprintCompletionData)[0];
                              return (
                                <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                                  <p className="text-sm font-semibold text-foreground">{data.completionRate}%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {data.completed} of {data.total} issues completed
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="mt-1 text-[10px]"
                                    style={{
                                      borderColor: data.status === 'completed' ? '#40916C' : '#2196F3',
                                      color: data.status === 'completed' ? '#40916C' : '#2196F3',
                                    }}
                                  >
                                    {data.status === 'completed' ? 'Completed' : 'Active'}
                                  </Badge>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="completionRate"
                            stroke="#1B4332"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#1B4332', stroke: '#1B4332' }}
                            activeDot={{ r: 6, fill: '#52B788', stroke: '#1B4332', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <p>Start a sprint to see completion rate trends.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sprint Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sprints
                  .sort((a: Sprint, b: Sprint) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 6)
                  .map((sprint: Sprint) => {
                    const sprintIssues = issues.filter((i) => i.sprintId === sprint.id);
                    const completedCount = sprintIssues.filter((i) => i.status === 'done').length;
                    const totalCount = sprintIssues.length;
                    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    const totalPoints = sprintIssues.reduce((s, i) => s + (i.storyPoints || 0), 0);

                    return (
                      <Card key={sprint.id} className="border-border/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold truncate" style={{ fontFamily: "'Space Grotesk'" }}>
                              {sprint.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0"
                              style={{
                                borderColor:
                                  sprint.status === 'completed'
                                    ? '#40916C'
                                    : sprint.status === 'active'
                                      ? '#2196F3'
                                      : '#8896A6',
                                color:
                                  sprint.status === 'completed'
                                    ? '#40916C'
                                    : sprint.status === 'active'
                                      ? '#2196F3'
                                      : '#8896A6',
                              }}
                            >
                              {sprint.status === 'completed'
                                ? 'Completed'
                                : sprint.status === 'active'
                                  ? 'Active'
                                  : 'Future'}
                            </Badge>
                          </div>
                          {sprint.goal && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{sprint.goal}</p>
                          )}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">
                                {completedCount} / {totalCount} issues
                              </span>
                              <span className="font-medium">{completionRate}%</span>
                            </div>
                            <Progress value={completionRate} className="h-1.5" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{totalPoints} story pts</span>
                            {sprint.startDate && (
                              <>
                                <span>|</span>
                                <span>
                                  {new Date(sprint.startDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                  {sprint.endDate &&
                                    ` - ${new Date(sprint.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}`}
                                </span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== TEAM TAB ==================== */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assignee Workload Table */}
            <Card className="border-border/50 lg:col-span-2 animate-slide-up">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Assignee Workload
                </CardTitle>
                <CardDescription>Issue distribution per team member</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.assigneeData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignee</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">To Do</TableHead>
                        <TableHead className="text-center">In Progress</TableHead>
                        <TableHead className="text-center">Done</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                        <TableHead className="w-[120px]">Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.assigneeData.map((assignee) => {
                        const name = getUserName(assignee.id);
                        const completionPercent =
                          assignee.total > 0
                            ? Math.round((assignee.done / assignee.total) * 100)
                            : 0;
                        return (
                          <TableRow key={assignee.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                {assignee.id === 'unassigned' ? (
                                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                  </div>
                                ) : (
                                  <Avatar className="w-7 h-7">
                                    <AvatarFallback
                                      className="text-[10px] text-white font-semibold"
                                      style={{ backgroundColor: getAvatarColor(name) }}
                                    >
                                      {getInitials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <span className="text-sm font-medium">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{assignee.total}</TableCell>
                            <TableCell className="text-center">
                              <span style={{ color: '#8896A6' }}>{assignee.todo}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span style={{ color: '#2196F3' }}>{assignee.inProgress}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span style={{ color: '#40916C' }}>{assignee.done}</span>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {assignee.storyPoints}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={completionPercent} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground w-8 text-right">
                                  {completionPercent}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No assigned issues to display.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Team Distribution Donut */}
            <Card className="border-border/50 animate-slide-up stagger-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "'Space Grotesk'" }}>
                  Work Distribution
                </CardTitle>
                <CardDescription>Issues per team member</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.assigneeChartData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.assigneeChartData.map((d) => ({
                              ...d,
                              name: d.name === d.name ? getUserName(d.name) : d.name,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            {analytics.assigneeChartData.map((entry, index) => (
                              <Cell key={`team-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {analytics.assigneeChartData.map((entry, index) => {
                        const name = getUserName(entry.name);
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-foreground flex-1 truncate">{name}</span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {entry.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No data available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Member Detail Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.assigneeData
              .filter((a) => a.id !== 'unassigned')
              .slice(0, 6)
              .map((assignee) => {
                const name = getUserName(assignee.id);
                const user = state.users.find((u) => u.id === assignee.id);
                const completionPercent =
                  assignee.total > 0 ? Math.round((assignee.done / assignee.total) * 100) : 0;
                const recentIssues = issues
                  .filter((i) => i.assigneeId === assignee.id)
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .slice(0, 3);

                return (
                  <Card key={assignee.id} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback
                            className="text-xs text-white font-semibold"
                            style={{ backgroundColor: user?.color || getAvatarColor(name) }}
                          >
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignee.total} issue{assignee.total !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-medium">{completionPercent}%</span>
                        </div>
                        <Progress value={completionPercent} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-xs font-semibold">{assignee.todo}</p>
                          <p className="text-[10px] text-muted-foreground">To Do</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-xs font-semibold" style={{ color: '#2196F3' }}>
                            {assignee.inProgress}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Active</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-xs font-semibold" style={{ color: '#40916C' }}>
                            {assignee.done}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Done</p>
                        </div>
                      </div>
                      {recentIssues.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Recent Issues
                            </p>
                            {recentIssues.map((issue) => (
                              <div key={issue.id} className="flex items-center gap-2">
                                <div
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: STATUS_DISPLAY[issue.status]?.color || '#8896A6',
                                  }}
                                />
                                <span className="text-xs font-mono text-muted-foreground shrink-0">
                                  {issue.key}
                                </span>
                                <span className="text-xs truncate">{issue.summary}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
