import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Activity, 
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useJobMonitoring } from '@/hooks/useRealtimeJobMonitoring';
import { cn } from '@/lib/utils';

interface RealtimeJobProgressProps {
  jobId: string;
  jobName: string;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
}

export function RealtimeJobProgress({ 
  jobId, 
  jobName, 
  onStop, 
  onPause, 
  onResume,
  className 
}: RealtimeJobProgressProps) {
  const { execution, progress, isConnected, connectionStatus } = useJobMonitoring(jobId);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (progress?.last_update) {
      setLastUpdate(new Date(progress.last_update));
    }
  }, [progress?.last_update]);

  const getStatusIcon = () => {
    if (!execution) return <Clock className="h-4 w-4 text-muted-foreground" />;
    
    switch (execution.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (): "default" | "destructive" | "secondary" | "outline" => {
    if (!execution) return 'default';
    
    switch (execution.status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary'; // Using secondary instead of success
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatItemsPerSecond = (itemsPerSecond: number) => {
    if (itemsPerSecond < 1) {
      return `${(itemsPerSecond * 60).toFixed(1)}/min`;
    }
    return `${itemsPerSecond.toFixed(1)}/sec`;
  };

  if (!execution && !progress) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">No active execution for {jobName}</span>
            {!isConnected && (
              <Badge variant="outline" className="ml-auto">
                Disconnected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4", {
      "border-l-blue-500": execution?.status === 'running',
      "border-l-green-500": execution?.status === 'completed',
      "border-l-red-500": execution?.status === 'failed',
      "border-l-yellow-500": execution?.status === 'cancelled',
      "border-l-gray-300": execution?.status === 'pending',
    }, className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header with status and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-medium">{jobName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={getStatusColor()}>
                  {execution?.status || 'Unknown'}
                </Badge>
                {execution?.started_at && (
                  <span>• {formatDuration(execution.started_at)}</span>
                )}
                {!isConnected && (
                  <Badge variant="outline" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Control buttons */}
          {execution?.status === 'running' && (
            <div className="flex items-center gap-2">
              {onPause && (
                <Button variant="outline" size="sm" onClick={onPause}>
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              {onStop && (
                <Button variant="outline" size="sm" onClick={onStop}>
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {execution?.status === 'pending' && onResume && (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar and metrics */}
        {progress && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.current_step}</span>
                <span className="font-medium">
                  {progress.progress_percentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>

            {/* Performance metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">
                  {progress.items_processed}
                  {progress.total_items && ` / ${progress.total_items}`}
                </span>
              </div>

              {progress.performance_metrics?.items_per_second && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Speed:</span>
                  <span className="font-medium">
                    {formatItemsPerSecond(progress.performance_metrics.items_per_second)}
                  </span>
                </div>
              )}

              {progress.performance_metrics?.estimated_completion && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">ETA:</span>
                  <span className="font-medium">
                    {new Date(progress.performance_metrics.estimated_completion).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {lastUpdate && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {execution?.error_message && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{execution.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection status indicator */}
        {connectionStatus !== 'connected' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className={cn("h-4 w-4", {
              "animate-pulse text-yellow-500": connectionStatus === 'connecting',
              "text-red-500": connectionStatus === 'error',
              "text-gray-400": connectionStatus === 'disconnected'
            })} />
            <span>
              {connectionStatus === 'connecting' && 'Connecting to real-time updates...'}
              {connectionStatus === 'error' && 'Connection error, retrying...'}
              {connectionStatus === 'disconnected' && 'Real-time updates disconnected'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}