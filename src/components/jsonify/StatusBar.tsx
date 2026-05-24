import { CheckCircle2, XCircle, AlertCircle, FileJson, Layers, Hash, Copy } from 'lucide-react';
import { JsonStats, ValidationResult } from '@/lib/jsonUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatusBarProps {
  validation: ValidationResult;
  stats: JsonStats;
  hasContent: boolean;
  currentPath?: string;
}

export function StatusBar({ validation, stats, hasContent, currentPath }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border glass px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        {/* Validation status */}
        {!hasContent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <AlertCircle className="h-4 w-4 animate-pulse-slow" />
            <span className="font-medium">Waiting for input...</span>
          </motion.div>
        ) : validation.valid ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">Valid JSON</span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 max-w-md"
          >
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate font-medium">
              {validation.error?.line 
                ? `Line ${validation.error.line}: ${validation.error.message}`
                : validation.error?.message}
            </span>
          </motion.div>
        )}

        {hasContent && validation.valid && currentPath && (
          <div className="hidden md:flex items-center gap-2 border-l border-border/80 pl-3">
            <span className="text-xs text-muted-foreground font-medium">Path:</span>
            <code className="bg-muted/80 border border-border px-1.5 py-0.5 rounded text-xs text-foreground font-mono select-all flex items-center gap-1.5">
              {currentPath}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentPath);
                  import('sonner').then(m => m.toast.success('Path copied!'));
                }}
                className="hover:text-accent transition-colors cursor-pointer"
                title="Copy Path"
              >
                <Copy className="h-3 w-3" />
              </button>
            </code>
          </div>
        )}
      </div>

      {/* Stats chips */}
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50",
            !hasContent && 'opacity-40'
          )}
        >
          <FileJson className="h-3.5 w-3.5" />
          <span className="font-medium">{stats.lines}</span>
          <span className="text-xs text-muted-foreground">
            {stats.lines === 1 ? 'line' : 'lines'}
          </span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50",
            !hasContent && 'opacity-40'
          )}
        >
          <span className="font-mono font-semibold">{stats.size}</span>
        </motion.div>

        {hasContent && validation.valid && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            >
              <Hash className="h-3.5 w-3.5" />
              <span className="font-semibold">{stats.keys}</span>
              <span className="text-xs">keys</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="font-semibold">{stats.depth}</span>
              <span className="text-xs">depth</span>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
