# Mobile App Implementation Plan

**Date Created**: 2025-10-29
**Status**: Pending
**Estimated Time**: 5-7 hours
**Framework**: Expo (React Native)

## Overview

This plan outlines the implementation of an Expo React Native mobile application within the existing IoT Pilot monorepo. The mobile app will provide device claiming functionality via QR code scanning, allowing customers to easily onboard their ESP8266 temperature sensors.

## Architecture Decision

**Chosen Approach**: Monorepo with npm workspaces

**Rationale**:
- Code sharing between web and mobile (TypeScript types, API client, domain logic)
- Atomic commits across all platforms
- Easier refactoring and dependency management
- Industry standard (Google, Facebook, Vercel)

**New Directory Structure**:
```
iotpilotserver/
├── apps/
│   ├── web/              # Next.js (moved from app/)
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── scripts/
│   │   ├── server.cjs
│   │   └── package.json
│   │
│   └── mobile/           # NEW - Expo app
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── navigation/
│       │   ├── hooks/
│       │   └── App.tsx
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/           # NEW - Shared code
│       ├── src/
│       │   ├── types/    # Shared TypeScript types
│       │   ├── api/      # API client
│       │   ├── utils/    # Utility functions
│       │   └── domain/   # Domain logic (CQRS)
│       ├── package.json
│       └── tsconfig.json
│
├── docker/               # Docker configs
├── docs/                 # Documentation
├── package.json          # Root workspace config
└── Makefile             # Updated with mobile commands
```

## Implementation Phases

### Phase 1: Restructure Monorepo (1 hour)

**Goal**: Create workspace structure and move existing code

**Steps**:

1. **Create root workspace configuration**
   ```bash
   # In root package.json, add:
   {
     "name": "iotpilot",
     "private": true,
     "workspaces": [
       "apps/*",
       "packages/*"
     ]
   }
   ```

2. **Move Next.js app to `apps/web/`**
   ```bash
   mkdir -p apps/web
   mv app/* apps/web/
   mv app/.* apps/web/ 2>/dev/null || true
   rmdir app
   ```

3. **Update paths in configuration files**
   - `docker-compose.yml`: Update volume mounts from `./app` to `./apps/web`
   - `Dockerfile`: Update WORKDIR and COPY paths
   - `Makefile`: Update all paths referencing `app/`

4. **Create shared package structure**
   ```bash
   mkdir -p packages/shared/src/{types,api,utils,domain}
   ```

5. **Test that web app still works**
   ```bash
   make local-restart-app
   make local-health
   ```

**Deliverables**:
- ✅ `apps/web/` with functioning Next.js app
- ✅ `packages/shared/` skeleton
- ✅ Updated Docker configs
- ✅ Verified web app runs successfully

---

### Phase 2: Initialize Expo App (1 hour)

**Goal**: Bootstrap Expo mobile app with TypeScript and navigation

**Steps**:

1. **Create Expo app**
   ```bash
   cd apps/
   npx create-expo-app mobile --template expo-template-blank-typescript
   cd mobile
   ```

2. **Install core dependencies**
   ```bash
   npm install @react-navigation/native @react-navigation/native-stack
   npm install react-native-screens react-native-safe-area-context
   npm install expo-camera expo-barcode-scanner
   npm install @tanstack/react-query axios
   npm install zustand
   ```

3. **Setup navigation structure**
   Create `src/navigation/AppNavigator.tsx`:
   ```typescript
   import { NavigationContainer } from '@react-navigation/native';
   import { createNativeStackNavigator } from '@react-navigation/native-stack';

   const Stack = createNativeStackNavigator();

   export function AppNavigator() {
     return (
       <NavigationContainer>
         <Stack.Navigator>
           <Stack.Screen name="Login" component={LoginScreen} />
           <Stack.Screen name="DeviceList" component={DeviceListScreen} />
           <Stack.Screen name="ScanQR" component={ScanQRScreen} />
           <Stack.Screen name="ClaimDevice" component={ClaimDeviceScreen} />
           <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
         </Stack.Navigator>
       </NavigationContainer>
     );
   }
   ```

4. **Setup shared package linking**
   In `apps/mobile/package.json`:
   ```json
   {
     "dependencies": {
       "@iotpilot/shared": "*"
     }
   }
   ```

5. **Configure TypeScript**
   Update `tsconfig.json` to reference shared package:
   ```json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "paths": {
         "@iotpilot/shared": ["../../packages/shared/src"]
       }
     }
   }
   ```

6. **Test Expo app runs**
   ```bash
   npm start
   # Scan QR code with Expo Go app on phone
   ```

**Deliverables**:
- ✅ `apps/mobile/` with working Expo app
- ✅ Navigation structure in place
- ✅ Dependencies installed
- ✅ Shared package linked
- ✅ App runs in Expo Go

---

### Phase 3: Implement Device Claiming Flow (2-3 hours)

**Goal**: Complete device claiming functionality

#### 3.1: Shared API Client (30 min)

Create `packages/shared/src/api/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

export class IotPilotApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, token?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password });
    return data;
  }

  // Devices
  async getDevices() {
    const { data } = await this.client.get('/api/devices');
    return data.devices;
  }

  async getDevice(deviceId: string) {
    const { data } = await this.client.get(`/api/devices/${deviceId}`);
    return data.device;
  }

  async claimDevice(deviceId: string, deviceName: string, location?: string) {
    const { data } = await this.client.post('/api/devices/claim', {
      deviceId,
      deviceName,
      location
    });
    return data;
  }

  // Types
  async getMetrics(deviceId: string, startDate: Date, endDate: Date) {
    const { data } = await this.client.get(`/api/devices/${deviceId}/metrics`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return data;
  }
}
```

Create `packages/shared/src/types/device.ts`:

```typescript
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNCLAIMED' | 'PENDING_SETUP' | 'ERROR';

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  status: DeviceStatus;
  ipAddress?: string;
  location?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  metadata?: {
    latestReading?: {
      temperature: number;
      humidity?: number;
      batteryLevel?: number;
      rssi?: number;
      timestamp: string;
    };
  };
}

export interface ClaimDeviceResponse {
  success: boolean;
  device: Device;
  setup: {
    claimingToken: string;
    tokenExpiry: Date;
    instructions: string[];
  };
}
```

#### 3.2: QR Scanner Screen (30 min)

Create `apps/mobile/src/screens/ScanQRScreen.tsx`:

```typescript
import { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

export function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);

    try {
      const qrData = JSON.parse(data);

      if (qrData.type === 'iotpilot_device' && qrData.deviceId) {
        navigation.navigate('ClaimDevice', {
          deviceId: qrData.deviceId
        });
      } else {
        alert('Invalid QR code');
        setScanned(false);
      }
    } catch (error) {
      alert('Invalid QR code format');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      {scanned && (
        <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 }
});
```

#### 3.3: Claim Device Screen (45 min)

Create `apps/mobile/src/screens/ClaimDeviceScreen.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '../hooks/useApiClient';

export function ClaimDeviceScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { deviceId } = route.params as { deviceId: string };
  const apiClient = useApiClient();

  const [deviceName, setDeviceName] = useState('');
  const [location, setLocation] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [claimingToken, setClaimingToken] = useState('');

  const claimMutation = useMutation({
    mutationFn: () => apiClient.claimDevice(deviceId, deviceName, location),
    onSuccess: (response) => {
      setClaimingToken(response.setup.claimingToken);
      setShowInstructions(true);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to claim device');
    }
  });

  const handleClaim = () => {
    if (!deviceName.trim()) {
      alert('Please enter a device name');
      return;
    }
    claimMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Claim Device</Text>
      <Text style={styles.subtitle}>Device ID: {deviceId}</Text>

      <TextInput
        style={styles.input}
        placeholder="Device Name (e.g., Living Room Sensor)"
        value={deviceName}
        onChangeText={setDeviceName}
      />

      <TextInput
        style={styles.input}
        placeholder="Location (optional)"
        value={location}
        onChangeText={setLocation}
      />

      <Button
        title="Claim Device"
        onPress={handleClaim}
        disabled={claimMutation.isPending}
      />

      {claimMutation.isPending && <ActivityIndicator style={styles.loader} />}

      {/* Setup Instructions Modal */}
      <Modal visible={showInstructions} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Device Setup Instructions</Text>

          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>Claiming Token:</Text>
            <Text style={styles.token}>{claimingToken}</Text>
            <Text style={styles.tokenExpiry}>Valid for 15 minutes</Text>
          </View>

          <Text style={styles.instructions}>
            1. Power on your device{'\n'}
            2. Connect to WiFi network "IotPilot-Setup-XXXX"{'\n'}
            3. Your phone will open a setup page{'\n'}
            4. Enter your WiFi credentials{'\n'}
            5. Enter the claiming token above{'\n'}
            6. Wait for device to connect (LED will turn solid green)
          </Text>

          <Button
            title="Done"
            onPress={() => {
              setShowInstructions(false);
              navigation.navigate('DeviceList');
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  loader: {
    marginTop: 16
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center'
  },
  tokenContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center'
  },
  tokenLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  token: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 4
  },
  tokenExpiry: {
    fontSize: 12,
    color: '#999'
  },
  instructions: {
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 24
  }
});
```

#### 3.4: Device List Screen (30 min)

Create `apps/mobile/src/screens/DeviceListScreen.tsx`:

```typescript
import { FlatList, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useApiClient } from '../hooks/useApiClient';
import type { Device } from '@iotpilot/shared/types';

export function DeviceListScreen() {
  const navigation = useNavigation();
  const apiClient = useApiClient();

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiClient.getDevices()
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return '#4ade80';
      case 'OFFLINE': return '#94a3b8';
      case 'PENDING_SETUP': return '#fbbf24';
      case 'ERROR': return '#ef4444';
      default: return '#cbd5e1';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Devices</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ScanQR')}
        >
          <Text style={styles.addButtonText}>+ Add Device</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceCard}
            onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
          >
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.deviceId}>ID: {item.deviceId}</Text>

            {item.metadata?.latestReading && (
              <View style={styles.readingContainer}>
                <Text style={styles.temperature}>
                  {item.metadata.latestReading.temperature.toFixed(1)}°C
                </Text>
                {item.metadata.latestReading.batteryLevel && (
                  <Text style={styles.battery}>
                    🔋 {item.metadata.latestReading.batteryLevel.toFixed(0)}%
                  </Text>
                )}
              </View>
            )}

            {item.lastSeenAt && (
              <Text style={styles.lastSeen}>
                Last seen: {new Date(item.lastSeenAt).toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  deviceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12
  },
  readingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 16
  },
  battery: {
    fontSize: 14,
    color: '#6b7280'
  },
  lastSeen: {
    fontSize: 12,
    color: '#9ca3af'
  }
});
```

#### 3.5: Device Detail Screen (30 min)

Create `apps/mobile/src/screens/DeviceDetailScreen.tsx`:

```typescript
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../hooks/useApiClient';

export function DeviceDetailScreen() {
  const route = useRoute();
  const { deviceId } = route.params as { deviceId: string };
  const apiClient = useApiClient();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => apiClient.getDevice(deviceId),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!device) {
    return <Text>Device not found</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.id}>ID: {device.deviceId}</Text>

        {device.metadata?.latestReading && (
          <>
            <View style={styles.temperatureContainer}>
              <Text style={styles.temperatureLabel}>Temperature</Text>
              <Text style={styles.temperatureValue}>
                {device.metadata.latestReading.temperature.toFixed(1)}°C
              </Text>
            </View>

            {device.metadata.latestReading.humidity !== undefined && (
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Humidity</Text>
                <Text style={styles.metricValue}>
                  {device.metadata.latestReading.humidity.toFixed(0)}%
                </Text>
              </View>
            )}

            {device.metadata.latestReading.batteryLevel !== undefined && (
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Battery</Text>
                <Text style={styles.metricValue}>
                  {device.metadata.latestReading.batteryLevel.toFixed(0)}%
                </Text>
              </View>
            )}

            {device.metadata.latestReading.rssi !== undefined && (
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>WiFi Signal</Text>
                <Text style={styles.metricValue}>
                  {device.metadata.latestReading.rssi} dBm
                </Text>
              </View>
            )}

            <Text style={styles.timestamp}>
              Updated: {new Date(device.metadata.latestReading.timestamp).toLocaleString()}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Device Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{device.status}</Text>
        </View>
        {device.ipAddress && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IP Address</Text>
            <Text style={styles.infoValue}>{device.ipAddress}</Text>
          </View>
        )}
        {device.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{device.location}</Text>
          </View>
        )}
        {device.lastSeenAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Seen</Text>
            <Text style={styles.infoValue}>
              {new Date(device.lastSeenAt).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  id: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 24
  },
  temperatureContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  temperatureLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8
  },
  temperatureValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  metricLabel: {
    fontSize: 16,
    color: '#6b7280'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937'
  }
});
```

**Deliverables**:
- ✅ Shared API client in `packages/shared/`
- ✅ Shared TypeScript types
- ✅ QR scanner screen
- ✅ Claim device screen with setup instructions
- ✅ Device list screen
- ✅ Device detail screen with live data
- ✅ Complete claiming flow end-to-end

---

### Phase 4: Setup Development Workflow (30 min)

**Goal**: Integrate mobile commands into Makefile

**Steps**:

1. **Add mobile commands to Makefile**

Add to `/Users/andrerfz/Proyectos/iotpilotserver/Makefile`:

```makefile
# ===================================
# Mobile App Commands (Expo)
# ===================================

.PHONY: mobile-install mobile-start mobile-ios mobile-android mobile-build-ios mobile-build-android

mobile-install: ## Install mobile app dependencies
	@echo "📱 Installing mobile app dependencies..."
	cd apps/mobile && npm install

mobile-start: ## Start Expo development server
	@echo "📱 Starting Expo development server..."
	@echo "📱 Scan the QR code with Expo Go app on your phone"
	cd apps/mobile && npm start

mobile-ios: ## Start iOS simulator (requires macOS + Xcode)
	@echo "📱 Starting iOS simulator..."
	cd apps/mobile && npm run ios

mobile-android: ## Start Android emulator (requires Android Studio)
	@echo "📱 Starting Android emulator..."
	cd apps/mobile && npm run android

mobile-build-ios: ## Build iOS app (requires EAS account)
	@echo "📱 Building iOS app..."
	cd apps/mobile && eas build --platform ios

mobile-build-android: ## Build Android app (requires EAS account)
	@echo "📱 Building Android app..."
	cd apps/mobile && eas build --platform android

mobile-test: ## Run mobile tests
	@echo "🧪 Running mobile tests..."
	cd apps/mobile && npm test

mobile-lint: ## Lint mobile code
	@echo "🔍 Linting mobile code..."
	cd apps/mobile && npm run lint
```

2. **Update workspace install command**

```makefile
install-all: ## Install dependencies for all workspaces
	@echo "📦 Installing all workspace dependencies..."
	npm install
	cd apps/web && npm install
	cd apps/mobile && npm install
	cd packages/shared && npm install
```

3. **Add environment variable for API URL**

Create `apps/mobile/.env`:

```bash
# Local development (replace with your machine's IP)
EXPO_PUBLIC_API_URL=https://iotpilotserver.test:9443

# Production
# EXPO_PUBLIC_API_URL=https://api.iotpilot.com
```

**Note**: On local network, you'll need to use your computer's IP address instead of `localhost` for the mobile app to connect. Update `.env` with your local IP (e.g., `http://192.168.1.100:9443`).

**Deliverables**:
- ✅ Makefile with mobile commands
- ✅ Environment configuration
- ✅ Simple workflow for starting mobile dev server

---

### Phase 5: Create Supporting Documentation (30 min)

**Goal**: Document mobile setup and development workflow

**Steps**:

1. **Create Mobile README**

Create `apps/mobile/README.md`:

```markdown
# IoT Pilot Mobile App

React Native mobile application built with Expo for managing IoT devices.

## Features

- QR code scanning for device claiming
- Real-time device status monitoring
- Temperature readings display
- Device list and detail views
- JWT authentication

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your phone (iOS/Android)

### Setup

1. Install dependencies:
   ```bash
   make mobile-install
   ```

2. Configure API URL:
   ```bash
   cd apps/mobile
   cp .env.example .env
   # Edit .env with your local IP address
   ```

3. Start development server:
   ```bash
   make mobile-start
   ```

4. Scan QR code with Expo Go app

### Building for Production

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure build:
   ```bash
   eas build:configure
   ```

4. Build for iOS:
   ```bash
   make mobile-build-ios
   ```

5. Build for Android:
   ```bash
   make mobile-build-android
   ```

## Project Structure

```
apps/mobile/
├── src/
│   ├── screens/        # Screen components
│   ├── components/     # Reusable components
│   ├── navigation/     # Navigation setup
│   ├── hooks/          # Custom hooks
│   └── App.tsx         # Root component
├── app.json            # Expo configuration
├── package.json
└── tsconfig.json
```

## Shared Code

This app uses shared code from `@iotpilot/shared` package:

- API client
- TypeScript types
- Domain logic
- Utility functions

## Testing on Device

### Physical Device (Recommended for QR Scanning)

1. Install Expo Go from App Store / Play Store
2. Run `make mobile-start`
3. Scan QR code from terminal
4. App will load on your device

### iOS Simulator (macOS only)

```bash
make mobile-ios
```

### Android Emulator

```bash
make mobile-android
```

## Troubleshooting

### Cannot connect to API

- Ensure your phone and computer are on the same WiFi network
- Update `EXPO_PUBLIC_API_URL` in `.env` with your computer's IP address
- Check that backend is running: `make local-health`

### Camera permission denied

- On iOS: Settings > Privacy > Camera > Expo Go > Enable
- On Android: Settings > Apps > Expo Go > Permissions > Camera > Allow

### QR Scanner not working

- Ensure good lighting
- Hold phone steady
- Try cleaning camera lens
- Restart Expo Go app
```

2. **Update main README**

Add mobile section to root `README.md`:

```markdown
## Mobile App

The mobile app is built with Expo (React Native) and provides:

- QR code device claiming
- Real-time device monitoring
- Temperature readings
- Device management

See `apps/mobile/README.md` for mobile-specific documentation.

### Quick Start

```bash
make mobile-install
make mobile-start
# Scan QR code with Expo Go app
```
```

3. **Create troubleshooting guide**

Create `docs/MOBILE_DEVELOPMENT.md` with:

- Local network setup
- SSL certificate trust on mobile
- Common Expo issues
- Build process
- App Store / Play Store submission

**Deliverables**:
- ✅ Mobile README
- ✅ Updated root README
- ✅ Mobile development guide
- ✅ Troubleshooting documentation

---

### Phase 6: Testing and Polish (1 hour)

**Goal**: Verify end-to-end functionality and polish UX

**Testing Checklist**:

#### Backend Integration

- [ ] Web app runs after restructure: `make local-restart-app`
- [ ] Health check passes: `make local-health`
- [ ] Database migrations applied: `make migrate`
- [ ] Device claiming API works: Test `/api/devices/claim` endpoint

#### Mobile App

- [ ] App loads in Expo Go
- [ ] Login screen works with real credentials
- [ ] Device list shows actual devices from backend
- [ ] "Add Device" button navigates to QR scanner
- [ ] QR scanner requests camera permission
- [ ] QR scanner successfully reads device QR code
- [ ] Claim device screen shows correct device ID
- [ ] Claiming token is displayed after successful claim
- [ ] Device appears in list after claiming
- [ ] Device detail screen shows live temperature data
- [ ] Pull to refresh works on device list
- [ ] Navigation works correctly between all screens

#### End-to-End Flow

- [ ] Pre-register device: `node apps/web/scripts/preregister-devices.js --count 1 --qr`
- [ ] Print QR code or display on screen
- [ ] Scan QR with mobile app
- [ ] Enter device name and claim
- [ ] Copy claiming token
- [ ] Power on ESP8266 device
- [ ] Connect to device WiFi portal
- [ ] Enter claiming token
- [ ] Device connects and sends first reading
- [ ] Reading appears in mobile app
- [ ] Reading appears in web dashboard

#### Polish

- [ ] Add loading states to all screens
- [ ] Add error handling with user-friendly messages
- [ ] Add empty states (no devices, no readings)
- [ ] Add pull-to-refresh on all lists
- [ ] Add proper TypeScript types everywhere
- [ ] Remove console.logs
- [ ] Add app icon and splash screen
- [ ] Test on both iOS and Android
- [ ] Test offline behavior

**Deliverables**:
- ✅ All tests passing
- ✅ End-to-end flow verified
- ✅ UX polish completed
- ✅ Documentation updated with any changes

---

## File Changes Summary

### Files to Create

```
apps/mobile/                           # Complete Expo app
packages/shared/                       # Shared code package
docs/MOBILE_DEVELOPMENT.md            # Mobile dev guide
apps/mobile/README.md                 # Mobile README
apps/mobile/.env                      # Environment config
```

### Files to Move

```
app/ → apps/web/                      # Next.js app relocation
```

### Files to Modify

```
package.json                          # Add workspaces config
docker-compose.yml                    # Update volume paths
Dockerfile                            # Update WORKDIR and COPY
Makefile                              # Add mobile commands
README.md                             # Add mobile section
.gitignore                            # Add Expo ignores
```

---

## Timeline Estimate

| Phase | Duration | Critical Path |
|-------|----------|---------------|
| Phase 1: Restructure | 1 hour | Yes - Blocks all other work |
| Phase 2: Initialize Expo | 1 hour | Yes - Required for Phase 3 |
| Phase 3: Implement Features | 2-3 hours | Yes - Core functionality |
| Phase 4: Development Workflow | 30 min | No - Can be done in parallel |
| Phase 5: Documentation | 30 min | No - Can be done in parallel |
| Phase 6: Testing & Polish | 1 hour | Yes - Final verification |
| **Total** | **5-7 hours** | |

---

## Success Criteria

- [ ] Monorepo structure in place with apps/ and packages/
- [ ] Web app still works after restructure
- [ ] Mobile app runs in Expo Go
- [ ] QR scanner successfully reads device QR codes
- [ ] Device claiming flow works end-to-end
- [ ] Mobile app displays live temperature data from backend
- [ ] Shared code successfully used by both web and mobile
- [ ] Documentation is complete and accurate
- [ ] All Makefile commands work correctly

---

## Next Steps After Implementation

1. **Authentication Enhancements**
   - Implement secure token storage (react-native-keychain)
   - Add biometric authentication (Face ID / Fingerprint)
   - Implement refresh token rotation

2. **Additional Features**
   - Temperature history charts
   - Alert configuration
   - Push notifications for alerts
   - Device settings management

3. **BLE Support (Future)**
   - Add expo-bluetooth when needed
   - Implement device discovery
   - BLE claiming flow for devices without WiFi

4. **App Store Deployment**
   - Create app icons and splash screens
   - Write app descriptions
   - Submit to Apple App Store ($99/year)
   - Submit to Google Play Store ($25 one-time)

---

## Notes

- This plan assumes the device claiming backend is already implemented (API endpoints exist)
- The mobile app will use the existing authentication system (JWT)
- Camera permissions are required for QR scanning
- Local development requires phone and computer on same network
- SSL certificates may need to be trusted on mobile devices for local HTTPS
- Expo Go has some limitations; production build will have full native access
