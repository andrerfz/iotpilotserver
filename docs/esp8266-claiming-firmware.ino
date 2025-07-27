/**
 * IotPilot ESP8266 Temperature Sensor with Claiming Flow
 *
 * Hardware: LILYGO T-OI ESP8266 + DS18B20 Temperature Sensor
 *
 * Features:
 * - WiFiManager for easy WiFi setup
 * - Device claiming flow with token validation
 * - Deep sleep for battery efficiency
 * - Persistent EEPROM storage
 * - Automatic reconnection
 *
 * Setup Flow:
 * 1. Power on → Check if configured
 * 2. If not configured → Start AP mode "IotPilot-Setup-XXXX"
 * 3. User connects and enters WiFi + Claiming Token
 * 4. Device validates token with backend
 * 5. Backend returns API key → Device stores in EEPROM
 * 6. Device reboots into normal operation
 *
 * Normal Operation:
 * - Wake from deep sleep
 * - Read temperature
 * - POST to webhook with API key
 * - Deep sleep for N minutes
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>  // https://github.com/tzapu/WiFiManager
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <ArduinoJson.h>  // https://github.com/bblanchon/ArduinoJson

// ====================
// DEVICE CONFIGURATION
// ====================

// IMPORTANT: This must be unique per device and match the pre-registered ID in database
// In production, this would be burned into flash during manufacturing
#define DEVICE_ID "IOT-XXXX-YYYY"  // CHANGE THIS FOR EACH DEVICE

#define TEMP_SENSOR_PIN 4         // GPIO4 (D2) - DS18B20 data pin
#define DEEP_SLEEP_MINUTES 60     // How long to sleep between readings
#define EEPROM_SIZE 512           // EEPROM size in bytes

// ====================
// EEPROM MEMORY MAP
// ====================
struct Config {
  char magic[4];                  // "IOTP" - validates config exists
  char deviceId[16];              // Device ID
  char apiKey[80];                // API key for authentication
  char webhookUrl[128];           // Webhook URL
  uint16_t reportingInterval;     // Seconds between reports
  bool deepSleepEnabled;          // Enable deep sleep
  char __padding[280];            // Reserved for future use
};

Config config;

// ====================
// GLOBALS
// ====================
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature sensors(&oneWire);
WiFiManager wifiManager;

// Custom parameters for claiming flow
WiFiManagerParameter *param_claiming_token;

// ====================
// EEPROM FUNCTIONS
// ====================

void loadConfig() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(0, config);
  EEPROM.end();

  // Check if config is valid
  if (strncmp(config.magic, "IOTP", 4) != 0) {
    Serial.println("⚠️ No valid config found in EEPROM");
    // Initialize with defaults
    memset(&config, 0, sizeof(config));
    strncpy(config.magic, "IOTP", 4);
    strncpy(config.deviceId, DEVICE_ID, sizeof(config.deviceId));
    config.reportingInterval = 60;
    config.deepSleepEnabled = true;
  } else {
    Serial.println("✅ Config loaded from EEPROM");
    Serial.print("   Device ID: "); Serial.println(config.deviceId);
    Serial.print("   API Key: "); Serial.println(strlen(config.apiKey) > 0 ? "***SET***" : "NOT SET");
  }
}

void saveConfig() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.put(0, config);
  EEPROM.commit();
  EEPROM.end();
  Serial.println("✅ Config saved to EEPROM");
}

bool isConfigured() {
  return strlen(config.apiKey) > 0 && strlen(config.webhookUrl) > 0;
}

// ====================
// DEVICE ACTIVATION
// ====================

bool activateDevice(const char* claimingToken) {
  Serial.println("\n🔐 Activating device with backend...");
  Serial.print("   Device ID: "); Serial.println(config.deviceId);
  Serial.print("   Token: "); Serial.println(claimingToken);

  WiFiClientSecure client;
  client.setInsecure(); // For development; use proper cert validation in production
  HTTPClient http;

  String activationUrl = "https://iotpilotserver.test:9443/api/devices/activate";

  http.begin(client, activationUrl);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = config.deviceId;
  doc["claimingToken"] = claimingToken;
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = "1.0.0";
  doc["deviceModel"] = "ESP8266-DS18B20";

  String payload;
  serializeJson(doc, payload);

  Serial.println("📤 Sending activation request...");
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("📥 Response code: "); Serial.println(httpCode);

    if (httpCode == 200) {
      // Parse response
      DynamicJsonDocument responseDoc(1024);
      DeserializationError error = deserializeJson(responseDoc, response);

      if (error) {
        Serial.print("❌ JSON parse error: "); Serial.println(error.c_str());
        http.end();
        return false;
      }

      // Extract credentials
      const char* apiKey = responseDoc["credentials"]["apiKey"];
      const char* webhookUrl = responseDoc["credentials"]["webhookUrl"];
      int reportingInterval = responseDoc["config"]["reportingInterval"] | 60;
      bool deepSleepEnabled = responseDoc["config"]["deepSleepEnabled"] | true;

      if (apiKey && webhookUrl) {
        // Save to EEPROM
        strncpy(config.apiKey, apiKey, sizeof(config.apiKey) - 1);
        strncpy(config.webhookUrl, webhookUrl, sizeof(config.webhookUrl) - 1);
        config.reportingInterval = reportingInterval;
        config.deepSleepEnabled = deepSleepEnabled;
        saveConfig();

        Serial.println("✅ Device activated successfully!");
        Serial.println("   API Key stored in EEPROM");
        Serial.println("   Webhook URL configured");
        http.end();
        return true;
      } else {
        Serial.println("❌ Missing credentials in response");
      }
    } else {
      Serial.print("❌ Activation failed: "); Serial.println(response);
    }
  } else {
    Serial.print("❌ HTTP request failed: "); Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return false;
}

// ====================
// WIFI SETUP
// ====================

void setupWiFiManager() {
  Serial.println("\n📡 Starting WiFi Manager...");

  // Custom AP name with device ID
  char apName[32];
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%04X", ESP.getChipId() & 0xFFFF);

  // Add custom parameter for claiming token
  param_claiming_token = new WiFiManagerParameter(
    "claiming_token",
    "Claiming Token (from app)",
    "",
    9,  // Max length (XXXX-YYYY)
    "placeholder='XXXX-YYYY' pattern='[A-Z0-9]{4}-[A-Z0-9]{4}' required"
  );
  wifiManager.addParameter(param_claiming_token);

  // Configure portal
  wifiManager.setConfigPortalTimeout(300); // 5 minutes timeout
  wifiManager.setConnectTimeout(30);       // 30 seconds to connect

  // Set callback for when user saves config
  wifiManager.setSaveConfigCallback([]() {
    Serial.println("✅ WiFi credentials saved");

    // Get claiming token from user input
    String claimingToken = param_claiming_token->getValue();
    Serial.print("🔑 Claiming Token: "); Serial.println(claimingToken);

    if (claimingToken.length() > 0) {
      // Activate device with backend
      if (activateDevice(claimingToken.c_str())) {
        Serial.println("✅ Device setup complete! Rebooting...");
        delay(2000);
        ESP.restart();
      } else {
        Serial.println("❌ Activation failed. Please try setup again.");
        // Portal will close, device will restart and try again
      }
    } else {
      Serial.println("❌ No claiming token provided");
    }
  });

  // Start captive portal
  if (!wifiManager.startConfigPortal(apName, "iotpilot123")) {
    Serial.println("❌ Failed to connect or setup timeout");
    delay(3000);
    ESP.restart();
  }
}

// ====================
// TEMPERATURE READING
// ====================

float readTemperature() {
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0);

  if (temp == DEVICE_DISCONNECTED_C) {
    Serial.println("❌ Temperature sensor not found!");
    return -999;
  }

  return temp;
}

// ====================
// DATA TRANSMISSION
// ====================

bool sendTemperatureData(float temperature) {
  Serial.println("\n📤 Sending temperature data...");

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, config.webhookUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + config.apiKey);

  // Build JSON payload
  DynamicJsonDocument doc(256);
  doc["deviceId"] = config.deviceId;
  doc["temperature"] = temperature;
  doc["unit"] = "celsius";
  doc["batteryLevel"] = ((float)analogRead(A0) / 1024.0) * 100;  // Rough estimate
  doc["rssi"] = WiFi.RSSI();
  doc["timestamp"] = ""; // Server will use current time

  String payload;
  serializeJson(doc, payload);
  Serial.println("   Payload: " + payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("📥 Response code: "); Serial.println(httpCode);
    Serial.println("   Response: " + response);

    if (httpCode == 200) {
      Serial.println("✅ Data sent successfully");
      http.end();
      return true;
    }
  } else {
    Serial.print("❌ HTTP request failed: "); Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return false;
}

// ====================
// SETUP
// ====================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════════════╗");
  Serial.println("║   IotPilot Temperature Sensor v1.0   ║");
  Serial.println("╚═══════════════════════════════════════╝");

  // Load config from EEPROM
  loadConfig();

  // Initialize temperature sensor
  sensors.begin();
  Serial.print("🌡️  Found "); Serial.print(sensors.getDeviceCount()); Serial.println(" temperature sensor(s)");

  // Check if device is configured
  if (!isConfigured()) {
    Serial.println("\n⚠️  Device not configured!");
    Serial.println("   Starting WiFi setup portal...");
    setupWiFiManager();
  } else {
    Serial.println("\n✅ Device is configured");
    Serial.println("   Connecting to WiFi...");

    // Connect to saved WiFi
    WiFi.mode(WIFI_STA);
    WiFi.begin();

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\n❌ Failed to connect to WiFi");
      Serial.println("   Restarting setup...");
      setupWiFiManager();
    } else {
      Serial.println("\n✅ WiFi connected");
      Serial.print("   IP: "); Serial.println(WiFi.localIP());
      Serial.print("   RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
    }
  }
}

// ====================
// MAIN LOOP
// ====================

void loop() {
  // Read temperature
  float temperature = readTemperature();

  if (temperature != -999) {
    Serial.print("\n🌡️  Temperature: "); Serial.print(temperature); Serial.println("°C");

    // Send data to backend
    bool success = sendTemperatureData(temperature);

    if (success) {
      Serial.println("✅ Data transmission complete");
    } else {
      Serial.println("⚠️  Data transmission failed (will retry next cycle)");
    }
  } else {
    Serial.println("⚠️  Skipping transmission - invalid temperature reading");
  }

  // Deep sleep if enabled
  if (config.deepSleepEnabled) {
    uint64_t sleepMicros = (uint64_t)config.reportingInterval * 1000000ULL;
    Serial.print("\n😴 Entering deep sleep for ");
    Serial.print(config.reportingInterval);
    Serial.println(" seconds...");
    Serial.println("   (Connect D0 to RST for wake-up)");
    delay(100);

    ESP.deepSleep(sleepMicros);
  } else {
    // Regular sleep (testing mode)
    Serial.print("\n⏸️  Sleeping for "); Serial.print(config.reportingInterval); Serial.println(" seconds...");
    delay(config.reportingInterval * 1000);
  }
}

// ====================
// NOTES FOR PRODUCTION
// ====================

/*
 * PRE-FLASH CHECKLIST:
 *
 * 1. Change DEVICE_ID to match pre-registered device in database
 * 2. Update API URL to production domain
 * 3. Enable SSL certificate validation (remove setInsecure())
 * 4. Solder D0 to RST bridge for deep sleep wake-up
 * 5. Test claiming flow end-to-end
 * 6. Verify battery life with 60-minute intervals
 * 7. Print Device ID + QR code on label
 * 8. Include setup instructions card in package
 *
 * MANUFACTURING WORKFLOW:
 *
 * 1. Run: node scripts/preregister-devices.js --count 100 --qr --output batch1.csv
 * 2. Flash firmware with unique DEVICE_ID for each unit
 * 3. Print and attach QR code labels
 * 4. Test one full cycle (claim → setup → data transmission)
 * 5. Package with instructions card
 * 6. Ship to customer
 */
