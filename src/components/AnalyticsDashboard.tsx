import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '@/hooks/useAnalytics';
import { 
  BarChart3, 
  TrendingUp,
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Activity,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Zap,
  Target,
  Database,
  Timer
} from 'lucide-react';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showFilters, setShowFilters] = useState(false);
  
  const { data, loading, error, refreshData } = useAnalytics({ timeRange });

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  Failed to Load Analytics
                </h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
              <Button variant="outline" onClick={refreshData} className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6" />
              <CardTitle className="text-2xl">Analytics Dashboard</CardTitle>
              <Badge variant="outline" className="ml-2">
                {timeRange === '7d' && 'Last 7 Days'}
                {timeRange === '30d' && 'Last 30 Days'}
                {timeRange === '90d' && 'Last 90 Days'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Time Range:</span>
                </div>
                <div className="flex gap-2">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                    >
                      {range === '7d' && '7 Days'}
                      {range === '30d' && '30 Days'}
                      {range === '90d' && '90 Days'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Executions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.overview.totalExecutions)}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <span>Across {data.overview.totalJobs} jobs</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.successRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {data.overview.successRate >= 90 ? (
                <span className="text-green-600">Excellent</span>
              ) : data.overview.successRate >= 75 ? (
                <span className="text-yellow-600">Good</span>
              ) : (
                <span className="text-red-600">Needs Attention</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Duration
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.overview.averageDuration)}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <span>Per execution</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Items Scraped
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.overview.totalItemsScraped)}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <span>{Math.round(data.overview.averageItemsPerExecution)} avg per job</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Executions Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Execution Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.trends.dailyExecutions.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {day.executions} total
                      </Badge>
                      <Badge variant="outline" className="text-xs text-green-600">
                        {day.successes} success
                      </Badge>
                      {day.failures > 0 && (
                        <Badge variant="outline" className="text-xs text-red-600">
                          {day.failures} failed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(day.itemsScraped)} items
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hourly Activity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.trends.hourlyDistribution
                .filter(hour => hour.executions > 0)
                .sort((a, b) => b.executions - a.executions)
                .slice(0, 8)
                .map((hour) => (
                  <div key={hour.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16">
                        {hour.hour.toString().padStart(2, '0')}:00
                      </span>
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          data-width={`${(hour.executions / Math.max(...data.trends.hourlyDistribution.map(h => h.executions))) * 100}%`}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {hour.executions} executions
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(hour.averageDuration)} avg
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Performing Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.performance.topPerformingJobs.slice(0, 5).map((job, index) => (
                <div key={job.job_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate">{job.job_name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {job.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{job.totalExecutions} runs</span>
                    <span>{formatDuration(job.averageDuration)}</span>
                    <span>{Math.round(job.averageItemsScraped)} items</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Slowest Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Performance Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.performance.slowestJobs.map((job) => (
                <div key={job.job_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold flex items-center justify-center">
                        <Clock className="h-3 w-3" />
                      </div>
                      <span className="text-sm font-medium truncate">{job.job_name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(job.averageDuration)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.executionCount} executions
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Error Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.performance.errorAnalysis.slice(0, 5).map((error) => (
                <div key={error.error_type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{error.error_type}</span>
                    <Badge variant="destructive" className="text-xs">
                      {error.count}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{error.percentage.toFixed(1)}% of failures</span>
                    <span>{error.jobs_affected.length} jobs affected</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.overview.successRate < 90 && (
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    Improve Success Rate
                  </span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Current success rate is {data.overview.successRate.toFixed(1)}%. 
                  Review failing jobs and optimize selectors.
                </p>
              </div>
            )}

            {data.performance.slowestJobs.length > 0 && (
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    Optimize Performance
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {data.performance.slowestJobs.length} jobs have slower than average execution times.
                </p>
              </div>
            )}

            {data.performance.errorAnalysis.length > 0 && (
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    Address Common Errors
                  </span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Top error: "{data.performance.errorAnalysis[0]?.error_type}" 
                  ({data.performance.errorAnalysis[0]?.count} occurrences)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}