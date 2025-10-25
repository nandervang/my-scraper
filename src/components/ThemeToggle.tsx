import { useState } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

type ThemeOption = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light' as ThemeOption, label: 'Light', icon: Sun, emoji: '☀️' },
    { id: 'dark' as ThemeOption, label: 'Dark', icon: Moon, emoji: '🌙' },
    { id: 'system' as ThemeOption, label: 'System', icon: Monitor, emoji: '💻' },
  ];

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)}
        className="apple-button focus-ring border-2 border-primary/30 hover:border-primary/50 bg-gradient-to-br from-background/80 to-muted/20 flex items-center gap-2 px-4 h-11"
      >
        <div className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-blue-400" />
        </div>
        <span className="text-sm font-medium hidden sm:inline">
          {themes.find(t => t.id === theme)?.label || 'Theme'}
        </span>
        <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        <span className="sr-only">Toggle theme</span>
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-3 z-50 w-56 apple-modal rounded-xl border shadow-xl overflow-hidden">
            <div className="p-2">
              {themes.map((themeOption) => {
                return (
                  <button
                    key={themeOption.id}
                    onClick={() => {
                      setTheme(themeOption.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 text-left rounded-lg transition-all duration-200 hover:scale-[1.02] focus-ring ${
                      theme === themeOption.id 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                      <span className="text-lg">{themeOption.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{themeOption.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {themeOption.id === 'light' && 'Always use light theme'}
                        {themeOption.id === 'dark' && 'Always use dark theme'}
                        {themeOption.id === 'system' && 'Follow system preference'}
                      </div>
                    </div>
                    {theme === themeOption.id && (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}