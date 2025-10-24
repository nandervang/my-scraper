import { useState } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

type ThemeOption = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light' as ThemeOption, label: 'Light', icon: Sun },
    { id: 'dark' as ThemeOption, label: 'Dark', icon: Moon },
    { id: 'system' as ThemeOption, label: 'System', icon: Monitor },
  ];

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)}
        className="btn-enhanced border-2 border-primary/30 hover:border-primary bg-gradient-to-br from-background/80 to-muted/50 flex items-center gap-2"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <ChevronDown className="h-4 w-4 ml-1" />
        <span className="sr-only">Toggle theme</span>
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-card to-muted shadow-xl">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              return (
                <button
                  key={themeOption.id}
                  onClick={() => {
                    setTheme(themeOption.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                    theme === themeOption.id ? 'bg-primary/20 text-primary' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-lg">{themeOption.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}