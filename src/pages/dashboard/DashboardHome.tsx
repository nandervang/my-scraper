import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Activity, Clock, CheckCircle, XCircle } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your scraping activities and product monitoring
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalJobs}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running Jobs</p>
                <p className="text-2xl font-bold text-orange-600">{stats.runningJobs}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedJobs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedJobs}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 AI-Powered Scraping
            </CardTitle>
            <CardDescription>
              Create intelligent scraping jobs with Google Gemini AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <strong>{stats.totalJobs}</strong> jobs created
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link to="/jobs">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Job
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/jobs">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Product Monitoring
            </CardTitle>
            <CardDescription>
              Track prices and availability across multiple sites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <strong>{stats.totalProducts}</strong> products monitored
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link to="/products">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/products">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔔 Notifications
            </CardTitle>
            <CardDescription>
              Stay updated with price alerts and job status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <strong>{stats.unreadNotifications}</strong> unread notifications
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1" variant="outline">
                <Link to="/notifications">
                  View All
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/notifications">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">🎉 Phase 2 Ready!</h3>
              <p className="text-green-700 text-sm">
                Database is set up with user authentication and ready for scraping jobs and product monitoring.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}