'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@heroui/button';
import { Form } from '@heroui/form';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/react';
import { Card, CardHeader, CardFooter, CardBody } from '@heroui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Validation schema
const profileFormSchema = z.object({
  language: z.string().min(2).max(5),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1)
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    }
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile settings');
        }

        const data = await response.json();

        // Update form values
        form.reset(data);
      } catch (error) {
        console.error('Error fetching profile settings:', error);
        toast.error('Failed to load profile settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  // Handle form submission
  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile settings');
      }

      toast.success('Profile settings updated successfully');
    } catch (error) {
      console.error('Error updating profile settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' }
  ];

  // Timezone options (simplified list)
  const timezoneOptions = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' }
  ];

  // Date format options
  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Display Preferences</h3>
          <p className="text-sm text-gray-500">
            Customize how information is displayed in your account
          </p>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardBody className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="language" className="text-sm font-medium">
                  Language
                </label>
                <Select
                  id="language"
                  className="max-w-xs"
                  items={languageOptions}
                  label="Language"
                  selectedKeys={[form.getValues('language')]}
                  onChange={(key) => form.setValue('language', key.toString(), { shouldDirty: true })}
                >
                  {(option) => <SelectItem key={option.value}>{option.label}</SelectItem>}
                </Select>
                {form.formState.errors.language && (
                  <p className="text-sm text-danger">
                    {form.formState.errors.language.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="timezone" className="text-sm font-medium">
                  Timezone
                </label>
                <Select
                  id="timezone"
                  className="max-w-xs"
                  items={timezoneOptions}
                  label="Timezone"
                  selectedKeys={[form.getValues('timezone')]}
                  onChange={(key) => form.setValue('timezone', key.toString(), { shouldDirty: true })}
                >
                  {(option) => <SelectItem key={option.value}>{option.label}</SelectItem>}
                </Select>
                {form.formState.errors.timezone && (
                  <p className="text-sm text-danger">
                    {form.formState.errors.timezone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="dateFormat" className="text-sm font-medium">
                  Date Format
                </label>
                <Select
                  id="dateFormat"
                  className="max-w-xs"
                  items={dateFormatOptions}
                  label="Date Format"
                  selectedKeys={[form.getValues('dateFormat')]}
                  onChange={(key) => form.setValue('dateFormat', key.toString(), { shouldDirty: true })}
                >
                  {(option) => <SelectItem key={option.value}>{option.label}</SelectItem>}
                </Select>
                {form.formState.errors.dateFormat && (
                  <p className="text-sm text-danger">
                    {form.formState.errors.dateFormat.message}
                  </p>
                )}
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
