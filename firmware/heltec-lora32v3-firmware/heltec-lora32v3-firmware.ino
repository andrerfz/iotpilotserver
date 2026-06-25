/**
 * IotPilot Heltec WiFi LoRa 32 V3 Temperature Sensor Firmware
 *
 * Hardware: Heltec WiFi LoRa 32 V3 (ESP32-S3FN8 + SX1262)
 * Battery:  Li-ion 3.7V via JST 1.25mm connector
 *
 * Pin mapping (Heltec WiFi LoRa 32 V3):
 *   GPIO7   — DS18B20 data (Header J3 pin 18, 4.7kΩ pull-up to 3.3V)
 *   GPIO1   — Battery ADC (VBAT_Read, 1:1 voltage divider)
 *   GPIO37  — ADC_Ctrl (P-channel MOSFET: LOW = enable, HIGH = disable)
 *   GPIO35  — LED (active HIGH)
 *   GPIO0   — PRG button (active LOW): 2s = sleep, 5s = factory reset
 *   GPIO36  — Vext_Ctrl (LOW = enable power to OLED + external rail, HIGH = off)
 *   GPIO17  — OLED SDA (I2C)
 *   GPIO18  — OLED SCL (I2C)
 *   GPIO21  — OLED RST
 *
 * LoRa SX1262 (internal SPI — disabled at boot to save ~1.6mA):
 *   NSS=GPIO8  SCK=GPIO9  MOSI=GPIO10  MISO=GPIO11
 *   RST=GPIO12  BUSY=GPIO13  DIO1=GPIO14
 *
 * PRG button behavior (GPIO0):
 *   Hold 2–5s → immediate deep sleep
 *   Hold 5s+  → factory reset (clears NVS + WiFi)
 *
 * Display:
 *   Shows temperature, battery %, WiFi RSSI and send result
 *   for DISPLAY_ON_SECONDS before deep sleep
 *
 * Libraries:
 *   WiFiManager, OneWire, DallasTemperature, ArduinoJson, SPI, U8g2
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>   // BLE setup-mode provisioning (fe-ble-claiming A4)
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ====================
// CONFIGURATION
// ====================

#ifndef DEVICE_ID
#define DEVICE_ID "IOT-XXXX-YYYY"
#endif

// Hardware pins
#define TEMP_SENSOR_PIN    7      // DS18B20 data (Header J3, pin 18)
#define BATTERY_ADC_PIN    1      // VBAT_Read (ADC1_CH0)
#define BATTERY_ADC_CTRL   37     // P-channel MOSFET: LOW = enable, HIGH = disable
#define LED_PIN            35     // Active HIGH
#define LED_ON             HIGH
#define LED_OFF            LOW
#define PRG_BUTTON_PIN     0      // PRG button, active LOW
#define VEXT_CTRL_PIN      36     // LOW = enable Vext (OLED + external rail), HIGH = off
#define OLED_SDA_PIN       17
#define OLED_SCL_PIN       18
#define OLED_RST_PIN       21

// LoRa SX1262 SPI pins (internal)
#define LORA_NSS_PIN       8
#define LORA_SCK_PIN       9
#define LORA_MOSI_PIN      10
#define LORA_MISO_PIN      11
#define LORA_RST_PIN       12
#define LORA_BUSY_PIN      13

// Battery calibration (Heltec V3: official scale factor 490/100 = 4.9)
// Source: WiFiLoRa32_battery_read example from Heltec library
#define BATTERY_SCALE_FACTOR   5.02   // calibrated: multimeter 4.15V / ADC 827mV = 5.02
#define BATTERY_FULL_V         4.15  // Heltec V3 charger terminates at ~4.15V, not 4.2V
#define BATTERY_EMPTY_V        3.0
#define BATTERY_LOW_THRESHOLD  15.0

#define NVS_NAMESPACE          "iotpilot"
#define WIFI_AP_PASSWORD       "iotpilot123"
#define FIRMWARE_VERSION       "1.2.0"
#define SLEEP_HOLD_MS          2000    // PRG hold 2s → sleep
#define FACTORY_RESET_HOLD_MS  5000   // PRG hold 5s → factory reset
#define DISPLAY_ON_SECONDS     5      // seconds to show display before sleeping
#define MAX_WIFI_FAILS         3
#define WIFI_RETRY_INTERVAL    60
#define MIN_REPORTING_INTERVAL 60
#define MAX_REPORTING_INTERVAL 86400

#ifndef ACTIVATION_URL
#define ACTIVATION_URL "https://dashboarddev.iotpilot.app/api/devices/activate"
#endif

// TEST MODE: -DTEST_WIFI_SSID=\"SSID\" -DTEST_WIFI_PASS=\"pass\" -DTEST_TOKEN=\"XXXX-YYYY\"

// ====================
// RTC STATE (survives deep sleep)
// ====================

RTC_DATA_ATTR int wifiFailCount = 0;

// Offline reading buffer — accumulates readings when WiFi unavailable.
// Sent in bulk on next successful connection. Lost on power-off.
#define MAX_BUFFERED_READINGS 48

struct BufferedReading { float temperature; };

RTC_DATA_ATTR BufferedReading readingBuffer[MAX_BUFFERED_READINGS];
RTC_DATA_ATTR int             bufferCount = 0;

// ====================
// DISPLAY
// ====================

// Heltec V3 OLED: 128x64 SSD1306, I2C on GPIO17/18, RST GPIO21
Adafruit_SSD1306 oled(128, 64, &Wire, OLED_RST_PIN);

void showDisplay(float temp, float battPct, int rssi, bool sent, bool sensorErr) {
  Serial.println("[DISPLAY] On");

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);

  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("[DISPLAY] Init failed");
    return;
  }

  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);

  // Header
  oled.setTextSize(2);
  oled.setCursor(0, 0);
  oled.print("IotPilot");
  oled.setTextSize(1);
  oled.setCursor(96, 8);
  oled.print(sent ? "OK" : "FAIL");

  // Temperature
  oled.setCursor(0, 22);
  if (sensorErr) {
    oled.print("Temp: ERROR");
  } else {
    char line[24];
    snprintf(line, sizeof(line), "Temp: %.1f C", temp);
    oled.print(line);
  }

  // Battery
  char line[24];
  oled.setCursor(0, 36);
  snprintf(line, sizeof(line), "Batt: %.0f%%", battPct);
  oled.print(line);

  // RSSI
  oled.setCursor(0, 50);
  snprintf(line, sizeof(line), "WiFi: %d dBm", rssi);
  oled.print(line);

  oled.display();

  for (int i = 0; i < DISPLAY_ON_SECONDS * 10; i++) {
    delay(100);
    yield();
  }

  oled.ssd1306_command(SSD1306_DISPLAYOFF);
  Serial.println("[DISPLAY] Off");
}

// ====================
// NVS CONFIG
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
  prefs.begin(NVS_NAMESPACE, true);
  String storedId = prefs.getString("deviceId", "");

  if (storedId.isEmpty()) {
    Serial.println("[NVS] No config — initializing defaults");
    memset(&config, 0, sizeof(config));
    strncpy(config.deviceId, DEVICE_ID, sizeof(config.deviceId) - 1);
    config.reportingInterval = 60;
    config.deepSleepEnabled  = true;
  } else {
    storedId.toCharArray(config.deviceId, sizeof(config.deviceId));
    prefs.getString("apiKey",     "").toCharArray(config.apiKey,     sizeof(config.apiKey));
    prefs.getString("webhookUrl", "").toCharArray(config.webhookUrl, sizeof(config.webhookUrl));
    config.reportingInterval = constrain(
      (int)prefs.getUShort("interval", 7200),
      MIN_REPORTING_INTERVAL, MAX_REPORTING_INTERVAL
    );
    config.deepSleepEnabled = prefs.getBool("deepSleep", true);
    Serial.printf("[NVS] Device: %s  API Key: %s\n",
      config.deviceId, strlen(config.apiKey) > 0 ? "SET" : "NOT SET");
  }
  prefs.end();
}

void saveConfig() {
  prefs.begin(NVS_NAMESPACE, false);
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
    memmove(&readingBuffer[0], &readingBuffer[1],
            (MAX_BUFFERED_READINGS - 1) * sizeof(BufferedReading));
    readingBuffer[MAX_BUFFERED_READINGS - 1].temperature = temperature;
  }
  Serial.printf("[BUFFER] Stored %.2fC  (%d/%d)\n", temperature,
    min(bufferCount, MAX_BUFFERED_READINGS), MAX_BUFFERED_READINGS);
}

void clearBuffer() { bufferCount = 0; }

// ====================
// LORA — disable SX1262
// ====================

void disableLoRa() {
  pinMode(LORA_RST_PIN,  OUTPUT);
  pinMode(LORA_NSS_PIN,  OUTPUT);
  pinMode(LORA_BUSY_PIN, INPUT);

  digitalWrite(LORA_NSS_PIN, HIGH);
  digitalWrite(LORA_RST_PIN, LOW);
  delay(10);
  digitalWrite(LORA_RST_PIN, HIGH);
  delay(10);

  unsigned long t = millis();
  while (digitalRead(LORA_BUSY_PIN) == HIGH && millis() - t < 500);

  SPI.begin(LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_NSS_PIN);
  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  digitalWrite(LORA_NSS_PIN, LOW);
  SPI.transfer(0x84);
  SPI.transfer(0x00);
  digitalWrite(LORA_NSS_PIN, HIGH);
  SPI.endTransaction();
  SPI.end();

  pinMode(LORA_RST_PIN,  INPUT);
  pinMode(LORA_NSS_PIN,  INPUT);
  pinMode(LORA_SCK_PIN,  INPUT);
  pinMode(LORA_MOSI_PIN, INPUT);
  pinMode(LORA_MISO_PIN, INPUT);

  Serial.println("[LoRa] SX1262 sleeping — ~1.6mA saved");
}

// ====================
// BATTERY
// ====================

float readBatteryVoltage() {
  // GPIO37 HIGH = enable ADC circuit (official Heltec V3 approach)
  pinMode(BATTERY_ADC_CTRL, OUTPUT);
  digitalWrite(BATTERY_ADC_CTRL, HIGH);
  delay(10);

  // Average 16 readings in millivolts using the built-in calibrated ADC
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogReadMilliVolts(BATTERY_ADC_PIN);
    delay(2);
  }

  digitalWrite(BATTERY_ADC_CTRL, LOW);
  pinMode(BATTERY_ADC_CTRL, INPUT);

  float avgMillivolts = sum / 16.0;
  Serial.printf("[BATTERY_RAW] ADC: %.0f mV  scale: %.1f  result: %.3fV\n",
    avgMillivolts, BATTERY_SCALE_FACTOR, (avgMillivolts * BATTERY_SCALE_FACTOR) / 1000.0);
  return (avgMillivolts * BATTERY_SCALE_FACTOR) / 1000.0;
}

float readBatteryPercent() {
  float voltage = readBatteryVoltage();
  float percent = (voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

// ====================
// TEMPERATURE
// ====================

OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature sensors(&oneWire);

float readTemperature() {
  pinMode(TEMP_SENSOR_PIN, INPUT_PULLUP);
  sensors.begin();
  Serial.printf("[SENSOR] %d sensor(s) on GPIO%d\n", sensors.getDeviceCount(), TEMP_SENSOR_PIN);

  for (int attempt = 1; attempt <= 3; attempt++) {
    sensors.requestTemperatures();
    delay(750);
    float temp = sensors.getTempCByIndex(0);
    if (temp != DEVICE_DISCONNECTED_C && temp != 85.0) return temp;
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

// Connect using credentials supplied at runtime (BLE provisioning).
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
  doc["deviceModel"]     = "HELTEC-WIFI-LORA-32-V3";

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
        MIN_REPORTING_INTERVAL, MAX_REPORTING_INTERVAL
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
  http.setTimeout(10000);

  bool batteryLow = (batteryPct <= BATTERY_LOW_THRESHOLD);

  DynamicJsonDocument doc(512);
  doc["deviceId"]        = config.deviceId;
  doc["batteryLevel"]    = batteryPct;
  doc["batteryVoltage"]  = round(batteryV * 1000.0) / 1000.0;
  doc["rssi"]            = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["alertPending"]    = batteryLow || sensorError;
  doc["sensorError"]     = sensorError;
  doc["batteryLow"]      = batteryLow;

  if (!sensorError) {
    JsonArray readings = doc.createNestedArray("readings");
    int totalReadings = bufferCount + 1;
    for (int i = 0; i < bufferCount; i++) {
      JsonObject r = readings.createNestedObject();
      r["temperature"]   = readingBuffer[i].temperature;
      r["cycle"]         = i + 1;
      r["offsetSeconds"] = (uint32_t)(totalReadings - 1 - i) * config.reportingInterval;
    }
    JsonObject r = readings.createNestedObject();
    r["temperature"]   = temperature;
    r["cycle"]         = totalReadings;
    r["offsetSeconds"] = 0;
    if (bufferCount > 0) Serial.printf("[SEND] Bulk: %d buffered + 1 current\n", bufferCount);
  }

  String payload;
  serializeJson(doc, payload);
  Serial.println("[SEND] " + payload);

  int httpCode = http.POST(payload);
  bool success = (httpCode == 200);

  if (success) {
    Serial.println("[SEND] OK");
    clearBuffer();

    DynamicJsonDocument res(512);
    if (deserializeJson(res, http.getString()) == DeserializationError::Ok) {
      JsonObject cfg = res["data"]["config"];
      if (!cfg.isNull()) {
        uint16_t newInterval = constrain(
          (int)(cfg["reportingInterval"] | config.reportingInterval),
          MIN_REPORTING_INTERVAL, MAX_REPORTING_INTERVAL
        );
        bool newDeepSleep = cfg["deepSleepEnabled"] | config.deepSleepEnabled;
        if (newInterval != config.reportingInterval || newDeepSleep != config.deepSleepEnabled) {
          config.reportingInterval = newInterval;
          config.deepSleepEnabled  = newDeepSleep;
          saveConfig();
          Serial.printf("[CONFIG] Updated — interval: %ds\n", newInterval);
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
  Serial.println("[SEND] All attempts failed");
  return false;
}

// ====================
// BLE SETUP MODE (first-claim provisioning)
// Contract: docs/frontend/fe-ble-claiming/gatt-contract.md
// ====================
#define BLE_SVC_UUID    "8e9a0001-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_INFO_UUID   "8e9a0002-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_PROV_UUID   "8e9a0003-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_CMD_UUID    "8e9a0004-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_STAT_UUID   "8e9a0005-1b2c-4f3d-9a6b-1f2e3d4c5b6a"
#define BLE_NET_UUID    "8e9a0006-1b2c-4f3d-9a6b-1f2e3d4c5b6a"  // WiFi networks the sensor sees
#define BLE_SETUP_TIMEOUT_MS  300000UL   // 5 min, then fall back to the AP portal

static NimBLECharacteristic* bleStatusChar = nullptr;
static String bleNetworksJson = "[]";
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

// Scan nearby WiFi (before NimBLE) and cache SSIDs so the app offers a pick-list.
static void scanWifiNetworks() {
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();
  DynamicJsonDocument doc(1024);
  JsonArray arr = doc.to<JsonArray>();
  String seen = "";
  for (int i = 0; i < n && arr.size() < 15; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) continue;
    String key = "\n" + ssid + "\n";
    if (seen.indexOf(key) >= 0) continue;
    seen += key;
    JsonObject o = arr.createNestedObject();
    o["ssid"] = ssid;
    o["rssi"] = WiFi.RSSI(i);
  }
  bleNetworksJson = "";
  serializeJson(doc, bleNetworksJson);
  WiFi.scanDelete();
  WiFi.mode(WIFI_OFF);
  Serial.printf("[WiFi] Scanned %d networks (%d unique)\n", n, arr.size());
}

static void bleStart(const char* apName) {
  NimBLEDevice::init(apName);
  NimBLEServer* server = NimBLEDevice::createServer();
  NimBLEService* svc = server->createService(BLE_SVC_UUID);

  NimBLECharacteristic* info = svc->createCharacteristic(BLE_INFO_UUID, NIMBLE_PROPERTY::READ);
  DynamicJsonDocument idoc(192);
  idoc["deviceId"] = config.deviceId;
  idoc["model"]    = "HELTEC-WIFI-LORA-32-V3";
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

  NimBLECharacteristic* nets = svc->createCharacteristic(BLE_NET_UUID, NIMBLE_PROPERTY::READ);
  nets->setValue(bleNetworksJson.c_str());

  svc->start();
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SVC_UUID);
  adv->setName(apName);
  // Name in scan response so it isn't dropped by the 31B adv packet (128-bit UUID).
  adv->enableScanResponse(true);
  adv->start();
  Serial.printf("[BLE] Advertising as %s\n", apName);
}

static void bleStop() {
  NimBLEDevice::stopAdvertising();
  NimBLEDevice::deinit(true);
  bleStatusChar = nullptr;
}

// First-claim provisioning over BLE. Returns true when activated (device reboots),
// false on timeout (caller falls back to the AP portal). See the C3 firmware for the
// single-radio teardown rationale; the S3 shares the 2.4 GHz radio too.
bool setupBLE() {
  // Advertise with the last 4 chars of the deviceId (matches the device label).
  char apName[32];
  size_t idLen = strlen(config.deviceId);
  const char* idTail = idLen >= 4 ? config.deviceId + idLen - 4 : config.deviceId;
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%s", idTail);

  bleProvReceived = false;
  bleActivateReq  = false;
  bleProvBuf      = "";
  scanWifiNetworks();   // cache nearby SSIDs (WiFi radio) before bringing up BLE
  bleStart(apName);

  unsigned long deadline = millis() + BLE_SETUP_TIMEOUT_MS;
  while (millis() < deadline) {
    delay(50);

    if (bleActivateReq) {
      bleActivateReq = false;
      bleSetStatus("WIFI_CONNECTING");
      bleStop();   // free the radio for WiFi

      bool wifiOk = connectWiFiWith(bleSsid, blePass);
      bool ok = wifiOk && activateDevice(bleToken);

      if (ok) {
        Serial.println("[BLE] Activation complete — rebooting into normal operation");
        delay(1500);
        ESP.restart();
        return true;   // not reached
      }

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

// ====================
// WIFI SETUP PORTAL
// ====================

WiFiManager wifiManager;
WiFiManagerParameter* param_claiming_token = nullptr;

void setupWiFiManager() {
  char apName[32];
  uint64_t chipId = ESP.getEfuseMac();
  snprintf(apName, sizeof(apName), "IotPilot-Setup-%04X", (uint16_t)(chipId & 0xFFFF));

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

  Serial.printf("[SETUP] Starting AP: %s\n", apName);

  if (!wifiManager.startConfigPortal(apName, WIFI_AP_PASSWORD)) {
    Serial.println("[SETUP] Timeout — restarting");
    delete param_claiming_token;
    param_claiming_token = nullptr;
    delay(3000);
    ESP.restart();
    return;
  }

  String token = param_claiming_token->getValue();
  delete param_claiming_token;
  param_claiming_token = nullptr;

  if (token.length() > 0) {
    if (activateDevice(token.c_str())) {
      wifiFailCount = 0;
      delay(2000);
      ESP.restart();
    } else {
      wifiManager.resetSettings();
      clearConfig();
      delay(3000);
      ESP.restart();
    }
  } else if (!needsActivation) {
    wifiFailCount = 0;
    delay(2000);
    ESP.restart();
  } else {
    wifiManager.resetSettings();
    clearConfig();
    delay(3000);
    ESP.restart();
  }
}

// ====================
// PRG BUTTON
// ====================

void checkPrgButton() {
  pinMode(PRG_BUTTON_PIN, INPUT_PULLUP);

  if (digitalRead(PRG_BUTTON_PIN) != LOW) return;

  Serial.println("[BUTTON] PRG held — 2s=sleep, 5s=factory reset");
  unsigned long held = millis();

  while (digitalRead(PRG_BUTTON_PIN) == LOW) {
    unsigned long elapsed = millis() - held;
    int blinkRate = elapsed >= SLEEP_HOLD_MS ? 100 : 300;
    digitalWrite(LED_PIN, (millis() / blinkRate) % 2);
    delay(50);

    if (elapsed >= FACTORY_RESET_HOLD_MS) {
      digitalWrite(LED_PIN, LED_ON);
      Serial.println("[BUTTON] Factory reset confirmed");
      WiFiManager wm;
      wm.resetSettings();
      clearConfig();
      wifiFailCount = 0;
      delay(1000);
      digitalWrite(LED_PIN, LED_OFF);
      ESP.restart();
    }
  }

  unsigned long elapsed = millis() - held;
  digitalWrite(LED_PIN, LED_ON);

  if (elapsed >= SLEEP_HOLD_MS) {
    Serial.println("[BUTTON] Sleep requested");
    digitalWrite(VEXT_CTRL_PIN, HIGH);  // HIGH = cut Vext power before sleep
    digitalWrite(LED_PIN, LED_OFF);
    Serial.flush();
    esp_sleep_enable_timer_wakeup((uint64_t)config.reportingInterval * 1000000ULL);
    esp_deep_sleep_start();
  }

  Serial.println("[BUTTON] Cancelled (too short)");
}

// ====================
// DEEP SLEEP
// ====================

void enterDeepSleep(uint32_t overrideSeconds = 0) {
  uint32_t interval = overrideSeconds > 0
    ? overrideSeconds
    : (config.deepSleepEnabled ? config.reportingInterval : MIN_REPORTING_INTERVAL);

  digitalWrite(VEXT_CTRL_PIN, HIGH);  // HIGH = cut Vext power before sleep

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

  pinMode(LED_PIN,       OUTPUT);
  pinMode(VEXT_CTRL_PIN, OUTPUT);

  digitalWrite(LED_PIN,       LED_ON);
  digitalWrite(VEXT_CTRL_PIN, LOW);   // LOW = enable Vext (powers OLED + external rail)

  Serial.println("\n[BOOT] IotPilot Sensor " FIRMWARE_VERSION " (Heltec WiFi LoRa 32 V3)");

  checkPrgButton();

  // Turn LED off after boot — only use it for factory reset feedback
  // Keeps it off during WiFi connect, send and sleep to save battery
  digitalWrite(LED_PIN, LED_OFF);
  Serial.printf("[BOOT] WiFi fail count: %d/%d\n", wifiFailCount, MAX_WIFI_FAILS);

  disableLoRa();

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  loadConfig();

  if (!isConfigured()) {
#ifdef TEST_TOKEN
    Serial.println("[TEST] Auto-activating...");
    if (connectWiFi()) {
      if (activateDevice(TEST_TOKEN)) {
        Serial.println("[TEST] Activation OK — rebooting");
        delay(1000);
        ESP.restart();
      } else {
        Serial.println("[TEST] Activation FAILED");
        enterDeepSleep(30);
      }
    } else {
      Serial.println("[TEST] WiFi failed — retrying in 30s");
      enterDeepSleep(30);
    }
    return;
#else
    // Primary path: BLE provisioning from the app. Falls back to the AP portal on
    // timeout so a device is never stranded.
    if (!setupBLE()) {
      setupWiFiManager();
    }
    return;
#endif
  }

  float batteryPct = readBatteryPercent();
  float batteryV   = readBatteryVoltage();
  Serial.printf("[BATTERY] %.1f%%  %.3fV\n", batteryPct, batteryV);

  // Read temperature before WiFi so it can be buffered even if WiFi fails
  float temp = readTemperature();
  bool sensorError = (temp == -999.0);

  if (!connectWiFi()) {
    wifiFailCount++;
    Serial.printf("[WiFi] Fail count: %d/%d\n", wifiFailCount, MAX_WIFI_FAILS);

    if (!sensorError) bufferReading(temp);

    if (wifiFailCount >= MAX_WIFI_FAILS) {
      wifiFailCount = 0;
      setupWiFiManager();
    } else {
      enterDeepSleep(WIFI_RETRY_INTERVAL);
    }
    return;
  }

  wifiFailCount = 0;

  wifiFailCount = 0;

  if (sensorError) {
    Serial.println("[SENSOR] Error — notifying server");
  } else {
    Serial.printf("[READ] %.2f C  Battery: %.1f%%  Voltage: %.3fV\n", temp, batteryPct, batteryV);
  }

  int rssi = WiFi.RSSI();  // save before disconnect
  bool sent = sendDataWithRetry(temp, batteryPct, batteryV, sensorError);

  // Buffer reading if send failed (WiFi up but server unreachable — tunnel down etc.)
  if (!sent && !sensorError) {
    bufferReading(temp);
    Serial.println("[BUFFER] Send failed — reading buffered for next cycle");
  }

  WiFi.disconnect(true);

  // Show display for DISPLAY_ON_SECONDS before sleeping
  showDisplay(temp, batteryPct, rssi, sent, sensorError);

  enterDeepSleep();
}

void loop() {
  // Not reached — deep sleep resets into setup()
}
