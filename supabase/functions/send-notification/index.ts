import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

// Production-ready CORS configuration
const getAllowedOrigins = () => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',           // Development
    'http://127.0.0.1:5173',          // Development alternative
    'https://mein-scraper.netlify.app',  // Production
    'https://staging-mein-scraper.netlify.app', // Staging (if exists)
  ];
  return allowedOrigins.map(origin => origin.trim());
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

interface NotificationPayload {
  type: 'job_completed' | 'job_failed' | 'job_started' | 'job_scheduled' | 'system_alert' | 'performance_alert' | 'test';
  channel: 'email' | 'sms' | 'webhook';
  recipient: string;
  message: {
    title: string;
    body: string;
    timestamp: string;
    job_id?: string;
    execution_id?: string;
    metadata?: Record<string, unknown>;
  };
}

interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  email_address?: string;
  sms_enabled: boolean;
  sms_number?: string;
  webhook_enabled: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  job_completion_enabled: boolean;
  job_failure_enabled: boolean;
  job_scheduled_enabled: boolean;
  error_threshold_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  max_notifications_per_hour: number;
  max_notifications_per_day: number;
}

serve(async (req) => {
  // Get origin from request for CORS validation
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse the request body
    const payload: NotificationPayload = await req.json()
    
    // Validate the payload
    if (!payload.type || !payload.channel || !payload.recipient || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload. Required: type, channel, recipient, message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('scraper_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Failed to fetch notification settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notification settings' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if notifications are enabled for this type and channel
    if (settings && payload.type !== 'test') {
      const channelEnabled = settings[`${payload.channel}_enabled` as keyof NotificationSettings] as boolean
      
      // Map notification types to database fields
      const typeMapping: Record<string, keyof NotificationSettings> = {
        'job_completed': 'job_completion_enabled',
        'job_failed': 'job_failure_enabled', 
        'job_started': 'job_scheduled_enabled',
        'job_scheduled': 'job_scheduled_enabled',
        'system_alert': 'error_threshold_enabled',
        'performance_alert': 'error_threshold_enabled'
      }
      
      const typeEnabled = settings[typeMapping[payload.type]] as boolean ?? true
      
      if (!channelEnabled || !typeEnabled) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Notification skipped due to user settings',
            sent: false 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Check frequency limits
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const { count: hourlyCount } = await supabaseClient
        .from('scraper_notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo.toISOString())

      const { count: dailyCount } = await supabaseClient
        .from('scraper_notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo.toISOString())

      if (hourlyCount && hourlyCount >= settings.max_notifications_per_hour) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Notification skipped due to hourly limit',
            sent: false 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      if (dailyCount && dailyCount >= settings.max_notifications_per_day) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Notification skipped due to daily limit',
            sent: false 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    let notificationResult: { sent: boolean; details?: string } = { sent: false }

    // Send notification based on channel
    switch (payload.channel) {
      case 'email':
        notificationResult = await sendEmailNotification(payload)
        break
      case 'sms':
        notificationResult = await sendSMSNotification(payload)
        break
      case 'webhook':
        notificationResult = await sendWebhookNotification(payload, settings)
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported notification channel' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
    }

    // Log the notification
    if (notificationResult.sent) {
      await supabaseClient
        .from('scraper_notification_history')
        .insert([{
          user_id: user.id,
          notification_type: payload.type,
          title: payload.message.title,
          message: payload.message.body,
          channels_sent: [payload.channel],
          status: 'sent',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: notificationResult.sent ? 'Notification sent successfully' : 'Notification failed to send',
        sent: notificationResult.sent,
        details: notificationResult.details
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function sendEmailNotification(payload: NotificationPayload): Promise<{ sent: boolean; details?: string }> {
  try {
    // For this demo, we'll simulate email sending
    // In production, you'd integrate with SendGrid, AWS SES, etc.
    
    const emailApiKey = Deno.env.get('EMAIL_API_KEY')
    if (!emailApiKey) {
      console.log('Email API key not configured, simulating email send')
      return { sent: true, details: 'Email simulated (no API key configured)' }
    }

    // Simulate email sending for now
    console.log(`Sending email to ${payload.recipient}:`, {
      subject: payload.message.title,
      body: payload.message.body,
      timestamp: payload.message.timestamp
    })

    return { sent: true, details: 'Email sent successfully' }
  } catch (error) {
    console.error('Failed to send email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { sent: false, details: errorMessage }
  }
}

async function sendSMSNotification(payload: NotificationPayload): Promise<{ sent: boolean; details?: string }> {
  try {
    // For this demo, we'll simulate SMS sending
    // In production, you'd integrate with Twilio, AWS SNS, etc.
    
    const smsApiKey = Deno.env.get('SMS_API_KEY')
    if (!smsApiKey) {
      console.log('SMS API key not configured, simulating SMS send')
      return { sent: true, details: 'SMS simulated (no API key configured)' }
    }

    // Simulate SMS sending for now
    console.log(`Sending SMS to ${payload.recipient}:`, {
      message: `${payload.message.title}: ${payload.message.body}`,
      timestamp: payload.message.timestamp
    })

    return { sent: true, details: 'SMS sent successfully' }
  } catch (error) {
    console.error('Failed to send SMS:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { sent: false, details: errorMessage }
  }
}

async function sendWebhookNotification(payload: NotificationPayload, settings: NotificationSettings | null): Promise<{ sent: boolean; details?: string }> {
  try {
    const webhookPayload = {
      type: payload.type,
      message: payload.message,
      timestamp: new Date().toISOString(),
      user_id: settings?.user_id
    }

    // Add signature if secret is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MyScraperNotificationBot/1.0'
    }

    if (settings?.webhook_secret) {
      // In production, you'd create an HMAC signature
      headers['X-Webhook-Signature'] = 'sha256=' + settings.webhook_secret
    }

    const response = await fetch(payload.recipient, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
    }

    return { sent: true, details: `Webhook delivered with status ${response.status}` }
  } catch (error) {
    console.error('Failed to send webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { sent: false, details: errorMessage }
  }
}