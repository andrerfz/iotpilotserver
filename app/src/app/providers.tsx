'use client';

import {HeroUIProvider} from '@heroui/react'
import {CommandBusProvider} from '@/context/providers/command-bus.provider'
import {QueryBusProvider} from '@/context/providers/query-bus.provider'

export function Providers({children}: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <CommandBusProvider>
                <QueryBusProvider>
                    {children}
                </QueryBusProvider>
            </CommandBusProvider>
        </HeroUIProvider>
    )
}