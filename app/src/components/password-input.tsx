'use client';

import {useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {Button, Input} from '@heroui/react';

interface PasswordInputProps {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    label?: string;
}

export default function PasswordInput({
    id,
    name,
    value,
    onChange,
    placeholder = "Enter your password",
    autoComplete = "current-password",
    required = true,
    label
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Input
            id={id}
            name={name}
            type={showPassword ? 'text' : 'password'}
            autoComplete={autoComplete}
            required={required}
            value={value}
            onChange={onChange}
            label={label || "Password"}
            placeholder={placeholder}
            variant="bordered"
            fullWidth
            endContent={
                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4 text-default-400"/>
                    ) : (
                        <Eye className="h-4 w-4 text-default-400"/>
                    )}
                </Button>
            }
        />
    );
}
