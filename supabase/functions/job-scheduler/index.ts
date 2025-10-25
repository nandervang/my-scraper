import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Production-ready CORS configuration
const getAllowedOrigins = () => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',           // Development
    'http://127.0.0.1:5173',          // Development alternative
    'https://mein-scraper.netlify.app', // Production (corrected domain)
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

interface ScheduleConfig {
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  time?: string; // HH:MM format
  days?: number[]; // 0-6 (Sunday-Saturday)
  timezone?: string;
}

interface JobScheduleRequest {
  jobId: string;
  scheduleConfig: ScheduleConfig;
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'POST') {
      const { jobId, scheduleConfig }: JobScheduleRequest = await req.json()

      // Validate the job belongs to the user
      const { data: job, error: jobError } = await supabase
        .from('scraper_jobs')
        .select('id, user_id')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single()

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Calculate next run time based on schedule config
      const nextRun = calculateNextRun(scheduleConfig)

      // Update the job with the new schedule
      const { error: updateError } = await supabase
        .from('scraper_jobs')
        .update({
          schedule_cron: convertScheduleConfigToCron(scheduleConfig),
          next_run_at: nextRun,
          schedule_enabled: scheduleConfig.frequency !== 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (updateError) {
        console.error('Failed to update job schedule:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update schedule' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          nextRun,
          message: 'Schedule updated successfully' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'GET') {
      // Get all scheduled jobs for processing
      const { data: scheduledJobs, error: jobsError } = await supabase
        .from('scraper_jobs')
        .select('id, name, schedule_cron, next_run_at, last_run_at, schedule_enabled')
        .eq('schedule_enabled', true)
        .lte('next_run_at', new Date().toISOString())
        .eq('status', 'pending')

      if (jobsError) {
        console.error('Failed to fetch scheduled jobs:', jobsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch scheduled jobs' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Process each job (this would typically trigger job execution)
      const processed = []
      for (const job of scheduledJobs || []) {
        try {
          // For now, we'll just update the last run time and return success
          // In a real implementation, you would trigger the actual job execution here
          
          await supabase
            .from('scraper_jobs')
            .update({
              last_run_at: new Date().toISOString()
            })
            .eq('id', job.id)

          console.log(`Processed scheduled job: ${job.name} (${job.id})`)
          processed.push(job.id)

        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error)
        }
      }

      return new Response(
        JSON.stringify({ 
          processed: processed.length,
          jobIds: processed 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Job scheduler error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function calculateNextRun(scheduleConfig: ScheduleConfig): string | null {
  if (scheduleConfig.frequency === 'manual') {
    return null
  }

  const now = new Date()
  const timezone = scheduleConfig.timezone || 'UTC'
  
  // Create a date in the specified timezone
  const nowInTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
  
  switch (scheduleConfig.frequency) {
    case 'hourly': {
      return new Date(nowInTimezone.getTime() + 60 * 60 * 1000).toISOString()
    }
    
    case 'daily': {
      const tomorrow = new Date(nowInTimezone)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (scheduleConfig.time) {
        const [hours, minutes] = scheduleConfig.time.split(':').map(Number)
        tomorrow.setHours(hours, minutes, 0, 0)
      }
      return tomorrow.toISOString()
    }
    
    case 'weekly': {
      const nextWeek = new Date(nowInTimezone)
      nextWeek.setDate(nextWeek.getDate() + 7)
      if (scheduleConfig.time) {
        const [hours, minutes] = scheduleConfig.time.split(':').map(Number)
        nextWeek.setHours(hours, minutes, 0, 0)
      }
      return nextWeek.toISOString()
    }
    
    case 'monthly': {
      const nextMonth = new Date(nowInTimezone)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1) // First day of next month
      if (scheduleConfig.time) {
        const [hours, minutes] = scheduleConfig.time.split(':').map(Number)
        nextMonth.setHours(hours, minutes, 0, 0)
      }
      return nextMonth.toISOString()
    }
    
    case 'custom': {
      const customInterval = (scheduleConfig.interval || 1) * 60 * 60 * 1000 // Convert hours to milliseconds
      return new Date(nowInTimezone.getTime() + customInterval).toISOString()
    }
    
    default:
      return null
  }
}

function convertScheduleConfigToCron(scheduleConfig: ScheduleConfig): string | null {
  if (scheduleConfig.frequency === 'manual') {
    return null
  }

  switch (scheduleConfig.frequency) {
    case 'hourly': {
      return '0 * * * *' // Every hour at minute 0
    }
    case 'daily': {
      const time = scheduleConfig.time || '09:00'
      const [hours, minutes] = time.split(':').map(Number)
      return `${minutes} ${hours} * * *` // Daily at specified time
    }
    case 'weekly': {
      const weeklyTime = scheduleConfig.time || '09:00'
      const [weeklyHours, weeklyMinutes] = weeklyTime.split(':').map(Number)
      const day = scheduleConfig.days?.[0] || 1 // Default to Monday
      return `${weeklyMinutes} ${weeklyHours} * * ${day}` // Weekly on specified day
    }
    case 'monthly': {
      const monthlyTime = scheduleConfig.time || '09:00'
      const [monthlyHours, monthlyMinutes] = monthlyTime.split(':').map(Number)
      return `${monthlyMinutes} ${monthlyHours} 1 * *` // Monthly on 1st day
    }
    case 'custom': {
      // For custom intervals, we'll use a simple hourly pattern
      const interval = scheduleConfig.interval || 1
      return `0 */${interval} * * *` // Every N hours
    }
    default:
      return null
  }
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g @supabase/cli
2. Login: supabase login
3. Deploy: supabase functions deploy job-scheduler
4. Set up environment variables in Supabase dashboard
5. Create a cron job to call this function periodically for scheduled execution
*/