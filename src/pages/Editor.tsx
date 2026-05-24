import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TreePine, Maximize, Minimize, RotateCw, Loader2, ArrowLeft, Pencil, Check, X, Monitor } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ThemeToggle } from '@/components/jsonify/ThemeToggle';
import { MonacoJsonEditor } from '@/components/jsonify/MonacoJsonEditor';
import { Toolbar } from '@/components/jsonify/Toolbar';
import { StatusBar } from '@/components/jsonify/StatusBar';
import { TreeView } from '@/components/jsonify/TreeView';
import { GraphView } from '@/components/jsonify/GraphView';
import { SchemaValidator } from '@/components/jsonify/SchemaValidator';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useProjects } from '@/hooks/useProjects';
import { useDebounce } from '@/hooks/useDebounce';
import {
  validateJson,
  formatJson,
  minifyJson,
  getJsonStats,
  buildTree,
  TreeNode,
} from '@/lib/jsonUtils';
import { readFileInChunks, formatFileSize } from '@/lib/fileUtils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const VISUALIZATION_LIMIT_BYTES = 5 * 1024 * 1024;
const DEBOUNCE_DELAY = 300;
const AUTOSAVE_DELAY = 800;

const formatBytes = (bytes: number) => formatFileSize(bytes);

/** Inline project name editor rendered in the header */
function ProjectNameEditor({
  name,
  onSave,
}: {
  name: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(name);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="h-8 rounded-md border border-accent/60 bg-muted/40 px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-48 transition-all"
          id="project-name-input"
          aria-label="Project name"
        />
        <button onClick={commit} className="p-1 rounded hover:bg-muted text-accent" aria-label="Save name">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={cancel} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted/50 transition-colors"
      aria-label="Edit project name"
      id="project-name-btn"
    >
      <span className="text-base font-semibold tracking-tight">{name}</span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

const Editor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { getProject, updateProject } = useProjects();
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const visualizationWarningShown = useRef(false);
  const [isPending, startTransition] = useTransition();
  const initialLoadDone = useRef(false);

  // ── Project state ──────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('');
  const [json, setJson] = useState('');
  const [debouncedJson, setDebouncedJson] = useState('');
  const [previousJson, setPreviousJson] = useState<string | null>(null);
  const [activeCursorPath, setActiveCursorPath] = useState('root');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showTree, setShowTree] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [notFound, setNotFound] = useState(false);

  // ── Load project on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    const project = getProject(id);
    if (!project) { setNotFound(true); return; }
    setProjectName(project.name);
    setJson(project.json);
    setDebouncedJson(project.json);
    initialLoadDone.current = true;
  }, [id, getProject]);

  // ── Debounce validation ────────────────────────────────────────────────────
  const updateDebouncedJson = useDebounce((value: string) => {
    setDebouncedJson(value);
  }, DEBOUNCE_DELAY);

  useEffect(() => {
    updateDebouncedJson(json);
  }, [json, updateDebouncedJson]);

  // ── Auto-save to localStorage ──────────────────────────────────────────────
  const saveProject = useDebounce((content: string) => {
    if (!id || !initialLoadDone.current) return;
    updateProject(id, { json: content });
  }, AUTOSAVE_DELAY);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveProject(json);
  }, [json, saveProject]);

  // ── Load from URL param ────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jsonParam = params.get('json');
    if (jsonParam) {
      try {
        const decoded = decodeURIComponent(jsonParam);
        setJson(decoded);
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        toast.error('Failed to load JSON from URL');
      }
    }
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const validation = useMemo(() => validateJson(debouncedJson), [debouncedJson]);
  const stats = useMemo(() => getJsonStats(debouncedJson, validation.parsed), [debouncedJson, validation.parsed]);
  const jsonSizeBytes = useMemo(() => new Blob([debouncedJson]).size, [debouncedJson]);
  const hasContent = debouncedJson.trim().length > 0;
  const canUndo = previousJson !== null;
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!hasContent || !validation.valid || typeof validation.parsed === 'undefined') {
      setTreeNodes([]); return;
    }
    if (!(showTree || showGraph)) { setTreeNodes([]); return; }
    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) { setTreeNodes([]); return; }
    startTransition(() => {
      try { setTreeNodes(buildTree(validation.parsed)); }
      catch { setTreeNodes([]); }
    });
  }, [hasContent, validation.valid, validation.parsed, showTree, showGraph, jsonSizeBytes]);

  useEffect(() => {
    if ((showTree || showGraph) && jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      setShowTree(false);
      setShowGraph(false);
      if (!visualizationWarningShown.current) {
        toast.warning(`Tree and graph views are disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)}.`);
        visualizationWarningShown.current = true;
      }
    }
    if (jsonSizeBytes <= VISUALIZATION_LIMIT_BYTES) visualizationWarningShown.current = false;
  }, [jsonSizeBytes, showTree, showGraph]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFormat = useCallback((indent: number) => {
    try {
      const formatted = formatJson(json, indent);
      setPreviousJson(json);
      setJson(formatted);
      toast.success('JSON formatted');
    } catch { toast.error('Failed to format JSON'); }
  }, [json]);

  const handleMinify = useCallback(() => {
    try {
      const minified = minifyJson(json);
      setPreviousJson(json);
      setJson(minified);
      toast.success('JSON minified');
    } catch { toast.error('Failed to minify JSON'); }
  }, [json]);

  const handleUndo = useCallback(() => {
    if (previousJson !== null) {
      setJson(previousJson);
      setPreviousJson(null);
      toast.success('Undone');
    }
  }, [previousJson]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(json);
    toast.success('Copied to clipboard');
  }, [json]);

  const handleClear = useCallback(() => {
    setPreviousJson(json);
    setJson('');
    toast.success('Editor cleared');
  }, [json]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    const file = files[0];
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Files larger than ${formatBytes(MAX_FILE_SIZE_BYTES)} are not supported.`);
        return;
      }
      setIsLoadingFile(true); setLoadProgress(0);
      try {
        const content = await readFileInChunks(file, p => setLoadProgress(p));
        setPreviousJson(json);
        setJson(content);
        toast.success(`Loaded ${file.name} (${formatBytes(file.size)})`);
      } catch { toast.error('Failed to read file'); }
      finally { setIsLoadingFile(false); setLoadProgress(0); }
    } else {
      toast.error('Please drop a JSON file');
    }
  }, [json]);

  const handleToggleTree = useCallback(() => {
    if (showTree) { setShowTree(false); return; }
    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      toast.warning(`Tree view is disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)}.`);
      return;
    }
    setShowTree(true); setShowGraph(false); setShowSchema(false);
  }, [showTree, jsonSizeBytes]);

  const handleToggleGraph = useCallback(() => {
    if (showGraph) { setShowGraph(false); return; }
    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      toast.warning(`Graph view is disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)}.`);
      return;
    }
    setShowGraph(true); setShowTree(false); setShowSchema(false);
  }, [showGraph, jsonSizeBytes]);

  const handleToggleSchema = useCallback(() => {
    if (showSchema) { setShowSchema(false); return; }
    setShowSchema(true); setShowTree(false); setShowGraph(false);
  }, [showSchema]);

  const handleRename = useCallback((newName: string) => {
    if (!id) return;
    setProjectName(newName);
    updateProject(id, { name: newName });
    toast.success('Project renamed');
  }, [id, updateProject]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-lg font-semibold">Project not found</p>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col bg-background relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
      {/* Drag overlay */}
      {isDragging && !isLoadingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-accent p-12">
            <TreePine className="h-16 w-16 text-accent" />
            <p className="text-xl font-semibold text-foreground">Drop JSON file here</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoadingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-12 shadow-lg">
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl font-semibold text-foreground">Loading file...</p>
              <p className="text-sm text-muted-foreground">{loadProgress.toFixed(0)}% complete</p>
            </div>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${loadProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          {/* Left: back + project name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0"
              id="back-to-projects"
              aria-label="Back to projects"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </button>
            <span className="text-muted-foreground/40 shrink-0">/</span>
            <ProjectNameEditor name={projectName} onSave={handleRename} />
          </div>

          {/* Right: theme toggle */}
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        {/* Toolbar row */}
        <div className="flex items-center border-t border-border px-6 py-2">
          <Toolbar
            onFormat={handleFormat}
            onMinify={handleMinify}
            onUndo={handleUndo}
            onCopy={handleCopy}
            onClear={handleClear}
            onToggleTree={handleToggleTree}
            onToggleGraph={handleToggleGraph}
            onToggleSchema={handleToggleSchema}
            isTreeVisible={showTree}
            isGraphVisible={showGraph}
            isSchemaVisible={showSchema}
            isValid={validation.valid}
            hasContent={hasContent}
            canUndo={canUndo}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 gap-4 overflow-hidden"
        >
          {/* Editor + visualization */}
          <div className="flex flex-1 overflow-hidden">
            {(showTree || showGraph || showSchema) && validation.valid && hasContent ? (
              <ResizablePanelGroup direction={splitOrientation} className="h-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <MonacoJsonEditor
                    value={json}
                    onChange={setJson}
                    errorLine={validation.error?.line}
                    onCursorPathChange={setActiveCursorPath}
                    treeNodes={treeNodes}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={splitOrientation === 'horizontal' ? 'mx-2' : 'my-2'} />
                <ResizablePanel defaultSize={50} minSize={25}>
                  <div ref={viewContainerRef} className="h-full">
                    {isPending ? (
                      <div className="h-full flex items-center justify-center bg-card rounded-lg border border-border">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-12 w-12 animate-spin text-accent" />
                          <p className="text-lg font-medium text-muted-foreground">
                            Rendering {showTree ? 'tree' : showGraph ? 'graph' : 'schema'} view...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        {showTree && (
                          <motion.div key="tree" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full overflow-auto rounded-lg border border-border bg-card scrollbar-thin">
                            <TreeView nodes={treeNodes} />
                          </motion.div>
                        )}
                        {showGraph && (
                          <motion.div key="graph" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
                            <GraphView nodes={treeNodes} />
                          </motion.div>
                        )}
                        {showSchema && (
                          <motion.div key="schema" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full overflow-auto rounded-lg border border-border bg-card">
                            <SchemaValidator json={json} isJsonValid={validation.valid} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="flex-1">
                <MonacoJsonEditor
                  value={json}
                  onChange={setJson}
                  errorLine={validation.error?.line}
                  onCursorPathChange={setActiveCursorPath}
                  treeNodes={treeNodes}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Status bar */}
        <StatusBar
          validation={validation}
          stats={stats}
          hasContent={hasContent}
          currentPath={activeCursorPath}
        />
      </main>

      {/* Floating Action Buttons */}
      <AnimatePresence>
        {hasContent && validation.valid && (showTree || showGraph) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 flex flex-col gap-2 z-20"
          >
            <Button
              size="icon"
              variant="default"
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl ripple hover-lift"
              onClick={() => {
                if (!document.fullscreenElement) {
                  viewContainerRef.current?.requestFullscreen();
                  setIsFullscreen(true);
                } else {
                  document.exitFullscreen();
                  setIsFullscreen(false);
                }
              }}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
            {(showTree || showGraph) && (
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl ripple hover-lift"
                onClick={() => setSplitOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Editor;
