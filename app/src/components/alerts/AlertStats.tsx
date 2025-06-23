import React from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface AlertStatsProps {
    stats: {
        total: number;
        active: number;
        resolved: number;
        critical: number;
    };
}

export function AlertStats({ stats }: AlertStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardBody className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="w-5 h-5 text-primary mr-2" />
                        <span className="text-2xl font-bold text-primary">{stats.total}</span>
                    </div>
                    <div className="text-sm text-default-500">Total Alerts</div>
                </CardBody>
            </Card>

            <Card>
                <CardBody className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-warning mr-2" />
                        <span className="text-2xl font-bold text-warning">{stats.active}</span>
                    </div>
                    <div className="text-sm text-default-500">Active Alerts</div>
                </CardBody>
            </Card>

            <Card>
                <CardBody className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="w-5 h-5 text-success mr-2" />
                        <span className="text-2xl font-bold text-success">{stats.resolved}</span>
                    </div>
                    <div className="text-sm text-default-500">Resolved</div>
                </CardBody>
            </Card>

            <Card>
                <CardBody className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-danger mr-2" />
                        <span className="text-2xl font-bold text-danger">{stats.critical}</span>
                    </div>
                    <div className="text-sm text-default-500">Critical</div>
                </CardBody>
            </Card>
        </div>
    );
}