// ============================================
// IoT Relay Control System — ESP8266 Firmware
// ============================================
// Versi     : 1.2 (Tambah Cek & Tampilkan IP)
// Hardware  : ESP8266 NodeMCU / Wemos D1 Mini
// Relay     : 4 channel active-low
// Library   : ESP8266WiFi, ESP8266WebServer, ArduinoJson v6
// ============================================

// ============================================
// KONFIGURASI WIFI — SESUAIKAN DI SINI
// ============================================
const char* WIFI_SSID     = "Akuu";
const char* WIFI_PASSWORD = "hadimita";

// ============================================
// KONFIGURASI DEVICE
// ============================================
const char* DEVICE_NAME = "ESP8266-Relay-01";

// ============================================
// KONFIGURASI PIN RELAY
// ============================================
const int RELAY_COUNT = 4;
const int relayPins[RELAY_COUNT] = { 5, 4, 0, 2 };  // D1, D2, D3, D4
const char* relayNames[RELAY_COUNT] = {
  "Relay 1", "Relay 2", "Relay 3", "Relay 4"
};

// ============================================
// STATE RELAY (disimpan di memory)
// ============================================
bool relayStates[RELAY_COUNT] = { false, false, false, false };

// ============================================
// SENSOR SIMULASI — base values
// ============================================
float baseTemperature = 27.0;
float baseHumidity    = 65.0;
float baseVoltage     = 220.0;

// ============================================
// LIBRARY
// ============================================
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

// ============================================
// SERVER & VARIABEL IP
// ============================================
ESP8266WebServer server(80);
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;  // Cek setiap 30 detik
String currentIP = "0.0.0.0";  // Menyimpan IP saat ini

// ============================================
// FUNGSI: Kirim CORS headers
// ============================================
void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ============================================
// FUNGSI: Kirim response JSON
// ============================================
void sendJson(int statusCode, JsonDocument& doc) {
  String response;
  serializeJson(doc, response);
  sendCORSHeaders();
  server.sendHeader("Content-Type", "application/json");
  server.send(statusCode, "application/json", response);
}

// ============================================
// FUNGSI: Kirim error JSON
// ============================================
void sendError(int statusCode, const char* message) {
  JsonDocument doc;
  doc["error"] = message;
  sendJson(statusCode, doc);
}

// ============================================
// FUNGSI: Kontrol pin relay fisik
// ============================================
void setRelayPin(int index, bool state) {
  // Relay active-low: HIGH = OFF, LOW = ON
  digitalWrite(relayPins[index], state ? LOW : HIGH);
  relayStates[index] = state;
}

// ============================================
// FUNGSI: Inisialisasi semua pin relay
// ============================================
void initRelayPins() {
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(relayPins[i], OUTPUT);
    setRelayPin(i, false);
  }
  Serial.println("[RELAY] Semua pin relay diinisialisasi (OFF)");
}

// ============================================
// FUNGSI: Cek dan dapatkan IP ESP8266
// ============================================
void checkAndGetIP() {
  if (WiFi.status() == WL_CONNECTED) {
    currentIP = WiFi.localIP().toString();
    Serial.printf("[INFO] IP Address ESP8266: %s\n", currentIP.c_str());
  } else {
    currentIP = "Tidak Terhubung";
    Serial.println("[INFO] Status: Belum terhubung ke WiFi");
  }
}

// ============================================
// HANDLER: GET /api/device-info (menampilkan IP & info perangkat)
// ============================================
void handleGetDeviceInfo() {
  checkAndGetIP();  // Perbarui IP sebelum dikirim

  JsonDocument doc;
  doc["device_name"] = DEVICE_NAME;
  doc["ip_address"]   = currentIP;
  doc["wifi_status"] = (WiFi.status() == WL_CONNECTED) ? "Terhubung" : "Terputus";
  doc["mac_address"]  = WiFi.macAddress();
  doc["uptime"]       = millis() / 1000;  // Waktu berjalan dalam detik

  sendJson(200, doc);
  Serial.println("[API] GET /api/device-info -> 200");
}

// ============================================
// HANDLER: GET /api/relays
// ============================================
void handleGetRelays() {
  JsonDocument doc;
  JsonArray array = doc.to<JsonArray>();

  for (int i = 0; i < RELAY_COUNT; i++) {
    JsonObject obj = array.add<JsonObject>();
    obj["id"]     = i + 1;
    obj["name"]   = relayNames[i];
    obj["status"] = relayStates[i];
  }

  sendJson(200, doc);
  Serial.println("[API] GET /api/relays -> 200");
}

// ============================================
// HANDLER: POST /api/relay
// Body: { "id": 1, "status": true }
// ============================================
void handlePostRelay() {
  if (!server.hasArg("plain")) {
    sendError(400, "Request body kosong");
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));

  if (err) {
    sendError(400, "JSON tidak valid");
    return;
  }

  int id = doc["id"] | 0;
  bool status = doc["status"] | false;

  if (id < 1 || id > RELAY_COUNT) {
    sendError(400, "ID relay tidak valid (1-4)");
    return;
  }

  int index = id - 1;
  setRelayPin(index, status);

  JsonDocument response;
  response["id"]      = id;
  response["name"]    = relayNames[index];
  response["status"]  = relayStates[index];
  response["message"] = status ? "Relay ON" : "Relay OFF";

  sendJson(200, response);
  Serial.printf("[API] POST /api/relay -> Relay %d %s\n", id, status ? "ON" : "OFF");
}

// ============================================
// HANDLER: POST /api/relay/all
// Body: { "status": false }
// ============================================
void handlePostRelayAll() {
  if (!server.hasArg("plain")) {
    sendError(400, "Request body kosong");
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));

  if (err) {
    sendError(400, "JSON tidak valid");
    return;
  }

  bool status = doc["status"] | false;

  for (int i = 0; i < RELAY_COUNT; i++) {
    setRelayPin(i, status);
  }

  JsonDocument response;
  response["message"] = status ? "Semua relay ON" : "Semua relay OFF";
  response["status"]  = status;

  JsonArray relays = response["relays"].to<JsonArray>();
  for (int i = 0; i < RELAY_COUNT; i++) {
    JsonObject obj = relays.add<JsonObject>();
    obj["id"]     = i + 1;
    obj["name"]   = relayNames[i];
    obj["status"] = relayStates[i];
  }

  sendJson(200, response);
  Serial.printf("[API] POST /api/relay/all -> ALL %s\n", status ? "ON" : "OFF");
}

// ============================================
// HANDLER: GET /api/sensors (data simulasi)
// ============================================
void handleGetSensors() {
  float totalCurrent = 0;
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (relayStates[i]) totalCurrent += 0.5;
  }

  JsonDocument doc;
  doc["temperature"] = baseTemperature + (random(-50, 50) / 100.0);
  doc["humidity"]    = baseHumidity + (random(-100, 100) / 100.0);
  doc["voltage"]     = baseVoltage + (random(-20, 20) / 10.0);
  doc["current"]     = totalCurrent + (random(-10, 10) / 100.0);

  sendJson(200, doc);
  Serial.println("[API] GET /api/sensors -> 200");
}

// ============================================
// HANDLER: OPTIONS (preflight CORS)
// ============================================
void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}

// ============================================
// HANDLER: 404 Not Found
// ============================================
void handleNotFound() {
  sendError(404, "Endpoint tidak ditemukan");
}

// ============================================
// FUNGSI: Daftarkan semua route
// ============================================
void registerRoutes() {
  server.on("/api/device-info", HTTP_GET, handleGetDeviceInfo);  // Route baru
  server.on("/api/relays", HTTP_GET, handleGetRelays);
  server.on("/api/relay", HTTP_POST, handlePostRelay);
  server.on("/api/relay/all", HTTP_POST, handlePostRelayAll);
  server.on("/api/sensors", HTTP_GET, handleGetSensors);

  server.on("/api/device-info", HTTP_OPTIONS, handleOptions);
  server.on("/api/relays", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay/all", HTTP_OPTIONS, handleOptions);
  server.on("/api/sensors", HTTP_OPTIONS, handleOptions);

  server.onNotFound(handleNotFound);

  Serial.println("[SERVER] Semua route terdaftar");
}

// ============================================
// FUNGSI: Koneksi WiFi
// ============================================
void connectWiFi() {
  Serial.printf("[WIFI] Menghubungkan ke %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    checkAndGetIP();  // Tampilkan IP saat berhasil terhubung
  } else {
    Serial.println();
    Serial.println("[WIFI] Gagal terhubung, akan mencoba ulang...");
    currentIP = "0.0.0.0";
  }
}

// ============================================
// FUNGSI: Cek dan rekoneksi WiFi
// ============================================
void checkWiFiConnection() {
  unsigned long now = millis();
  if (now - lastWifiCheck >= WIFI_CHECK_INTERVAL) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Koneksi terputus, mencoba menyambung kembali...");
      connectWiFi();
    } else {
      // Cek ulang IP setiap interval jika masih terhubung
      checkAndGetIP();
    }
  }
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=====================================");
  Serial.println("  IoT Relay Control System v1.2");
  Serial.println("  Device: " + String(DEVICE_NAME));
  Serial.println("=====================================");

  initRelayPins();
  connectWiFi();
  registerRoutes();

  server.begin();
  Serial.println("[SERVER] HTTP server berjalan di port 80");
  Serial.println("=====================================");
}

// ============================================
// LOOP
// ============================================
void loop() {
  server.handleClient();
  checkWiFiConnection();
}
