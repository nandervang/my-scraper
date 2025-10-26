import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  CheckCircle,
  XCircle,
  Clock,
  Webhook,
  Save,
  PlayCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface NotificationSettings {
  id?: string;
  user_id: string;
  
  // Channel Configuration
  email_enabled: boolean;
  email_address?: string;
  sms_enabled: boolean;
  sms_number?: string;
  webhook_enabled: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  
  // Notification Types
  job_completion_enabled: boolean;
  job_failure_enabled: boolean;
  job_scheduled_enabled: boolean;
  price_alert_enabled: boolean;
  stock_alert_enabled: boolean;
  error_threshold_enabled: boolean;
  
  // Frequency & Timing
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // TIME format
  quiet_hours_end?: string;   // TIME format
  timezone: string;
  
  // Rate Limiting
  max_notifications_per_hour: number;
  max_notifications_per_day: number;
  batch_notifications: boolean;
  batch_delay_minutes: number;
  
  // Filters
  min_execution_time_seconds: number;
  only_important_failures: boolean;
  failure_threshold_count: number;
  
  created_at?: string;
  updated_at?: string;
}

const NotificationSettingsManager = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    user_id: '',
    email_enabled: true,
    email_address: '',
    sms_enabled: false,
    sms_number: '',
    webhook_enabled: false,
    webhook_url: '',
    webhook_secret: '',
    job_completion_enabled: true,
    job_failure_enabled: true,
    job_scheduled_enabled: false,
    price_alert_enabled: true,
    stock_alert_enabled: true,
    error_threshold_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'UTC',
    max_notifications_per_hour: 10,
    max_notifications_per_day: 50,
    batch_notifications: false,
    batch_delay_minutes: 15,
    min_execution_time_seconds: 30,
    only_important_failures: false,
    failure_threshold_count: 3,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('scraper_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load notification settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings for new user
        setSettings(prev => ({ ...prev, user_id: user.id }));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('scraper_notification_settings')
        .upsert([{
          ...settings,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      console.log('Notification settings saved successfully');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (channelType: string) => {
    setTesting(channelType);
    setTestResults(prev => ({ ...prev, [channelType]: false }));

    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'test',
          channel: channelType,
          recipient: channelType === 'email' ? settings.email_address : 
                    channelType === 'sms' ? settings.sms_number :
                    settings.webhook_url,
          message: {
            title: 'Test Notification',
            body: 'This is a test notification from My Scraper.',
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      setTestResults(prev => ({ ...prev, [channelType]: true }));
      console.log(`${channelType} notification test successful`);
    } catch (error) {
      console.error(`Failed to test ${channelType} notification:`, error);
      setTestResults(prev => ({ ...prev, [channelType]: false }));
    } finally {
      setTesting(null);
    }
  };

  const updateChannelEnabled = (channel: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [`${channel}_enabled`]: enabled
    }));
  };

  const updateNotificationType = (type: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [type]: enabled
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const channels = [
    {
      type: 'email',
      icon: Mail,
      title: 'Email Notifications',
      description: 'Get notified via email',
      enabled: settings.email_enabled,
      verified: !!settings.email_address,
      testable: true
    },
    {
      type: 'sms',
      icon: MessageSquare,
      title: 'SMS Notifications',
      description: 'Get notified via text message',
      enabled: settings.sms_enabled,
      verified: !!settings.sms_number,
      testable: true
    },
    {
      type: 'webhook',
      icon: Webhook,
      title: 'Webhook Notifications',
      description: 'Send notifications to your webhook endpoint',
      enabled: settings.webhook_enabled,
      verified: !!settings.webhook_url,
      testable: true
    }
  ];

  const notificationTypes = [
    { key: 'job_completion_enabled', label: 'Job Completed', description: 'When scraping jobs finish successfully' },
    { key: 'job_failure_enabled', label: 'Job Failed', description: 'When scraping jobs encounter errors' },
    { key: 'job_scheduled_enabled', label: 'Job Scheduled', description: 'When new jobs are scheduled' },
    { key: 'price_alert_enabled', label: 'Price Alerts', description: 'When product prices change significantly' },
    { key: 'stock_alert_enabled', label: 'Stock Alerts', description: 'When product availability changes' },
    { key: 'error_threshold_enabled', label: 'Error Threshold', description: 'When error rates exceed limits' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Notification Settings</h1>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div key={channel.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <div>
                      <h3 className="font-medium">{channel.title}</h3>
                      <p className="text-sm text-gray-600">{channel.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channel.verified && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={(checked: boolean) => updateChannelEnabled(channel.type, checked)}
                    />
                  </div>
                </div>

                {channel.enabled && (
                  <div className="space-y-4">
                    {channel.type === 'email' && (
                      <div>
                        <Label htmlFor="email_address">Email Address</Label>
                        <Input
                          id="email_address"
                          type="email"
                          value={settings.email_address || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_address: e.target.value }))}
                          placeholder="your-email@example.com"
                        />
                      </div>
                    )}

                    {channel.type === 'sms' && (
                      <div>
                        <Label htmlFor="sms_number">Phone Number</Label>
                        <Input
                          id="sms_number"
                          type="tel"
                          value={settings.sms_number || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, sms_number: e.target.value }))}
                          placeholder="+1234567890"
                        />
                      </div>
                    )}

                    {channel.type === 'webhook' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="webhook_url">Webhook URL</Label>
                          <Input
                            id="webhook_url"
                            type="url"
                            value={settings.webhook_url || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                            placeholder="https://your-webhook-endpoint.com/notifications"
                          />
                        </div>
                        <div>
                          <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
                          <Input
                            id="webhook_secret"
                            type="password"
                            value={settings.webhook_secret || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
                            placeholder="Your webhook verification secret"
                          />
                        </div>
                      </div>
                    )}

                    {channel.testable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testNotification(channel.type)}
                        disabled={testing === channel.type || !channel.verified}
                        className="flex items-center gap-2"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {testing === channel.type ? 'Testing...' : 'Test Notification'}
                        {testResults[channel.type] === true && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {testResults[channel.type] === false && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{type.label}</h4>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
              <Switch
                checked={settings[type.key as keyof NotificationSettings] as boolean}
                onCheckedChange={(checked: boolean) => updateNotificationType(type.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Timing & Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Timing & Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiet Hours */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium">Quiet Hours</h4>
                  <p className="text-sm text-gray-600">Suppress notifications during specific hours</p>
                </div>
              </div>
              <Switch
                checked={settings.quiet_hours_enabled}
                onCheckedChange={(checked: boolean) =>
                  setSettings(prev => ({ ...prev, quiet_hours_enabled: checked }))
                }
              />
            </div>

            {settings.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quiet_start">Start Time</Label>
                  <Input
                    id="quiet_start"
                    type="time"
                    value={settings.quiet_hours_start}
                    onChange={(e) => setSettings(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="quiet_end">End Time</Label>
                  <Input
                    id="quiet_end"
                    type="time"
                    value={settings.quiet_hours_end}
                    onChange={(e) => setSettings(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_per_hour">Max per Hour</Label>
              <Input
                id="max_per_hour"
                type="number"
                min="1"
                max="100"
                value={settings.max_notifications_per_hour}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, max_notifications_per_hour: parseInt(e.target.value) || 10 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="max_per_day">Max per Day</Label>
              <Input
                id="max_per_day"
                type="number"
                min="1"
                max="1000"
                value={settings.max_notifications_per_day}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, max_notifications_per_day: parseInt(e.target.value) || 50 }))
                }
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Batch Notifications</h4>
                <p className="text-sm text-gray-600">Group multiple notifications together</p>
              </div>
              <Switch
                checked={settings.batch_notifications}
                onCheckedChange={(checked: boolean) =>
                  setSettings(prev => ({ ...prev, batch_notifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Only Important Failures</h4>
                <p className="text-sm text-gray-600">Only notify for repeated failures</p>
              </div>
              <Switch
                checked={settings.only_important_failures}
                onCheckedChange={(checked: boolean) =>
                  setSettings(prev => ({ ...prev, only_important_failures: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { NotificationSettingsManager };
export default NotificationSettingsManager;