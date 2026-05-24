import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  FileJson,
  Clock,
  FolderOpen,
  ChevronRight,
  Braces,
  Layers,
  CheckCircle2,
  XCircle,
  Upload,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/jsonify/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { useProjects, Project } from '@/hooks/useProjects';
import { formatFileSize } from '@/lib/fileUtils';
import { toast } from 'sonner';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface ProjectRowProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}

function ProjectRow({ project, onOpen, onDelete }: ProjectRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      onClick={onOpen}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-card/20 px-4 py-4.5 hover:bg-muted/30 transition-all duration-150 cursor-pointer first:rounded-t-lg last:rounded-b-lg last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileJson className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate font-medium text-foreground text-sm leading-none">
              {project.name}
            </span>
            {project.json.trim() && (
              project.isValid ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                  <XCircle className="h-2.5 w-2.5" />
                  Invalid
                </span>
              )
            )}
            <span className="text-[11px] text-muted-foreground">
              ({formatFileSize(project.size)})
            </span>
          </div>
          {project.description && (
            <p className="truncate text-xs text-muted-foreground mt-1">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {relativeTime(project.updatedAt)}
        </span>

        <div className="flex items-center gap-2 min-w-[70px] justify-end">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-background/80 border border-border rounded-md px-2 py-1 z-10">
              <button
                onClick={onDelete}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Delete
              </button>
              <span className="text-muted-foreground text-xs">/</span>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-medium text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                aria-label="Delete project"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { projects, createProject, deleteProject } = useProjects();
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
    );
  }, [projects, search]);

  const handleCreateNew = () => {
    const id = createProject({ json: '{}' });
    navigate(`/editor/${id}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        let name = file.name.endsWith('.json') ? file.name.slice(0, -5) : file.name;
        
        const id = createProject({
          name: name || 'Imported Project',
          json: text,
        });
        toast.success(`Successfully imported ${file.name}`);
        navigate(`/editor/${id}`);
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error('Failed to read file');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Desktop Required Mobile Overlay */}
      <div className="lg:hidden fixed inset-0 z-50 bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none animate-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-accent">
          <Monitor className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Desktop Required</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-1">
          JSON Editor uses a split editor, preview, and document outline that need more horizontal space.
        </p>
        <p className="text-xs text-accent mt-4 font-medium uppercase tracking-wider">
          Open on a tablet landscape, laptop, or desktop.
        </p>
      </div>

      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-40 hidden lg:block">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      {/* Hidden File Input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Main Container ── */}
      <main className="mx-auto w-full max-w-3xl px-6 py-16 flex-1 flex flex-col">
        {/* Title Block */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight">JSON Editor</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Local projects, fast JSON structure, clean preview.
          </p>

          {/* Quick CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="gap-2 font-medium"
            >
              <Upload className="h-4 w-4" />
              Import JSON
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNew}
              className="gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              New blank JSON
            </Button>
          </div>
        </div>

        {/* ── Projects Section ── */}
        <div className="border-t border-border pt-10 flex-1 flex flex-col">
          <h2 className="text-xl font-bold tracking-tight mb-4">Projects</h2>

          {/* Search + Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="project-search"
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/40 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              />
            </div>
            <div className="text-xs font-mono text-muted-foreground px-2 py-1 shrink-0 bg-muted/50 border border-border rounded-md self-start sm:self-auto">
              {filtered.length} of {projects.length}
            </div>
          </div>

          {/* List or Empty State */}
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {projects.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card/20 px-6"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted border border-border">
                    <FolderOpen className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-base font-semibold">No projects yet</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                    Create a blank project or import a JSON file to keep it available in this browser.
                  </p>
                  <Button
                    className="mt-6 gap-2 font-medium"
                    size="sm"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4" />
                    New blank JSON
                  </Button>
                </motion.div>
              ) : filtered.length === 0 ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center text-muted-foreground text-sm border border-border border-dashed rounded-xl"
                >
                  No projects match &ldquo;{search}&rdquo;
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  layout
                  className="flex flex-col border border-border rounded-xl bg-card/10 overflow-hidden"
                >
                  {filtered.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      onOpen={() => navigate(`/editor/${project.id}`)}
                      onDelete={() => deleteProject(project.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
