import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RealtimeJobProgress } from '@/components/RealtimeJobProgress';
import { useRealtimeJobMonitoring } from '@/hooks/useRealtimeJobMonitoring';
import { supabase } from '@/lib/supabase';
import type { ScrapingJob } from '@/lib/supabase';
import { 
  Activity, 
  Play, 
  Square, 
  Zap,
  Database,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Monitor
} from 'lucide-react';

interface RealtimeMonitoringDashboardProps {
  className?: string;
}

export function RealtimeMonitoringDashboard({ className }: RealtimeMonitoringDashboardProps) {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  
  const {
    activeExecutions,
    jobProgress,
    isConnected,
    connectionStatus,
    startMonitoring,
    stopMonitoring,
    subscribeToJob,
    unsubscribeFromJob
  } = useRealtimeJobMonitoring();

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobMonitoring = (jobId: string) => {
    if (selectedJobs.has(jobId)) {
      setSelectedJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        unsubscribeFromJob(jobId);
        return newSet;
      });
    } else {
      setSelectedJobs(prev => {
        const newSet = new Set(prev);
        newSet.add(jobId);
        subscribeToJob(jobId);
        return newSet;
      });
    }
  };

  const startMonitoringAll = () => {
    const allJobIds = jobs.map(job => job.id);
    setSelectedJobs(new Set(allJobIds));
    startMonitoring(allJobIds);
  };

  const stopMonitoringAll = () => {
    setSelectedJobs(new Set());
    stopMonitoring();
  };

  const getActiveJobsCount = () => {
    return Array.from(activeExecutions.values()).filter(
      execution => execution.status === 'running'
    ).length;
  };

  const getCompletedJobsCount = () => {
    return Array.from(activeExecutions.values()).filter(
      execution => execution.status === 'completed'
    ).length;
  };

  const getFailedJobsCount = () => {
    return Array.from(activeExecutions.values()).filter(
      execution => execution.status === 'failed'
    ).length;
  };

  const getTotalItemsProcessed = () => {
    return Array.from(jobProgress.values()).reduce(
      (total, progress) => total + progress.items_processed, 0
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading monitoring dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Dashboard Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-6 w-6" />
              <CardTitle className="text-2xl">Real-time Job Monitoring</CardTitle>
              <Badge 
                variant={isConnected ? "secondary" : "destructive"}
                className="ml-2"
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startMonitoringAll}
                disabled={selectedJobs.size === jobs.length}
              >
                <Play className="h-4 w-4 mr-2" />
                Monitor All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stopMonitoringAll}
                disabled={selectedJobs.size === 0}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadJobs}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{getActiveJobsCount()}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{getCompletedJobsCount()}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{getFailedJobsCount()}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Database className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{getTotalItemsProcessed()}</p>
                <p className="text-sm text-muted-foreground">Items Processed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {connectionStatus === 'connecting' && 'Connecting to real-time updates...'}
                  {connectionStatus === 'error' && 'Connection error - retrying automatically'}
                  {connectionStatus === 'disconnected' && 'Real-time monitoring is disabled'}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Some features may not work correctly without a real-time connection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job List with Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Job Selection ({selectedJobs.size} of {jobs.length} monitored)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedJobs.has(job.id) 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => toggleJobMonitoring(job.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{job.name}</h3>
                    <p className="text-sm text-muted-foreground">{job.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedJobs.has(job.id) && (
                      <Badge variant="default">Monitoring</Badge>
                    )}
                    {activeExecutions.has(job.id) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Job Progress */}
      {selectedJobs.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Job Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from(selectedJobs).map(jobId => {
              const job = jobs.find(j => j.id === jobId);
              if (!job) return null;
              
              return (
                <RealtimeJobProgress
                  key={jobId}
                  jobId={jobId}
                  jobName={job.name}
                  onStop={() => {
                    // Implement stop job functionality
                    console.log('Stop job:', jobId);
                  }}
                  onPause={() => {
                    // Implement pause job functionality
                    console.log('Pause job:', jobId);
                  }}
                  onResume={() => {
                    // Implement resume job functionality
                    console.log('Resume job:', jobId);
                  }}
                />
              );
            })}
            
            {selectedJobs.size === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4" />
                <p>Select jobs above to monitor their real-time progress</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}