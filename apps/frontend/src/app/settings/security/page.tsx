'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Card, CardBody, CardFooter, CardHeader, Switch, Input, Slider} from '@/components/ui';

import {toast} from 'sonner';
import {AlertCircle, ChevronDown, ChevronUp, Key, Loader2, Lock, Monitor, RefreshCw, Shield, Trash2} from 'lucide-react';
import { apiUrl } from '@/utils/api-url';

// Validation schema
const securityFormSchema = z.object({
  twoFactorAuth: z.enum(['true', 'false']),
  sessionTimeout: z.string().regex(/^\d+$/),
  loginNotifications: z.enum(['true', 'false'])
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;

interface SessionEntry {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SecuritySettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionTimeoutValue, setSessionTimeoutValue] = useState(30);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Session panel state
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      twoFactorAuth: 'false',
      sessionTimeout: '30',
      loginNotifications: 'true'
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(apiUrl('/api/settings/security'));
        if (!response.ok) throw new Error('Failed to fetch security settings');
        const body = await response.json();
        const data = body.data ?? body;
        form.reset(data);
        setSessionTimeoutValue(parseInt(data.sessionTimeout) || 30);
      } catch {
        toast.error('Failed to load security settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [form]);

  const onSubmit = async (values: SecurityFormValues) => {
    setIsSaving(true);
    try {
      const sessionTimeout = parseInt(values.sessionTimeout);
      if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
        throw new Error('Session timeout must be between 5 and 1440 minutes');
      }
      const response = await fetch(apiUrl('/api/settings/security'), {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(values)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update security settings');
      }
      toast.success('Security settings updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchChange = (name: keyof SecurityFormValues) => (checked: boolean) => {
    form.setValue(name, checked ? 'true' : 'false', {shouldDirty: true});
  };

  const handleSliderChange = (value: number) => {
    setSessionTimeoutValue(value);
    form.setValue('sessionTimeout', value.toString(), {shouldDirty: true});
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch(apiUrl('/api/auth/password'), {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({currentPassword, newPassword}),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error((body.data ?? body)?.error || body.message || 'Failed to change password');
      }
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Session management
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/sessions'));
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      setSessions(body.data ?? body);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const toggleSessions = async () => {
    const next = !showSessions;
    setShowSessions(next);
    if (next && sessions.length === 0) await loadSessions();
  };

  const revokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(apiUrl(`/api/auth/sessions/${id}`), {method: 'DELETE'});
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      const data = body.data ?? body;
      setSessions(s => s.filter(x => x.id !== id));
      if (data.wasCurrentSession) {
        toast.success('Session revoked. You will be logged out.');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        toast.success('Session revoked');
      }
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      const res = await fetch(apiUrl('/api/auth/sessions'), {method: 'DELETE'});
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      const data = body.data ?? body;
      setSessions(s => s.filter(x => x.isCurrent));
      toast.success(`Revoked ${data.revokedCount} other session${data.revokedCount !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Security Settings</h2>

      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Account Security</h3>
          <p className="text-sm text-gray-500">Manage your account security settings</p>
        </CardHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardBody className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <Switch
                  checked={form.watch('twoFactorAuth') === 'true'}
                  onValueChange={handleSwitchChange('twoFactorAuth')}
                />
              </div>

              {form.watch('twoFactorAuth') === 'true' && (
                <div className="ml-9 pl-4 border-l border-success">
                  <p className="text-sm text-success">
                    Two-factor authentication is enabled. A 6-digit verification code will be sent to your email on each login.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Login Notifications</h3>
                    <p className="text-xs text-muted-foreground">Receive notifications when someone logs into your account</p>
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
                    <p className="text-xs text-muted-foreground">Automatically log out after a period of inactivity</p>
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
                    <span className="text-xs text-muted-foreground">{sessionTimeoutValue} minutes</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      min={5}
                      max={1440}
                      value={sessionTimeoutValue.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 5 && value <= 1440) handleSliderChange(value);
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
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Change Password
          </h3>
          <p className="text-sm text-gray-500">Update your account password</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            type="password"
            label="Current password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            label="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
            description="At least 8 characters, one uppercase, one lowercase, one number"
          />
          <Input
            type="password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            color={confirmPassword && confirmPassword !== newPassword ? 'danger' : 'default'}
          />
          <div className="flex justify-end">
            <Button
              color="primary"
              isLoading={isChangingPassword}
              isDisabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={handleChangePassword}
            >
              Update Password
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </h3>
              <p className="text-sm text-gray-500">Devices and browsers currently signed in to your account</p>
            </div>
            <Button
              variant="bordered"
              size="sm"
              endContent={showSessions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              onClick={toggleSessions}
            >
              {showSessions ? 'Hide' : 'Show sessions'}
            </Button>
          </div>
        </CardHeader>

        {showSessions && (
          <CardBody>
            {sessionsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-default-400 text-center py-4">No active sessions found</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-default-200 bg-default-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-default-500">{s.id.slice(0, 12)}…</span>
                        {s.isCurrent && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-default-400 mt-0.5">
                        Started {new Date(s.createdAt).toLocaleString()} · Expires {new Date(s.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={revokingId === s.id}
                        startContent={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => revokeSession(s.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}

                {otherSessions.length > 1 && (
                  <div className="pt-2">
                    <Button
                      color="danger"
                      variant="bordered"
                      size="sm"
                      isLoading={revokingAll}
                      onClick={revokeAllOthers}
                    >
                      Revoke all other sessions ({otherSessions.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Security Recommendations</h3>
          <p className="text-sm text-gray-500">Suggestions to improve your account security</p>
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
                  Add an extra layer of security by requiring a second verification step when logging in.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className={`h-5 w-5 ${sessions.length <= 1 ? 'text-success' : 'text-warning'} mt-0.5`} />
              <div>
                <h3 className="text-sm font-medium">Review active sessions</h3>
                <p className="text-xs text-muted-foreground">
                  Regularly check and terminate any suspicious sessions.
                  {sessions.length > 1 && ` You have ${sessions.length} active sessions.`}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
