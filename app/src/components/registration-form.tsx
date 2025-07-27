'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Input} from '@heroui/input';
import {Button} from '@heroui/button';
import {useUserCommands} from '@/hooks/commands/use-user-commands';
import {toast} from 'sonner';

/**
 * RegistrationForm component for new user registration.
 * @returns JSX element for the registration form.
 */
export function RegistrationForm() {
    const router = useRouter();
    const { registerUser, loading, error } = useUserCommands();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password match
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            // Call the API to register
            await registerUser({
                email,
                password,
                username
            } as any);

            toast.success('Registration successful! Please log in.');

            // Redirect to login on success
            router.push('/login');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Registration failed');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                type="text"
                label="Username"
                placeholder="Choose a username"
                value={username}
                onValueChange={setUsername}
                isRequired
                variant="bordered"
                classNames={{
                    input: "bg-transparent",
                    inputWrapper: "border-default-200 hover:border-default-400"
                }}
            />

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
                placeholder="Create a password"
                value={password}
                onValueChange={setPassword}
                isRequired
                variant="bordered"
                classNames={{
                    input: "bg-transparent",
                    inputWrapper: "border-default-200 hover:border-default-400"
                }}
            />

            <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                isRequired
                variant="bordered"
                classNames={{
                    input: "bg-transparent",
                    inputWrapper: "border-default-200 hover:border-default-400"
                }}
            />

            {error && (
                <div className="text-sm text-danger bg-danger-50 border border-danger-200 rounded-lg p-3">
                    {error}
                </div>
            )}

            <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="w-full"
                size="lg"
            >
                {loading ? 'Creating account...' : 'Create account'}
            </Button>
        </form>
    );
}

export default RegistrationForm;
