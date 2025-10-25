import { useState, useEffect, useCallback } from 'react';

export interface JobExecutionMetrics {
  id: string;
  job_id: string;
  job_name: string;
  status: 'completed' | 'failed' | 'cancelled' | 'running';
  started_at: string;
  completed_at?: string;
  duration?: number;
  items_scraped?: number;
  error_message?: string;
  performance_score?: number;
}

export interface AnalyticsData {
  overview: {
    totalJobs: number;
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    totalItemsScraped: number;
    averageItemsPerExecution: number;
  };
  trends: {
    dailyExecutions: Array<{
      date: string;
      executions: number;
      successes: number;
      failures: number;
      itemsScraped: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      executions: number;
      averageDuration: number;
    }>;
  };
  performance: {
    topPerformingJobs: Array<{
      job_id: string;
      job_name: string;
      successRate: number;
      averageDuration: number;
      totalExecutions: number;
      averageItemsScraped: number;
    }>;
    slowestJobs: Array<{
      job_id: string;
      job_name: string;
      averageDuration: number;
      executionCount: number;
    }>;
    errorAnalysis: Array<{
      error_type: string;
      count: number;
      percentage: number;
      jobs_affected: string[];
    }>;
  };
  timeRangeData: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
}

interface UseAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
}

export function useAnalytics({ 
  timeRange = '30d', 
  startDate, 
  endDate 
}: UseAnalyticsProps = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateDateRange = useCallback(() => {
    const end = endDate ? new Date(endDate) : new Date();
    let start: Date;

    switch (timeRange) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }, [timeRange, startDate, endDate]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = calculateDateRange();
      
      // For demo purposes, let's generate comprehensive mock data
      // In production, these would be actual database queries
      
      const mockData = generateMockAnalyticsData(start, end);
      setData(mockData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [calculateDateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const refreshData = useCallback(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    data,
    loading,
    error,
    refreshData
  };
}

function generateMockAnalyticsData(startDate: Date, endDate: Date): AnalyticsData {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate daily trend data
  const dailyExecutions = [];
  for (let i = 0; i < daysDiff; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const baseExecutions = Math.floor(Math.random() * 20) + 5;
    const successes = Math.floor(baseExecutions * (0.7 + Math.random() * 0.2));
    const failures = baseExecutions - successes;
    
    dailyExecutions.push({
      date: date.toISOString().split('T')[0],
      executions: baseExecutions,
      successes,
      failures,
      itemsScraped: successes * (Math.floor(Math.random() * 100) + 50)
    });
  }

  // Generate hourly distribution
  const hourlyDistribution = [];
  for (let hour = 0; hour < 24; hour++) {
    const executionCount = Math.floor(Math.random() * 10) + 
      (hour >= 9 && hour <= 17 ? 5 : 0); // More activity during business hours
    
    hourlyDistribution.push({
      hour,
      executions: executionCount,
      averageDuration: Math.floor(Math.random() * 120000) + 30000 // 30s to 2.5min
    });
  }

  // Calculate overview metrics
  const totalExecutions = dailyExecutions.reduce((sum, day) => sum + day.executions, 0);
  const totalSuccesses = dailyExecutions.reduce((sum, day) => sum + day.successes, 0);
  const totalItemsScraped = dailyExecutions.reduce((sum, day) => sum + day.itemsScraped, 0);

  // Generate performance data
  const jobNames = [
    'E-commerce Product Scraper',
    'News Article Extractor', 
    'Price Monitor Bot',
    'Social Media Analytics',
    'Real Estate Listings',
    'Job Board Scanner',
    'Stock Market Data',
    'Weather Information'
  ];

  const topPerformingJobs = jobNames.slice(0, 5).map((name, index) => ({
    job_id: `job_${index + 1}`,
    job_name: name,
    successRate: 95 - Math.random() * 10,
    averageDuration: Math.floor(Math.random() * 60000) + 30000,
    totalExecutions: Math.floor(Math.random() * 50) + 20,
    averageItemsScraped: Math.floor(Math.random() * 200) + 100
  }));

  const slowestJobs = jobNames.slice(3, 6).map((name, index) => ({
    job_id: `job_${index + 4}`,
    job_name: name,
    averageDuration: Math.floor(Math.random() * 120000) + 90000, // 1.5-3.5 minutes
    executionCount: Math.floor(Math.random() * 30) + 10
  }));

  const errorTypes = [
    'Connection timeout',
    'Element not found',
    'Rate limit exceeded',
    'Invalid response format',
    'Authentication failed'
  ];

  const errorAnalysis = errorTypes.map(errorType => {
    const count = Math.floor(Math.random() * 15) + 1;
    return {
      error_type: errorType,
      count,
      percentage: (count / (totalExecutions - totalSuccesses)) * 100,
      jobs_affected: jobNames.slice(0, Math.floor(Math.random() * 3) + 1)
    };
  });

  return {
    overview: {
      totalJobs: jobNames.length,
      totalExecutions,
      successRate: (totalSuccesses / totalExecutions) * 100,
      averageDuration: 45000 + Math.random() * 30000, // 45s - 1.25min average
      totalItemsScraped,
      averageItemsPerExecution: totalItemsScraped / totalSuccesses
    },
    trends: {
      dailyExecutions,
      hourlyDistribution
    },
    performance: {
      topPerformingJobs,
      slowestJobs,
      errorAnalysis
    },
    timeRangeData: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalDays: daysDiff
    }
  };
}