import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      <Sun className={`h-5 w-5 transition-all ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
      <Moon className={`absolute top-2 left-2 h-5 w-5 transition-all ${isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
    </button>
  );
}
