import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Save } from 'lucide-react';
import { type ScrapingJob } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface JobScheduleModalProps {
  job: ScrapingJob;
  onScheduleUpdated: () => void;
}

type ScheduleFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface ScheduleConfig {
  frequency: ScheduleFrequency;
  interval?: number;
  time?: string; // HH:MM format
  days?: number[]; // 0-6 (Sunday-Saturday)
  timezone?: string;
}

export function JobScheduleModal({ job, onScheduleUpdated }: JobScheduleModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    frequency: 'manual',
    time: '09:00',
    days: [1, 2, 3, 4, 5], // Weekdays
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const frequencyOptions = [
    { value: 'manual', label: 'Manual Only', description: 'Run only when triggered manually' },
    { value: 'hourly', label: 'Every Hour', description: 'Run automatically every hour' },
    { value: 'daily', label: 'Daily', description: 'Run once per day at specified time' },
    { value: 'weekly', label: 'Weekly', description: 'Run weekly on selected days' },
    { value: 'monthly', label: 'Monthly', description: 'Run once per month' },
    { value: 'custom', label: 'Custom Interval', description: 'Set custom interval in hours' }
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSaveSchedule = async () => {
    try {
      // Call the Supabase Edge Function for job scheduling
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/job-scheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          scheduleConfig: schedule
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save schedule');
      }

      const result = await response.json();
      console.log('Schedule saved successfully:', result);
      
      onScheduleUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  const getSchedulePreview = () => {
    switch (schedule.frequency) {
      case 'manual':
        return 'Manual execution only';
      case 'hourly':
        return 'Every hour';
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        if (schedule.days && schedule.days.length > 0) {
          const selectedDays = schedule.days.map(d => dayNames[d]).join(', ');
          return `Weekly on ${selectedDays} at ${schedule.time}`;
        }
        return 'Weekly (no days selected)';
      case 'monthly':
        return `Monthly on the 1st at ${schedule.time}`;
      case 'custom':
        return `Every ${schedule.interval || 1} hours`;
      default:
        return 'No schedule set';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="apple-button">
          <Clock className="h-4 w-4 mr-2" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="apple-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl apple-text flex items-center gap-3">
            <Calendar className="h-6 w-6" />
            Schedule Job: {job.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Schedule Status */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Current Schedule</h4>
                <p className="text-sm text-muted-foreground">{getSchedulePreview()}</p>
              </div>
              <Badge className={`status-indicator ${schedule.frequency === 'manual' ? 'status-warning' : 'status-success'}`}>
                {schedule.frequency === 'manual' ? 'Manual' : 'Automated'}
              </Badge>
            </div>
          </div>

          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Schedule Frequency</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {frequencyOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setSchedule(prev => ({ ...prev, frequency: option.value as ScheduleFrequency }))}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    schedule.frequency === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      schedule.frequency === option.value 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground'
                    }`}>
                      {schedule.frequency === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Selection (for daily, weekly, monthly) */}
          {['daily', 'weekly', 'monthly'].includes(schedule.frequency) && (
            <div className="space-y-3">
              <Label htmlFor="time" className="text-base font-medium">Execution Time</Label>
              <Input
                id="time"
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                className="apple-input max-w-xs"
              />
            </div>
          )}

          {/* Day Selection (for weekly) */}
          {schedule.frequency === 'weekly' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const newDays = schedule.days?.includes(index)
                        ? schedule.days.filter(d => d !== index)
                        : [...(schedule.days || []), index];
                      setSchedule(prev => ({ ...prev, days: newDays }));
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      schedule.days?.includes(index)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Interval (for custom) */}
          {schedule.frequency === 'custom' && (
            <div className="space-y-3">
              <Label htmlFor="interval" className="text-base font-medium">Interval (hours)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="168"
                value={schedule.interval || 1}
                onChange={(e) => setSchedule(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                className="apple-input max-w-xs"
                placeholder="Hours between runs"
              />
            </div>
          )}

          {/* Timezone */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Timezone</Label>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {schedule.timezone} (Your local timezone)
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="apple-button">
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} className="apple-button">
              <Save className="h-4 w-4 mr-2" />
              Save Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}