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
import { ExternalLink, Clock, Zap, FileText, Copy, Download } from 'lucide-react';
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

  const exportAsJSON = (results: ScrapingResult[]) => {
    const exportData = {
      job: {
        id: job?.id,
        name: job?.name,
        url: job?.url,
        scraping_type: job?.scraping_type,
        created_at: job?.created_at
      },
      results: results.map(result => ({
        id: result.id,
        scraped_at: result.scraped_at,
        status: result.status,
        data: result.data,
        execution_time_ms: result.execution_time_ms,
        tokens_used: result.tokens_used,
        error_message: result.error_message
      })),
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.name || 'scraping-results'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Results exported as JSON file",
    });
  };

  const exportAsCSV = (results: ScrapingResult[]) => {
    if (results.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no results to export",
        variant: "destructive"
      });
      return;
    }

    // Create CSV headers
    const headers = ['ID', 'Scraped At', 'Status', 'Execution Time (ms)', 'Tokens Used', 'Error Message', 'Data'];
    
    // Create CSV rows
    const rows = results.map(result => [
      result.id,
      result.scraped_at,
      result.status,
      result.execution_time_ms || '',
      result.tokens_used || '',
      result.error_message || '',
      JSON.stringify(result.data || {}).replace(/,/g, ';') // Replace commas to avoid CSV conflicts
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.name || 'scraping-results'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Results exported as CSV file",
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
      <DialogContent className="modal-fullscreen dialog-content">
        <DialogHeader className="border-b pb-6 mb-6">
          <DialogTitle className="flex items-center gap-4 text-3xl">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white text-2xl">
              {job.scraping_type === 'product' ? '🛍️' : 
               job.scraping_type === 'price' ? '💰' : 
               job.scraping_type === 'content' ? '📄' : '🤖'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground text-3xl mb-2">{job.name}</div>
              <div className="text-xl text-muted-foreground capitalize">{job.scraping_type} scraping</div>
            </div>
            <Badge className={`status-badge text-lg px-4 py-2 ${getStatusColor(job.status)}`}>
              {job.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-16 text-lg">
              <TabsTrigger value="details" className="flex items-center gap-3 text-lg font-semibold">
                <Clock className="h-6 w-6" />
                Job Details
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-3 text-lg font-semibold">
                <FileText className="h-6 w-6" />
                Results ({results.length})
              </TabsTrigger>
              <TabsTrigger value="configuration" className="flex items-center gap-3 text-lg font-semibold">
                <Zap className="h-6 w-6" />
                Configuration
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto max-h-modal-content">
              <TabsContent value="details" className="space-y-8 mt-0 text-lg h-auto"
                           data-state="active">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <ExternalLink className="h-6 w-6" />
                    Target URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-lg">
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all text-lg font-medium"
                  >
                    {job.url}
                  </a>
                </CardContent>
              </Card>

              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Clock className="h-6 w-6" />
                    Timing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-lg">
                  <div>
                    <strong className="text-xl">Created:</strong> <span className="text-lg">{new Date(job.created_at).toLocaleString()}</span>
                  </div>
                  {job.last_run_at && (
                    <div>
                      <strong className="text-xl">Last Run:</strong> <span className="text-lg">{new Date(job.last_run_at).toLocaleString()}</span>
                    </div>
                  )}
                  {job.next_run_at && (
                    <div>
                      <strong className="text-xl">Next Run:</strong> <span className="text-lg">{new Date(job.next_run_at).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {job.ai_prompt && (
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Zap className="h-6 w-6" />
                    AI Prompt
                    <Button
                      variant="outline"
                      size="lg"
                      className="btn-enhanced"
                      onClick={() => copyToClipboard(job.ai_prompt || '')}
                    >
                      <Copy className="h-5 w-5" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl whitespace-pre-wrap border shadow-inner">
                    {job.ai_prompt}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6 text-lg">
            {isLoadingResults ? (
              <div className="text-center py-16 text-2xl">Loading results...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-xl">
                No results yet. Run the job to see results here.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Export Buttons */}
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">Results ({results.length})</h3>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => exportAsJSON(results)}
                      className="btn-enhanced flex items-center gap-3"
                    >
                      <Download className="h-5 w-5" />
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => exportAsCSV(results)}
                      className="btn-enhanced flex items-center gap-3"
                    >
                      <Download className="h-5 w-5" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {results.map((result) => (
                  <Card key={result.id} className="card-enhanced">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-2xl flex items-center gap-3">
                          <FileText className="h-6 w-6" />
                          Result from {new Date(result.scraped_at).toLocaleString()}
                        </CardTitle>
                        <div className="flex gap-3">
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                            {result.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="lg"
                            className="btn-enhanced"
                            onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                          >
                            <Copy className="h-5 w-5" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.error_message ? (
                        <div className="text-red-600 text-lg">
                          <strong>Error:</strong> {result.error_message}
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-6 text-lg text-gray-600 mb-4">
                            {result.execution_time_ms && (
                              <span>⏱️ {result.execution_time_ms}ms</span>
                            )}
                            {result.tokens_used && (
                              <span>🎯 {result.tokens_used} tokens</span>
                            )}
                          </div>
                          <pre className="text-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl overflow-x-auto max-h-80 border shadow-inner">
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

          <TabsContent value="configuration" className="space-y-6 text-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl">AI Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-lg">
                  <div><strong className="text-xl">Model:</strong> <span className="text-lg">{job.gemini_model}</span></div>
                  <div><strong className="text-xl">Vision:</strong> <span className="text-lg">{job.use_vision ? 'Enabled' : 'Disabled'}</span></div>
                  <div><strong className="text-xl">Type:</strong> <span className="text-lg">{job.scraping_type}</span></div>
                </CardContent>
              </Card>

              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl">Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-lg">
                  <div><strong className="text-xl">Enabled:</strong> <span className="text-lg">{job.schedule_enabled ? 'Yes' : 'No'}</span></div>
                  {job.schedule_cron && (
                    <div><strong className="text-xl">Schedule:</strong> <span className="text-lg">{job.schedule_cron}</span></div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(job.config && Object.keys(job.config).length > 0) && (
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl">Custom Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl overflow-x-auto border shadow-inner">
                    {JSON.stringify(job.config, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {(job.selectors && Object.keys(job.selectors).length > 0) && (
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-2xl">CSS Selectors</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl overflow-x-auto border shadow-inner">
                    {JSON.stringify(job.selectors, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}