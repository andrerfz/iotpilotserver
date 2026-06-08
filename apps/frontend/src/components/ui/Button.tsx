'use client';

import { forwardRef } from 'react';
import { Button as HeroButton } from '@heroui/button';
import type { ButtonProps as HeroButtonProps } from '@heroui/button';

export interface ButtonProps extends Omit<HeroButtonProps, 'isDisabled' | 'isLoading'> {
    disabled?: boolean;
    loading?: boolean;
    // keep HeroUI originals for migration compat
    isDisabled?: boolean;
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ disabled, loading, isDisabled, isLoading, ...rest }, ref) => (
        <HeroButton
            ref={ref as any}
            isDisabled={disabled ?? isDisabled}
            isLoading={loading ?? isLoading}
            {...rest}
        />
    )
);
Button.displayName = 'Button';

export { Button };
