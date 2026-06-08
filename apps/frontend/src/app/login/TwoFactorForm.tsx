'use client';

import { useState, useRef, useEffect } from 'react';
import {Button, Input, Card, CardBody, CardHeader} from '@/components/ui';

import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { apiUrl } from '@/utils/api-url';

interface TwoFactorFormProps {
    userId: string;
    onSuccess: () => void;
    onBack: () => void;
    remember?: boolean;
}

export default function TwoFactorForm({ userId, onSuccess, onBack, remember }: TwoFactorFormProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) return;

        setLoading(true);
        try {
            const response = await fetch(apiUrl('/api/auth/verify-2fa'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code, remember }),
                credentials: 'include',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Verification failed' }));
                throw new Error(data.error || 'Invalid code');
            }

            toast.success('Verified successfully');
            onSuccess();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Verification failed');
            setCode('');
            inputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-md w-full">
            <CardHeader className="flex flex-col items-center pb-0">
                <div className="bg-primary-100 p-3 rounded-full mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Check your email</h2>
                <p className="text-sm text-default-500 text-center mt-2">
                    We sent a 6-digit verification code to your email address.
                </p>
            </CardHeader>
            <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        ref={inputRef}
                        label="Verification Code"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                    />
                    <Button
                        type="submit"
                        color="primary"
                        fullWidth
                        isLoading={loading}
                        isDisabled={code.length !== 6}
                    >
                        Verify
                    </Button>
                    <Button
                        type="button"
                        variant="light"
                        fullWidth
                        onClick={onBack}
                    >
                        Back to login
                    </Button>
                </form>
            </CardBody>
        </Card>
    );
}
