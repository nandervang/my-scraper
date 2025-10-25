import { NotificationSettingsManager } from '@/components/NotificationSettingsManager';

export function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-8">
        <NotificationSettingsManager />
      </div>
    </div>
  );
}