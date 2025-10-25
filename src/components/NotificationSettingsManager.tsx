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
  AlertCircle,
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
  email_enabled: boolean;
  email_address?: string;
  sms_enabled: boolean;
  phone_number?: string;
  webhook_enabled: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  notification_types: {
    job_completed: boolean;
    job_failed: boolean;
    job_started: boolean;
    job_scheduled: boolean;
    system_alerts: boolean;
    performance_alerts: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    timezone: string;
  };
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
  };
  created_at?: string;
  updated_at?: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook';
  icon: React.ReactNode;
  description: string;
  verified: boolean;
  enabled: boolean;
}

export function NotificationSettingsManager() {
  const [settings, setSettings] = useState<NotificationSettings>({
    user_id: '',
    email_enabled: true,
    sms_enabled: false,
    webhook_enabled: false,
    notification_types: {
      job_completed: true,
      job_failed: true,
      job_started: false,
      job_scheduled: true,
      system_alerts: true,
      performance_alerts: false,
    },
    quiet_hours: {
      enabled: false,
      start_time: '22:00',
      end_time: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    frequency_limits: {
      max_per_hour: 10,
      max_per_day: 50,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const channels: NotificationChannel[] = [
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      icon: <Mail className="h-5 w-5" />,
      description: 'Receive notifications via email',
      verified: !!settings.email_address,
      enabled: settings.email_enabled,
    },
    {
      id: 'sms',
      name: 'SMS',
      type: 'sms',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Receive notifications via SMS',
      verified: !!settings.phone_number,
      enabled: settings.sms_enabled,
    },
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'webhook',
      icon: <Webhook className="h-5 w-5" />,
      description: 'Send notifications to custom webhook endpoint',
      verified: !!settings.webhook_url,
      enabled: settings.webhook_enabled,
    },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
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
        // Set user_id for new settings
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

      const settingsToSave = { ...settings, user_id: user.id };

      const { error } = await supabase
        .from('scraper_notification_settings')
        .upsert([settingsToSave], { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to save notification settings:', error);
        return;
      }

      // Show success message
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
                    channelType === 'sms' ? settings.phone_number :
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
    } catch (error) {
      console.error(`Failed to test ${channelType} notification:`, error);
      setTestResults(prev => ({ ...prev, [channelType]: false }));
    } finally {
      setTesting(null);
    }
  };

  const updateNotificationType = (type: keyof typeof settings.notification_types, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [type]: enabled,
      },
    }));
  };

  const updateChannelEnabled = (channelType: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [`${channelType}_enabled`]: enabled,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            <span>Loading notification settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            Notification Settings
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {channels.map((channel) => (
            <div key={channel.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {channel.icon}
                  <div>
                    <h3 className="font-medium">{channel.name}</h3>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel.verified ? (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={(checked) => updateChannelEnabled(channel.type, checked)}
                  />
                </div>
              </div>

              {/* Channel-specific settings */}
              {channel.type === 'email' && channel.enabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email_address || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, email_address: e.target.value }))}
                      placeholder="your@email.com"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testNotification('email')}
                    disabled={testing === 'email' || !settings.email_address}
                  >
                    {testing === 'email' ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Test Email
                  </Button>
                  {testResults.email !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      {testResults.email ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Test email sent successfully</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Failed to send test email</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {channel.type === 'sms' && channel.enabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={settings.phone_number || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testNotification('sms')}
                    disabled={testing === 'sms' || !settings.phone_number}
                  >
                    {testing === 'sms' ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Test SMS
                  </Button>
                  {testResults.sms !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      {testResults.sms ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Test SMS sent successfully</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Failed to send test SMS</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {channel.type === 'webhook' && channel.enabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={settings.webhook_url || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://your-webhook-endpoint.com/notifications"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={settings.webhook_secret || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder="Enter webhook secret for verification"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testNotification('webhook')}
                    disabled={testing === 'webhook' || !settings.webhook_url}
                  >
                    {testing === 'webhook' ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Test Webhook
                  </Button>
                  {testResults.webhook !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      {testResults.webhook ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Test webhook sent successfully</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Failed to send test webhook</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(settings.notification_types).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium capitalize">{type.replace('_', ' ')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {type === 'job_completed' && 'Get notified when jobs finish successfully'}
                    {type === 'job_failed' && 'Get notified when jobs encounter errors'}
                    {type === 'job_started' && 'Get notified when jobs begin execution'}
                    {type === 'job_scheduled' && 'Get notified when jobs are scheduled'}
                    {type === 'system_alerts' && 'Get notified about system-wide issues'}
                    {type === 'performance_alerts' && 'Get notified about performance issues'}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => updateNotificationType(type as keyof typeof settings.notification_types, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Enable Quiet Hours</h3>
              <p className="text-sm text-muted-foreground">
                Disable notifications during specified hours
              </p>
            </div>
            <Switch
              checked={settings.quiet_hours.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  quiet_hours: { ...prev.quiet_hours, enabled: checked }
                }))
              }
            />
          </div>

          {settings.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={settings.quiet_hours.start_time}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      quiet_hours: { ...prev.quiet_hours, start_time: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={settings.quiet_hours.end_time}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      quiet_hours: { ...prev.quiet_hours, end_time: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequency Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequency Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="max-per-hour">Maximum notifications per hour</Label>
            <Input
              id="max-per-hour"
              type="number"
              min="1"
              max="100"
              value={settings.frequency_limits.max_per_hour}
              onChange={(e) => 
                setSettings(prev => ({
                  ...prev,
                  frequency_limits: { ...prev.frequency_limits, max_per_hour: parseInt(e.target.value) || 10 }
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="max-per-day">Maximum notifications per day</Label>
            <Input
              id="max-per-day"
              type="number"
              min="1"
              max="1000"
              value={settings.frequency_limits.max_per_day}
              onChange={(e) => 
                setSettings(prev => ({
                  ...prev,
                  frequency_limits: { ...prev.frequency_limits, max_per_day: parseInt(e.target.value) || 50 }
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="apple-button">
          {saving ? (
            <Clock className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}