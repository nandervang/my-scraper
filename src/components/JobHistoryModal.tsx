import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Timer,
  Database
} from 'lucide-react';
import { type ScrapingJob } from '@/lib/supabase';

interface JobHistoryModalProps {
  job: ScrapingJob | null;
  isOpen: boolean;
  onClose: () => void;
}

interface JobExecution {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  itemsScraped?: number;
  error?: string;
  resultsPreview?: string[];
}

const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export function JobHistoryModal({ job, isOpen, onClose }: JobHistoryModalProps) {
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadExecutionHistory = useCallback(async () => {
    if (!job) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual history loading from database
      // For now, simulate some execution history
      const mockExecutions: JobExecution[] = [
        {
          id: '1',
          status: 'completed',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45000), // 45 seconds duration
          duration: 45000,
          itemsScraped: 127,
          resultsPreview: ['Item 1', 'Item 2', 'Item 3']
        },
        {
          id: '2',
          status: 'failed',
          startTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          endTime: new Date(Date.now() - 6 * 60 * 60 * 1000 + 12000), // 12 seconds duration
          duration: 12000,
          error: 'Failed to load page: Connection timeout'
        },
        {
          id: '3',
          status: 'completed',
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 67000), // 67 seconds duration
          duration: 67000,
          itemsScraped: 89,
          resultsPreview: ['Product A', 'Product B', 'Product C']
        }
      ];
      setExecutions(mockExecutions);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    } finally {
      setLoading(false);
    }
  }, [job]);

  useEffect(() => {
    if (job && isOpen) {
      loadExecutionHistory();
    }
  }, [job, isOpen, loadExecutionHistory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-success';
      case 'failed':
        return 'status-error';
      case 'cancelled':
        return 'status-warning';
      default:
        return 'status-warning';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="apple-modal max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl apple-text flex items-center gap-3">
            <History className="h-6 w-6" />
            Execution History: {job.name}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading execution history...</p>
              </div>
            </div>
          ) : executions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Execution History</h3>
                <p className="text-muted-foreground">
                  This job hasn't been executed yet. Run the job to see its execution history here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {executions.map((execution) => (
                  <Card key={execution.id} className="apple-card hover:shadow-lg transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <CardTitle className="text-lg">
                              Execution {execution.id}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(execution.startTime)}
                            </p>
                          </div>
                        </div>
                        <Badge className={`status-indicator ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Timing Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Started</p>
                            <p className="text-sm text-muted-foreground">
                              {execution.startTime.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {execution.duration && (
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Duration</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDuration(execution.duration)}
                              </p>
                            </div>
                          </div>
                        )}

                        {execution.itemsScraped !== undefined && (
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Items Scraped</p>
                              <p className="text-sm text-muted-foreground">
                                {execution.itemsScraped} items
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Error Information */}
                      {execution.error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">Error</p>
                              <p className="text-sm text-destructive/80">{execution.error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results Preview */}
                      {execution.resultsPreview && execution.resultsPreview.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Sample Results</h4>
                          <div className="space-y-1">
                            {execution.resultsPreview.slice(0, 3).map((result, index) => (
                              <div key={index} className="text-sm bg-muted/50 px-3 py-1 rounded">
                                {result}
                              </div>
                            ))}
                            {execution.resultsPreview.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{execution.resultsPreview.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" className="apple-button">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Full Results
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="apple-button">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}