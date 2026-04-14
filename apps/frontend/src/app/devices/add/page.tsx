'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/contexts/auth-context';
import {Button, Card, CardBody, CardHeader, Input} from '@/components/ui';

import {ArrowLeft, Copy, Check, QrCode, Wifi} from 'lucide-react';

interface ClaimResult {
    deviceId: string;
    claimingToken: string;
    expiresAt: string;
    instructions: string;
}

export default function AddDevicePage() {
    const router = useRouter();
    const {apiCall} = useAuth();
    const [deviceId, setDeviceId] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
    const [copied, setCopied] = useState(false);

    const handleClaim = async () => {
        if (!deviceId.trim()) {
            setError('Device ID is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiCall('/api/devices/claim', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    deviceId: deviceId.trim().toUpperCase(),
                    name: deviceName.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to claim device');
            }

            setClaimResult(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim device');
        } finally {
            setLoading(false);
        }
    };

    const copyToken = () => {
        if (claimResult?.claimingToken) {
            navigator.clipboard.writeText(claimResult.claimingToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Step 1: Enter device ID
    if (!claimResult) {
        return (
            <div className="max-w-lg mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-1"/>
                    Back
                </button>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                        <h1 className="text-xl font-bold">Add Device</h1>
                        <p className="text-sm text-gray-500">
                            Enter the Device ID from your sensor label or scan the QR code
                        </p>
                    </CardHeader>
                    <CardBody className="px-6 pb-6 gap-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Device ID"
                            placeholder="IOT-XXXX-YYYY"
                            value={deviceId}
                            onValueChange={setDeviceId}
                            variant="bordered"
                            description="Found on the device label or QR code"
                            startContent={<QrCode className="w-4 h-4 text-gray-400"/>}
                            classNames={{input: 'uppercase'}}
                        />

                        <Input
                            label="Device Name (optional)"
                            placeholder="e.g. Kitchen Freezer"
                            value={deviceName}
                            onValueChange={setDeviceName}
                            variant="bordered"
                            description="A friendly name to identify this device"
                        />

                        <Button
                            color="primary"
                            onPress={handleClaim}
                            isLoading={loading}
                            className="w-full mt-2"
                            size="lg"
                        >
                            Claim Device
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Step 2: Show claiming token + setup instructions
    const expiresAt = new Date(claimResult.expiresAt);
    const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000));

    return (
        <div className="max-w-lg mx-auto">
            <button
                onClick={() => router.back()}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-1"/>
                Back to devices
            </button>

            <Card className="shadow-sm mb-4">
                <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500"/>
                        <h1 className="text-xl font-bold">Device Claimed!</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Now set up your device using the token below
                    </p>
                </CardHeader>
                <CardBody className="px-6 pb-6 gap-4">
                    {/* Claiming token display */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Setup Token</p>
                        <p className="text-4xl font-mono font-bold tracking-widest text-gray-900">
                            {claimResult.claimingToken}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            Expires in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
                        </p>
                        <Button
                            variant="flat"
                            size="sm"
                            onPress={copyToken}
                            className="mt-3"
                            startContent={copied ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                        >
                            {copied ? 'Copied!' : 'Copy token'}
                        </Button>
                    </div>

                    {/* Setup instructions */}
                    <div className="space-y-3 mt-2">
                        <h3 className="font-semibold text-sm">Setup Instructions</h3>

                        <div className="flex gap-3 items-start">
                            <div className="bg-primary-100 text-primary-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                            <p className="text-sm text-gray-600">
                                Power on your sensor device. It will create a WiFi hotspot.
                            </p>
                        </div>

                        <div className="flex gap-3 items-start">
                            <div className="bg-primary-100 text-primary-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                            <div className="text-sm text-gray-600">
                                <p>Connect your phone to the WiFi network:</p>
                                <div className="flex items-center gap-2 mt-1 bg-gray-100 rounded-lg px-3 py-2">
                                    <Wifi className="w-4 h-4 text-gray-500"/>
                                    <span className="font-mono font-medium">IotPilot-Setup-XXXX</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Password: <code className="bg-gray-100 px-1 rounded">iotpilot123</code></p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start">
                            <div className="bg-primary-100 text-primary-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                            <p className="text-sm text-gray-600">
                                A setup page will open automatically. Select your WiFi network and enter the <strong>setup token</strong> shown above.
                            </p>
                        </div>

                        <div className="flex gap-3 items-start">
                            <div className="bg-primary-100 text-primary-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                            <p className="text-sm text-gray-600">
                                The device will connect and start reporting automatically. You can close this page.
                            </p>
                        </div>
                    </div>

                    <Button
                        color="primary"
                        variant="flat"
                        onPress={() => router.push('/devices')}
                        className="w-full mt-4"
                    >
                        Go to My Devices
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}
