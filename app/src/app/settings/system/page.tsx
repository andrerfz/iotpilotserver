'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@heroui/button';
import {Form} from '@heroui/form';
import {Card, CardBody, CardHeader} from '@heroui/card';
import {Select, SelectItem} from '@heroui/react';
import {Switch} from '@heroui/switch';
import {Radio, RadioGroup} from '@heroui/radio';
import {toast} from 'sonner';
import {BarChart, Gauge, Layout, Loader2, Palette, Settings, Sparkles} from 'lucide-react';

// Validation schema for regular users
const systemFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  dashboardLayout: z.enum(['default', 'compact', 'expanded']),
  itemsPerPage: z.string().regex(/^\d+$/) // numeric string
});

// Extended schema for admin users
const adminSystemFormSchema = systemFormSchema.extend({
  enableAdvancedMetrics: z.enum(['true', 'false']),
  enableBetaFeatures: z.enum(['true', 'false']),
  logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});

// Union type for form values
type SystemFormValues = z.infer<typeof systemFormSchema>;
type AdminSystemFormValues = z.infer<typeof adminSystemFormSchema>;
type FormValues = SystemFormValues | AdminSystemFormValues;

export default function SystemSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState<FormValues>({
    theme: 'light',
    dashboardLayout: 'default',
    itemsPerPage: '10'
  });

  // Options for select components
  const dashboardLayoutOptions = [
    { key: "default", label: "Default" },
    { key: "compact", label: "Compact" },
    { key: "expanded", label: "Expanded" }
  ];

  const itemsPerPageOptions = [
    { key: "5", label: "5" },
    { key: "10", label: "10" },
    { key: "25", label: "25" },
    { key: "50", label: "50" },
    { key: "100", label: "100" }
  ];

  const logLevelOptions = [
    { key: "debug", label: "Debug (Verbose)" },
    { key: "info", label: "Info (Standard)" },
    { key: "warn", label: "Warning (Minimal)" },
    { key: "error", label: "Error (Critical Only)" }
  ];

  // Initialize form with the appropriate schema based on isAdmin state
  const form = useForm<FormValues>({
    resolver: isAdmin ? zodResolver(adminSystemFormSchema) : zodResolver(systemFormSchema),
    defaultValues: formData
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/system');
        if (!response.ok) {
          throw new Error('Failed to fetch system settings');
        }

        const data = await response.json();

        // Check if user is admin
        if (data.isAdmin === 'true') {
          setIsAdmin(true);
        }

        // Update form data state
        setFormData(data);

        // Update form values
        form.reset(data);
      } catch (error) {
        toast.error('Failed to load system settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);

    try {
      // Validate items per page
      const itemsPerPage = parseInt(values.itemsPerPage);
      if (isNaN(itemsPerPage) || itemsPerPage < 5 || itemsPerPage > 100) {
        throw new Error('Items per page must be between 5 and 100');
      }

      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update system settings');
      }

      toast.success('System settings updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update system settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to handle switch changes
  const handleSwitchChange = (name: string) => (checked: boolean) => {
    form.setValue(name as any, checked ? 'true' : 'false', { shouldDirty: true });
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
      <h2 className="text-xl font-semibold mb-6">System Settings</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">Display Settings</h3>
              <p className="text-sm text-gray-500">
                Customize your dashboard appearance
              </p>
            </CardHeader>

            <CardBody className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Palette className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Theme</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose your preferred color theme
                    </p>
                  </div>
                </div>

                <div className="pl-9">
                  <RadioGroup
                    value={form.watch('theme')}
                    onValueChange={(value) => form.setValue('theme', value as 'light' | 'dark' | 'system', { shouldDirty: true })}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <Radio value="light" id="theme-light" />
                      <label htmlFor="theme-light" className="text-sm">Light</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Radio value="dark" id="theme-dark" />
                      <label htmlFor="theme-dark" className="text-sm">Dark</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Radio value="system" id="theme-system" />
                      <label htmlFor="theme-system" className="text-sm">System</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Layout className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Dashboard Layout</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose how your dashboard is organized
                    </p>
                  </div>
                </div>

                <div className="pl-9">
                  <Select
                    id="dashboardLayout"
                    className="max-w-xs"
                    items={dashboardLayoutOptions}
                    label="Dashboard Layout"
                    selectedKeys={[form.watch('dashboardLayout')]}
                    onChange={(key) => form.setValue('dashboardLayout', key.toString() as 'default' | 'compact' | 'expanded', { shouldDirty: true })}
                  >
                    {(option) => <SelectItem key={option.key}>{option.label}</SelectItem>}
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Settings className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Items Per Page</h3>
                    <p className="text-xs text-muted-foreground">
                      Number of items to display in lists and tables
                    </p>
                  </div>
                </div>

                <div className="pl-9">
                  <Select
                    id="itemsPerPage"
                    className="max-w-xs"
                    items={itemsPerPageOptions}
                    label="Items Per Page"
                    selectedKeys={[form.watch('itemsPerPage')]}
                    onChange={(key) => form.setValue('itemsPerPage', key.toString(), { shouldDirty: true })}
                  >
                    {(option) => <SelectItem key={option.key}>{option.label}</SelectItem>}
                  </Select>
                </div>
              </div>
            </CardBody>
          </Card>

          {isAdmin && (
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold">Admin Settings</h3>
                <p className="text-sm text-gray-500">
                  Advanced system settings (admin only)
                </p>
              </CardHeader>

              <CardBody className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <BarChart className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-medium">Advanced Metrics</h3>
                      <p className="text-xs text-muted-foreground">
                        Enable detailed system metrics and analytics
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.watch('enableAdvancedMetrics') === 'true'}
                    onValueChange={handleSwitchChange('enableAdvancedMetrics')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-medium">Beta Features</h3>
                      <p className="text-xs text-muted-foreground">
                        Enable experimental features and functionality
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.watch('enableBetaFeatures') === 'true'}
                    onValueChange={handleSwitchChange('enableBetaFeatures')}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <Gauge className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-medium">Log Level</h3>
                      <p className="text-xs text-muted-foreground">
                        Set the system logging verbosity
                      </p>
                    </div>
                  </div>

                  <div className="pl-9">
                    <Select
                      id="logLevel"
                      className="max-w-xs"
                      items={logLevelOptions}
                      label="Log Level"
                      selectedKeys={[form.watch('logLevel')]}
                      onChange={(key) => form.setValue('logLevel', key.toString() as 'debug' | 'info' | 'warn' | 'error', { shouldDirty: true })}
                    >
                      {(option) => <SelectItem key={option.key}>{option.label}</SelectItem>}
                    </Select>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              color="primary"
              isLoading={isSaving}
              isDisabled={!form.formState.isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
