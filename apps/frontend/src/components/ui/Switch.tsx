'use client';

import { forwardRef } from 'react';
import { Switch as HeroSwitch } from '@heroui/switch';
import type { SwitchProps as HeroSwitchProps } from '@heroui/switch';

export interface SwitchProps extends Omit<HeroSwitchProps, 'isSelected' | 'isDisabled' | 'isReadOnly'> {
    checked?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    // keep HeroUI originals for migration compat
    isSelected?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
    ({ checked, disabled, readOnly, isSelected, isDisabled, isReadOnly, ...rest }, ref) => (
        <HeroSwitch
            ref={ref as any}
            isSelected={checked ?? isSelected}
            isDisabled={disabled ?? isDisabled}
            isReadOnly={readOnly ?? isReadOnly}
            {...rest}
        />
    )
);
Switch.displayName = 'Switch';

export { Switch };
