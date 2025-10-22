import { useState, useEffect } from 'react';
import { supabase, type ScrapingJob, type ScrapingResult } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Clock, Zap, FileText, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JobDetailsModalProps {
  job: ScrapingJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsModal({ job, open, onOpenChange }: JobDetailsModalProps) {
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setResults([]);
      setLoadedJobId(null);
      setIsLoadingResults(false);
    }
  }, [open]);

  // Load results only when modal opens with a new job
  useEffect(() => {
    if (!job?.id || !open || loadedJobId === job.id) return;
    
    const loadResults = async () => {
      try {
        setIsLoadingResults(true);
        
        const { data, error } = await supabase
          .from('scraper_results')
          .select('*')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading results:', error);
          toast({ title: 'Error', description: 'Failed to load results', variant: 'destructive' });
          return;
        }

        setResults(data || []);
        setLoadedJobId(job.id);
      } catch (err) {
        console.error('Unexpected error loading results:', err);
        toast({ title: 'Error', description: 'Failed to load results', variant: 'destructive' });
      } finally {
        setIsLoadingResults(false);
      }
    };

    loadResults();
  }, [job?.id, open, loadedJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
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

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">
              {job.scraping_type === 'product' ? '🛍️' : 
               job.scraping_type === 'price' ? '💰' : 
               job.scraping_type === 'content' ? '📄' : '🤖'}
            </span>
            {job.name}
            <Badge className={getStatusColor(job.status)}>
              {job.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Job Details</TabsTrigger>
            <TabsTrigger value="results">
              Results ({results.length})
            </TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Target URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {job.url}
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Created:</strong> {new Date(job.created_at).toLocaleString()}
                  </div>
                  {job.last_run_at && (
                    <div>
                      <strong>Last Run:</strong> {new Date(job.last_run_at).toLocaleString()}
                    </div>
                  )}
                  {job.next_run_at && (
                    <div>
                      <strong>Next Run:</strong> {new Date(job.next_run_at).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {job.ai_prompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    AI Prompt
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(job.ai_prompt || '')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {job.ai_prompt}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {isLoadingResults ? (
              <div className="text-center py-8">Loading results...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No results yet. Run the job to see results here.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Result from {new Date(result.scraped_at).toLocaleString()}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.error_message ? (
                        <div className="text-red-600 text-sm">
                          <strong>Error:</strong> {result.error_message}
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-4 text-sm text-gray-600 mb-3">
                            {result.execution_time_ms && (
                              <span>⏱️ {result.execution_time_ms}ms</span>
                            )}
                            {result.tokens_used && (
                              <span>🎯 {result.tokens_used} tokens</span>
                            )}
                          </div>
                          <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto max-h-64">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Model:</strong> {job.gemini_model}</div>
                  <div><strong>Vision:</strong> {job.use_vision ? 'Enabled' : 'Disabled'}</div>
                  <div><strong>Type:</strong> {job.scraping_type}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Enabled:</strong> {job.schedule_enabled ? 'Yes' : 'No'}</div>
                  {job.schedule_cron && (
                    <div><strong>Schedule:</strong> {job.schedule_cron}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(job.config && Object.keys(job.config).length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(job.config, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {(job.selectors && Object.keys(job.selectors).length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>CSS Selectors</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(job.selectors, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}