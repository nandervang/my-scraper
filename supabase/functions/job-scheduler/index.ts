import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Production-ready CORS configuration
const getAllowedOrigins = () => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',           // Development
    'http://127.0.0.1:5173',          // Development alternative
    'https://my-scraper.netlify.app',  // Production (update with actual domain)
    'https://staging-my-scraper.netlify.app', // Staging (if exists)
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
        .from('scraping_jobs')
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
        .from('scraping_jobs')
        .update({
          schedule_config: scheduleConfig,
          next_run: nextRun,
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
        .from('scraping_jobs')
        .select('id, name, schedule_config, next_run, last_run')
        .not('schedule_config->frequency', 'eq', 'manual')
        .lte('next_run', new Date().toISOString())
        .eq('status', 'idle')

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
          // Calculate next run time
          const nextRun = calculateNextRun(job.schedule_config)
          
          // Update the job's next run time
          await supabase
            .from('scraping_jobs')
            .update({
              next_run: nextRun,
              last_run: new Date().toISOString()
            })
            .eq('id', job.id)

          // Here you would trigger the actual job execution
          // For now, we'll just log it
          console.log(`Triggered scheduled job: ${job.name} (${job.id})`)
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

/* To deploy this function:
1. Install Supabase CLI: npm install -g @supabase/cli
2. Login: supabase login
3. Deploy: supabase functions deploy job-scheduler
4. Set up environment variables in Supabase dashboard
5. Create a cron job to call this function periodically for scheduled execution
*/