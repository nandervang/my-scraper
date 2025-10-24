import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight } from 'lucide-react';

export function DashboardHome() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalProducts: 0,
    inStockProducts: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [jobsResult, productsResult, notificationsResult] = await Promise.all([
        db.jobs.list(),
        db.products.list(),
        db.notifications.list(),
      ]);

      const jobs = jobsResult.data || [];
      const products = productsResult.data || [];
      const notifications = notificationsResult.data || [];

      setStats({
        totalJobs: jobs.length,
        runningJobs: jobs.filter(j => j.status === 'running').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        totalProducts: products.length,
        inStockProducts: products.filter(p => p.in_stock === true).length,
        unreadNotifications: notifications.filter(n => !n.read).length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
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
              My Scraper Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Overview of your scraping activities and product monitoring
            </p>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-enhanced border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalJobs}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Jobs</div>
                </div>
                <div className="text-2xl">🤖</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.runningJobs}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Running</div>
                </div>
                <div className="text-2xl">🚀</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.completedJobs}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Completed</div>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.failedJobs}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium">Failed</div>
                </div>
                <div className="text-2xl">❌</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                🤖 AI-Powered Scraping
              </CardTitle>
              <CardDescription className="text-base">
                Create intelligent scraping jobs with Google Gemini AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{stats.totalJobs}</strong> jobs created
              </div>
              <div className="flex gap-3">
                <Button asChild className="flex-1 apple-button">
                  <Link to="/jobs">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job
                  </Link>
                </Button>
                <Button variant="outline" asChild className="apple-button">
                  <Link to="/jobs">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                📊 Product Monitoring
              </CardTitle>
              <CardDescription className="text-base">
                Track prices and availability across multiple sites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{stats.totalProducts}</strong> products monitored
              </div>
              <div className="flex gap-3">
                <Button asChild className="flex-1 apple-button">
                  <Link to="/products">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Link>
                </Button>
                <Button variant="outline" asChild className="apple-button">
                  <Link to="/products">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                🔔 Notifications
              </CardTitle>
              <CardDescription className="text-base">
                Stay updated with price alerts and job status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{stats.unreadNotifications}</strong> unread notifications
              </div>
              <div className="flex gap-3">
                <Button asChild className="flex-1 apple-button" variant="outline">
                  <Link to="/notifications">
                    View All
                  </Link>
                </Button>
                <Button variant="outline" asChild className="apple-button">
                  <Link to="/notifications">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Status Card */}
        <Card className="card-enhanced border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎉</div>
              <div>
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">Phase 2 Ready!</h3>
                <p className="text-green-700 dark:text-green-300">
                  Database is set up with user authentication and ready for scraping jobs and product monitoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}