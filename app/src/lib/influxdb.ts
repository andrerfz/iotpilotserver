interface InfluxConfig {
    url: string;
    token: string;
    org: string;
    bucket: string;
}

interface ValidationResult {
    isValid: boolean;
    config?: InfluxConfig;
    error?: string;
}

export function validateInfluxConfig(): ValidationResult {
    const url = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    const org = process.env.INFLUXDB_ORG;
    const bucket = process.env.INFLUXDB_BUCKET;

    if (!url) {
        return { isValid: false, error: 'INFLUXDB_URL not configured' };
    }

    if (!token) {
        return { isValid: false, error: 'INFLUXDB_TOKEN not configured' };
    }

    // Use defaults if not provided
    const finalOrg = org || 'iotpilot';
    const finalBucket = bucket || 'devices';

    return {
        isValid: true,
        config: {
            url,
            token,
            org: finalOrg,
            bucket: finalBucket
        }
    };
}

export function formatMetricsForInflux(data: any, timestamp?: number): string {
    const points: string[] = [];
    const ts = timestamp || new Date().getTime() * 1000000; // nanoseconds

    // Escape special characters in device_id
    const deviceId = data.device_id.replace(/([, =])/g, '\\$1');

    // Map metrics to InfluxDB line protocol
    const metricMappings = {
        cpu_usage: 'cpu_usage',
        cpu_temperature: 'cpu_temperature',
        memory_usage_percent: 'memory_usage',
        disk_usage_percent: 'disk_usage'
    };

    Object.entries(metricMappings).forEach(([key, measurement]) => {
        if (data[key] !== undefined && typeof data[key] === 'number') {
            points.push(`${measurement},device_id=${deviceId} value=${data[key]} ${ts}`);
        }
    });

    return points.join('\n');
}

export async function sendToInfluxDB(data: any): Promise<void> {
    try {
        const validation = validateInfluxConfig();
        if (!validation.isValid) {
            console.log('InfluxDB not configured, skipping metrics storage');
            return;
        }

        const { url, token, org, bucket } = validation.config!;
        const points = formatMetricsForInflux(data);

        if (!points) {
            return; // No metrics to send
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${url}/api/v2/write?org=${org}&bucket=${bucket}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'text/plain'
            },
            body: points,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('Failed to send metrics to InfluxDB:', response.statusText);
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('InfluxDB request timed out');
        } else {
            console.error('Error sending metrics to InfluxDB:', error);
        }
    }
}