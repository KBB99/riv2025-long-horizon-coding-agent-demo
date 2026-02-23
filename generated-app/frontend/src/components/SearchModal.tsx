import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { search as searchApi } from '@/api/client';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command';
import { issueTypeColors } from '@/lib/utils';

export function SearchModal() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ issues: any[]; projects: any[] }>({ issues: [], projects: [] });

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SEARCH' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 1) {
      setResults({ issues: [], projects: [] });
      return;
    }
    try {
      const result = await searchApi({ q, type: 'all', limit: 10 });
      setResults(result);
    } catch {
      setResults({ issues: [], projects: [] });
    }
  }, []);

  const close = () => dispatch({ type: 'SET_SEARCH_OPEN', open: false });

  const handleSelectIssue = (issue: any) => {
    close();
    if (issue.projectId) {
      dispatch({ type: 'SET_CURRENT_PROJECT', projectId: issue.projectId });
      navigate(`/project/${issue.projectId}/issues/${issue.id}`);
    } else {
      navigate(`/issues/${issue.id}`);
    }
  };

  const handleSelectProject = (id: string) => {
    close();
    dispatch({ type: 'SET_CURRENT_PROJECT', projectId: id });
    navigate(`/project/${id}/board`);
  };

  return (
    <CommandDialog open={state.searchOpen} onOpenChange={(open) => dispatch({ type: 'SET_SEARCH_OPEN', open })}>
      <CommandInput
        placeholder="Search issues, projects..."
        value={query}
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {results.issues.length > 0 && (
          <CommandGroup heading="Issues">
            {results.issues.map((issue: any) => (
              <CommandItem key={issue.id} onSelect={() => handleSelectIssue(issue)}>
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: issueTypeColors[issue.type] || '#8896A6' }} />
                <span className="text-xs font-mono text-muted-foreground mr-2">{issue.key}</span>
                <span className="truncate">{issue.summary}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.projects.length > 0 && (
          <CommandGroup heading="Projects">
            {results.projects.map((project: any) => (
              <CommandItem key={project.id} onSelect={() => handleSelectProject(project.id)}>
                <div
                  className="w-5 h-5 rounded mr-2 flex items-center justify-center text-[8px] text-white font-bold"
                  style={{ backgroundColor: project.color || '#1B4332' }}
                >
                  {project.key?.slice(0, 2)}
                </div>
                <span>{project.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{project.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
