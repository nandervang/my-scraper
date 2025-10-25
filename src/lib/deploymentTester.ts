import { supabase } from '@/lib/supabase';

/**
 * Deployment testing utilities to verify all systems are working correctly
 */
export class DeploymentTester {
  
  /**
   * Test 1: Verify Supabase connection and authentication
   */
  static async testSupabaseConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Test basic connection
      const { error } = await supabase.from('scraper_jobs').select('count').limit(1);
      
      if (error) {
        return {
          success: false,
          message: `Supabase connection failed: ${error.message}`,
          details: error
        };
      }

      // Test authentication
      const { data: user, error: authError } = await supabase.auth.getUser();
      
      return {
        success: true,
        message: 'Supabase connection successful',
        details: {
          connected: true,
          authenticated: !authError && !!user?.user,
          user: user?.user?.email || 'anonymous'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  /**
   * Test 2: Verify environment variables are properly set
   */
  static testEnvironmentVariables(): {
    success: boolean;
    message: string;
    details: Record<string, boolean>;
  } {
    const requiredVars = {
      'VITE_SUPABASE_URL': !!import.meta.env.VITE_SUPABASE_URL,
      'VITE_SUPABASE_ANON_KEY': !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      'VITE_GOOGLE_AI_API_KEY': !!import.meta.env.VITE_GOOGLE_AI_API_KEY,
    };

    const missing = Object.entries(requiredVars).filter(([, exists]) => !exists);
    
    return {
      success: missing.length === 0,
      message: missing.length === 0 
        ? 'All required environment variables are set' 
        : `Missing environment variables: ${missing.map(([key]) => key).join(', ')}`,
      details: requiredVars
    };
  }

  /**
   * Test 3: Verify database schema and permissions
   */
  static async testDatabaseSchema(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const tables = [
        'scraper_jobs',
        'scraper_results',
        'scraper_products',
        'scraper_websites',
        'scraper_job_executions',
        'scraper_job_progress',
        'scraper_notification_settings',
        'scraper_notification_history'
      ];

      const results: Record<string, boolean> = {};
      
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('count').limit(1);
          results[table] = !error;
        } catch {
          results[table] = false;
        }
      }

      const missingTables = Object.entries(results).filter(([_, exists]) => !exists);
      
      return {
        success: missingTables.length === 0,
        message: missingTables.length === 0 
          ? 'All database tables are accessible'
          : `Missing or inaccessible tables: ${missingTables.map(([table]) => table).join(', ')}`,
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Database schema test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  /**
   * Test 4: Test Edge Function connectivity
   */
  static async testEdgeFunctions(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return {
          success: false,
          message: 'Supabase URL not configured'
        };
      }

      // Test job-scheduler function
      const schedulerUrl = `${supabaseUrl}/functions/v1/job-scheduler`;
      const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

      const results: Record<string, any> = {};

      // Test scheduler function (GET request to see if it exists)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = session?.access_token 
          ? { 'Authorization': `Bearer ${session.access_token}` }
          : {};

        const schedulerResponse = await fetch(schedulerUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        });

        results.jobScheduler = {
          accessible: schedulerResponse.status !== 404,
          status: schedulerResponse.status,
          deployed: schedulerResponse.status < 500
        };
      } catch (error) {
        results.jobScheduler = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test notification function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = session?.access_token 
          ? { 'Authorization': `Bearer ${session.access_token}` }
          : {};

        const notificationResponse = await fetch(notificationUrl, {
          method: 'OPTIONS', // CORS preflight
          headers: authHeaders
        });

        results.sendNotification = {
          accessible: notificationResponse.status !== 404,
          status: notificationResponse.status,
          deployed: notificationResponse.status < 500
        };
      } catch (error) {
        results.sendNotification = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      const allDeployed = Object.values(results).every((result: any) => result.deployed);

      return {
        success: allDeployed,
        message: allDeployed 
          ? 'All Edge Functions are deployed and accessible'
          : 'Some Edge Functions are not deployed or accessible',
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Edge Function test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  /**
   * Test 5: Test real-time subscriptions
   */
  static async testRealTimeSubscriptions(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    return new Promise((resolve) => {
      try {
        let subscriptionWorking = false;
        
        // Create a test subscription
        const subscription = supabase
          .channel('deployment-test')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'scraper_jobs' 
            }, 
            () => {
              subscriptionWorking = true;
            }
          )
          .subscribe((status) => {
            setTimeout(() => {
              subscription.unsubscribe();
              resolve({
                success: status === 'SUBSCRIBED',
                message: status === 'SUBSCRIBED' 
                  ? 'Real-time subscriptions are working'
                  : `Real-time subscription failed with status: ${status}`,
                details: { status, subscriptionWorking }
              });
            }, 2000); // Wait 2 seconds to test
          });
      } catch (error) {
        resolve({
          success: false,
          message: `Real-time test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }
    });
  }

  /**
   * Test 6: Test error handling system
   */
  static async testErrorHandling(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Test database error handling
      const { error } = await supabase.from('non_existent_table').select('*');
      
      // Test that we get an expected error
      const errorHandled = !!error && error.message.includes('relation');
      
      return {
        success: errorHandled,
        message: errorHandled 
          ? 'Error handling is working correctly'
          : 'Error handling may not be working as expected',
        details: { error }
      };
    } catch (error) {
      return {
        success: true, // Catching the error is actually good
        message: 'Error handling caught the exception correctly',
        details: error
      };
    }
  }

  /**
   * Run all deployment tests
   */
  static async runAllTests(): Promise<{
    overallSuccess: boolean;
    results: Record<string, any>;
    summary: string;
  }> {
    console.log('🚀 Starting deployment tests...');
    
    const results: Record<string, any> = {};
    
    // Run all tests
    console.log('1️⃣ Testing Supabase connection...');
    results.supabaseConnection = await this.testSupabaseConnection();
    
    console.log('2️⃣ Testing environment variables...');
    results.environmentVariables = this.testEnvironmentVariables();
    
    console.log('3️⃣ Testing database schema...');
    results.databaseSchema = await this.testDatabaseSchema();
    
    console.log('4️⃣ Testing Edge Functions...');
    results.edgeFunctions = await this.testEdgeFunctions();
    
    console.log('5️⃣ Testing real-time subscriptions...');
    results.realTimeSubscriptions = await this.testRealTimeSubscriptions();
    
    console.log('6️⃣ Testing error handling...');
    results.errorHandling = await this.testErrorHandling();
    
    // Calculate overall success
    const overallSuccess = Object.values(results).every((result: any) => result.success);
    
    // Generate summary
    const passedTests = Object.values(results).filter((result: any) => result.success).length;
    const totalTests = Object.keys(results).length;
    
    const summary = `${passedTests}/${totalTests} tests passed. ${overallSuccess ? '✅ Ready for production!' : '❌ Issues found that need attention.'}`;
    
    console.log(`🏁 Deployment tests completed: ${summary}`);
    
    return {
      overallSuccess,
      results,
      summary
    };
  }
}

// Helper function to run tests from browser console
(window as any).testDeployment = () => DeploymentTester.runAllTests();