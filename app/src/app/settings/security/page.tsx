'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@heroui/button';
import {Form} from '@heroui/form';
import {Card, CardBody, CardFooter, CardHeader} from '@heroui/card';
import {Switch} from '@heroui/switch';
import {Input} from '@heroui/input';
import {Slider} from '@heroui/slider';
import {toast} from 'sonner';
import {AlertCircle, Key, Loader2, Lock, Shield} from 'lucide-react';

// Validation schema
const securityFormSchema = z.object({
  twoFactorAuth: z.enum(['true', 'false']),
  sessionTimeout: z.string().regex(/^\d+$/), // numeric string
  loginNotifications: z.enum(['true', 'false'])
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;

export default function SecuritySettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionTimeoutValue, setSessionTimeoutValue] = useState(30);

  // Initialize form
  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      twoFactorAuth: 'false',
      sessionTimeout: '30',
      loginNotifications: 'true'
    }
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/security');
        if (!response.ok) {
          throw new Error('Failed to fetch security settings');
        }

        const data = await response.json();

        // Update form values
        form.reset(data);

        // Update slider value
        setSessionTimeoutValue(parseInt(data.sessionTimeout) || 30);
      } catch (error) {
        console.error('Error fetching security settings:', error);
        toast.error('Failed to load security settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  // Handle form submission
  const onSubmit = async (values: SecurityFormValues) => {
    setIsSaving(true);

    try {
      // Validate session timeout
      const sessionTimeout = parseInt(values.sessionTimeout);
      if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
        throw new Error('Session timeout must be between 5 and 1440 minutes');
      }

      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update security settings');
      }

      toast.success('Security settings updated successfully');
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to handle switch changes
  const handleSwitchChange = (name: keyof SecurityFormValues) => (checked: boolean) => {
    form.setValue(name, checked ? 'true' : 'false', { shouldDirty: true });
  };

  // Handle slider change
  const handleSliderChange = (value: number) => {
    setSessionTimeoutValue(value);
    form.setValue('sessionTimeout', value.toString(), { shouldDirty: true });
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
      <h2 className="text-xl font-semibold mb-6">Security Settings</h2>

      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Account Security</h3>
          <p className="text-sm text-gray-500">
            Manage your account security settings
          </p>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardBody className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('twoFactorAuth') === 'true'}
                  onValueChange={handleSwitchChange('twoFactorAuth')}
                />
              </div>

              {form.watch('twoFactorAuth') === 'true' && (
                <div className="ml-9 pl-4 border-l border-muted">
                  <p className="text-sm mb-2">
                    Two-factor authentication is enabled. You'll need to enter a verification code when logging in.
                  </p>
                  <Button
                    type="button"
                    variant="flat"
                    size="sm"
                    onClick={() => {
                      // In a real implementation, this would open a modal to set up 2FA
                      toast.info('2FA setup would open here');
                    }}
                  >
                    Configure 2FA
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Login Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications when someone logs into your account
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('loginNotifications') === 'true'}
                  onValueChange={handleSwitchChange('loginNotifications')}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Lock className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Session Timeout</h3>
                    <p className="text-xs text-muted-foreground">
                      Automatically log out after a period of inactivity
                    </p>
                  </div>
                </div>

                <div className="pl-9 space-y-3">
                  <Slider
                    value={[sessionTimeoutValue]}
                    minValue={5}
                    maxValue={240}
                    step={5}
                    onChange={(values) => handleSliderChange(Array.isArray(values) ? values[0] : values)}
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {sessionTimeoutValue} minutes
                    </span>

                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      min={5}
                      max={1440}
                      value={sessionTimeoutValue.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 5 && value <= 1440) {
                          handleSliderChange(value);
                        }
                      }}
                    />
                  </div>
                </div>
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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Security Recommendations</h3>
          <p className="text-sm text-gray-500">
            Suggestions to improve your account security
          </p>
        </CardHeader>

        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h3 className="text-sm font-medium">Use a strong, unique password</h3>
                <p className="text-xs text-muted-foreground">
                  Ensure your password is at least 12 characters long and includes a mix of letters, numbers, and symbols.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className={`h-5 w-5 ${form.watch('twoFactorAuth') === 'true' ? 'text-success' : 'text-warning'} mt-0.5`} />
              <div>
                <h3 className="text-sm font-medium">Enable two-factor authentication</h3>
                <p className="text-xs text-muted-foreground">
                  Add an extra layer of security to your account by requiring a second verification step when logging in.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="text-sm font-medium">Review active sessions</h3>
                <p className="text-xs text-muted-foreground">
                  Regularly check and terminate any suspicious sessions.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-xs mt-1"
                  onClick={() => {
                    // In a real implementation, this would navigate to active sessions page
                    toast.info('Active sessions page would open here');
                  }}
                >
                  View active sessions
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
