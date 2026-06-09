'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Form, Select, SelectItem, Card, CardBody, CardFooter, CardHeader, Input} from '@/components/ui';

import {toast} from 'sonner';
import {Loader2, User} from 'lucide-react';
import {useAuth} from '@/contexts/auth-context';

// Display preferences schema
const displayFormSchema = z.object({
    language: z.string().min(2).max(5),
    timezone: z.string().min(1),
    dateFormat: z.string().min(1),
});

// Personal info schema
const personalFormSchema = z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phoneNumber: z.string().max(30).optional(),
});

type DisplayFormValues = z.infer<typeof displayFormSchema>;
type PersonalFormValues = z.infer<typeof personalFormSchema>;

const LANGUAGE_OPTIONS = [
    {value: 'en', label: 'English'},
    {value: 'es', label: 'Spanish'},
    {value: 'fr', label: 'French'},
    {value: 'de', label: 'German'},
    {value: 'zh', label: 'Chinese'},
];

const TIMEZONE_OPTIONS = [
    {value: 'UTC', label: 'UTC'},
    {value: 'America/New_York', label: 'Eastern Time (US & Canada)'},
    {value: 'America/Chicago', label: 'Central Time (US & Canada)'},
    {value: 'America/Denver', label: 'Mountain Time (US & Canada)'},
    {value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)'},
    {value: 'Europe/London', label: 'London'},
    {value: 'Europe/Paris', label: 'Paris'},
    {value: 'Asia/Tokyo', label: 'Tokyo'},
];

const DATE_FORMAT_OPTIONS = [
    {value: 'MM/DD/YYYY', label: 'MM/DD/YYYY'},
    {value: 'DD/MM/YYYY', label: 'DD/MM/YYYY'},
    {value: 'YYYY-MM-DD', label: 'YYYY-MM-DD'},
];

export default function ProfileSettingsClient() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingDisplay, setIsSavingDisplay] = useState(false);
    const [isSavingPersonal, setIsSavingPersonal] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const {apiCall} = useAuth();

    const displayForm = useForm<DisplayFormValues>({
        resolver: zodResolver(displayFormSchema),
        defaultValues: {language: 'en', timezone: 'UTC', dateFormat: 'MM/DD/YYYY'},
    });

    // watch() subscribes to form state changes — needed for Select selectedKeys to update reactively
    const language = displayForm.watch('language');
    const timezone = displayForm.watch('timezone');
    const dateFormat = displayForm.watch('dateFormat');

    const personalForm = useForm<PersonalFormValues>({
        resolver: zodResolver(personalFormSchema),
        defaultValues: {firstName: '', lastName: '', phoneNumber: ''},
    });

    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await apiCall('/api/settings/profile');
                if (response.ok) {
                    const result = await response.json();
                    const data = result.data || result;
                    displayForm.reset({
                        language: data.language || 'en',
                        timezone: data.timezone || 'UTC',
                        dateFormat: data.dateFormat || 'MM/DD/YYYY',
                    });
                    personalForm.reset({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        phoneNumber: data.phoneNumber || '',
                    });
                    setEmail(data.email || '');
                    setUsername(data.username || '');
                }
            } catch (err) {
                console.error('Failed to fetch profile settings:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProfile();
    }, [apiCall, displayForm, personalForm]);

    const onSaveDisplay = async (values: DisplayFormValues) => {
        setIsSavingDisplay(true);
        try {
            const response = await apiCall('/api/settings/profile', {
                method: 'PUT',
                body: JSON.stringify(values),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update preferences');
            }
            toast.success('Display preferences saved');
            displayForm.reset(values);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
        } finally {
            setIsSavingDisplay(false);
        }
    };

    const onSavePersonal = async (values: PersonalFormValues) => {
        setIsSavingPersonal(true);
        try {
            // Fetch current display prefs so we send the full schema
            const currentDisplay = displayForm.getValues();
            const response = await apiCall('/api/settings/profile', {
                method: 'PUT',
                body: JSON.stringify({...currentDisplay, ...values}),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update personal info');
            }
            toast.success('Personal information saved');
            personalForm.reset(values);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update personal info');
        } finally {
            setIsSavingPersonal(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Profile Settings</h2>

            {/* Personal Information */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="h-5 w-5"/>
                        Personal Information
                    </h3>
                    <p className="text-sm text-gray-500">Update your name and contact details</p>
                </CardHeader>
                <form onSubmit={personalForm.handleSubmit(onSavePersonal)}>
                    <CardBody className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="First name"
                                value={personalForm.watch('firstName') || ''}
                                onChange={e => personalForm.setValue('firstName', e.target.value, {shouldDirty: true})}
                                autoComplete="given-name"
                            />
                            <Input
                                label="Last name"
                                value={personalForm.watch('lastName') || ''}
                                onChange={e => personalForm.setValue('lastName', e.target.value, {shouldDirty: true})}
                                autoComplete="family-name"
                            />
                        </div>
                        <Input
                            label="Phone number"
                            value={personalForm.watch('phoneNumber') || ''}
                            onChange={e => personalForm.setValue('phoneNumber', e.target.value, {shouldDirty: true})}
                            autoComplete="tel"
                            className="max-w-xs"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Email"
                                value={email}
                                isReadOnly
                                description="Email cannot be changed from here"
                                classNames={{input: 'text-default-400'}}
                            />
                            <Input
                                label="Username"
                                value={username}
                                isReadOnly
                                description="Username cannot be changed from here"
                                classNames={{input: 'text-default-400'}}
                            />
                        </div>
                    </CardBody>
                    <CardFooter className="flex justify-end">
                        <Button
                            type="submit"
                            color="primary"
                            isLoading={isSavingPersonal}
                            isDisabled={!personalForm.formState.isDirty}
                        >
                            {isSavingPersonal ? 'Saving…' : 'Save Personal Info'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* Display Preferences */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold">Display Preferences</h3>
                    <p className="text-sm text-gray-500">Customize how information is displayed</p>
                </CardHeader>
                <Form {...displayForm}>
                    <form onSubmit={displayForm.handleSubmit(onSaveDisplay)}>
                        <CardBody className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Language</label>
                                <Select
                                    className="max-w-xs"
                                    items={LANGUAGE_OPTIONS}
                                    label="Language"
                                    selectedKeys={[language]}
                                    onChange={k => displayForm.setValue('language', k.toString(), {shouldDirty: true})}
                                >
                                    {o => <SelectItem key={o.value}>{o.label}</SelectItem>}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Timezone</label>
                                <Select
                                    className="max-w-xs"
                                    items={TIMEZONE_OPTIONS}
                                    label="Timezone"
                                    selectedKeys={[timezone]}
                                    onChange={k => displayForm.setValue('timezone', k.toString(), {shouldDirty: true})}
                                >
                                    {o => <SelectItem key={o.value}>{o.label}</SelectItem>}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date Format</label>
                                <Select
                                    className="max-w-xs"
                                    items={DATE_FORMAT_OPTIONS}
                                    label="Date Format"
                                    selectedKeys={[dateFormat]}
                                    onChange={k => displayForm.setValue('dateFormat', k.toString(), {shouldDirty: true})}
                                >
                                    {o => <SelectItem key={o.value}>{o.label}</SelectItem>}
                                </Select>
                            </div>
                        </CardBody>
                        <CardFooter className="flex justify-end">
                            <Button
                                type="submit"
                                color="primary"
                                isLoading={isSavingDisplay}
                                isDisabled={!displayForm.formState.isDirty}
                            >
                                {isSavingDisplay ? 'Saving…' : 'Save Preferences'}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
