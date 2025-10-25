import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Processing authentication...');
        
        // Check if we have hash fragments in the URL (OAuth callback data)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          setStatus('Setting up your session...');
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('Error setting session:', error);
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?error=auth_failed';
            }, 2000);
            return;
          }
          
          if (data.session) {
            console.log('Authentication successful:', data.session.user.email);
            setStatus('Authentication successful! Redirecting to dashboard...');
            
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          } else {
            setStatus('Failed to create session. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?error=auth_failed';
            }, 2000);
          }
        } else {
          // Fallback: try to get existing session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?error=auth_failed';
            }, 2000);
            return;
          }

          if (data.session) {
            console.log('Existing session found:', data.session.user.email);
            setStatus('Authentication successful! Redirecting to dashboard...');
            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          } else {
            setStatus('No authentication data found. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?error=no_auth_data';
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Unexpected auth callback error:', err);
        setStatus('An unexpected error occurred. Redirecting...');
        setTimeout(() => {
          window.location.href = '/?error=auth_failed';
        }, 2000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">{status}</p>
        <div className="text-xs text-muted-foreground/70">
          Please wait while we complete your sign in...
        </div>
      </div>
    </div>
  );
}