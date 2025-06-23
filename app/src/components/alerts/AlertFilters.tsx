import React from 'react';
import { ALERT_TYPES } from '@/types/alerts';
import {Input, Select, SelectItem, Button} from '@heroui/react';
import {Filter, X} from 'lucide-react';

interface AlertFiltersProps {
    searchQuery: string;
    severityFilter: string;
    statusFilter: string;
    typeFilter: string;
    onSearchChange: (value: string) => void;
    onSeverityChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onClearFilters: () => void;
}

export function AlertFilters({
    searchQuery,
    severityFilter,
    statusFilter,
    typeFilter,
    onSearchChange,
    onSeverityChange,
    onStatusChange,
    onTypeChange,
    onClearFilters
}: AlertFiltersProps) {
    const hasActiveFilters = searchQuery || severityFilter || statusFilter || typeFilter;

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-default-50 rounded-lg">
            <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                startContent={<Filter className="w-4 h-4 text-default-500"/>}
                isClearable
                onClear={() => onSearchChange('')}
            />

            <Select
                placeholder="Severity"
                selectedKeys={severityFilter ? [severityFilter] : []}
                onSelectionChange={(keys) => onSeverityChange(Array.from(keys)[0] as string || '')}
            >
                <SelectItem key="">All Severities</SelectItem>
                <SelectItem key="INFO">Info</SelectItem>
                <SelectItem key="WARNING">Warning</SelectItem>
                <SelectItem key="ERROR">Error</SelectItem>
                <SelectItem key="CRITICAL">Critical</SelectItem>
            </Select>

            <Select
                placeholder="Status"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onSelectionChange={(keys) => onStatusChange(Array.from(keys)[0] as string || '')}
            >
                <SelectItem key="">All Statuses</SelectItem>
                <SelectItem key="active">Active</SelectItem>
                <SelectItem key="acknowledged">Acknowledged</SelectItem>
                <SelectItem key="resolved">Resolved</SelectItem>
            </Select>

            <Select
                placeholder="Type"
                selectedKeys={typeFilter ? [typeFilter] : []}
                onSelectionChange={(keys) => onTypeChange(Array.from(keys)[0] as string || '')}
            >
                {[
                    {
                        key: "all",
                        label: "All Types"
                    },
                    ...ALERT_TYPES
                ].map(type => (
                    <SelectItem key={type.key}>{type.label}</SelectItem>
                ))}
            </Select>

            <Button
                variant={hasActiveFilters ? "solid" : "bordered"}
                color={hasActiveFilters ? "warning" : "default"}
                onClick={onClearFilters}
                startContent={<X className="w-4 h-4"/>}
                className="w-full"
            >
                Clear Filters
            </Button>
        </div>
    );
}