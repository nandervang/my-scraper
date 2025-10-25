import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Database,
  Zap,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { db, type ScrapingJob } from '@/lib/supabase';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalItemsScraped: number;
  avgExecutionTime: number;
  successRate: number;
  recentExecutions: number;
}

interface RecentActivity {
  id: string;
  jobName: string;
  status: 'completed' | 'failed' | 'running';
  timestamp: Date;
  itemsScraped?: number;
  duration?: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalItemsScraped: 0,
    avgExecutionTime: 0,
    successRate: 0,
    recentExecutions: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load jobs using the proper db interface
      const { data: jobsData, error } = await db.jobs.list();
      if (error) throw error;
      
      const jobs = jobsData || [];
      
      // Calculate stats
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter((job: ScrapingJob) => job.status === 'running').length;
      const completedJobs = jobs.filter((job: ScrapingJob) => job.status === 'completed').length;
      const failedJobs = jobs.filter((job: ScrapingJob) => job.status === 'failed').length;
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      
      // Simulate additional stats (in a real app, these would come from execution history)
      const totalItemsScraped = Math.floor(Math.random() * 10000) + 5000;
      const avgExecutionTime = Math.floor(Math.random() * 120) + 30; // 30-150 seconds
      const recentExecutions = Math.floor(Math.random() * 50) + 10;
      
      setStats({
        totalJobs,
        activeJobs,
        completedJobs,
        failedJobs,
        totalItemsScraped,
        avgExecutionTime,
        successRate,
        recentExecutions
      });
      
      // Generate mock recent activity
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          jobName: 'E-commerce Product Scraper',
          status: 'completed',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
          itemsScraped: 127,
          duration: 45
        },
        {
          id: '2',
          jobName: 'News Article Collector',
          status: 'running',
          timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
        },
        {
          id: '3',
          jobName: 'Social Media Monitor',
          status: 'failed',
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
        {
          id: '4',
          jobName: 'Price Tracker',
          status: 'completed',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          itemsScraped: 89,
          duration: 67
        }
      ];
      
      setRecentActivity(mockActivity);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statCards = [
    {
      title: 'Total Jobs',
      value: stats.totalJobs,
      icon: Database,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs,
      icon: Activity,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: 'Items Scraped',
      value: stats.totalItemsScraped.toLocaleString(),
      icon: BarChart3,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold apple-text">Dashboard Overview</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="apple-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold apple-text">Dashboard Overview</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData}
            disabled={loading}
            className="apple-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title} className="apple-card hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(activity.status)}
                  <div>
                    <p className="font-medium">{activity.jobName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                      {activity.itemsScraped && ` • ${activity.itemsScraped} items`}
                      {activity.duration && ` • ${activity.duration}s`}
                    </p>
                  </div>
                </div>
                <Badge className={`status-indicator ${
                  activity.status === 'completed' ? 'status-success' :
                  activity.status === 'failed' ? 'status-error' : 'status-warning'
                }`}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full apple-button justify-start" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Create New Job
            </Button>
            <Button className="w-full apple-button justify-start" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Run All Active Jobs
            </Button>
            <Button className="w-full apple-button justify-start" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Manager
            </Button>
            <Button className="w-full apple-button justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.avgExecutionTime}s
              </div>
              <p className="text-sm text-muted-foreground">Avg Execution Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.recentExecutions}
              </div>
              <p className="text-sm text-muted-foreground">Recent Executions (24h)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}