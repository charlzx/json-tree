import { useState } from 'react';
import { Clock, Plus, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { ProjectVersion } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/fileUtils';

interface VersionHistoryPanelProps {
  versions: ProjectVersion[];
  onSaveCheckpoint: (name: string) => void;
  onRestoreCheckpoint: (version: ProjectVersion) => void;
  onDeleteCheckpoint: (versionId: string) => void;
}

export function VersionHistoryPanel({
  versions,
  onSaveCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
}: VersionHistoryPanelProps) {
  const [draftName, setDraftName] = useState('');

  const handleSave = () => {
    if (!draftName.trim()) return;
    onSaveCheckpoint(draftName.trim());
    setDraftName('');
  };

  const relativeTime = (ts: number): string => {
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
  };

  return (
    <div className="flex h-full flex-col bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-accent animate-pulse-slow" />
        <h3 className="text-lg font-semibold">Version History</h3>
      </div>

      {/* Manual Save Draft */}
      <div className="mb-5 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Name your checkpoint..."
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!draftName.trim()}
            className="gap-1 text-xs shrink-0 font-semibold"
          >
            <Plus className="h-3 w-3" />
            Save
          </Button>
        </div>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2.5">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground text-xs border border-dashed border-border rounded-lg bg-card/20">
            <AlertCircle className="h-5 w-5 mb-2 opacity-50" />
            <p>No historical versions saved yet.</p>
            <p className="mt-1 text-[10px]">Manual and automatic 10m backups will appear here.</p>
          </div>
        ) : (
          versions.map((ver) => (
            <div
              key={ver.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-xs truncate max-w-[180px]">
                  {ver.name}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-1">
                  <span>{relativeTime(ver.timestamp)}</span>
                  <span>•</span>
                  <span>{formatFileSize(ver.size)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onRestoreCheckpoint(ver)}
                  className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                  title="Restore checkpoint (creates a backup first)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteCheckpoint(ver.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete checkpoint"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
