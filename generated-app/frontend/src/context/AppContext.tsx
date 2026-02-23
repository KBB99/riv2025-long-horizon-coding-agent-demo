import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  role: 'admin' | 'member' | 'viewer';
}

interface AppState {
  currentProjectId: string | null;
  currentUser: User;
  users: User[];
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  searchOpen: boolean;
  createIssueOpen: boolean;
}

type AppAction =
  | { type: 'SET_CURRENT_PROJECT'; projectId: string | null }
  | { type: 'SET_CURRENT_USER'; user: User }
  | { type: 'SET_USERS'; users: User[] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_THEME'; theme: 'light' | 'dark' | 'system' }
  | { type: 'TOGGLE_SEARCH' }
  | { type: 'SET_SEARCH_OPEN'; open: boolean }
  | { type: 'SET_CREATE_ISSUE_OPEN'; open: boolean };

const DEFAULT_USERS: User[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Alex Chen', email: 'alex@canopy.dev', color: '#D4A373', role: 'admin' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Sarah Kim', email: 'sarah@canopy.dev', color: '#52796F', role: 'member' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'James Wilson', email: 'james@canopy.dev', color: '#9B59B6', role: 'member' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Maya Patel', email: 'maya@canopy.dev', color: '#2196F3', role: 'member' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Liam O\'Brien', email: 'liam@canopy.dev', color: '#BC6C25', role: 'viewer' },
];

function loadState(): Partial<AppState> {
  try {
    const stored = localStorage.getItem('canopy_app_state');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

const savedState = loadState();

const initialState: AppState = {
  currentProjectId: savedState.currentProjectId || null,
  currentUser: savedState.currentUser || DEFAULT_USERS[0],
  users: DEFAULT_USERS,
  sidebarCollapsed: savedState.sidebarCollapsed || false,
  theme: savedState.theme || 'light',
  searchOpen: false,
  createIssueOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProjectId: action.projectId };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.user };
    case 'SET_USERS':
      return { ...state, users: action.users };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.collapsed };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'TOGGLE_SEARCH':
      return { ...state, searchOpen: !state.searchOpen };
    case 'SET_SEARCH_OPEN':
      return { ...state, searchOpen: action.open };
    case 'SET_CREATE_ISSUE_OPEN':
      return { ...state, createIssueOpen: action.open };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  setCurrentProject: (id: string | null) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSearch: () => void;
  openCreateIssue: () => void;
  closeCreateIssue: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Persist state to localStorage
  useEffect(() => {
    const toSave = {
      currentProjectId: state.currentProjectId,
      currentUser: state.currentUser,
      sidebarCollapsed: state.sidebarCollapsed,
      theme: state.theme,
    };
    localStorage.setItem('canopy_app_state', JSON.stringify(toSave));
  }, [state.currentProjectId, state.currentUser, state.sidebarCollapsed, state.theme]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else if (state.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [state.theme]);

  const setCurrentProject = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', projectId: id });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  const toggleSearch = useCallback(() => {
    dispatch({ type: 'TOGGLE_SEARCH' });
  }, []);

  const openCreateIssue = useCallback(() => {
    dispatch({ type: 'SET_CREATE_ISSUE_OPEN', open: true });
  }, []);

  const closeCreateIssue = useCallback(() => {
    dispatch({ type: 'SET_CREATE_ISSUE_OPEN', open: false });
  }, []);

  return (
    <AppContext.Provider value={{
      state, dispatch, setCurrentProject, toggleSidebar, setTheme,
      toggleSearch, openCreateIssue, closeCreateIssue,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
