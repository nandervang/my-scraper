import { AnalyticsDashboard } from '../components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your scraping performance, analyze trends, and optimize your jobs.
          </p>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </div>
  );
}