/**
 * IotPilot ESP32-C3 Temperature Sensor Firmware
 *
 * Hardware: LILYGO TTGO T-OI Plus (ESP32-C3) + DS18B20 Temperature Sensor
 * Battery:  16340 Li-ion 3.7V (GPIO1 has built-in voltage divider ÷2)
 *
 * Pin mapping (LILYGO T-OI Plus):
 *   GPIO3  — Blue LED (active LOW)
 *   GPIO1  — Battery ADC (voltage divider: battery/2 → ADC)
 *   GPIO5  — DS18B20 data (connect via 4.7kΩ pull-up to 3.3V)
 *
 * Setup Flow:
 * 1. Power on → no NVS config → AP mode "IotPilot-Setup-XXXX"
 * 2. Customer connects, enters WiFi credentials + claiming token
 * 3. Device calls /api/devices/activate → gets API key + webhook URL
 * 4. Stores credentials in NVS (Preferences), reboots into normal operation
 *
 * Normal Operation:
 * - Wake from deep sleep (timer wakeup)
 * - Read DS18B20 temperature
 * - POST to webhook with API key
 * - Deep sleep for reportingInterval seconds
 *
 * WiFi failure handling:
 * - Up to MAX_WIFI_FAILS consecutive failures sleep and retry next cycle
 * - Only enters setup portal after MAX_WIFI_FAILS consecutive failures
 * - Setup portal preserves existing credentials if no claiming token entered
 *   (WiFi-only change without re-activation)
 *
 * Factory reset:
 * - Hold BOOT button (GPIO9) for 5 seconds on power-up
 * - LED blinks rapidly to confirm
 * - Clears all NVS config and WiFi credentials → back to factory state
 *
 * Libraries:
 *   WiFiManager (tzapu/tablatronix), OneWire, DallasTemperature, ArduinoJson
 *
 * Manufacturing:
 *   make device-preregister COUNT=10
 *   make device-flash-esp32c3 ID=IOT-XXXX-YYYY
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>   // BLE setup-mode provisioning (fe-ble-claiming A2/A3)

// ====================
// CONFIGURATION
// ====================

// Override at compile time:
// --build-property "compiler.cpp.extra_flags=-DDEVICE_ID=\"IOT-XXXX-YYYY\""
#ifndef DEVICE_ID
#define DEVICE_ID "IOT-XXXX-YYYY"
#endif

// Hardware pins (LILYGO T-OI Plus V1.3 ESP32-C3)
#define TEMP_SENSOR_PIN   5     // GPIO5 — DS18B20 data (4.7kΩ pull-up to 3.3V)
#define LED_PIN           3     // GPIO3 — IO3 controllable green LED (active HIGH)
#define LED_ON            HIGH
#define LED_OFF           LOW
#define BATTERY_ADC_PIN   2     // GPIO2 — ADC1_CH2, battery via ÷2 divider (confirmed in official LILYGO example)

// Battery calibration (T-OI Plus: two equal resistors → ÷2 divider)
// Uses esp_adc_cal for accurate mV readings (corrects ESP32-C3 ADC non-linearity).
#define BATTERY_DIVIDER_RATIO  2.0
#define BATTERY_FULL_V         4.10  // ADC reads ~4.10V at full charge on T-OI Plus; constrain() clamps >100% anyway
#define BATTERY_EMPTY_V        3.0
#define BATTERY_LOW_THRESHOLD  15.0      // % — flag alertPending when below this

#define NVS_NAMESPACE          "iotpilot"
#define WIFI_AP_PASSWORD       "iotpilot123"
#define FIRMWARE_VERSION       "1.2.0"
#define FACTORY_RESET_PIN      9        // GPIO9 — BOOT button (active LOW, internal pull-up)
#define FACTORY_RESET_HOLD_MS  5000     // Hold 5 seconds to trigger factory reset

// Consecutive WiFi failures before entering setup portal
#define MAX_WIFI_FAILS         3
#define WIFI_RETRY_INTERVAL    60        // seconds between WiFi retry cycles

// Bounds for reportingInterval received from server (seconds)
#define MIN_REPORTING_INTERVAL 60
#define MAX_REPORTING_INTERVAL 86400     // 24 hours

// Activation server — override via build flag:
// -DACTIVATION_URL=\"https://dashboarddev.iotpilot.app/api/devices/activate\"
#ifndef ACTIVATION_URL
#define ACTIVATION_URL    "https://dashboard.iotpilot.app/api/devices/activate"
#endif

// ====================
// RTC STATE (survives deep sleep)
// ====================

// Counts consecutive WiFi failures across sleep cycles.
// Reset to 0 on successful connection.
RTC_DATA_ATTR int wifiFailCount = 0;

// Offline reading buffer — accumulates readings when WiFi is unavailable.
// Sent in bulk on next successful connection. Survives deep sleep, lost on power-off.
#define MAX_BUFFERED_READINGS 48  // 48 × 30min = 24h buffer at default interval

struct BufferedReading {
  float temperature;
};

RTC_DATA_ATTR BufferedReading readingBuffer[MAX_BUFFERED_READINGS];
RTC_DATA_ATTR int             bufferCount = 0;

// ====================
// NVS CONFIG (Preferences)
// ====================

Preferences prefs;

struct Config {
  char deviceId[16];
  char apiKey[80];
  char webhookUrl[128];
  uint16_t reportingInterval;
  bool deepSleepEnabled;
};

Config config;

void loadConfig() {
  prefs.begin(NVS_NAMESPACE, true);  // read-only

  String storedId = prefs.getString("deviceId", "");

  if (storedId.isEmpty()) {
    Serial.println("[NVS] No config — initializing defaults");
    memset(&config, 0, sizeof(config));
    strncpy(config.deviceId, DEVICE_ID, sizeof(config.deviceId) - 1);
    config.reportingInterval = 60;
    config.deepSleepEnabled = true;
  } else {
    storedId.toCharArray(config.deviceId, sizeof(config.deviceId));
    prefs.getString("apiKey", "").toCharArray(config.apiKey, sizeof(config.apiKey));
    prefs.getString("webhookUrl", "").toCharArray(config.webhookUrl, sizeof(config.webhookUrl));
    config.reportingInterval = constrain(
      (int)prefs.getUShort("interval", 7200),
      MIN_REPORTING_INTERVAL,
      MAX_REPORTING_INTERVAL
    );
    config.deepSleepEnabled  = prefs.getBool("deepSleep", true);

    Serial.printf("[NVS] Device: %s  API Key: %s\n",
      config.deviceId,
      strlen(config.apiKey) > 0 ? "SET" : "NOT SET");
  }

  prefs.end();
}

void saveConfig() {
  prefs.begin(NVS_NAMESPACE, false);  // read-write
  prefs.putString("deviceId",   config.deviceId);
  prefs.putString("apiKey",     config.apiKey);
  prefs.putString("webhookUrl", config.webhookUrl);
  prefs.putUShort("interval",   config.reportingInterval);
  prefs.putBool("deepSleep",    config.deepSleepEnabled);
  prefs.end();
  Serial.println("[NVS] Config saved");
}

void clearConfig() {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.clear();
  prefs.end();
  Serial.println("[NVS] Config cleared");
}

bool isConfigured() {
  return strlen(config.apiKey) > 0 && strlen(config.webhookUrl) > 0;
}

// ====================
// READING BUFFER
// ====================

void bufferReading(float temperature) {
  if (bufferCount < MAX_BUFFERED_READINGS) {
    readingBuffer[bufferCount++].temperature = temperature;
  } else {
    // Buffer full — drop oldest, shift left, add newest at end
    memmove(&readingBuffer[0], &readingBuffer[1],
            (MAX_BUFFERED_READINGS - 1) * sizeof(BufferedReading));
    readingBuffer[MAX_BUFFERED_READINGS - 1].temperature = temperature;
  }
  Serial.printf("[BUFFER] Stored reading %.2fC  (buffer: %d/%d)\n",
    temperature, bufferCount < MAX_BUFFERED_READINGS ? bufferCount : MAX_BUFFERED_READINGS,
    MAX_BUFFERED_READINGS);
}

void clearBuffer() {
  bufferCount = 0;
}

// ====================
// BATTERY
// ====================

// analogReadMilliVolts() is the arduino-esp32 v3.x calibrated ADC API —
// handles eFuse calibration internally, no esp_adc_cal needed.
float readBatteryVoltage() {
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogReadMilliVolts(BATTERY_ADC_PIN);
    delay(2);
  }
  return (sum / 16.0 / 1000.0) * BATTERY_DIVIDER_RATIO;
}

// Returns -1.0 when voltage is too low to be a valid reading
// (no battery, or deeply discharged below protection threshold).
#define BATTERY_MIN_VALID_V 0.5   // ADC floor ~0.5V → battery < 1.0V = dead/absent

float readBatteryPercent() {
  float voltage = readBatteryVoltage();
  if (voltage < BATTERY_MIN_VALID_V) return -1.0;
  float percent = (voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

// ====================
// TEMPERATURE
// ====================

OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature sensors(&oneWire);

float readTemperature() {
  pinMode(TEMP_SENSOR_PIN, INPUT_PULLUP);  // internal ~45kΩ pull-up (weaker than 4.7kΩ external, but works for short cables)
  sensors.begin();
  Serial.printf("[SENSOR] %d sensor(s) on GPIO%d\n", sensors.getDeviceCount(), TEMP_SENSOR_PIN);

  for (int attempt = 1; attempt <= 3; attempt++) {
    sensors.requestTemperatures();
    delay(750);  // DS18B20 max conversion time at 12-bit
    float temp = sensors.getTempCByIndex(0);

    if (temp != DEVICE_DISCONNECTED_C && temp != 85.0) {
      return temp;
    }
    Serial.printf("[SENSOR] Attempt %d failed\n", attempt);
    delay(200);
  }

  Serial.println("[SENSOR] Failed after 3 attempts — sensor disconnected?");
  return -999.0;
}

// ====================
// WIFI
// ====================

bool connectWiFi() {
  WiFi.mode(WIFI_STA);

#ifdef TEST_WIFI_SSID
  WiFi.begin(TEST_WIFI_SSID, TEST_WIFI_PASS);
  Serial.printf("[WiFi] TEST MODE — connecting to: %s\n", TEST_WIFI_SSID);
#else
  WiFi.begin();
  String ssid = WiFi.SSID();
  Serial.printf("[WiFi] Connecting to: %s\n", ssid.length() > 0 ? ssid.c_str() : "(saved network)");
#endif

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

// Connect using credentials supplied at runtime (BLE provisioning), rather than
// the NVS-saved network used by connectWiFi().
bool connectWiFiWith(const char* ssid, const char* pass) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  Serial.printf("[WiFi] Connecting to: %s\n", ssid);

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
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (strncmp(ACTIVATION_URL, "https", 5) == 0) {
    secureClient.setInsecure();
    http.begin(secureClient, ACTIVATION_URL);
  } else {
    http.begin(plainClient, ACTIVATION_URL);
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);

  DynamicJsonDocument doc(512);
  doc["deviceId"]        = config.deviceId;
  doc["claimingToken"]   = claimingToken;
  doc["macAddress"]      = WiFi.macAddress();
  doc["ipAddress"]       = WiFi.localIP().toString();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["deviceModel"]     = "LILYGO-T-OI-PLUS-C3";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    DynamicJsonDocument res(1024);
    deserializeJson(res, http.getString());

    JsonObject data = res["data"];
    const char* apiKey     = data["credentials"]["apiKey"];
    const char* webhookUrl = data["credentials"]["webhookUrl"];

    if (apiKey && webhookUrl) {
      strncpy(config.apiKey,     apiKey,     sizeof(config.apiKey) - 1);
      strncpy(config.webhookUrl, webhookUrl, sizeof(config.webhookUrl) - 1);
      config.reportingInterval = constrain(
        (int)(data["config"]["reportingInterval"] | 7200),
        MIN_REPORTING_INTERVAL,
        MAX_REPORTING_INTERVAL
      );
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

bool sendData(float temperature, float batteryPct, float batteryV, bool sensorError = false) {
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
  http.setTimeout(15000);  // longer timeout for bulk payloads

  bool batteryValid = (batteryPct >= 0.0);
  bool batteryLow   = batteryValid && (batteryPct <= BATTERY_LOW_THRESHOLD);

  // 512 base + 64 bytes per buffered reading
  DynamicJsonDocument doc(512 + MAX_BUFFERED_READINGS * 64);
  doc["deviceId"]        = config.deviceId;
  if (batteryValid) {
    doc["batteryLevel"]   = batteryPct;
    doc["batteryVoltage"] = round(batteryV * 1000.0) / 1000.0;
  } else {
    doc["batteryLevel"]   = nullptr;
    doc["batteryVoltage"] = nullptr;
  }
  doc["rssi"]            = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["alertPending"]    = batteryLow || sensorError;
  doc["sensorError"]     = sensorError;
  doc["batteryLow"]      = batteryLow;

  if (!sensorError) {
    JsonArray readings = doc.createNestedArray("readings");

    // Buffered readings first (oldest → newest), with approximate age in seconds
    int totalReadings = bufferCount + 1;  // buffered + current
    for (int i = 0; i < bufferCount; i++) {
      JsonObject r = readings.createNestedObject();
      r["temperature"]   = readingBuffer[i].temperature;
      r["cycle"]         = i + 1;
      r["offsetSeconds"] = (uint32_t)(totalReadings - 1 - i) * config.reportingInterval;
    }

    // Current reading (newest, offset = 0)
    JsonObject r = readings.createNestedObject();
    r["temperature"]   = temperature;
    r["cycle"]         = totalReadings;
    r["offsetSeconds"] = 0;

    if (bufferCount > 0) {
      Serial.printf("[SEND] Bulk: %d buffered + 1 current reading\n", bufferCount);
    }
  }

  String payload;
  serializeJson(doc, payload);
  Serial.println("[SEND] " + payload);

  int httpCode = http.POST(payload);
  bool success = (httpCode == 200);

  if (success) {
    Serial.println("[SEND] OK");
    clearBuffer();  // Clear offline buffer after successful bulk send

    // Apply config update from server response
    DynamicJsonDocument res(512);
    if (deserializeJson(res, http.getString()) == DeserializationError::Ok) {
      JsonObject cfg = res["data"]["config"];
      if (!cfg.isNull()) {
        uint16_t newInterval = constrain(
          (int)(cfg["reportingInterval"] | config.reportingInterval),
          MIN_REPORTING_INTERVAL,
          MAX_REPORTING_INTERVAL
        );
        bool newDeepSleep = cfg["deepSleepEnabled"] | config.deepSleepEnabled;
        if (newInterval != config.reportingInterval || newDeepSleep != config.deepSleepEnabled) {
          config.reportingInterval = newInterval;
          config.deepSleepEnabled  = newDeepSleep;
          saveConfig();
          Serial.printf("[CONFIG] Updated — interval: %ds  deepSleep: %s\n",
            newInterval, newDeepSleep ? "on" : "off");
        }
      }
    }
  } else {
    Serial.printf("[SEND] Failed — HTTP %d\n", httpCode);
  }

  http.end();
  return success;
}

bool sendDataWithRetry(float temperature, float batteryPct, float batteryV, bool sensorError = false) {
  for (int attempt = 1; attempt <= 3; attempt++) {
    if (sendData(temperature, batteryPct, batteryV, sensorError)) return true;
    Serial.printf("[SEND] Attempt %d/3 failed\n", attempt);
    if (attempt < 3) delay(2000);
  }
  Serial.println("[SEND] All attempts failed — data lost this cycle");
  return false;
}

// ====================
// WIFI SETUP PORTAL
// ====================

WiFiManager wifiManager;
// ====================
// BLE SETUP MODE (first-claim provisioning)
// Contract: docs/frontend/fe-ble-claiming/gatt-contract.md
// NOTE: requires PartitionScheme=min_spiffs — NimBLE does not fit the default
// partition (see fe-ble-claiming/open-questions.md Q2). The flash script sets it.
// ====================
#define BLE_SVC_UUID    "8e9a0001-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_INFO_UUID   "8e9a0002-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_PROV_UUID   "8e9a0003-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_CMD_UUID    "8e9a0004-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_STAT_UUID   "8e9a0005-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_SETUP_TIMEOUT_MS  300000UL   // 5 min, then fall back to the AP portal

static NimBLECharacteristic* bleStatusChar = nullptr;
static String bleProvBuf = "";
static char bleSsid[64]  = "";
static char blePass[64]  = "";
static char bleToken[16] = "";
static volatile bool bleProvReceived = false;
static volatile bool bleActivateReq  = false;

static void bleSetStatus(const char* s) {
  if (bleStatusChar) {
    bleStatusChar->setValue((const uint8_t*)s, strlen(s));
    bleStatusChar->notify();
  }
  Serial.printf("[BLE] status=%s\n", s);
}

// `provision` write — accumulate (handles chunked writes under a small ATT MTU)
// and parse when the buffer is a complete JSON object with the required fields.
class ProvCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    bleProvBuf += String(c->getValue().c_str());
    DynamicJsonDocument doc(512);
    if (deserializeJson(doc, bleProvBuf) == DeserializationError::Ok) {
      const char* ssid  = doc["ssid"]          | "";
      const char* pass  = doc["password"]      | "";
      const char* token = doc["claimingToken"] | "";
      if (strlen(ssid) > 0 && strlen(token) > 0) {
        strncpy(bleSsid,  ssid,  sizeof(bleSsid)  - 1);
        strncpy(blePass,  pass,  sizeof(blePass)  - 1);
        strncpy(bleToken, token, sizeof(bleToken) - 1);
        bleProvBuf = "";
        bleProvReceived = true;
        bleSetStatus("RECEIVED");
      }
    }
  }
};

// `command` write — "activate" triggers provisioning; "cancel" clears it.
class CmdCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    String cmd = String(c->getValue().c_str());
    if (cmd == "activate" && bleProvReceived) {
      bleActivateReq = true;
    } else if (cmd == "cancel") {
      bleProvBuf = "";
      bleProvReceived = false;
      bleSetStatus("IDLE");
    }
  }
};

static void bleStart(const char* apName) {
  NimBLEDevice::init(apName);
  NimBLEServer* server = NimBLEDevice::createServer();
  NimBLEService* svc = server->createService(BLE_SVC_UUID);

  NimBLECharacteristic* info = svc->createCharacteristic(BLE_INFO_UUID, NIMBLE_PROPERTY::READ);
  DynamicJsonDocument idoc(192);
  idoc["deviceId"] = config.deviceId;
  idoc["model"]    = "LILYGO-T-OI-PLUS-C3";
  idoc["fw"]       = FIRMWARE_VERSION;
  String ijson;
  serializeJson(idoc, ijson);
  info->setValue(ijson.c_str());

  NimBLECharacteristic* prov = svc->createCharacteristic(BLE_PROV_UUID, NIMBLE_PROPERTY::WRITE);
  prov->setCallbacks(new ProvCallbacks());

  NimBLECharacteristic* cmd = svc->createCharacteristic(BLE_CMD_UUID, NIMBLE_PROPERTY::WRITE);
  cmd->setCallbacks(new CmdCallbacks());

  bleStatusChar = svc->createCharacteristic(
    BLE_STAT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  bleStatusChar->setValue("IDLE");

  svc->start();
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SVC_UUID);
  adv->setName(apName);
  adv->start();
  Serial.printf("[BLE] Advertising as %s\n", apName);
}

static void bleStop() {
  NimBLEDevice::stopAdvertising();
  NimBLEDevice::deinit(true);
  bleStatusChar = nullptr;
}

// First-claim provisioning over BLE. Returns true when the device was activated
// (it reboots into normal operation), false on timeout (caller falls back to the
// AP portal so the device is never stranded).
//
// Single-radio C3: BLE and WiFi cannot run together, so on "activate" we tear BLE
// down, bring up WiFi and run the existing activateDevice(). On success the device
// reboots and the dashboard sees it come ONLINE (the app reconciles there — the
// final result is not sent back over BLE). On failure we re-advertise and report
// ERR_* so the operator can retry. (Coexistence/retry hardening = task A5.)
bool setupBLE() {
  char apName[32];
  uint64_t chipId = ESP.getEfuseMac();
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%04X", (uint16_t)(chipId & 0xFFFF));

  bleProvReceived = false;
  bleActivateReq  = false;
  bleProvBuf      = "";
  bleStart(apName);

  unsigned long deadline = millis() + BLE_SETUP_TIMEOUT_MS;
  while (millis() < deadline) {
    digitalWrite(LED_PIN, (millis() / 1000) % 2);   // slow blink = BLE setup mode
    delay(50);

    if (bleActivateReq) {
      bleActivateReq = false;
      bleSetStatus("WIFI_CONNECTING");
      bleStop();   // free the radio for WiFi

      bool wifiOk = connectWiFiWith(bleSsid, blePass);
      bool ok = wifiOk && activateDevice(bleToken);

      if (ok) {
        Serial.println("[BLE] Activation complete — rebooting into normal operation");
        wifiFailCount = 0;
        delay(1500);
        ESP.restart();
        return true;   // not reached
      }

      // Failure — release WiFi, bring BLE back, report the error, allow a retry.
      WiFi.disconnect(true);
      WiFi.mode(WIFI_OFF);
      bleStart(apName);
      bleSetStatus(wifiOk ? "ERR_TOKEN" : "ERR_WIFI");
      bleProvReceived = false;
      bleProvBuf = "";
      deadline = millis() + BLE_SETUP_TIMEOUT_MS;
    }
  }

  Serial.println("[BLE] Setup timeout — falling back to AP portal");
  bleStop();
  return false;
}

WiFiManagerParameter* param_claiming_token = nullptr;

void setupWiFiManager() {
  char apName[32];
  uint64_t chipId = ESP.getEfuseMac();
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%04X", (uint16_t)(chipId & 0xFFFF));

  // Only ask for claiming token on first-time setup.
  // If device already has credentials (WiFi-only change), token is optional.
  bool needsActivation = !isConfigured();

  if (needsActivation) {
    param_claiming_token = new WiFiManagerParameter(
      "claiming_token", "Claiming Token (from app)", "", 9,
      "placeholder='XXXX-YYYY' pattern='[A-Z0-9]{4}-[A-Z0-9]{4}' required"
    );
  } else {
    param_claiming_token = new WiFiManagerParameter(
      "claiming_token", "Claiming Token (leave empty to keep existing)", "", 9,
      "placeholder='XXXX-YYYY' pattern='[A-Z0-9]{4}-[A-Z0-9]{4}'"
    );
  }
  wifiManager.addParameter(param_claiming_token);
  wifiManager.setConfigPortalTimeout(120);
  wifiManager.setConnectTimeout(30);

  Serial.printf("[SETUP] Starting AP: %s  (activation: %s)\n",
    apName, needsActivation ? "required" : "optional");

  if (!wifiManager.startConfigPortal(apName, WIFI_AP_PASSWORD)) {
    Serial.println("[SETUP] Timeout — restarting");
    delete param_claiming_token;
    param_claiming_token = nullptr;
    delay(3000);
    ESP.restart();
    return;
  }

  Serial.printf("[SETUP] WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  String token = param_claiming_token->getValue();
  delete param_claiming_token;
  param_claiming_token = nullptr;

  if (token.length() > 0) {
    // Token provided — always attempt activation (first setup or re-activation)
    if (activateDevice(token.c_str())) {
      Serial.println("[SETUP] Activation complete — rebooting");
      wifiFailCount = 0;
      delay(2000);
      ESP.restart();
    } else {
      Serial.println("[SETUP] Activation failed — resetting");
      wifiManager.resetSettings();
      clearConfig();
      delay(3000);
      ESP.restart();
    }
  } else if (!needsActivation) {
    // No token, but device already has credentials — just changed WiFi network
    Serial.println("[SETUP] WiFi updated — keeping existing credentials, rebooting");
    wifiFailCount = 0;
    delay(2000);
    ESP.restart();
  } else {
    // No token, no existing credentials — nothing to do
    Serial.println("[SETUP] No token and no existing config — resetting");
    wifiManager.resetSettings();
    clearConfig();
    delay(3000);
    ESP.restart();
  }
}

// ====================
// FACTORY RESET
// ====================

void checkFactoryReset() {
  pinMode(FACTORY_RESET_PIN, INPUT_PULLUP);

  if (digitalRead(FACTORY_RESET_PIN) != LOW) return;

  Serial.println("[RESET] BOOT held — waiting 5s to confirm factory reset...");
  unsigned long held = millis();

  while (digitalRead(FACTORY_RESET_PIN) == LOW) {
    // Blink LED rapidly to signal pending reset
    digitalWrite(LED_PIN, (millis() / 150) % 2);
    delay(50);

    if (millis() - held >= FACTORY_RESET_HOLD_MS) {
      // Confirmed — execute reset
      digitalWrite(LED_PIN, LED_ON);
      Serial.println("[RESET] Factory reset confirmed — clearing all config");

      WiFiManager wm;
      wm.resetSettings();
      clearConfig();
      wifiFailCount = 0;

      Serial.println("[RESET] Done — rebooting to setup mode");
      delay(1000);
      digitalWrite(LED_PIN, LED_OFF);
      ESP.restart();
    }
  }

  // Button released before 5s — abort
  Serial.println("[RESET] Cancelled (released too early)");
  digitalWrite(LED_PIN, LED_ON);
}

// ====================
// DEEP SLEEP
// ====================

void enterDeepSleep() {
  uint32_t interval = config.deepSleepEnabled
    ? config.reportingInterval
    : MIN_REPORTING_INTERVAL;

  Serial.printf("[SLEEP] %d seconds\n", interval);
  Serial.flush();

  digitalWrite(LED_PIN, LED_OFF);
  delay(100);

  esp_sleep_enable_timer_wakeup((uint64_t)interval * 1000000ULL);
  esp_deep_sleep_start();
}

// ====================
// SETUP
// ====================

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_ON);

  Serial.println("\n[BOOT] IotPilot Sensor " FIRMWARE_VERSION " (ESP32-C3)");

  checkFactoryReset();
  Serial.printf("[BOOT] WiFi fail count: %d/%d\n", wifiFailCount, MAX_WIFI_FAILS);

  loadConfig();

  if (!isConfigured()) {
#ifdef TEST_TOKEN
    Serial.println("[TEST] Auto-activating with embedded credentials...");
    if (connectWiFi()) {
      if (activateDevice(TEST_TOKEN)) {
        Serial.println("[TEST] Activation OK — rebooting");
        delay(1000);
        ESP.restart();
      } else {
        Serial.println("[TEST] Activation FAILED — check token and server");
        esp_sleep_enable_timer_wakeup(30ULL * 1000000ULL);
        esp_deep_sleep_start();
      }
    } else {
      Serial.println("[TEST] WiFi failed — retrying in 30s");
      esp_sleep_enable_timer_wakeup(30ULL * 1000000ULL);
      esp_deep_sleep_start();
    }
    return;
#else
    // Primary path: BLE provisioning from the app. Falls back to the AP captive
    // portal on timeout so a device is never stranded (and for ESP8266, which has
    // no BLE, the portal stays the only path).
    if (!setupBLE()) {
      setupWiFiManager();
    }
    return;
#endif
  }

  // Read battery at rest BEFORE WiFi radio powers up to avoid voltage sag
  float batteryV   = readBatteryVoltage();
  float batteryPct = readBatteryPercent();
  if (batteryPct >= 0.0) {
    Serial.printf("[BATTERY] %.1f%%  %.3fV (at rest, pre-WiFi)\n", batteryPct, batteryV);
  } else {
    Serial.printf("[BATTERY] Not measurable (%.3fV < %.1fV) — no battery or fully discharged\n",
      batteryV, BATTERY_MIN_VALID_V);
  }

  // Read temperature before WiFi — so it can be buffered even if WiFi fails
  float temp = readTemperature();
  bool sensorError = (temp == -999.0);

  if (!sensorError) {
    Serial.printf("[READ] %.2f C  Battery: %.1f%%  Voltage: %.3fV\n", temp, batteryPct, batteryV);
  }

  if (!connectWiFi()) {
    wifiFailCount++;
    Serial.printf("[WiFi] Fail count: %d/%d\n", wifiFailCount, MAX_WIFI_FAILS);

    // Buffer the reading so it's not lost
    if (!sensorError) bufferReading(temp);

    if (wifiFailCount >= MAX_WIFI_FAILS) {
      Serial.println("[WiFi] Max failures reached — entering setup portal");
      wifiFailCount = 0;
      setupWiFiManager();
    } else {
      Serial.printf("[WiFi] Transient failure — retrying in %ds\n", WIFI_RETRY_INTERVAL);
      esp_sleep_enable_timer_wakeup((uint64_t)WIFI_RETRY_INTERVAL * 1000000ULL);
      digitalWrite(LED_PIN, LED_OFF);
      Serial.flush();
      esp_deep_sleep_start();
    }
    return;
  }

  // WiFi connected — reset failure counter and send buffered + current reading
  wifiFailCount = 0;

  if (sensorError) {
    Serial.println("[SENSOR] Error — notifying server");
  }

  bool sent = sendDataWithRetry(temp, batteryPct, batteryV, sensorError);

  // Buffer reading if send failed (WiFi up but server unreachable — tunnel down etc.)
  if (!sent && !sensorError) {
    bufferReading(temp);
    Serial.println("[BUFFER] Send failed — reading buffered for next cycle");
  }

  WiFi.disconnect(true);
  enterDeepSleep();
}

void loop() {
  // Not reached — deep sleep resets into setup()
}
