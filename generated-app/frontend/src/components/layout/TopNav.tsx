import { Search, Plus, TreePine, Bell, ChevronDown, Moon, Sun, Settings, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function TopNav() {
  const { state, toggleSearch, openCreateIssue, setTheme } = useApp();
  const navigate = useNavigate();
  const user = state.currentUser;

  return (
    <header className="h-14 bg-gradient-to-r from-[#1B4332] via-[#1B4332] to-[#234E3E] text-white flex items-center px-4 gap-3 shrink-0 z-50 sticky top-0 shadow-md">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 hover:opacity-90 transition-all duration-200 mr-2 group"
      >
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
          <TreePine className="w-5 h-5 text-[#D4A373]" />
        </div>
        <span className="font-display font-semibold text-lg tracking-tight hidden sm:block"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
          Canopy
        </span>
      </button>

      {/* Search */}
      <button
        onClick={toggleSearch}
        className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white/60 transition-all duration-200 flex-1 max-w-md group"
      >
        <Search className="w-4 h-4 group-hover:text-white/80 transition-colors" />
        <span className="hidden sm:inline group-hover:text-white/80 transition-colors">Search issues, projects...</span>
        <kbd className="ml-auto text-[10px] bg-white/8 border border-white/10 px-1.5 py-0.5 rounded hidden sm:inline font-mono">⌘K</kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          onClick={openCreateIssue}
          className="bg-[#D4A373] hover:bg-[#c49363] text-white h-8 px-3 text-sm font-medium rounded-md"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Create</span>
        </Button>

        <button className="p-2 rounded-md hover:bg-white/10 transition-colors relative">
          <Bell className="w-4.5 h-4.5 text-white/70" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 p-1 rounded-md hover:bg-white/10 transition-colors">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ backgroundColor: user.color }}
              >
                {getInitials(user.name)}
              </div>
              <ChevronDown className="w-3 h-3 text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(state.theme === 'dark' ? 'light' : 'dark')}>
              {state.theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (state.currentProjectId) {
                navigate(`/project/${state.currentProjectId}/settings`);
              } else {
                navigate('/projects');
              }
            }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
