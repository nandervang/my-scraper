import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NotificationRequest {
  type: 'job_completed' | 'job_failed' | 'job_started' | 'job_scheduled' | 'system_alert' | 'performance_alert';
  title: string;
  body: string;
  jobId?: string;
  executionId?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationStatus {
  success: boolean;
  message: string;
  sent: boolean;
  queued?: boolean;
  details?: string;
}

export function useNotificationService() {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<NotificationStatus | null>(null);

  const sendNotification = useCallback(async (
    notification: NotificationRequest,
    channels: Array<'email' | 'sms' | 'webhook'> = ['email']
  ): Promise<NotificationStatus[]> => {
    setSending(true);
    const results: NotificationStatus[] = [];

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's notification settings to determine recipients
      const { data: settings, error: settingsError } = await supabase
        .from('scraper_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw new Error('Failed to fetch notification settings');
      }

      // Send notification to each channel
      for (const channel of channels) {
        let recipient = '';
        
        // Determine recipient based on channel
        switch (channel) {
          case 'email':
            recipient = settings?.email_address || user.email || '';
            break;
          case 'sms':
            recipient = settings?.phone_number || '';
            break;
          case 'webhook':
            recipient = settings?.webhook_url || '';
            break;
        }

        if (!recipient) {
          results.push({
            success: false,
            message: `No ${channel} recipient configured`,
            sent: false
          });
          continue;
        }

        // Call the notification Edge Function
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: {
            type: notification.type,
            channel,
            recipient,
            message: {
              title: notification.title,
              body: notification.body,
              timestamp: new Date().toISOString(),
              job_id: notification.jobId,
              execution_id: notification.executionId,
              metadata: notification.metadata,
            },
          },
        });

        if (error) {
          results.push({
            success: false,
            message: `Failed to send ${channel} notification: ${error.message}`,
            sent: false,
            details: error.message
          });
        } else {
          results.push({
            success: data.success,
            message: data.message,
            sent: data.sent,
            queued: data.queued,
            details: data.details
          });
        }
      }

      // Set the last result to the first result for backwards compatibility
      if (results.length > 0) {
        setLastResult(results[0]);
      }

    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        sent: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      results.push(errorResult);
      setLastResult(errorResult);
    } finally {
      setSending(false);
    }

    return results;
  }, []);

  const sendJobCompletedNotification = useCallback(async (
    jobName: string,
    itemsScraped: number,
    duration: number,
    jobId?: string,
    executionId?: string
  ) => {
    return sendNotification({
      type: 'job_completed',
      title: 'Job Completed Successfully',
      body: `${jobName} has completed successfully. Scraped ${itemsScraped} items in ${Math.round(duration / 1000)}s.`,
      jobId,
      executionId,
      metadata: { itemsScraped, duration }
    });
  }, [sendNotification]);

  const sendJobFailedNotification = useCallback(async (
    jobName: string,
    errorMessage: string,
    jobId?: string,
    executionId?: string
  ) => {
    return sendNotification({
      type: 'job_failed',
      title: 'Job Failed',
      body: `${jobName} has failed with error: ${errorMessage}`,
      jobId,
      executionId,
      metadata: { errorMessage }
    });
  }, [sendNotification]);

  const sendJobStartedNotification = useCallback(async (
    jobName: string,
    jobId?: string,
    executionId?: string
  ) => {
    return sendNotification({
      type: 'job_started',
      title: 'Job Started',
      body: `${jobName} has started execution.`,
      jobId,
      executionId
    });
  }, [sendNotification]);

  const sendJobScheduledNotification = useCallback(async (
    jobName: string,
    scheduledTime: string,
    jobId?: string
  ) => {
    return sendNotification({
      type: 'job_scheduled',
      title: 'Job Scheduled',
      body: `${jobName} has been scheduled to run at ${new Date(scheduledTime).toLocaleString()}.`,
      jobId,
      metadata: { scheduledTime }
    });
  }, [sendNotification]);

  const sendSystemAlertNotification = useCallback(async (
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    return sendNotification({
      type: 'system_alert',
      title,
      body: message,
      metadata
    });
  }, [sendNotification]);

  const sendPerformanceAlertNotification = useCallback(async (
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    return sendNotification({
      type: 'performance_alert',
      title,
      body: message,
      metadata
    });
  }, [sendNotification]);

  const testNotificationChannels = useCallback(async (
    channels: Array<'email' | 'sms' | 'webhook'> = ['email', 'sms', 'webhook']
  ) => {
    const results: Record<string, NotificationStatus> = {};
    
    for (const channel of channels) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data: settings } = await supabase
          .from('scraper_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        let recipient = '';
        switch (channel) {
          case 'email':
            recipient = settings?.email_address || user.email || '';
            break;
          case 'sms':
            recipient = settings?.phone_number || '';
            break;
          case 'webhook':
            recipient = settings?.webhook_url || '';
            break;
        }

        if (!recipient) {
          results[channel] = {
            success: false,
            message: `No ${channel} recipient configured`,
            sent: false
          };
          continue;
        }

        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: {
            type: 'test',
            channel,
            recipient,
            message: {
              title: 'Test Notification',
              body: 'This is a test notification from My Scraper.',
              timestamp: new Date().toISOString(),
            },
          },
        });

        if (error) {
          results[channel] = {
            success: false,
            message: `Failed to send test ${channel} notification: ${error.message}`,
            sent: false,
            details: error.message
          };
        } else {
          results[channel] = {
            success: data.success,
            message: data.message,
            sent: data.sent,
            details: data.details
          };
        }
      } catch (error) {
        results[channel] = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          sent: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }, []);

  return {
    sending,
    lastResult,
    sendNotification,
    sendJobCompletedNotification,
    sendJobFailedNotification,
    sendJobStartedNotification,
    sendJobScheduledNotification,
    sendSystemAlertNotification,
    sendPerformanceAlertNotification,
    testNotificationChannels
  };
}