import { useState } from 'react';
import { type ScrapingJob } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Play, 
  Trash2, 
  Eye, 
  Clock, 
  Calendar, 
  ExternalLink,
  Zap,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: ScrapingJob;
  isRunning?: boolean;
  isDeleting?: boolean;
  onRun: (job: ScrapingJob) => void;
  onView: (job: ScrapingJob) => void;
  onDelete: (job: ScrapingJob) => void;
}

export function JobCard({ 
  job, 
  isRunning = false, 
  isDeleting = false,
  onRun, 
  onView, 
  onDelete 
}: JobCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-success';
      case 'running': return 'status-warning';
      case 'failed': return 'status-error';
      case 'pending': return 'status-warning';
      case 'paused': return 'status-warning';
      default: return 'status-warning';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return '🛍️';
      case 'price': return '💰';
      case 'content': return '📄';
      default: return '🤖';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'price': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'content': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      className={cn(
        "card-hover apple-text focus-ring group cursor-pointer",
        isHovered && "shadow-xl",
        isRunning && "ring-2 ring-blue-500/30",
        isDeleting && "opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl" title={`${job.scraping_type} scraping`}>
                {getTypeIcon(job.scraping_type)}
              </span>
              <h3 className="font-bold text-xl leading-tight truncate">
                {job.name}
              </h3>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={cn("status-indicator", getStatusColor(job.status))}>
                {job.status}
              </Badge>
              <Badge variant="outline" className={cn("text-sm font-semibold", getTypeColor(job.scraping_type))}>
                {job.scraping_type}
              </Badge>
              {job.use_vision && (
                <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                  <Zap className="w-4 h-4 mr-1" />
                  Vision AI
                </Badge>
              )}
            </div>
          </div>
          
          {isRunning && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* URL Display */}
        <div className="mb-6">
          <div className="flex items-center gap-3 text-lg text-muted-foreground mb-2">
            <ExternalLink className="h-4 w-4" />
            <span>Target URL</span>
          </div>
          <a 
            href={job.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-lg text-primary hover:underline truncate block font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {job.url}
          </a>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 gap-3 mb-6 text-base text-muted-foreground">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDate(job.created_at)}</span>
          </div>
          {job.last_run_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4" />
              <span>Last run: {formatDate(job.last_run_at)}</span>
            </div>
          )}
        </div>

        {/* AI Configuration Summary */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border">
          <div className="text-base text-muted-foreground mb-2">AI Configuration</div>
          <div className="text-lg">
            <div className="flex items-center justify-between">
              <span>Model:</span>
              <code className="text-base bg-background px-2 py-1 rounded font-mono">
                {job.gemini_model.replace('models/', '')}
              </code>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            size="lg" 
            variant="outline" 
            className="flex-1 apple-button focus-ring text-lg"
            onClick={(e) => {
              e.stopPropagation();
              onView(job);
            }}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="apple-button focus-ring text-lg"
            onClick={(e) => {
              e.stopPropagation();
              onRun(job);
            }}
            disabled={job.status === 'running' || isRunning}
          >
            {job.status === 'running' || isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-destructive hover:text-destructive apple-button focus-ring text-lg"
                disabled={isDeleting}
                onClick={(e) => e.stopPropagation()}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="apple-modal dialog-content">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-3xl apple-text">Delete Job</AlertDialogTitle>
                <AlertDialogDescription className="text-xl apple-text">
                  Are you sure you want to delete "{job.name}"? This action cannot be undone and will permanently delete the job and all its results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-4">
                <AlertDialogCancel className="apple-button focus-ring text-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(job)}
                  className="bg-destructive hover:bg-destructive/90 apple-button focus-ring text-lg"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}