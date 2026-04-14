'use client';

import { forwardRef } from 'react';
import { Input as HeroInput } from '@heroui/input';
import type { InputProps as HeroInputProps } from '@heroui/input';

export interface InputProps extends Omit<HeroInputProps, 'isDisabled' | 'isReadOnly' | 'isRequired' | 'isInvalid'> {
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    invalid?: boolean;
    // keep HeroUI originals for migration compat
    isDisabled?: boolean;
    isReadOnly?: boolean;
    isRequired?: boolean;
    isInvalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ disabled, readOnly, required, invalid, isDisabled, isReadOnly, isRequired, isInvalid, ...rest }, ref) => (
        <HeroInput
            ref={ref as any}
            isDisabled={disabled ?? isDisabled}
            isReadOnly={readOnly ?? isReadOnly}
            isRequired={required ?? isRequired}
            isInvalid={invalid ?? isInvalid}
            {...rest}
        />
    )
);
Input.displayName = 'Input';

export { Input };
