'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@heroui/button';
import {Form} from '@heroui/form';
import {Card, CardBody, CardFooter, CardHeader} from '@heroui/card';
import {Switch} from '@heroui/switch';
import {toast} from 'sonner';
import {AlertTriangle, Bell, Loader2, Mail, Server} from 'lucide-react';

// Validation schema
const notificationsFormSchema = z.object({
  emailNotifications: z.enum(['true', 'false']),
  pushNotifications: z.enum(['true', 'false']),
  alertNotifications: z.enum(['true', 'false']),
  deviceOfflineNotifications: z.enum(['true', 'false'])
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function NotificationsSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailNotifications: 'true',
      pushNotifications: 'false',
      alertNotifications: 'true',
      deviceOfflineNotifications: 'true'
    }
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notification settings');
        }

        const data = await response.json();

        // Update form values
        form.reset(data);
      } catch (error) {
        toast.error('Failed to load notification settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  // Handle form submission
  const onSubmit = async (values: NotificationsFormValues) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update notification settings');
      }

      toast.success('Notification settings updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to handle switch changes
  const handleSwitchChange = (name: keyof NotificationsFormValues) => (checked: boolean) => {
    form.setValue(name, checked ? 'true' : 'false', { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Notification Settings</h2>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <p className="text-sm text-gray-500">
            Choose how and when you want to be notified about system events
          </p>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardBody className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('emailNotifications') === 'true'}
                  onValueChange={handleSwitchChange('emailNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Push Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('pushNotifications') === 'true'}
                  onValueChange={handleSwitchChange('pushNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <h3 className="text-sm font-medium">Alert Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications for system alerts and warnings
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('alertNotifications') === 'true'}
                  onValueChange={handleSwitchChange('alertNotifications')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Server className="h-5 w-5 text-danger" />
                  <div>
                    <h3 className="text-sm font-medium">Device Offline Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Get notified when devices go offline
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('deviceOfflineNotifications') === 'true'}
                  onValueChange={handleSwitchChange('deviceOfflineNotifications')}
                />
              </div>
            </CardBody>

            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                color="primary"
                isLoading={isSaving}
                isDisabled={!form.formState.isDirty}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
