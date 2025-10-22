import { db, type ScrapingJob, type ScrapingResult } from '@/lib/supabase';
import { GeminiService, type GeminiScrapingResult } from '@/lib/gemini';

export class JobExecutor {
  static async executeJob(jobId: string): Promise<void> {
    try {
      // Update job status to running
      await db.jobs.update(jobId, { 
        status: 'running',
        last_run_at: new Date().toISOString()
      });

      // Get the job details
      const { data: job, error: jobError } = await db.jobs.get(jobId);
      if (jobError || !job) {
        throw new Error('Job not found');
      }

      console.log('Executing job:', job.name);

      // Execute the scraping with Gemini AI
      const scrapingResult = await GeminiService.scrapeWithAI({
        url: job.url,
        prompt: job.ai_prompt || GeminiService.getPromptTemplate(job.scraping_type),
        useVision: job.use_vision,
        model: job.gemini_model || 'models/gemini-2.5-flash' // Use best model if job doesn't specify
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
      await db.results.create(result);

      // Update job status
      await db.jobs.update(jobId, { 
        status: scrapingResult.success ? 'completed' : 'failed'
      });

      console.log('Job completed:', job.name);

    } catch (error) {
      console.error('Job execution failed:', error);
      
      // Update job status to failed
      await db.jobs.update(jobId, { status: 'failed' });
      
      // Create error result
      await db.results.create({
        job_id: jobId,
        user_id: '', // Will be set by RLS
        data: {},
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        scraped_at: new Date().toISOString()
      });
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

    return await GeminiService.scrapeWithAI({
      url: job.url,
      prompt: job.ai_prompt || GeminiService.getPromptTemplate(job.scraping_type),
      useVision: job.use_vision || false,
      model: job.gemini_model || 'models/gemini-2.5-flash'
    });
  }
}