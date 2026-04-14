'use client';

import { forwardRef } from 'react';
import { Checkbox as HeroCheckbox } from '@heroui/checkbox';
import type { CheckboxProps as HeroCheckboxProps } from '@heroui/checkbox';

export interface CheckboxProps extends Omit<HeroCheckboxProps, 'isSelected' | 'isDisabled' | 'isReadOnly'> {
    checked?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ checked, disabled, readOnly, isSelected, isDisabled, isReadOnly, ...rest }, ref) => (
        <HeroCheckbox
            ref={ref as any}
            isSelected={checked ?? isSelected}
            isDisabled={disabled ?? isDisabled}
            isReadOnly={readOnly ?? isReadOnly}
            {...rest}
        />
    )
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
