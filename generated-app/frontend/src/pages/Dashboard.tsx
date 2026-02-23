import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useAllIssues } from '@/hooks/useIssues';
import type { Issue } from '@canopy/shared';
import {
  Plus,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  TreePine,
  ArrowRight,
  Zap,
  Layers,
  ArrowUpRight,
  Sparkles,
  Activity,
  GitBranch,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  cn,
  issueTypeColors,
  priorityColors,
  formatRelativeDate,
  getInitials,
  getAvatarColor,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// Animated number counter hook — spring physics feel
// ---------------------------------------------------------------------------

function useAnimatedCount(target: number, duration = 900): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = current;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      // Spring-style ease-out (overshoot then settle)
      const t = Math.min(elapsed / duration, 1);
      const spring = 1 - Math.pow(1 - t, 4); // quartic ease-out for snappy feel
      const value = Math.round(fromRef.current + (target - fromRef.current) * spring);
      setCurrent(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return current;
}

// ---------------------------------------------------------------------------
// Priority bar chart (inline horizontal stacked bar)
// ---------------------------------------------------------------------------

interface PriorityBreakdownProps {
  issues: Issue[];
}

const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  Highest: 'Critical',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Lowest: 'Trivial',
};

function PriorityBreakdown({ issues }: PriorityBreakdownProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PRIORITY_ORDER) counts[p] = 0;
    for (const issue of issues) {
      if (counts[issue.priority] !== undefined) {
        counts[issue.priority]++;
      }
    }
    return counts;
  }, [issues]);

  const total = issues.length || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Priority Distribution
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {issues.length} total
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/50 gap-px">
        {PRIORITY_ORDER.map((p) => {
          const pct = (breakdown[p] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={p}
              className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full cursor-pointer"
              style={{
                width: `${pct}%`,
                backgroundColor: priorityColors[p],
                opacity: hovered && hovered !== p ? 0.35 : 1,
                transform: hovered === p ? 'scaleY(1.3)' : 'scaleY(1)',
              }}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {PRIORITY_ORDER.map((p) => {
          if (breakdown[p] === 0) return null;
          return (
            <div
              key={p}
              className={cn(
                'flex items-center gap-1.5 transition-opacity duration-200',
                hovered && hovered !== p ? 'opacity-40' : 'opacity-100'
              )}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: priorityColors[p] }}
              />
              <span className="text-[11px] text-muted-foreground">
                {PRIORITY_LABELS[p]}
              </span>
              <span className="text-[11px] font-mono font-medium text-foreground/70">
                {breakdown[p]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card with animated counter and trend
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
  delay: number;
}

function StatCard({ label, value, icon: Icon, color, trend, delay }: StatCardProps) {
  const animatedValue = useAnimatedCount(value);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card
      className={cn(
        'border-border/40 hover:border-border/80 transition-all duration-300 group cursor-default overflow-hidden relative',
        isVisible ? 'animate-slide-up opacity-100' : 'opacity-0'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient accent on top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
        }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.08em]">
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className="text-3xl font-semibold tracking-tight font-display tabular-nums"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                {animatedValue}
              </p>
              {trend && trend.value !== 0 && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[11px] font-medium font-mono',
                    trend.value > 0 ? 'text-[#40916C]' : 'text-[#BC6C25]'
                  )}
                >
                  {trend.value > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}
                  <span className="text-muted-foreground ml-0.5 font-sans font-normal">
                    {trend.label}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ backgroundColor: `${color}12` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent Activity feed
// ---------------------------------------------------------------------------

function getActivityVerb(issue: Issue): string {
  if (issue.status === 'done') return 'completed';
  if (issue.status === 'in_progress') return 'started working on';
  return 'created';
}

function getActivityIcon(issue: Issue) {
  if (issue.status === 'done') return CheckCircle2;
  if (issue.status === 'in_progress') return Activity;
  return Circle;
}

function getActivityTime(issue: Issue): string {
  if (issue.status === 'done' && issue.resolvedAt) return formatRelativeDate(issue.resolvedAt);
  if (issue.updatedAt) return formatRelativeDate(issue.updatedAt);
  return formatRelativeDate(issue.createdAt);
}

interface RecentActivityProps {
  issues: Issue[];
  users: { id: string; name: string; color: string }[];
  onIssueClick: (id: string) => void;
}

function RecentActivity({ issues, users, onIssueClick }: RecentActivityProps) {
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const u of users) map.set(u.id, { name: u.name, color: u.color });
    return map;
  }, [users]);

  // Build activity items from issues, sorted by most recent update
  const activities = useMemo(() => {
    return [...issues]
      .sort((a, b) => {
        const timeA = a.updatedAt || a.createdAt;
        const timeB = b.updatedAt || b.createdAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      })
      .slice(0, 8);
  }, [issues]);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Activity className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No recent activity</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Activity will appear here once work begins
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((issue, idx) => {
        const user = issue.assigneeId ? userMap.get(issue.assigneeId) : null;
        const ActivityIcon = getActivityIcon(issue);
        const verb = getActivityVerb(issue);
        const time = getActivityTime(issue);

        return (
          <button
            key={issue.id}
            onClick={() => onIssueClick(issue.id)}
            className={cn(
              'w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-all duration-200 text-left group',
              'animate-slide-up'
            )}
            style={{ animationDelay: `${200 + idx * 60}ms` }}
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center pt-0.5 shrink-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${issueTypeColors[issue.type] || '#8896A6'}15`,
                }}
              >
                <ActivityIcon
                  className="w-3.5 h-3.5"
                  style={{ color: issueTypeColors[issue.type] || '#8896A6' }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {user && (
                  <span className="text-xs font-medium text-foreground">
                    {user.name.split(' ')[0]}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{verb}</span>
                <span className="text-xs font-mono text-muted-foreground/80">{issue.key}</span>
              </div>
              <p className="text-sm text-foreground/90 truncate leading-snug group-hover:text-foreground transition-colors">
                {issue.summary}
              </p>
              <span className="text-[10px] text-muted-foreground/60 font-mono">{time}</span>
            </div>

            {/* Priority dot */}
            <div
              className="w-2 h-2 rounded-full mt-2.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: priorityColors[issue.priority] || '#8896A6' }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero Gradient Mesh Background (SVG-based)
// ---------------------------------------------------------------------------

function HeroGradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="mesh-1" cx="20%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#1B4332" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1B4332" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-2" cx="70%" cy="60%" r="45%">
            <stop offset="0%" stopColor="#D4A373" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#D4A373" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-3" cx="90%" cy="20%" r="35%">
            <stop offset="0%" stopColor="#40916C" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#40916C" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-4" cx="40%" cy="80%" r="40%">
            <stop offset="0%" stopColor="#9B59B6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#9B59B6" stopOpacity="0" />
          </radialGradient>
          {/* Noise texture overlay */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh-1)" />
        <rect width="100%" height="100%" fill="url(#mesh-2)" />
        <rect width="100%" height="100%" fill="url(#mesh-3)" />
        <rect width="100%" height="100%" fill="url(#mesh-4)" />
        <rect width="100%" height="100%" filter="url(#noise)" opacity="0.025" />
      </svg>
      {/* Grid overlay (Swiss International style) */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, setCurrentProject, openCreateIssue } = useApp();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: allIssues = [] } = useAllIssues();

  const myIssues = useMemo(
    () => allIssues.filter((i) => i.assigneeId === state.currentUser.id && i.status !== 'done'),
    [allIssues, state.currentUser.id]
  );

  const totalIssues = allIssues.length;
  const openIssues = useMemo(() => allIssues.filter((i) => i.status !== 'done').length, [allIssues]);

  const resolvedThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allIssues.filter((i) => {
      if (!i.resolvedAt) return false;
      return new Date(i.resolvedAt) > weekAgo;
    }).length;
  }, [allIssues]);

  // Compute trends (simple mock: compare count to a reasonable baseline)
  const resolvedPrevWeek = useMemo(() => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allIssues.filter((i) => {
      if (!i.resolvedAt) return false;
      const d = new Date(i.resolvedAt);
      return d > twoWeeksAgo && d <= weekAgo;
    }).length;
  }, [allIssues]);

  const handleIssueClick = useCallback(
    (issueId: string) => navigate(`/issue/${issueId}`),
    [navigate]
  );

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = state.currentUser.name.split(' ')[0];

  if (projects.length === 0 && !projectsLoading) {
    return <WelcomeScreen onCreateProject={() => navigate('/projects/new')} />;
  }

  return (
    <div className="animate-fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Section                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative -mx-6 -mt-6 px-6 pt-8 pb-8 mb-8 overflow-hidden">
        <HeroGradientMesh />

        <div className="relative z-10 max-w-3xl">
          <div className="animate-slide-up">
            <p
              className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/70 mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Dashboard
            </p>
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15] font-display"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed max-w-lg">
              {openIssues > 0 ? (
                <>
                  You have{' '}
                  <span className="text-foreground font-medium">{myIssues.length} open issue{myIssues.length !== 1 ? 's' : ''}</span>{' '}
                  assigned across{' '}
                  <span className="text-foreground font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>.
                </>
              ) : (
                'All clear! No open issues to worry about.'
              )}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-3 mt-5 animate-slide-up stagger-2">
            <Button
              onClick={openCreateIssue}
              size="sm"
              className="bg-[#1B4332] hover:bg-[#163a2a] text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Issue
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects')}
              className="transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              All Projects
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards (4-col Swiss grid)                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Issues"
          value={totalIssues}
          icon={FolderOpen}
          color="#1B4332"
          delay={80}
        />
        <StatCard
          label="Open Issues"
          value={openIssues}
          icon={AlertCircle}
          color="#2196F3"
          delay={140}
        />
        <StatCard
          label="Resolved This Week"
          value={resolvedThisWeek}
          icon={CheckCircle2}
          color="#40916C"
          trend={{
            value: resolvedThisWeek - resolvedPrevWeek,
            label: 'vs last week',
          }}
          delay={200}
        />
        <StatCard
          label="My Open Issues"
          value={myIssues.length}
          icon={Clock}
          color="#D4A373"
          delay={260}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content grid: 7/5 split (editorial asymmetry)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left column — Recent Activity */}
        <div className="lg:col-span-7">
          <Card className="animate-slide-up stagger-3 border-border/40 hover:border-border/60 transition-colors duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#1B4332]/8 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-[#1B4332]" />
                  </div>
                  <CardTitle
                    className="text-[15px] font-display"
                    style={{ fontFamily: "'Space Grotesk'" }}
                  >
                    Recent Activity
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RecentActivity
                issues={allIssues}
                users={state.users}
                onIssueClick={handleIssueClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column — stacked cards */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Breakdown */}
          <Card className="animate-slide-up stagger-4 border-border/40 hover:border-border/60 transition-colors duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#D4A373]/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[#D4A373]" />
                </div>
                <CardTitle
                  className="text-[15px] font-display"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  Priority Overview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {allIssues.length > 0 ? (
                <PriorityBreakdown issues={allIssues.filter((i) => i.status !== 'done')} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No issues to analyze</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Issues compact list */}
          <Card className="animate-slide-up stagger-5 border-border/40 hover:border-border/60 transition-colors duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2196F3]/10 flex items-center justify-center">
                    <GitBranch className="w-3.5 h-3.5 text-[#2196F3]" />
                  </div>
                  <CardTitle
                    className="text-[15px] font-display"
                    style={{ fontFamily: "'Space Grotesk'" }}
                  >
                    Assigned to Me
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono tabular-nums px-2 py-0.5">
                  {myIssues.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {myIssues.length > 0 ? (
                <div className="space-y-0.5">
                  {myIssues.slice(0, 6).map((issue, idx) => (
                    <button
                      key={issue.id}
                      onClick={() => navigate(`/issue/${issue.id}`)}
                      className={cn(
                        'w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-all duration-200 text-left group',
                        'animate-slide-up'
                      )}
                      style={{ animationDelay: `${300 + idx * 50}ms` }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-current/10 transition-all"
                        style={{ backgroundColor: issueTypeColors[issue.type] || '#8896A6' }}
                      />
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0 opacity-70">
                        {issue.key}
                      </span>
                      <span className="text-sm truncate flex-1 group-hover:text-foreground transition-colors text-foreground/85">
                        {issue.summary}
                      </span>
                      <div
                        className="w-2 h-2 rounded-full shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: priorityColors[issue.priority] || '#8896A6' }}
                      />
                    </button>
                  ))}
                  {myIssues.length > 6 && (
                    <p className="text-[11px] text-muted-foreground text-center pt-2 font-mono">
                      +{myIssues.length - 6} more issues
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-[#40916C]/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    No issues currently assigned to you
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Projects row                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card className="animate-slide-up stagger-6 border-border/40 hover:border-border/60 transition-colors duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#40916C]/10 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-[#40916C]" />
              </div>
              <CardTitle
                className="text-[15px] font-display"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Projects
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors group/btn"
            >
              View all
              <ArrowRight className="w-3 h-3 ml-1 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.slice(0, 6).map((project, idx) => {
                const projectIssues = allIssues.filter((i) => i.projectId === project.id);
                const doneCount = projectIssues.filter((i) => i.status === 'done').length;
                const progress = projectIssues.length > 0 ? (doneCount / projectIssues.length) * 100 : 0;

                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setCurrentProject(project.id);
                      navigate(`/project/${project.id}/board`);
                    }}
                    className={cn(
                      'flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-muted/50 transition-all duration-200 text-left group border border-transparent hover:border-border/50',
                      'animate-slide-up'
                    )}
                    style={{ animationDelay: `${350 + idx * 60}ms` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:rotate-1 shadow-sm"
                      style={{ backgroundColor: project.color || '#1B4332' }}
                    >
                      {project.icon || project.key.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                          {project.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {project.key} · {projectIssues.length} issue{projectIssues.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {/* Mini progress bar */}
                      {projectIssues.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-muted/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#40916C] transition-all duration-700 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No projects yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-3">
                Create your first project to get started
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects/new')}
                className="transition-all duration-200 active:scale-[0.98]"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Create Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome Screen (polished empty state for new users)
// ---------------------------------------------------------------------------

function WelcomeScreen({ onCreateProject }: { onCreateProject: () => void }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="welcome-1" cx="30%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#1B4332" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1B4332" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="welcome-2" cx="70%" cy="70%" r="40%">
              <stop offset="0%" stopColor="#D4A373" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#D4A373" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="welcome-3" cx="50%" cy="20%" r="35%">
              <stop offset="0%" stopColor="#40916C" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#40916C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcome-1)" />
          <rect width="100%" height="100%" fill="url(#welcome-2)" />
          <rect width="100%" height="100%" fill="url(#welcome-3)" />
        </svg>
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div
        className={cn(
          'relative z-10 text-center space-y-8 max-w-lg px-6 transition-all duration-700',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        {/* Illustrated logo */}
        <div className="mx-auto relative">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-lg animate-scale-in"
            style={{
              background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
            }}
          >
            <TreePine className="w-12 h-12 text-[#D4A373]" />
          </div>
          {/* Floating accent elements */}
          <div
            className="absolute -top-2 -right-3 w-5 h-5 rounded-lg bg-[#D4A373]/20 animate-slide-up stagger-2"
            style={{ animationDuration: '600ms' }}
          />
          <div
            className="absolute -bottom-1 -left-3 w-4 h-4 rounded-md bg-[#40916C]/15 animate-slide-up stagger-3"
            style={{ animationDuration: '600ms' }}
          />
          <div
            className="absolute top-1 -left-5 w-3 h-3 rounded-full bg-[#9B59B6]/10 animate-slide-up stagger-4"
            style={{ animationDuration: '600ms' }}
          />
        </div>

        <div className="space-y-3 animate-slide-up stagger-1">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Welcome to
          </p>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-display"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Canopy
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            Elegant project management that brings clarity to your workflow.
            Create your first project to begin.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex items-center justify-center gap-6 animate-slide-up stagger-2">
          {[
            { icon: Layers, label: 'Projects' },
            { icon: GitBranch, label: 'Issues' },
            { icon: Sparkles, label: 'Sprints' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-muted-foreground/60">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>

        <div className="animate-slide-up stagger-3 space-y-3">
          <Button
            onClick={onCreateProject}
            size="lg"
            className="bg-[#1B4332] hover:bg-[#163a2a] text-white px-10 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first project
          </Button>
          <p className="text-[11px] text-muted-foreground/50 font-mono">
            It only takes a moment
          </p>
        </div>
      </div>
    </div>
  );
}
