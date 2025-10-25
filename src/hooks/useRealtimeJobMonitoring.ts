import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface JobExecution {
  id: string;
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration?: number;
  items_scraped?: number;
  progress_percentage?: number;
  current_step?: string;
  error_message?: string;
  ai_insights?: Record<string, unknown>;
  results_preview?: string[];
  screenshot_urls?: string[];
}

export interface JobProgress {
  job_id: string;
  execution_id: string;
  progress_percentage: number;
  current_step: string;
  items_processed: number;
  total_items?: number;
  last_update: string;
  performance_metrics?: {
    items_per_second: number;
    estimated_completion: string;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

interface RealtimeJobMonitoring {
  activeExecutions: Map<string, JobExecution>;
  jobProgress: Map<string, JobProgress>;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  startMonitoring: (jobIds?: string[]) => void;
  stopMonitoring: () => void;
  getJobExecution: (jobId: string) => JobExecution | undefined;
  getJobProgress: (jobId: string) => JobProgress | undefined;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
}

export function useRealtimeJobMonitoring(): RealtimeJobMonitoring {
  const [activeExecutions, setActiveExecutions] = useState<Map<string, JobExecution>>(new Map());
  const [jobProgress, setJobProgress] = useState<Map<string, JobProgress>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const subscriptionsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const monitoredJobsRef = useRef<Set<string>>(new Set());

  const startMonitoring = useCallback((jobIds?: string[]) => {
    setConnectionStatus('connecting');
    
    try {
      // Subscribe to job executions table for real-time updates
      const executionSubscription = supabase
        .channel('job-executions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scraper_job_executions',
            filter: jobIds ? `job_id=in.(${jobIds.join(',')})` : undefined
          },
          (payload) => {
            const execution = payload.new as JobExecution;
            if (execution) {
              setActiveExecutions(prev => {
                const newMap = new Map(prev);
                newMap.set(execution.job_id, execution);
                return newMap;
              });
            }
            
            // Handle deletions
            if (payload.eventType === 'DELETE' && payload.old) {
              const oldExecution = payload.old as JobExecution;
              setActiveExecutions(prev => {
                const newMap = new Map(prev);
                newMap.delete(oldExecution.job_id);
                return newMap;
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            setIsConnected(false);
          }
        });

      // Subscribe to job progress table for real-time progress updates
      const progressSubscription = supabase
        .channel('job-progress')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scraper_job_progress',
            filter: jobIds ? `job_id=in.(${jobIds.join(',')})` : undefined
          },
          (payload) => {
            const progress = payload.new as JobProgress;
            if (progress) {
              setJobProgress(prev => {
                const newMap = new Map(prev);
                newMap.set(progress.job_id, progress);
                return newMap;
              });
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.set('executions', executionSubscription);
      subscriptionsRef.current.set('progress', progressSubscription);

      if (jobIds) {
        jobIds.forEach(jobId => monitoredJobsRef.current.add(jobId));
      }

    } catch (error) {
      console.error('Failed to start real-time monitoring:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    subscriptionsRef.current.forEach((subscription) => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current.clear();
    monitoredJobsRef.current.clear();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const subscribeToJob = useCallback((jobId: string) => {
    if (monitoredJobsRef.current.has(jobId)) return;
    
    monitoredJobsRef.current.add(jobId);
    
    // Create individual subscription for this job
    const jobSubscription = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraper_job_executions',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          const execution = payload.new as JobExecution;
          if (execution) {
            setActiveExecutions(prev => {
              const newMap = new Map(prev);
              newMap.set(execution.job_id, execution);
              return newMap;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraper_job_progress',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          const progress = payload.new as JobProgress;
          if (progress) {
            setJobProgress(prev => {
              const newMap = new Map(prev);
              newMap.set(progress.job_id, progress);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.set(`job-${jobId}`, jobSubscription);
  }, []);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    const subscription = subscriptionsRef.current.get(`job-${jobId}`);
    if (subscription) {
      subscription.unsubscribe();
      subscriptionsRef.current.delete(`job-${jobId}`);
    }
    monitoredJobsRef.current.delete(jobId);
    
    setActiveExecutions(prev => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
    
    setJobProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  }, []);

  const getJobExecution = useCallback((jobId: string) => {
    return activeExecutions.get(jobId);
  }, [activeExecutions]);

  const getJobProgress = useCallback((jobId: string) => {
    return jobProgress.get(jobId);
  }, [jobProgress]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Auto-reconnect logic
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    
    if (connectionStatus === 'error' && monitoredJobsRef.current.size > 0) {
      reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect real-time monitoring...');
        startMonitoring(Array.from(monitoredJobsRef.current));
      }, 5000); // Retry after 5 seconds
    }

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [connectionStatus, startMonitoring]);

  return {
    activeExecutions,
    jobProgress,
    isConnected,
    connectionStatus,
    startMonitoring,
    stopMonitoring,
    getJobExecution,
    getJobProgress,
    subscribeToJob,
    unsubscribeFromJob
  };
}

// Utility hook for monitoring a single job
export function useJobMonitoring(jobId: string) {
  const monitoring = useRealtimeJobMonitoring();
  
  useEffect(() => {
    if (jobId) {
      monitoring.subscribeToJob(jobId);
      return () => monitoring.unsubscribeFromJob(jobId);
    }
  }, [jobId, monitoring]);

  return {
    execution: monitoring.getJobExecution(jobId),
    progress: monitoring.getJobProgress(jobId),
    isConnected: monitoring.isConnected,
    connectionStatus: monitoring.connectionStatus
  };
}