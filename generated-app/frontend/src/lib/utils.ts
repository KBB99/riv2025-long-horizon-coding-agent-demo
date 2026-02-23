import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Issue type colors
export const issueTypeColors: Record<string, string> = {
  'Epic': '#9B59B6',
  'Story': '#40916C',
  'Bug': '#BC6C25',
  'Task': '#2196F3',
  'Sub-task': '#8896A6',
};

// Priority colors
export const priorityColors: Record<string, string> = {
  'Highest': '#BC6C25',
  'High': '#E9C46A',
  'Medium': '#40916C',
  'Low': '#2196F3',
  'Lowest': '#8896A6',
};

// Status category colors
export const statusColors: Record<string, string> = {
  'todo': '#8896A6',
  'in_progress': '#2196F3',
  'done': '#40916C',
};

// Default board columns
export const DEFAULT_COLUMNS = [
  { id: 'col-todo', name: 'To Do', statusCategory: 'todo' as const, sortOrder: 0, color: '#8896A6' },
  { id: 'col-in-progress', name: 'In Progress', statusCategory: 'in_progress' as const, sortOrder: 1, color: '#2196F3' },
  { id: 'col-in-review', name: 'In Review', statusCategory: 'in_progress' as const, sortOrder: 2, color: '#E9C46A' },
  { id: 'col-done', name: 'Done', statusCategory: 'done' as const, sortOrder: 3, color: '#40916C' },
];

// Default status map from column name to id
export const statusMap: Record<string, string> = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'In Review': 'in_review',
  'Done': 'done',
};

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Avatar colors based on name hash
const avatarColors = ['#D4A373', '#52796F', '#9B59B6', '#2196F3', '#BC6C25', '#40916C', '#E9C46A', '#1B4332'];
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
