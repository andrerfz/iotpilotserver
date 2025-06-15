'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Select, Switch, RadioGroup, Radio, Separator } from '@heroui/react';
import { toast } from 'sonner';
import { Loader2, Settings, Layout, Palette, Gauge, Sparkles, BarChart } from 'lucide-react';

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

  // Initialize form with basic schema
  const form = useForm<FormValues>({
    resolver: zodResolver(systemFormSchema),
    defaultValues: {
      theme: 'light',
      dashboardLayout: 'default',
      itemsPerPage: '10'
    }
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
          // Update form resolver for admin schema
          form.setOptions({
            resolver: zodResolver(adminSystemFormSchema)
          });
        }
        
        // Update form values
        form.reset(data);
      } catch (error) {
        console.error('Error fetching system settings:', error);
        toast.error('Failed to load system settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

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
      console.error('Error updating system settings:', error);
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
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>
                Customize your dashboard appearance
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
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
                    value={form.watch('dashboardLayout')}
                    onChange={(e) => form.setValue('dashboardLayout', e.target.value as 'default' | 'compact' | 'expanded', { shouldDirty: true })}
                  >
                    <option value="default">Default</option>
                    <option value="compact">Compact</option>
                    <option value="expanded">Expanded</option>
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
                    value={form.watch('itemsPerPage')}
                    onChange={(e) => form.setValue('itemsPerPage', e.target.value, { shouldDirty: true })}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {isAdmin && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Advanced system settings (admin only)
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
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
                    onCheckedChange={handleSwitchChange('enableAdvancedMetrics')}
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
                    onCheckedChange={handleSwitchChange('enableBetaFeatures')}
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
                      value={form.watch('logLevel')}
                      onChange={(e) => form.setValue('logLevel', e.target.value as 'debug' | 'info' | 'warn' | 'error', { shouldDirty: true })}
                    >
                      <option value="debug">Debug (Verbose)</option>
                      <option value="info">Info (Standard)</option>
                      <option value="warn">Warning (Minimal)</option>
                      <option value="error">Error (Critical Only)</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
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