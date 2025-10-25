import { useEffect, useState, useCallback } from 'react';
import { db, type ScrapingJob } from '@/lib/supabase';
import { JobExecutor, JobExecutionException, JobExecutionError } from '@/lib/jobExecutor';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateJobModal } from '@/components/CreateJobModal';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { JobCard } from '@/components/JobCard';
import { useToast } from '@/hooks/use-toast';
import { useApiErrorHandler } from '@/hooks/useErrorHandler';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoadingCard } from '@/components/ui/loading';

export function JobsPage() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ScrapingJob[]>([]);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<ScrapingJob | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  // Enhanced error handling
  const { 
    error, 
    isLoading: loading, 
    executeApiCall, 
    clearError, 
    retry 
  } = useApiErrorHandler({
    showToast: false, // We'll handle toasts manually for better UX
    autoRetry: false,
    maxRetries: 3,
  });

  const loadJobs = useCallback(async () => {
    const { data } = await executeApiCall(
      async () => {
        const result = await db.jobs.list();
        if (result.error) throw result.error;
        return result.data || [];
      },
      { context: 'loadJobs' }
    );

    if (data) {
      setJobs(data);
    }
  }, [executeApiCall]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const runJob = async (job: ScrapingJob) => {
    try {
      setRunningJobs(prev => new Set(prev).add(job.id));
      toast({ title: 'Starting job', description: `Running "${job.name}"...` });
      await JobExecutor.runJob(job);
      await loadJobs(); // Refresh jobs to show updated status
      toast({ title: 'Job completed', description: `"${job.name}" finished successfully` });
    } catch (err) {
      console.error('Failed to run job:', err);
      
      let errorTitle = 'Job failed';
      let errorDescription = `Failed to run "${job.name}"`;
      
      if (err instanceof JobExecutionException) {
        switch (err.type) {
          case JobExecutionError.INVALID_URL:
            errorTitle = 'Invalid URL';
            errorDescription = `The URL for "${job.name}" is invalid. Please check and update the job configuration.`;
            break;
          case JobExecutionError.NETWORK_ERROR:
            errorTitle = 'Network Error';
            errorDescription = `Could not reach the target website for "${job.name}". Please check your internet connection and try again.`;
            break;
          case JobExecutionError.AI_SERVICE_ERROR:
            errorTitle = 'AI Service Error';
            errorDescription = `The AI service is currently unavailable. Please try running "${job.name}" again later.`;
            break;
          case JobExecutionError.RATE_LIMIT_ERROR:
            errorTitle = 'Rate Limited';
            errorDescription = `Too many requests. Please wait a moment before running "${job.name}" again.`;
            break;
          default:
            errorDescription = `${errorDescription}: ${err.message}`;
        }
      } else {
        errorDescription = `${errorDescription}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDescription,
        variant: 'destructive'
      });
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const deleteJob = async (job: ScrapingJob) => {
    try {
      setDeletingJobs(prev => new Set(prev).add(job.id));
      toast({ title: 'Deleting job', description: `Deleting "${job.name}"...` });
      
      const { error } = await db.jobs.delete(job.id);
      if (error) throw error;
      
      await loadJobs(); // Refresh jobs list
      toast({ title: 'Job deleted', description: `"${job.name}" has been deleted` });
    } catch (err) {
      console.error('Failed to delete job:', err);
      toast({ 
        title: 'Delete failed', 
        description: `Failed to delete "${job.name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const viewJob = (job: ScrapingJob) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  // Filter jobs based on search and status
  useEffect(() => {
    let filtered = jobs;
    
    if (searchQuery) {
      filtered = filtered.filter(job => 
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.scraping_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }
    
    setFilteredJobs(filtered);
  }, [jobs, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded-lg w-80 animate-pulse"></div>
              <div className="h-6 bg-muted/70 rounded w-96 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-enhanced animate-pulse bg-muted/30 h-24"></div>
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div className="card-enhanced animate-pulse bg-muted/30 h-20"></div>

          {/* Jobs Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <LoadingCard count={6} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-8xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              We encountered an error while loading your jobs: {error?.userMessage || error?.message || 'Unknown error'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => { clearError(); loadJobs(); }} className="apple-button">
                Try Again
              </Button>
              {error?.recoverable && (
                <Button onClick={retry} variant="outline" className="apple-button">
                  Auto Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Scraping Jobs
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your intelligent web scraping operations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <CreateJobModal onJobCreated={loadJobs} />
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-enhanced border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {jobs.filter(j => j.status === 'completed').length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Completed</div>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {jobs.filter(j => j.status === 'pending').length}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Pending</div>
                </div>
                <div className="text-2xl">⏳</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {jobs.filter(j => j.status === 'running').length}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Running</div>
                </div>
                <div className="text-2xl">🚀</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {jobs.filter(j => j.status === 'failed').length}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium">Failed</div>
                </div>
                <div className="text-2xl">❌</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search jobs by name, URL, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter jobs by status"
                    className="px-3 py-2 border border-input rounded-md text-sm bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredJobs.length} of {jobs.length} jobs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <Card className="card-enhanced text-center py-16">
            <CardContent>
              <div className="space-y-6">
                <div className="text-8xl">🤖</div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl">No scraping jobs yet</CardTitle>
                  <CardDescription className="text-lg max-w-md mx-auto">
                    Get started by creating your first AI-powered web scraping job
                  </CardDescription>
                </div>
                <CreateJobModal onJobCreated={loadJobs} />
              </div>
            </CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className="card-enhanced text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <div className="text-6xl">🔍</div>
                <div className="space-y-2">
                  <CardTitle>No jobs match your search</CardTitle>
                  <CardDescription>
                    Try adjusting your search terms or filters
                  </CardDescription>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isRunning={runningJobs.has(job.id)}
                isDeleting={deletingJobs.has(job.id)}
                onRun={runJob}
                onView={viewJob}
                onDelete={deleteJob}
                onScheduleUpdated={loadJobs}
              />
            ))}
          </div>
        )}

        {/* Job Details Modal */}
        <JobDetailsModal
          job={selectedJob}
          open={showJobDetails}
          onOpenChange={setShowJobDetails}
        />
      </div>
    </div>
  );
}