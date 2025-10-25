import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  History, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Timer,
  Database,
  Search,
  RefreshCw
} from 'lucide-react';
import { type ScrapingJob } from '@/lib/supabase';

interface JobExecutionHistoryProps {
  job: ScrapingJob | null;
  isOpen: boolean;
  onClose: () => void;
}

interface JobExecution {
  id: string;
  job_id: string;
  status: 'completed' | 'failed' | 'cancelled' | 'running';
  started_at: string;
  completed_at?: string;
  duration?: number; // in milliseconds
  items_scraped?: number;
  error_message?: string;
  ai_insights?: Record<string, unknown>;
  results_preview?: string[];
  gemini_reasoning?: string;
  screenshot_urls?: string[];
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

export function JobExecutionHistory({ job, isOpen, onClose }: JobExecutionHistoryProps) {
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const generateMockExecutions = useCallback((): JobExecution[] => {
    return [
      {
        id: '1',
        job_id: job?.id || '',
        status: 'completed',
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45000).toISOString(),
        duration: 45000,
        items_scraped: 127,
        results_preview: ['Product A - $29.99', 'Product B - $45.50', 'Product C - $12.99'],
        ai_insights: { confidence: 0.95, elements_found: 127 }
      },
      {
        id: '2',
        job_id: job?.id || '',
        status: 'failed',
        started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000 + 12000).toISOString(),
        duration: 12000,
        error_message: 'Failed to load page: Connection timeout',
        ai_insights: { confidence: 0.0, error_type: 'network' }
      },
      {
        id: '3',
        job_id: job?.id || '',
        status: 'completed',
        started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 67000).toISOString(),
        duration: 67000,
        items_scraped: 89,
        results_preview: ['Item X - $15.99', 'Item Y - $23.50'],
        ai_insights: { confidence: 0.88, elements_found: 89 }
      }
    ];
  }, [job?.id]);

  const loadExecutionHistory = useCallback(async () => {
    if (!job || !isOpen) return;
    
    setLoading(true);
    try {
      // For now, use mock data since we haven't set up the execution history table yet
      setExecutions(generateMockExecutions());
    } catch (error) {
      console.error('Failed to load execution history:', error);
    } finally {
      setLoading(false);
    }
  }, [job, isOpen, generateMockExecutions]);

  useEffect(() => {
    if (job && isOpen) {
      loadExecutionHistory();
    }
  }, [job, isOpen, statusFilter, loadExecutionHistory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
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
      case 'running':
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

  const filteredExecutions = executions.filter(exec => 
    (statusFilter === 'all' || exec.status === statusFilter) &&
    (searchTerm === '' || 
     exec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     exec.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
     exec.error_message?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

        <div className="py-4 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search executions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 apple-input"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
              title="Filter by execution status"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadExecutionHistory}
              disabled={loading}
              className="apple-button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Execution List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading execution history...</p>
              </div>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Execution History</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No executions match your current filters.'
                    : 'This job hasn\'t been executed yet. Run the job to see its execution history here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[50vh] overflow-y-auto space-y-4">
              {filteredExecutions.map((execution) => (
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
                            {formatDistanceToNow(new Date(execution.started_at))}
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
                            {new Date(execution.started_at).toLocaleString()}
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

                      {execution.items_scraped !== undefined && (
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Items Scraped</p>
                            <p className="text-sm text-muted-foreground">
                              {execution.items_scraped} items
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error Information */}
                    {execution.error_message && (
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

                    {/* Results Preview */}
                    {execution.results_preview && execution.results_preview.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sample Results</h4>
                        <div className="space-y-1">
                          {execution.results_preview.slice(0, 3).map((result, index) => (
                            <div key={index} className="text-sm bg-muted/50 px-3 py-1 rounded">
                              {result}
                            </div>
                          ))}
                          {execution.results_preview.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{execution.results_preview.length - 3} more items
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