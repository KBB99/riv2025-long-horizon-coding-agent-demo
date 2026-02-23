import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard, Map, List, Play, Columns3, BarChart3,
  TrendingUp, FileText, Settings, Tags, Boxes, FolderPlus,
  PanelLeftClose, PanelLeftOpen, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
}

const projectNavItems: NavItem[] = [
  { label: 'Roadmap', icon: Map, path: '/roadmap', section: 'Planning' },
  { label: 'Backlog', icon: List, path: '/backlog', section: 'Planning' },
  { label: 'Active Sprints', icon: Play, path: '/sprints', section: 'Planning' },
  { label: 'Board', icon: Columns3, path: '/board', section: 'Board' },
  { label: 'Burndown', icon: BarChart3, path: '/reports/burndown', section: 'Reports' },
  { label: 'Velocity', icon: TrendingUp, path: '/reports/velocity', section: 'Reports' },
  { label: 'Sprint Report', icon: FileText, path: '/reports/sprint', section: 'Reports' },
  { label: 'Settings', icon: Settings, path: '/settings', section: 'Project' },
  { label: 'Labels', icon: Tags, path: '/settings/labels', section: 'Project' },
  { label: 'Components', icon: Boxes, path: '/settings/components', section: 'Project' },
];

export function Sidebar() {
  const { state, toggleSidebar } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state.sidebarCollapsed;
  const hasProject = !!state.currentProjectId;

  const currentPath = location.pathname;

  // Group items by section
  const sections = projectNavItems.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const getFullPath = (item: NavItem) => {
    if (!state.currentProjectId) return item.path;
    return `/project/${state.currentProjectId}${item.path}`;
  };

  const isActive = (item: NavItem) => {
    const fullPath = getFullPath(item);
    return currentPath === fullPath || currentPath.startsWith(fullPath + '/');
  };

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-200 ease-out overflow-hidden',
        collapsed ? 'w-[52px]' : 'w-60'
      )}
    >
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {/* Dashboard link */}
        <NavButton
          icon={LayoutDashboard}
          label="Dashboard"
          collapsed={collapsed}
          active={currentPath === '/'}
          onClick={() => navigate('/')}
        />

        {hasProject && (
          <>
            {Object.entries(sections).map(([section, items]) => (
              <div key={section} className="mt-3">
                {!collapsed && (
                  <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section}
                  </div>
                )}
                {items.map((item) => (
                  <NavButton
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
                    active={isActive(item)}
                    onClick={() => navigate(getFullPath(item))}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && (
          <NavButton
            icon={FolderPlus}
            label="All Projects"
            collapsed={collapsed}
            active={currentPath === '/projects'}
            onClick={() => navigate('/projects')}
          />
        )}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

function NavButton({
  icon: Icon,
  label,
  collapsed,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-sidebar-accent text-accent font-medium'
          : 'text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', active && 'text-[#D4A373]')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
