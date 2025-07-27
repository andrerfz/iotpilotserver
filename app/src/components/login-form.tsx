'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Input} from '@heroui/input';
import {Button} from '@heroui/button';
import {Checkbox} from '@heroui/checkbox';
import {useAuth} from '@/contexts/auth-context';
import {useUserCommands} from '@/hooks/commands/use-user-commands';
import {toast} from 'sonner';

/**
 * LoginForm component for user authentication using domain commands.
 * @returns JSX element for the login form.
 */
export function LoginForm() {
    const router = useRouter();
    const { login: legacyLogin } = useAuth(); // Keep for backward compatibility with state management
    const { authenticateUser, loading, error } = useUserCommands();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Use domain command for authentication
            const result = await authenticateUser({
                email,
                password,
                rememberMe: remember
            } as any);

            // Update auth context state with the result
            if (result && (result as any).token) {
                // Store token in a cookie or localStorage based on remember me
                if (remember) {
                    localStorage.setItem('auth_token', (result as any).token);
                }
                
                toast.success('Login successful!');
                
                // Redirect to dashboard on success
                router.push('/');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Authentication failed');
        }
    };

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