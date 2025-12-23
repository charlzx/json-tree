import { 
  Wand2, 
  Minimize2, 
  Copy, 
  Check, 
  Trash2, 
  History,
  FileJson,
  TreePine,
  ChevronDown,
  Undo2,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface ToolbarProps {
  onFormat: (indent: number) => void;
  onMinify: () => void;
  onUndo: () => void;
  onCopy: () => void;
  onClear: () => void;
  onToggleHistory: () => void;
  onToggleTree: () => void;
  onToggleGraph: () => void;
  onToggleSchema: () => void;
  isTreeVisible: boolean;
  isGraphVisible: boolean;
  isSchemaVisible: boolean;
  isValid: boolean;
  hasContent: boolean;
  canUndo: boolean;
}

export function Toolbar({
  onFormat,
  onMinify,
  onUndo,
  onCopy,
  onClear,
  onToggleHistory,
  onToggleTree,
  onToggleGraph,
  onToggleSchema,
  isTreeVisible,
  isGraphVisible,
  isSchemaVisible,
  isValid,
  hasContent,
  canUndo,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Format dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="default" 
            size="sm" 
            disabled={!isValid || !hasContent}
            className="gap-1.5 ripple hover-lift"
          >
            <Wand2 className="h-4 w-4" />
            Format
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-popover">
          <DropdownMenuItem onClick={() => onFormat(2)}>
            2 spaces
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFormat(4)}>
            4 spaces
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFormat(1)}>
            1 tab (as space)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onMinify}
            disabled={!isValid || !hasContent}
            className="ripple hover-lift"
          >
            <Minimize2 className="h-4 w-4 mr-1.5" />
            Minify
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Minify JSON</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUndo}
            disabled={!canUndo}
            className="ripple hover-lift"
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            Undo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Undo</p>
        </TooltipContent>
      </Tooltip>

      <div className="h-6 w-px bg-border/50" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            disabled={!hasContent}
            className="gap-1.5 ripple hover-lift"
          >
            {copied ? (
              <Check className="h-4 w-4 text-accent" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy to clipboard</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClear}
            disabled={!hasContent}
            className="ripple hover-lift"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear editor</p>
        </TooltipContent>
      </Tooltip>

      <div className="h-6 w-px bg-border/50" />
        <Trash2 className="h-4 w-4" />
      <div className="h-6 w-px bg-border/50" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={isTreeVisible ? 'default' : 'outline'}
            size="sm" 
            onClick={onToggleTree}
            disabled={!isValid || !hasContent}
            className={`gap-1.5 ripple hover-lift ${isTreeVisible ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}`}
          >
            <TreePine className="h-4 w-4" />
            Tree
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle tree view</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={isGraphVisible ? 'default' : 'outline'}
            size="sm" 
            onClick={onToggleGraph}
            disabled={!isValid || !hasContent}
            className={`gap-1.5 ripple hover-lift ${isGraphVisible ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' : ''}`}
          >
            <GitBranch className="h-4 w-4" />
            Graph
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle graph view</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={isSchemaVisible ? 'secondary' : 'outline'}
            size="sm" 
            onClick={onToggleSchema}
            className="gap-1.5 ripple hover-lift"
          >
            <FileJson className="h-4 w-4" />
            Schema
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle schema validator</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleHistory}
            className="gap-1.5 ripple hover-lift"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle history</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
