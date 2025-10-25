import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AuthComponent } from './components/auth/AuthComponent';
import { AuthCallback } from './pages/AuthCallback';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { JobsPage } from './pages/dashboard/JobsPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { MonitoringPage } from './pages/monitoring/MonitoringPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import WebsitesPage from './pages/WebsitesPage';
import { DeploymentTestPage } from './pages/DeploymentTestPage';
import { Navigation } from './components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { ThemeProvider } from './hooks/use-theme';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorStatus, GlobalErrorOverlay } from './components/ErrorStatus';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="my-scraper-theme">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!session) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="my-scraper-theme">
        <Router>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
                <div className="absolute top-4 right-4">
                  <ThemeToggle />
                </div>
                <Card className="w-full max-w-md card-enhanced">
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Welcome to My Scraper</CardTitle>
                    <CardDescription className="text-lg">
                      Your intelligent web scraping companion powered by AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AuthComponent />
                  </CardContent>
                </Card>
              </div>
            } />
          </Routes>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="my-scraper-theme">
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={<AuthenticatedApp session={session} onSignOut={handleSignOut} />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

interface AuthenticatedAppProps {
  session: Session;
  onSignOut: () => Promise<void>;
}

function AuthenticatedApp({ session, onSignOut }: AuthenticatedAppProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-card to-muted/50 shadow-sm border-r border-primary/20 flex flex-col">
        <div className="p-6 border-b border-primary/20">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-electric bg-clip-text text-transparent">My Scraper</h1>
          <p className="text-lg text-muted-foreground mt-1">AI-powered web scraping</p>
        </div>
        
        <div className="flex-1 p-4">
          <Navigation />
        </div>

        <div className="p-4 border-t border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-electric rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                {session.user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="lg"
              onClick={onSignOut}
              className="flex-1 btn-enhanced"
            >
              Sign Out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/websites" element={<WebsitesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/deployment-test" element={<DeploymentTestPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Error Status */}
      <ErrorStatus />
      <GlobalErrorOverlay />
    </div>
  );
}

export default App;
