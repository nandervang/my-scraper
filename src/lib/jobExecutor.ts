import { db, type ScrapingJob, type ScrapingResult } from '@/lib/supabase';
import { GeminiService, type GeminiScrapingResult } from '@/lib/gemini';

export const JobExecutionError = {
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  INVALID_URL: 'INVALID_URL',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type JobExecutionErrorType = typeof JobExecutionError[keyof typeof JobExecutionError];

export class JobExecutionException extends Error {
  public type: JobExecutionErrorType;
  public recoverable: boolean;
  
  constructor(
    type: JobExecutionErrorType,
    message: string,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'JobExecutionException';
    this.type = type;
    this.recoverable = recoverable;
  }
}

export class JobExecutor {
  static async executeJob(jobId: string): Promise<void> {
    let job: ScrapingJob | null = null;
    
    try {
      // Update job status to running
      const updateResult = await db.jobs.update(jobId, { 
        status: 'running',
        last_run_at: new Date().toISOString()
      });

      if (updateResult.error) {
        throw new JobExecutionException(
          JobExecutionError.DATABASE_ERROR,
          `Failed to update job status: ${updateResult.error.message}`,
          true
        );
      }

      // Get the job details
      const { data: jobData, error: jobError } = await db.jobs.get(jobId);
      if (jobError) {
        throw new JobExecutionException(
          JobExecutionError.DATABASE_ERROR,
          `Failed to fetch job: ${jobError.message}`,
          true
        );
      }
      
      if (!jobData) {
        throw new JobExecutionException(
          JobExecutionError.JOB_NOT_FOUND,
          'Job not found',
          false
        );
      }

      job = jobData;
      
      // TypeScript assertion: job is guaranteed to be non-null after this point
      if (!job) {
        throw new Error('Job is null after assignment');
      }
      
      console.log('Executing job:', job.name);

      // Validate URL
      try {
        new URL(job.url);
      } catch {
        throw new JobExecutionException(
          JobExecutionError.INVALID_URL,
          `Invalid URL: ${job.url}`,
          false
        );
      }

      // Execute the scraping with Gemini AI
      const scrapingResult = await GeminiService.scrapeWithAI({
        url: job.url,
        prompt: job.ai_prompt || GeminiService.getPromptTemplate(job.scraping_type),
        useVision: job.use_vision,
        model: job.gemini_model || 'models/gemini-2.5-flash'
      });

      // Create result record
      const result: Partial<ScrapingResult> = {
        job_id: job.id,
        user_id: job.user_id,
        data: scrapingResult.data || {},
        status: scrapingResult.success ? 'success' : 'failed',
        error_message: scrapingResult.error,
        execution_time_ms: scrapingResult.executionTime,
        tokens_used: scrapingResult.tokensUsed,
        scraped_at: new Date().toISOString()
      };

      // Save the result
      const resultSave = await db.results.create(result);
      if (resultSave.error) {
        console.error('Failed to save result, but job completed:', resultSave.error);
        // Don't fail the job if result saving fails
      }

      // Update job status
      const finalUpdate = await db.jobs.update(jobId, { 
        status: scrapingResult.success ? 'completed' : 'failed'
      });

      if (finalUpdate.error) {
        console.error('Failed to update final job status:', finalUpdate.error);
      }

      console.log('Job completed:', job.name, 'Success:', scrapingResult.success);

    } catch (error) {
      console.error('Job execution failed:', error);
      
      const errorMessage = error instanceof JobExecutionException 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      // Update job status to failed (if we have a job ID)
      try {
        await db.jobs.update(jobId, { status: 'failed' });
      } catch (updateError) {
        console.error('Failed to update job status to failed:', updateError);
      }
      
      // Create error result (if we have job info)
      try {
        await db.results.create({
          job_id: jobId,
          user_id: job?.user_id || '', // Will be set by RLS if empty
          data: {},
          status: 'failed',
          error_message: errorMessage,
          scraped_at: new Date().toISOString()
        });
      } catch (resultError) {
        console.error('Failed to create error result:', resultError);
      }

      // Re-throw for higher-level handling
      throw error;
    }
  }

  static async runJob(job: ScrapingJob): Promise<void> {
    return this.executeJob(job.id);
  }

  // Test run without saving to database
  static async testJob(job: Partial<ScrapingJob>): Promise<GeminiScrapingResult> {
    if (!job.url || !job.scraping_type) {
      return {
        success: false,
        error: 'URL and scraping type are required'
      };
    }

    // Validate URL for test job
    try {
      new URL(job.url);
    } catch {
      return {
        success: false,
        error: `Invalid URL: ${job.url}`
      };
    }

    try {
      return await GeminiService.scrapeWithAI({
        url: job.url,
        prompt: job.ai_prompt || GeminiService.getPromptTemplate(job.scraping_type),
        useVision: job.use_vision || false,
        model: job.gemini_model || 'models/gemini-2.5-flash'
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test execution failed'
      };
    }
  }
}