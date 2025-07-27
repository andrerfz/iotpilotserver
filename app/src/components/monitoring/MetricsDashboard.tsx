'use client';

import {useEffect, useState} from 'react';
import {Cpu, HardDrive, RefreshCw, Thermometer} from 'lucide-react';
import {Card, CardBody, CardHeader} from '@heroui/card';
import {Button} from '@heroui/button';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useDeviceMetrics} from '@/hooks/domain/use-device-metrics';

interface MetricsDashboardProps {
  deviceId: string;
}

interface MetricData {
  timestamp: string;
  value: number;
  [key: string]: any;
}

/**
 * MetricsDashboard component to display real-time device metrics.
 * @param props The component props including the deviceId.
 * @returns JSX element displaying real-time metrics charts.
 */
export function MetricsDashboard({ deviceId }: MetricsDashboardProps) {
  const { metrics, loading, error, refresh } = useDeviceMetrics(deviceId, 5000);
  const [cpuData, setCpuData] = useState<MetricData[]>([]);
  const [memoryData, setMemoryData] = useState<MetricData[]>([]);
  const [temperatureData, setTemperatureData] = useState<MetricData[]>([]);
  const [diskData, setDiskData] = useState<MetricData[]>([]);

  useEffect(() => {
    if (metrics && (metrics as any).metrics) {
      if ((metrics as any).metrics.cpu_usage) {
        setCpuData(formatMetricsForChart((metrics as any).metrics.cpu_usage, 'cpu_usage'));
      }
      if ((metrics as any).metrics.memory_usage) {
        setMemoryData(formatMetricsForChart((metrics as any).metrics.memory_usage, 'memory_usage'));
      }
      if ((metrics as any).metrics.cpu_temperature) {
        setTemperatureData(formatMetricsForChart((metrics as any).metrics.cpu_temperature, 'cpu_temperature'));
      }
      if ((metrics as any).metrics.disk_usage) {
        setDiskData(formatMetricsForChart((metrics as any).metrics.disk_usage, 'disk_usage'));
      }
    }
  }, [metrics]);

  // Format metrics data for chart
  const formatMetricsForChart = (metricData: MetricData[], metricType: string) => {
    if (!metricData || !Array.isArray(metricData)) {
      return [];
    }

    return metricData.map((item, index) => {
      try {
        const date = new Date(item.timestamp);
        return {
          timestamp: isNaN(date.getTime()) ? `Point ${index}` : date.toLocaleTimeString(),
          value: typeof item.value === 'number' ? item.value : 0,
        };
      } catch {
        return {
          timestamp: `Point ${index}`,
          value: 0,
        };
      }
    }).filter(item => item !== null);
  };

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  if (error) {
    return <div>Error loading metrics: {error}</div>;
  }

  return (
    <div className="metrics-dashboard space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Device Metrics</h2>
        <Button
          onClick={refresh}
          variant="bordered"
          size="sm"
          startContent={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="flex items-center font-medium text-gray-700">
              <Cpu className="w-5 h-5 text-blue-600 mr-2" />
              CPU Usage (%)
            </h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="flex items-center font-medium text-gray-700">
              <HardDrive className="w-5 h-5 text-green-600 mr-2" />
              Memory Usage (%)
            </h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="flex items-center font-medium text-gray-700">
              <Thermometer className="w-5 h-5 text-red-500 mr-2" />
              CPU Temperature (°C)
            </h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temperatureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="flex items-center font-medium text-gray-700">
              <HardDrive className="w-5 h-5 text-purple-600 mr-2" />
              Disk Usage (%)
            </h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
