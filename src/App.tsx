import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AuthComponent } from './components/auth/AuthComponent';
import { AuthCallback } from './pages/AuthCallback';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { JobsPage } from './pages/dashboard/JobsPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { Navigation } from './components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-gray-900">Welcome to My Scraper</CardTitle>
                  <CardDescription>
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
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<AuthenticatedApp session={session} onSignOut={handleSignOut} />} />
      </Routes>
    </Router>
  );
}

interface AuthenticatedAppProps {
  session: Session;
  onSignOut: () => Promise<void>;
}

function AuthenticatedApp({ session, onSignOut }: AuthenticatedAppProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">My Scraper</h1>
          <p className="text-sm text-gray-600 mt-1">AI-powered web scraping</p>
        </div>
        
        <div className="flex-1 p-4">
          <Navigation />
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">
                {session.user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSignOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/notifications" element={<div>Notifications page coming soon</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
