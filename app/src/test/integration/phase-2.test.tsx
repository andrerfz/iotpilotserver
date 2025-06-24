import {describe, it, expect} from 'vitest';
import {render} from '@testing-library/react';
import {DDDProvider, useCommandBus} from '@/context/ddd.context';

function TestComponent() {
    const commandBus = useCommandBus();
    return <div data-testid="command-bus">{commandBus ? 'Connected' : 'Not Connected'}</div>;
}

describe('Phase 2 Integration', () => {
    it('should provide DDD context to components', () => {
        const {getByTestId} = render(
            <DDDProvider>
                <TestComponent />
            </DDDProvider>
        );

        expect(getByTestId('command-bus')).toHaveTextContent('Connected');
    });
});