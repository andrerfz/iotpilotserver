/**
 * IotPilot ESP8266 Temperature Sensor Firmware
 *
 * Hardware: LILYGO T-OI V1.0 (ESP8266) + DS18B20 Temperature Sensor
 * Battery:  16340 Li-ion 3.7V (A0 has built-in voltage divider)
 *
 * Setup Flow:
 * 1. Power on → no EEPROM config → AP mode "IotPilot-Setup-XXXX"
 * 2. Customer connects, enters WiFi credentials + claiming token
 * 3. Device calls /api/devices/activate → gets API key + webhook URL
 * 4. Stores credentials in EEPROM, reboots into normal operation
 *
 * Normal Operation:
 * - Wake from deep sleep (D0 must be bridged to RST)
 * - Read DS18B20 temperature
 * - POST to webhook with API key
 * - Deep sleep for reportingInterval seconds
 *
 * Libraries:
 *   WiFiManager (tzapu), OneWire, DallasTemperature, ArduinoJson
 *
 * Manufacturing:
 *   make device-preregister COUNT=10
 *   make device-flash ID=IOT-XXXX-YYYY
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <ArduinoJson.h>

// ====================
// CONFIGURATION
// ====================

// Override at compile time: --build-property "compiler.cpp.extra_flags=-DDEVICE_ID=\"IOT-XXXX-YYYY\""
#ifndef DEVICE_ID
#define DEVICE_ID "IOT-XXXX-YYYY"
#endif

// Hardware pins (LILYGO T-OI V1.0)
#define TEMP_SENSOR_PIN   5     // GPIO5 (D1) — DS18B20 data
#define LED_PIN           2     // GPIO2 — onboard blue LED (LOW = on)
// A0 — battery voltage detection (built-in divider)

// Battery calibration (LILYGO T-OI V1.0 voltage divider)
#define BATTERY_DIVIDER_RATIO  7.37   // ADC 0-1V maps to 0-7.37V
#define BATTERY_FULL_V         4.2
#define BATTERY_EMPTY_V        3.0

#define EEPROM_SIZE       512
#define WIFI_AP_PASSWORD  "iotpilot123"
#define FIRMWARE_VERSION  "1.0.0"

// Activation server — override via build flag for production:
// -DACTIVATION_URL=\"https://app.iotpilot.com/api/devices/activate\"
#ifndef ACTIVATION_URL
#define ACTIVATION_URL    "http://192.168.0.168:3001/api/devices/activate"
#endif

// ====================
// EEPROM CONFIG
// ====================
struct Config {
  char magic[4];                  // "IOTP" = valid config
  char deviceId[16];
  char apiKey[80];
  char webhookUrl[128];
  uint16_t reportingInterval;     // Seconds between reports
  bool deepSleepEnabled;
  char __reserved[280];
};

Config config;

// ====================
// GLOBALS
// ====================
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature sensors(&oneWire);
WiFiManager wifiManager;
WiFiManagerParameter *param_claiming_token;

// ====================
// EEPROM
// ====================

void loadConfig() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(0, config);
  EEPROM.end();

  if (strncmp(config.magic, "IOTP", 4) != 0) {
    Serial.println("[EEPROM] No config — initializing");
    memset(&config, 0, sizeof(config));
    strncpy(config.magic, "IOTP", 4);
    strncpy(config.deviceId, DEVICE_ID, sizeof(config.deviceId));
    config.reportingInterval = 60;
    config.deepSleepEnabled = true;
  } else {
    Serial.print("[EEPROM] Device: "); Serial.println(config.deviceId);
    Serial.print("[EEPROM] API Key: "); Serial.println(strlen(config.apiKey) > 0 ? "SET" : "NOT SET");
  }
}

void saveConfig() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.put(0, config);
  EEPROM.commit();
  EEPROM.end();
}

bool isConfigured() {
  return strlen(config.apiKey) > 0 && strlen(config.webhookUrl) > 0;
}

// ====================
// BATTERY
// ====================

float readBatteryPercent() {
  float voltage = (analogRead(A0) / 1024.0) * BATTERY_DIVIDER_RATIO;
  float percent = (voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

// ====================
// TEMPERATURE
// ====================

float readTemperature() {
  for (int attempt = 1; attempt <= 3; attempt++) {
    sensors.requestTemperatures();
    delay(100);
    float temp = sensors.getTempCByIndex(0);

    if (temp != DEVICE_DISCONNECTED_C && temp != 85.0) {
      return temp;
    }
    Serial.printf("[SENSOR] Attempt %d failed\n", attempt);
    delay(200);
  }
  Serial.println("[SENSOR] Failed after 3 attempts");
  return -999.0;
}

// ====================
// WIFI
// ====================

bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin();

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] IP: %s  RSSI: %d dBm\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }

  Serial.println("\n[WiFi] Connection failed");
  return false;
}

// ====================
// ACTIVATION
// ====================

bool activateDevice(const char* claimingToken) {
  Serial.printf("[ACTIVATE] Device: %s  Token: %s\n", config.deviceId, claimingToken);

  HTTPClient http;
  WiFiClient client;
  http.begin(client, ACTIVATION_URL);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512);
  doc["deviceId"] = config.deviceId;
  doc["claimingToken"] = claimingToken;
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["deviceModel"] = "LILYGO-T-OI-V1";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    DynamicJsonDocument res(1024);
    deserializeJson(res, http.getString());

    JsonObject data = res["data"];
    const char* apiKey = data["credentials"]["apiKey"];
    const char* webhookUrl = data["credentials"]["webhookUrl"];

    if (apiKey && webhookUrl) {
      strncpy(config.apiKey, apiKey, sizeof(config.apiKey) - 1);
      strncpy(config.webhookUrl, webhookUrl, sizeof(config.webhookUrl) - 1);
      config.reportingInterval = data["config"]["reportingInterval"] | 7200;
      config.deepSleepEnabled = data["config"]["deepSleepEnabled"] | true;
      saveConfig();

      Serial.println("[ACTIVATE] Success — credentials stored");
      http.end();
      return true;
    }
  } else {
    Serial.printf("[ACTIVATE] Failed — HTTP %d: %s\n", httpCode, http.getString().c_str());
  }

  http.end();
  return false;
}

// ====================
// DATA TRANSMISSION
// ====================

bool sendData(float temperature) {
  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (strncmp(config.webhookUrl, "https", 5) == 0) {
    secureClient.setInsecure();
    http.begin(secureClient, config.webhookUrl);
  } else {
    http.begin(plainClient, config.webhookUrl);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", config.apiKey);

  DynamicJsonDocument doc(512);
  doc["deviceId"]        = config.deviceId;
  doc["batteryLevel"]    = readBatteryPercent();
  doc["rssi"]            = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["alertPending"]    = false;

  JsonArray readings = doc.createNestedArray("readings");
  JsonObject r = readings.createNestedObject();
  r["temperature"] = temperature;
  r["cycle"]       = 1;

  String payload;
  serializeJson(doc, payload);
  Serial.println("[SEND] " + payload);

  int httpCode = http.POST(payload);
  bool ok = (httpCode == 200);

  if (ok) {
    Serial.println("[SEND] OK");
  } else {
    Serial.printf("[SEND] Failed — HTTP %d\n", httpCode);
  }

  http.end();
  return ok;
}

// ====================
// WIFI SETUP PORTAL
// ====================

void setupWiFiManager() {
  char apName[32];
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%04X", ESP.getChipId() & 0xFFFF);

  param_claiming_token = new WiFiManagerParameter(
    "claiming_token", "Claiming Token (from app)", "", 9,
    "placeholder='XXXX-YYYY' pattern='[A-Z0-9]{4}-[A-Z0-9]{4}' required"
  );
  wifiManager.addParameter(param_claiming_token);
  wifiManager.setConfigPortalTimeout(300);
  wifiManager.setConnectTimeout(30);

  Serial.printf("[SETUP] Starting AP: %s\n", apName);

  if (!wifiManager.startConfigPortal(apName, WIFI_AP_PASSWORD)) {
    Serial.println("[SETUP] Timeout — restarting");
    delay(3000);
    ESP.restart();
    return;
  }

  Serial.printf("[SETUP] WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  String token = param_claiming_token->getValue();
  Serial.printf("[SETUP] Token: %s\n", token.c_str());

  if (token.length() > 0 && activateDevice(token.c_str())) {
    Serial.println("[SETUP] Complete — rebooting");
    delay(2000);
    ESP.restart();
  } else {
    Serial.println("[SETUP] Failed — resetting WiFi");
    wifiManager.resetSettings();
    delay(3000);
    ESP.restart();
  }
}

// ====================
// DEEP SLEEP
// ====================

void enterDeepSleep() {
  uint16_t interval = config.reportingInterval;

  Serial.printf("[SLEEP] %d seconds (D0→RST required)\n", interval);
  Serial.flush();

  digitalWrite(LED_PIN, HIGH);  // LED off
  ESP.deepSleep((uint64_t)interval * 1000000ULL);
}

// ====================
// SETUP
// ====================

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);  // LED on during activity

  Serial.println("\n[BOOT] IotPilot Sensor " FIRMWARE_VERSION);

  loadConfig();

  sensors.begin();
  Serial.printf("[SENSOR] %d sensor(s) on GPIO%d\n", sensors.getDeviceCount(), TEMP_SENSOR_PIN);

  if (!isConfigured()) {
    setupWiFiManager();
    return;
  }

  if (!connectWiFi()) {
    setupWiFiManager();
    return;
  }

  // Read + send
  float temp = readTemperature();
  if (temp != -999.0) {
    Serial.printf("[READ] %.2f C  Battery: %.0f%%\n", temp, readBatteryPercent());
    sendData(temp);
  }

  enterDeepSleep();
}

void loop() {
  // Not reached — deep sleep resets into setup()
}
