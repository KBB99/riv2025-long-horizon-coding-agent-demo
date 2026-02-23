import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useCreateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const PROJECT_COLORS = ['#1B4332', '#52796F', '#D4A373', '#2D6A4F', '#9B59B6', '#2196F3', '#BC6C25', '#40916C'];

export default function CreateProject() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [autoKey, setAutoKey] = useState(true);

  const handleNameChange = (v: string) => {
    setName(v);
    if (autoKey) {
      const generated = v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5);
      setKey(generated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      toast.error('Name and key are required');
      return;
    }
    if (!/^[A-Z]+$/.test(key)) {
      toast.error('Key must be uppercase letters only');
      return;
    }

    createProject.mutate(
      { name: name.trim(), key, description: description.trim() || undefined, color },
      {
        onSuccess: (project) => {
          toast.success(`Project "${project.name}" created!`);
          setCurrentProject(project.id);
          navigate(`/project/${project.id}/board`);
        },
        onError: (err) => {
          toast.error(`Failed to create project: ${err.message}`);
        },
      }
    );
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-xl" style={{ fontFamily: "'Space Grotesk'" }}>
            Create New Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                autoFocus
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Project Key</Label>
              <Input
                id="key"
                placeholder="MAP"
                value={key}
                onChange={e => { setKey(e.target.value.toUpperCase()); setAutoKey(false); }}
                maxLength={10}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">Used in issue keys (e.g., {key || 'KEY'}-123)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this project about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-lg transition-all duration-150"
                    style={{
                      backgroundColor: c,
                      outline: c === color ? '2px solid #D4A373' : 'none',
                      outlineOffset: '2px',
                      transform: c === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#D4A373] hover:bg-[#c49363] text-white"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
