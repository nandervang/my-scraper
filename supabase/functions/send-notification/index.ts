import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    metadata?: Record<string, any>;
  };
}

serve(async (req) => {
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
      .from('notification_settings')
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
      const channelEnabled = settings[`${payload.channel}_enabled`]
      const typeEnabled = settings.notification_types?.[payload.type]
      
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

      // Check quiet hours
      if (settings.quiet_hours?.enabled) {
        const now = new Date()
        const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
        const startTime = settings.quiet_hours.start_time
        const endTime = settings.quiet_hours.end_time
        
        // Check if current time is within quiet hours
        const isQuietTime = (startTime <= endTime) 
          ? (currentTime >= startTime && currentTime <= endTime)
          : (currentTime >= startTime || currentTime <= endTime)
        
        if (isQuietTime) {
          // Log the notification for later delivery
          await supabaseClient
            .from('notification_queue')
            .insert([{
              user_id: user.id,
              type: payload.type,
              channel: payload.channel,
              recipient: payload.recipient,
              message: payload.message,
              scheduled_for: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
              created_at: now.toISOString()
            }])

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Notification queued for after quiet hours',
              sent: false,
              queued: true
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      }

      // Check frequency limits
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const { count: hourlyCount } = await supabaseClient
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('sent_at', oneHourAgo.toISOString())

      const { count: dailyCount } = await supabaseClient
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('sent_at', oneDayAgo.toISOString())

      if (hourlyCount && hourlyCount >= (settings.frequency_limits?.max_per_hour || 10)) {
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

      if (dailyCount && dailyCount >= (settings.frequency_limits?.max_per_day || 50)) {
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

    let notificationResult: any = { sent: false }

    // Send notification based on channel
    switch (payload.channel) {
      case 'email':
        notificationResult = await sendEmailNotification(payload, settings)
        break
      case 'sms':
        notificationResult = await sendSMSNotification(payload, settings)
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
        .from('notification_history')
        .insert([{
          user_id: user.id,
          type: payload.type,
          channel: payload.channel,
          recipient: payload.recipient,
          message: payload.message,
          sent_at: new Date().toISOString(),
          success: true
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
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function sendEmailNotification(payload: NotificationPayload, settings: any) {
  try {
    // For this demo, we'll use a simple email service
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
    return { sent: false, details: error.message }
  }
}

async function sendSMSNotification(payload: NotificationPayload, settings: any) {
  try {
    // For this demo, we'll use a simple SMS service
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
    return { sent: false, details: error.message }
  }
}

async function sendWebhookNotification(payload: NotificationPayload, settings: any) {
  try {
    const webhookPayload = {
      type: payload.type,
      message: payload.message,
      timestamp: new Date().toISOString(),
      user_id: settings?.user_id
    }

    // Add signature if secret is provided
    let headers: Record<string, string> = {
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
    return { sent: false, details: error.message }
  }
}