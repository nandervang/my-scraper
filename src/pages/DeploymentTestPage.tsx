import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Play, AlertTriangle } from 'lucide-react';
import { DeploymentTester } from '@/lib/deploymentTester';

interface TestResult {
  success: boolean;
  message: string;
  details?: unknown;
}

interface TestResults {
  overallSuccess: boolean;
  results: Record<string, TestResult>;
  summary: string;
}

export function DeploymentTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    
    try {
      const results = await DeploymentTester.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test runner error:', error);
      setTestResults({
        overallSuccess: false,
        results: {
          testRunner: {
            success: false,
            message: `Test runner failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        },
        summary: 'Test runner encountered an error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? 'default' : 'destructive'}>
        {success ? 'PASS' : 'FAIL'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🚀 Deployment Testing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive testing suite to verify all systems are working correctly for production deployment.
          </p>
        </div>

        {/* Test Runner */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Play className="h-6 w-6" />
              Test Suite Controller
            </CardTitle>
            <CardDescription>
              Run all deployment tests to verify system readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="apple-button"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
              
              {testResults && (
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.overallSuccess)}
                  <span className="font-medium">
                    {testResults.summary}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card className={`card-enhanced ${testResults.overallSuccess ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {testResults.overallSuccess ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                  Overall Status
                </CardTitle>
                <CardDescription>
                  {testResults.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {getStatusBadge(testResults.overallSuccess)}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {testResults.overallSuccess 
                      ? 'All systems are ready for production deployment!' 
                      : 'Some issues need to be resolved before production deployment.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Individual Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(testResults.results).map(([testName, result]) => (
                <Card key={testName} className="card-enhanced">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="capitalize">
                        {testName.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {getStatusIcon(result.success)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status:</span>
                        {getStatusBadge(result.success)}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Message:</p>
                        <p className="text-sm text-muted-foreground">
                          {result.message}
                        </p>
                      </div>
                      
                      {result.details && Object.keys(result.details as object).length > 0 && (
                        <details className="mt-3">
                          <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                            Technical Details
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : JSON.stringify(result.details, null, 2)}
                          </div>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Testing Information */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Testing Information</CardTitle>
            <CardDescription>
              What these tests verify and how to interpret results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Tests Performed:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Supabase Connection & Authentication</li>
                  <li>• Environment Variables Configuration</li>
                  <li>• Database Schema & Permissions</li>
                  <li>• Edge Functions Deployment</li>
                  <li>• Real-time Subscriptions</li>
                  <li>• Error Handling System</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Next Steps:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• ✅ All tests pass → Ready for production</li>
                  <li>• ❌ Edge Functions fail → Deploy functions</li>
                  <li>• ❌ Database fail → Check RLS policies</li>
                  <li>• ❌ Environment fail → Set missing variables</li>
                  <li>• ❌ Connection fail → Check Supabase status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}