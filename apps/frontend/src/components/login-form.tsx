'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Input, Button, Checkbox} from '@/components/ui';

import {useAuth} from '@/contexts/auth-context';
import {toast} from 'sonner';
import TwoFactorForm from '@/app/login/TwoFactorForm';
import { apiUrl } from '@/utils/api-url';

export function LoginForm() {
    const router = useRouter();
    const {refreshUser} = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [twoFactorState, setTwoFactorState] = useState<{ userId: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(apiUrl('/api/auth/login'), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password, remember}),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Check if 2FA is required
            if (data.data?.requiresTwoFactor) {
                setTwoFactorState({userId: data.data.userId});
                toast.info('Verification code sent to your email');
                return;
            }

            // Normal login — refresh auth state and redirect
            await refreshUser();
            toast.success('Login successful!');
            router.push('/');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    // Show 2FA form if needed
    if (twoFactorState) {
        return (
            <TwoFactorForm
                userId={twoFactorState.userId}
                remember={remember}
                onSuccess={async () => {
                    await refreshUser();
                    toast.success('Login successful!');
                    router.push('/');
                }}
                onBack={() => setTwoFactorState(null)}
            />
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                type="email"
                label="Email"
                placeholder="Enter your email"
                value={email}
                onValueChange={setEmail}
                isRequired
                variant="bordered"
                classNames={{
                    input: "bg-transparent",
                    inputWrapper: "border-default-200 hover:border-default-400"
                }}
            />

            <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onValueChange={setPassword}
                isRequired
                variant="bordered"
                classNames={{
                    input: "bg-transparent",
                    inputWrapper: "border-default-200 hover:border-default-400"
                }}
            />

            <div className="flex items-center justify-between">
                <Checkbox
                    isSelected={remember}
                    onValueChange={setRemember}
                    size="sm"
                >
                    Remember me
                </Checkbox>
            </div>

            <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="w-full"
                size="lg"
            >
                {loading ? 'Signing in...' : 'Sign in'}
            </Button>
        </form>
    );
}

export default LoginForm;
