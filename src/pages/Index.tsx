import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { TreePine, Maximize, Minimize, RotateCw, Loader2 } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ThemeToggle } from '@/components/jsonify/ThemeToggle';
import { MonacoJsonEditor } from '@/components/jsonify/MonacoJsonEditor';
import { Toolbar } from '@/components/jsonify/Toolbar';
import { StatusBar } from '@/components/jsonify/StatusBar';
import { TreeView } from '@/components/jsonify/TreeView';
import { GraphView } from '@/components/jsonify/GraphView';
import { HistoryPanel } from '@/components/jsonify/HistoryPanel';
import { SchemaValidator } from '@/components/jsonify/SchemaValidator';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useJsonHistory } from '@/hooks/useJsonHistory';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  validateJson, 
  formatJson, 
  minifyJson, 
  getJsonStats,
  buildTree,
  TreeNode
} from '@/lib/jsonUtils';
import { readFileInChunks, formatFileSize } from '@/lib/fileUtils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap for uploads
const VISUALIZATION_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB limit for tree/graph rendering
const DEBOUNCE_DELAY = 300; // ms delay for validation during typing

const formatBytes = (bytes: number) => formatFileSize(bytes);

const Index = () => {
  const { isDark, toggleTheme } = useTheme();
  const { history, addToHistory, clearHistory, removeFromHistory } = useJsonHistory();
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const visualizationWarningShown = useRef(false);
  const [isPending, startTransition] = useTransition();
  
  const [json, setJson] = useState('');
  const [debouncedJson, setDebouncedJson] = useState('');
  const [previousJson, setPreviousJson] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Debounce JSON updates for validation to improve typing performance
  const updateDebouncedJson = useDebounce((value: string) => {
    setDebouncedJson(value);
  }, DEBOUNCE_DELAY);

  useEffect(() => {
    updateDebouncedJson(json);
  }, [json, updateDebouncedJson]);

  // Load JSON from URL on mount
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

  const validation = useMemo(() => validateJson(debouncedJson), [debouncedJson]);
  const stats = useMemo(() => getJsonStats(debouncedJson, validation.parsed), [debouncedJson, validation.parsed]);
  const jsonSizeBytes = useMemo(() => new Blob([debouncedJson]).size, [debouncedJson]);
  const hasContent = debouncedJson.trim().length > 0;
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  
  useEffect(() => {
    if (!hasContent || !validation.valid || typeof validation.parsed === 'undefined') {
      setTreeNodes([]);
      return;
    }

    if (!(showTree || showGraph)) {
      setTreeNodes([]);
      return;
    }

    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      setTreeNodes([]);
      return;
    }
    
    startTransition(() => {
      try {
        const nodes = buildTree(validation.parsed);
        setTreeNodes(nodes);
      } catch {
        setTreeNodes([]);
      }
    });
  }, [hasContent, validation.valid, validation.parsed, showTree, showGraph, jsonSizeBytes]);

  useEffect(() => {
    if ((showTree || showGraph) && jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      setShowTree(false);
      setShowGraph(false);
      if (!visualizationWarningShown.current) {
        toast.warning(`Tree and graph views are disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)} to keep the app responsive.`);
        visualizationWarningShown.current = true;
      }
    }

    if (jsonSizeBytes <= VISUALIZATION_LIMIT_BYTES) {
      visualizationWarningShown.current = false;
    }
  }, [jsonSizeBytes, showTree, showGraph]);

  const canUndo = previousJson !== null;

  const handleFormat = useCallback((indent: number) => {
    try {
      const formatted = formatJson(json, indent);
      setPreviousJson(json);
      setJson(formatted);
      addToHistory(formatted);
      toast.success('JSON formatted');
    } catch {
      toast.error('Failed to format JSON');
    }
  }, [json, addToHistory]);

  const handleMinify = useCallback(() => {
    try {
      const minified = minifyJson(json);
      setPreviousJson(json);
      setJson(minified);
      addToHistory(minified);
      toast.success('JSON minified');
    } catch {
      toast.error('Failed to minify JSON');
    }
  }, [json, addToHistory]);

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
    setJson('');
    setPreviousJson(null);
    toast.success('Editor cleared');
  }, []);

  const handleHistorySelect = useCallback((historyJson: string) => {
    setJson(historyJson);
    setShowHistory(false);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`Files larger than ${formatBytes(MAX_FILE_SIZE_BYTES)} are not supported to avoid freezing.`);
          return;
        }

        setIsLoadingFile(true);
        setLoadProgress(0);
        
        try {
          const content = await readFileInChunks(file, (progress) => {
            setLoadProgress(progress);
          });
          
          setPreviousJson(json);
          setJson(content);
          toast.success(`Loaded ${file.name} (${formatBytes(file.size)})`);
        } catch (error) {
          toast.error('Failed to read file');
        } finally {
          setIsLoadingFile(false);
          setLoadProgress(0);
        }
      } else {
        toast.error('Please drop a JSON file');
      }
    }
  }, [json]);

  const handleToggleTree = useCallback(() => {
    if (showTree) {
      setShowTree(false);
      return;
    }

    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      toast.warning(`Tree view is disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)} to keep the app responsive.`);
      return;
    }

    setShowTree(true);
    setShowGraph(false);
    setShowSchema(false);
  }, [showTree, jsonSizeBytes]);

  const handleToggleGraph = useCallback(() => {
    if (showGraph) {
      setShowGraph(false);
      return;
    }

    if (jsonSizeBytes > VISUALIZATION_LIMIT_BYTES) {
      toast.warning(`Graph view is disabled for files larger than ${formatBytes(VISUALIZATION_LIMIT_BYTES)} to keep the app responsive.`);
      return;
    }

    setShowGraph(true);
    setShowTree(false);
    setShowSchema(false);
  }, [showGraph, jsonSizeBytes]);

  const handleToggleSchema = useCallback(() => {
    if (showSchema) {
      setShowSchema(false);
      return;
    }

    setShowSchema(true);
    setShowTree(false);
    setShowGraph(false);
  }, [showSchema]);

  return (
    <div 
      className="flex h-screen flex-col bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && !isLoadingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary p-12">
            <TreePine className="h-16 w-16 text-primary" />
            <p className="text-xl font-semibold text-foreground">Drop JSON file here</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoadingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/20 bg-card p-12 shadow-lg">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl font-semibold text-foreground">Loading file...</p>
              <p className="text-sm text-muted-foreground">{loadProgress.toFixed(0)}% complete</p>
            </div>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header with title centered at top and toolbar below */}
      <header className="border-b border-border">
        {/* Title Section - Centered */}
        <div className="flex items-center justify-center gap-3 px-6 py-3 relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TreePine className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight">JSON Tree</h1>
            </div>
          </div>
          <div className="absolute right-6">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
        
        {/* Toolbar Section */}
        <div className="flex items-center justify-center border-t border-border px-6 py-2">
          <Toolbar
            onFormat={handleFormat}
            onMinify={handleMinify}
            onUndo={handleUndo}
            onCopy={handleCopy}
            onClear={handleClear}
            onToggleHistory={() => setShowHistory(!showHistory)}
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
        {/* Editor area */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 gap-4 overflow-hidden"
        >
          {/* Main editor + visualization */}
          <div className="flex flex-1 overflow-hidden">
            {(showTree || showGraph || showSchema) && validation.valid && hasContent ? (
              <ResizablePanelGroup direction={splitOrientation} className="h-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <MonacoJsonEditor
                    value={json}
                    onChange={setJson}
                    errorLine={validation.error?.line}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={splitOrientation === 'horizontal' ? 'mx-2' : 'my-2'} />
                <ResizablePanel defaultSize={50} minSize={25}>
                  <div ref={viewContainerRef} className="h-full">
                  {isPending ? (
                    <div className="h-full flex items-center justify-center bg-card rounded-lg border border-border">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-lg font-medium text-muted-foreground">Rendering {showTree ? 'tree' : showGraph ? 'graph' : 'schema'} view...</p>
                      </div>
                    </div>
                  ) : (
                  <AnimatePresence mode="wait">
                    {showTree && (
                      <motion.div
                        key="tree"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-auto rounded-lg border border-border bg-card scrollbar-thin"
                      >
                        <TreeView nodes={treeNodes} />
                      </motion.div>
                    )}
                    {showGraph && (
                      <motion.div
                        key="graph"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                      >
                        <GraphView nodes={treeNodes} />
                      </motion.div>
                    )}
                    {showSchema && (
                      <motion.div
                        key="schema"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-auto rounded-lg border border-border bg-card"
                      >
                        <SchemaValidator 
                          json={json} 
                          isJsonValid={validation.valid}
                        />
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
                />
              </div>
            )}
          </div>

          {/* History panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <HistoryPanel
                  history={history}
                  onSelect={handleHistorySelect}
                  onRemove={removeFromHistory}
                  onClear={clearHistory}
                  onClose={() => setShowHistory(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status bar */}
        <StatusBar
          validation={validation}
          stats={stats}
          hasContent={hasContent}
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
            {/* Fullscreen Toggle */}
            <Button
              size="icon"
              variant="default"
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl glass hover-lift ripple bg-primary text-primary-foreground hover:bg-primary/90"
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
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>

            {/* Split Orientation Toggle */}
            {(showTree || showGraph) && (
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl glass hover-lift ripple"
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

export default Index;
