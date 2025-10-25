import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("animate-spin", sizeClasses[size], className)}>
      <div className="w-full h-full border-2 border-primary/30 border-t-primary rounded-full"></div>
    </div>
  );
}

interface LoadingCardProps {
  count?: number;
  className?: string;
}

export function LoadingCard({ count = 1, className }: LoadingCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "card-hover animate-pulse",
            "bg-gradient-to-br from-muted/50 to-muted/30",
            "border border-muted",
            className
          )}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-muted rounded-lg w-3/4"></div>
                <div className="h-4 bg-muted/70 rounded w-1/2"></div>
              </div>
              <div className="w-8 h-8 bg-muted rounded-full"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-muted/70 rounded w-full"></div>
              <div className="h-4 bg-muted/70 rounded w-2/3"></div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <div className="h-10 bg-muted rounded-lg flex-1"></div>
              <div className="h-10 bg-muted rounded-lg w-16"></div>
              <div className="h-10 bg-muted rounded-lg w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce-1" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce-2" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce-3" />
    </div>
  );
}

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({ 
  title = "Loading...", 
  description = "Please wait while we fetch your data",
  className 
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-primary/40 rounded-full animate-spin animate-reverse"></div>
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
      
      <LoadingDots className="mt-4" />
    </div>
  );
}