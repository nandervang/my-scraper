import { useEffect, useState } from 'react';
import { db, type ScrapingJob } from '@/lib/supabase';
import { JobExecutor } from '@/lib/jobExecutor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateJobModal } from '@/components/CreateJobModal';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { Play, Pause, Trash2, Eye } from 'lucide-react';

export function JobsPage() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<ScrapingJob | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.jobs.list();
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const runJob = async (job: ScrapingJob) => {
    try {
      setRunningJobs(prev => new Set(prev).add(job.id));
      await JobExecutor.runJob(job);
      await loadJobs(); // Refresh jobs to show updated status
    } catch (err) {
      console.error('Failed to run job:', err);
      // TODO: Add toast notification
    } finally {
      setRunningJobs(prev => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={loadJobs}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scraping Jobs</h1>
          <p className="text-gray-600 mt-1">
            Manage your AI-powered web scraping tasks
          </p>
        </div>
        <CreateJobModal onJobCreated={loadJobs} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {jobs.filter(j => j.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {jobs.filter(j => j.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {jobs.filter(j => j.status === 'running').length}
            </div>
            <div className="text-sm text-gray-600">Running</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {jobs.filter(j => j.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="mb-2">No scraping jobs yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first AI-powered scraping job to get started
            </CardDescription>
            <CreateJobModal onJobCreated={loadJobs} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(job.scraping_type)}</span>
                    <div>
                      <CardTitle className="text-lg">{job.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {job.scraping_type} scraping
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 truncate">
                  <strong>URL:</strong> {job.url}
                </div>
                
                {job.ai_prompt && (
                  <div className="text-sm text-gray-600">
                    <strong>AI Prompt:</strong> 
                    <p className="mt-1 text-xs bg-gray-50 p-2 rounded truncate">
                      {job.ai_prompt}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
                  {job.last_run_at && (
                    <span>Last run: {new Date(job.last_run_at).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => viewJob(job)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runJob(job)}
                    disabled={job.status === 'running' || runningJobs.has(job.id)}
                  >
                    {job.status === 'running' || runningJobs.has(job.id) ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
  );
}