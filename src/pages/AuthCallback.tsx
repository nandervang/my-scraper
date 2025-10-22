import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth callback error:', error);
          // Redirect to home with error
          window.location.href = '/?error=auth_failed';
        } else {
          // Redirect to home on success
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Unexpected auth callback error:', err);
        window.location.href = '/?error=auth_failed';
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}