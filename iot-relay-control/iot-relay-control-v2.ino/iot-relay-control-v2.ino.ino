// ============================================
// IoT Relay Control System — ESP8266 Firmware
// ============================================
// Versi     : 1.3 (AP Mode + WiFi Config)
// Hardware  : ESP8266 NodeMCU / Wemos D1 Mini
// Relay     : 4 channel active-low
// Library   : ESP8266WiFi, ESP8266WebServer, ArduinoJson v6,
//             EEPROM.h, DNSServer.h
// ============================================

// ============================================
// KONFIGURASI DEFAULT — BISA DIUBAH VIA WEB
// ============================================
const char* DEVICE_NAME     = "ESP8266-Relay-01";
const char* DEFAULT_AP_PASS = "12345678";   // Password AP mode

// ============================================
// KONFIGURASI PIN RELAY
// ============================================
const int RELAY_COUNT = 4;
const int relayPins[RELAY_COUNT] = { 5, 4, 0, 2 };  // D1, D2, D3, D4
const char* relayNames[RELAY_COUNT] = {
  "Relay 1", "Relay 2", "Relay 3", "Relay 4"
};

// ============================================
// STATE RELAY
// ============================================
bool relayStates[RELAY_COUNT] = { false, false, false, false };

// ============================================
// SENSOR SIMULASI
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
#include <EEPROM.h>
#include <DNSServer.h>

// ============================================
// EEPROM CONFIG
// ============================================
#define EEPROM_SIZE 256
#define EEPROM_MAGIC 0xAB
#define MAX_SSID_LEN 32
#define MAX_PASS_LEN 64

// Variabel WiFi (dimuat dari EEPROM atau default)
char storedSSID[MAX_SSID_LEN + 1]   = "Akuu";
char storedPass[MAX_PASS_LEN + 1]   = "hadimita";

// ============================================
// SERVER, DNS, AP
// ============================================
ESP8266WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

String apSSID = "";       // Dibuat di setup()
String currentIP = "0.0.0.0";

// WiFi management state
enum WifiState { WIFI_NORMAL, WIFI_RECONNECTING };
WifiState wifiState = WIFI_NORMAL;
unsigned long wifiReconnectStart = 0;
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000;

// ============================================
// EEPROM: Simpan konfigurasi WiFi
// Layout:
//   Byte 0     : Magic (0xAB)
//   Byte 1     : Panjang SSID (n)
//   Byte 2..n+1: SSID
//   Byte n+2   : Panjang Password (m)
//   Byte n+3..n+m+2: Password
// ============================================
void saveWifiToEEPROM(const char* ssid, const char* password) {
  EEPROM.begin(EEPROM_SIZE);
  byte n = strlen(ssid);
  byte m = strlen(password);
  if (n > MAX_SSID_LEN) n = MAX_SSID_LEN;
  if (m > MAX_PASS_LEN) m = MAX_PASS_LEN;

  EEPROM.write(0, EEPROM_MAGIC);
  EEPROM.write(1, n);
  for (byte i = 0; i < n; i++) EEPROM.write(2 + i, ssid[i]);
  EEPROM.write(2 + n, m);
  for (byte i = 0; i < m; i++) EEPROM.write(3 + n + i, password[i]);

  EEPROM.commit();
  EEPROM.end();
  Serial.printf("[EEPROM] WiFi disimpan: SSID=%s, Pass=%s\n", ssid, password);
}

bool loadWifiFromEEPROM(char* ssid, char* password) {
  EEPROM.begin(EEPROM_SIZE);
  if (EEPROM.read(0) != EEPROM_MAGIC) {
    EEPROM.end();
    Serial.println("[EEPROM] Tidak ada data valid, gunakan default");
    return false;
  }
  byte n = EEPROM.read(1);
  if (n > MAX_SSID_LEN) { EEPROM.end(); return false; }
  for (byte i = 0; i < n; i++) ssid[i] = EEPROM.read(2 + i);
  ssid[n] = '\0';

  byte m = EEPROM.read(2 + n);
  if (m > MAX_PASS_LEN) { EEPROM.end(); return false; }
  for (byte i = 0; i < m; i++) password[i] = EEPROM.read(3 + n + i);
  password[m] = '\0';

  EEPROM.end();
  Serial.printf("[EEPROM] WiFi dimuat: SSID=%s\n", ssid);
  return true;
}

void clearWifiEEPROM() {
  EEPROM.begin(EEPROM_SIZE);
  for (int i = 0; i < EEPROM_SIZE; i++) EEPROM.write(i, 0);
  EEPROM.commit();
  EEPROM.end();
  Serial.println("[EEPROM] WiFi config dihapus");
}

// ============================================
// HALAMAN KONFIGURASI (disimpan di Flash/PROGMEM)
// ============================================
const char CONFIG_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IoT Relay - Setup</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060b18;color:#e8edf5;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;padding:16px}
.container{max-width:480px;margin:0 auto}
h1{font-size:20px;text-align:center;margin-bottom:20px;color:#10b981}
h1 span{color:#6b7fa3;font-size:12px;display:block;margin-top:4px}
.card{background:#0d1526;border:1px solid #1a2a48;border-radius:12px;padding:16px;margin-bottom:12px}
.card h2{font-size:13px;color:#6b7fa3;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:6px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a2a48;font-size:13px}
.row:last-child{border-bottom:none}
.row .label{color:#6b7fa3}
.row .value{color:#e8edf5;font-weight:500;font-family:monospace}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.badge-on{background:rgba(16,185,129,.15);color:#10b981}
.badge-off{background:rgba(239,68,68,.15);color:#ef4444}
input,select{width:100%;padding:10px 12px;background:#060b18;border:1px solid #1a2a48;border-radius:8px;color:#e8edf5;font-size:14px;outline:none;margin-bottom:8px;font-family:inherit}
input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;width:100%;font-family:inherit}
.btn-primary{background:#10b981;color:#fff}
.btn-primary:hover{background:#059669;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-danger{background:transparent;color:#ef4444;border:1px solid rgba(239,68,68,.3);margin-top:8px}
.btn-danger:hover{background:rgba(239,68,68,.1)}
.btn-scan{background:#1a2a48;color:#e8edf5;margin-bottom:12px}
.btn-scan:hover{background:#131f36}
#scan-list{max-height:200px;overflow-y:auto}
.scan-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background .15s;font-size:13px;margin-bottom:2px}
.scan-item:hover{background:#131f36}
.scan-item.selected{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3)}
.scan-rssi{color:#6b7fa3;font-size:11px;font-family:monospace}
.scan-lock{color:#f59e0b;font-size:11px}
.loading{text-align:center;padding:20px;color:#6b7fa3}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #1a2a48;border-top-color:#10b981;border-radius:50%;animation:spin .6s linear infinite;margin-right:6px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.msg{padding:10px;border-radius:8px;font-size:12px;margin-bottom:8px;display:none}
.msg-ok{display:block;background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2)}
.msg-err{display:block;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
</style>
</head>
<body>
<div class="container">
  <h1>IoT Relay Control <span>Halaman Konfigurasi Perangkat</span></h1>

  <div class="card">
    <h2>&#128225; Status WiFi</h2>
    <div id="wifi-status"><div class="loading"><span class="spinner"></span>Memuat...</div></div>
  </div>

  <div class="card">
    <h2>&#128187; Informasi Perangkat</h2>
    <div id="device-info"><div class="loading"><span class="spinner"></span>Memuat...</div></div>
  </div>

  <div class="card">
    <h2>&#128269; Pindai Jaringan WiFi</h2>
    <button class="btn btn-scan" onclick="scanWifi()" id="btn-scan">Pindai WiFi</button>
    <div id="scan-list"></div>
  </div>

  <div class="card">
    <h2>&#9881; Konfigurasi WiFi Baru</h2>
    <div id="msg" class="msg"></div>
    <input type="text" id="inp-ssid" placeholder="Nama WiFi (SSID)">
    <input type="password" id="inp-pass" placeholder="Password WiFi">
    <button class="btn btn-primary" onclick="saveWifi()" id="btn-save">Simpan & Hubungkan</button>
  </div>

  <button class="btn btn-danger" onclick="resetWifi()">Reset Konfigurasi WiFi</button>
</div>

<script>
function get(url){return fetch(url).then(r=>r.json())}
function post(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json())}

function showMsg(txt,ok){
  var m=document.getElementById('msg');
  m.className='msg '+(ok?'msg-ok':'msg-err');
  m.textContent=txt;
  setTimeout(function(){m.className='msg';m.style.display='none'},5000);
}

function loadStatus(){
  get('/api/wifi/status').then(function(d){
    var h='<div class="row"><span class="label">Mode</span><span class="value">'+d.mode+'</span></div>';
    h+='<div class="row"><span class="label">STA Status</span><span class="value"><span class="badge '+(d.sta_connected?'badge-on':'badge-off')+'">'+(d.sta_connected?'Terhubung':'Terputus')+'</span></span></div>';
    if(d.sta_connected){
      h+='<div class="row"><span class="label">STA SSID</span><span class="value">'+d.sta_ssid+'</span></div>';
      h+='<div class="row"><span class="label">STA IP</span><span class="value">'+d.sta_ip+'</span></div>';
      h+='<div class="row"><span class="label">Signal</span><span class="value">'+d.rssi+' dBm</span></div>';
    }
    h+='<div class="row"><span class="label">AP SSID</span><span class="value">'+d.ap_ssid+'</span></div>';
    h+='<div class="row"><span class="label">AP IP</span><span class="value">'+d.ap_ip+'</span></div>';
    document.getElementById('wifi-status').innerHTML=h;
  }).catch(function(){});
}

function loadDeviceInfo(){
  get('/api/device-info').then(function(d){
    var h='<div class="row"><span class="label">Nama</span><span class="value">'+d.device_name+'</span></div>';
    h+='<div class="row"><span class="label">MAC</span><span class="value">'+d.mac_address+'</span></div>';
    h+='<div class="row"><span class="label">Uptime</span><span class="value">'+Math.floor(d.uptime/3600)+'j '+Math.floor((d.uptime%3600)/60)+'m '+d.uptime%60+'d</span></div>';
    h+='<div class="row"><span class="label">Free Heap</span><span class="value">'+(d.free_heap/1024).toFixed(1)+' KB</span></div>';
    h+='<div class="row"><span class="label">Flash Size</span><span class="value">'+(d.flash_size/1024)+' KB</span></div>';
    h+='<div class="row"><span class="label">CPU Freq</span><span class="value">'+d.cpu_freq+' MHz</span></div>';
    document.getElementById('device-info').innerHTML=h;
  }).catch(function(){});
}

function scanWifi(){
  var btn=document.getElementById('btn-scan');
  var list=document.getElementById('scan-list');
  btn.disabled=true;
  btn.textContent='Memindai...';
  list.innerHTML='<div class="loading"><span class="spinner"></span>Memindai jaringan...</div>';
  get('/api/wifi/scan').then(function(d){
    btn.disabled=false;
    btn.textContent='Pindai WiFi';
    if(!d.networks||d.networks.length===0){
      list.innerHTML='<div style="color:#6b7fa3;text-align:center;padding:12px">Tidak ada jaringan ditemukan</div>';
      return;
    }
    var h='';
    d.networks.forEach(function(n){
      var rssi=n.rssi>-50?'Kuat':n.rssi>-70?'Sedang':'Lemah';
      h+='<div class="scan-item" onclick="selectNetwork(\''+n.ssid.replace(/'/g,"\\'")+'\')">';
      h+='<span>'+n.ssid+(n.secured?' <span class="scan-lock">&#128274;</span>':'')+'</span>';
      h+='<span class="scan-rssi">'+n.rssi+'dBm ('+rssi+')</span>';
      h+='</div>';
    });
    list.innerHTML=h;
  }).catch(function(){
    btn.disabled=false;
    btn.textContent='Pindai WiFi';
    list.innerHTML='<div style="color:#ef4444;text-align:center;padding:12px">Gagal memindai</div>';
  });
}

function selectNetwork(ssid){
  document.getElementById('inp-ssid').value=ssid;
  document.getElementById('inp-pass').focus();
  var items=document.querySelectorAll('.scan-item');
  items.forEach(function(el){
    el.classList.remove('selected');
    if(el.textContent.indexOf(ssid)===0) el.classList.add('selected');
  });
}

function saveWifi(){
  var ssid=document.getElementById('inp-ssid').value.trim();
  var pass=document.getElementById('inp-pass').value;
  if(!ssid){showMsg('SSID tidak boleh kosong',false);return}
  var btn=document.getElementById('btn-save');
  btn.disabled=true;
  btn.textContent='Menyimpan...';
  post('/api/wifi/config',{ssid:ssid,password:pass}).then(function(d){
    btn.disabled=false;
    btn.textContent='Simpan & Hubungkan';
    showMsg(d.message||'Tersimpan! ESP sedang reconnect...',true);
    setTimeout(loadStatus,3000);
    setTimeout(loadStatus,8000);
  }).catch(function(){
    btn.disabled=false;
    btn.textContent='Simpan & Hubungkan';
    showMsg('Gagal menyimpan',false);
  });
}

function resetWifi(){
  if(!confirm('Reset konfigurasi WiFi? ESP akan restart.'))return;
  post('/api/wifi/reset',{}).then(function(d){
    alert(d.message);
  }).catch(function(){});
}

loadStatus();
loadDeviceInfo();
setInterval(loadStatus,5000);
</script>
</body>
</html>
)rawliteral";

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

void sendError(int statusCode, const char* message) {
  JsonDocument doc;
  doc["error"] = message;
  sendJson(statusCode, doc);
}

// ============================================
// FUNGSI: Kontrol pin relay fisik
// ============================================
void setRelayPin(int index, bool state) {
  digitalWrite(relayPins[index], state ? LOW : HIGH);
  relayStates[index] = state;
}

void initRelayPins() {
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(relayPins[i], OUTPUT);
    setRelayPin(i, false);
  }
  Serial.println("[RELAY] Semua pin relay diinisialisasi (OFF)");
}

// ============================================
// HANDLER: GET / (Halaman Konfigurasi)
// ============================================
void handleConfigPage() {
  server.send_P(200, "text/html", CONFIG_PAGE);
}

// ============================================
// HANDLER: GET /api/device-info
// ============================================
void handleGetDeviceInfo() {
  JsonDocument doc;
  doc["device_name"] = DEVICE_NAME;
  doc["ip_address"]  = currentIP;
  doc["ap_ip"]       = WiFi.softAPIP().toString();
  doc["wifi_status"] = (WiFi.status() == WL_CONNECTED) ? "Terhubung" : "Terputus";
  doc["mac_address"] = WiFi.macAddress();
  doc["uptime"]      = millis() / 1000;
  doc["free_heap"]   = ESP.getFreeHeap();
  doc["flash_size"]  = ESP.getFlashChipSize();
  doc["cpu_freq"]    = ESP.getCpuFreqMHz();
  doc["sdk_version"] = ESP.getSdkVersion();

  sendJson(200, doc);
}

// ============================================
// HANDLER: GET /api/wifi/status
// ============================================
void handleGetWifiStatus() {
  JsonDocument doc;
  doc["mode"]         = "AP + STA";
  doc["sta_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["sta_ssid"]     = storedSSID;
  doc["sta_ip"]       = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "0.0.0.0";
  doc["rssi"]         = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  doc["ap_ssid"]      = apSSID;
  doc["ap_ip"]        = WiFi.softAPIP().toString();
  doc["ap_pass"]      = DEFAULT_AP_PASS;

  sendJson(200, doc);
}

// ============================================
// HANDLER: GET /api/wifi/scan
// ============================================
void handleGetWifiScan() {
  Serial.println("[WIFI] Memulai scan...");
  int n = WiFi.scanNetworks();
  Serial.printf("[WIFI] Ditemukan %d jaringan\n", n);

  JsonDocument doc;
  JsonArray networks = doc["networks"].to<JsonArray>();

  for (int i = 0; i < n; i++) {
    JsonObject net = networks.add<JsonObject>();
    net["ssid"]    = WiFi.SSID(i).c_str();
    net["rssi"]    = WiFi.RSSI(i);
    net["secured"] = (WiFi.encryptionType(i) != ENC_TYPE_NONE);
    net["channel"] = WiFi.channel(i);
  }
  WiFi.scanDelete();

  sendJson(200, doc);
}

// ============================================
// HANDLER: POST /api/wifi/config
// ============================================
void handlePostWifiConfig() {
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

  const char* newSSID = doc["ssid"] | "";
  const char* newPass = doc["password"] | "";

  if (strlen(newSSID) == 0) {
    sendError(400, "SSID tidak boleh kosong");
    return;
  }
  if (strlen(newSSID) > MAX_SSID_LEN) {
    sendError(400, "SSID terlalu panjang (max 32 karakter)");
    return;
  }
  if (strlen(newPass) > MAX_PASS_LEN) {
    sendError(400, "Password terlalu panjang (max 64 karakter)");
    return;
  }

  // Simpan ke EEPROM
  saveWifiToEEPROM(newSSID, newPass);

  // Update variabel runtime
  strncpy(storedSSID, newSSID, MAX_SSID_LEN);
  strncpy(storedPass, newPass, MAX_PASS_LEN);
  storedSSID[MAX_SSID_LEN] = '\0';
  storedPass[MAX_PASS_LEN] = '\0';

  // Set flag untuk reconnect di loop()
  wifiState = WIFI_RECONNECTING;
  wifiReconnectStart = millis();

  // Response SEBELUM disconnect (agar HTTP response terkirim)
  JsonDocument response;
  response["message"] = "WiFi tersimpan. ESP sedang reconnect ke: " + String(newSSID);
  response["ap_fallback"] = WiFi.softAPIP().toString();
  sendJson(200, response);

  Serial.printf("[WIFI] Config disimpan, akan reconnect ke: %s\n", newSSID);
}

// ============================================
// HANDLER: POST /api/wifi/reset
// ============================================
void handlePostWifiReset() {
  clearWifiEEPROM();

  JsonDocument response;
  response["message"] = "WiFi config direset. ESP akan restart dalam AP mode.";
  sendJson(200, response);

  Serial.println("[WIFI] Config direset, restart...");
  delay(500);
  ESP.restart();
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
}

// ============================================
// HANDLER: POST /api/relay
// ============================================
void handlePostRelay() {
  if (!server.hasArg("plain")) { sendError(400, "Request body kosong"); return; }

  JsonDocument doc;
  if (deserializeJson(doc, server.arg("plain"))) { sendError(400, "JSON tidak valid"); return; }

  int id = doc["id"] | 0;
  bool status = doc["status"] | false;

  if (id < 1 || id > RELAY_COUNT) { sendError(400, "ID relay tidak valid (1-4)"); return; }

  setRelayPin(id - 1, status);

  JsonDocument response;
  response["id"]      = id;
  response["name"]    = relayNames[id - 1];
  response["status"]  = relayStates[id - 1];
  response["message"] = status ? "Relay ON" : "Relay OFF";
  sendJson(200, response);
}

// ============================================
// HANDLER: POST /api/relay/all
// ============================================
void handlePostRelayAll() {
  if (!server.hasArg("plain")) { sendError(400, "Request body kosong"); return; }

  JsonDocument doc;
  if (deserializeJson(doc, server.arg("plain"))) { sendError(400, "JSON tidak valid"); return; }

  bool status = doc["status"] | false;
  for (int i = 0; i < RELAY_COUNT; i++) setRelayPin(i, status);

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
}

// ============================================
// HANDLER: GET /api/sensors
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
}

// ============================================
// HANDLER: OPTIONS (CORS preflight)
// ============================================
void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}

// ============================================
// HANDLER: 404
// ============================================
void handleNotFound() {
  sendError(404, "Endpoint tidak ditemukan");
}

// ============================================
// DAFTARKAN SEMUA ROUTE
// ============================================
void registerRoutes() {
  // Halaman konfigurasi
  server.on("/", HTTP_GET, handleConfigPage);

  // Device info
  server.on("/api/device-info", HTTP_GET, handleGetDeviceInfo);

  // WiFi management
  server.on("/api/wifi/status", HTTP_GET, handleGetWifiStatus);
  server.on("/api/wifi/scan", HTTP_GET, handleGetWifiScan);
  server.on("/api/wifi/config", HTTP_POST, handlePostWifiConfig);
  server.on("/api/wifi/reset", HTTP_POST, handlePostWifiReset);

  // Relay
  server.on("/api/relays", HTTP_GET, handleGetRelays);
  server.on("/api/relay", HTTP_POST, handlePostRelay);
  server.on("/api/relay/all", HTTP_POST, handlePostRelayAll);

  // Sensor
  server.on("/api/sensors", HTTP_GET, handleGetSensors);

  // CORS preflight untuk semua endpoint
  const char* paths[] = {
    "/", "/api/device-info",
    "/api/wifi/status", "/api/wifi/scan", "/api/wifi/config", "/api/wifi/reset",
    "/api/relays", "/api/relay", "/api/relay/all", "/api/sensors"
  };
  for (int i = 0; i < 10; i++) {
    server.on(paths[i], HTTP_OPTIONS, handleOptions);
  }

  server.onNotFound(handleNotFound);
  Serial.println("[SERVER] Semua route terdaftar");
}

// ============================================
// WIFI: Mulai AP mode
// ============================================
void startAP() {
  apSSID = "IoT-Relay-" + String(ESP.getChipId(), HEX).substring(0, 4);
  WiFi.softAP(apSSID.c_str(), DEFAULT_AP_PASS);
  Serial.printf("[AP] SSID: %s\n", apSSID.c_str());
  Serial.printf("[AP] Password: %s\n", DEFAULT_AP_PASS);
  Serial.printf("[AP] IP: %s\n", WiFi.softAPIP().toString().c_str());
}

// ============================================
// WIFI: Koneksi STA
// ============================================
void connectSTA() {
  Serial.printf("[STA] Menghubungkan ke: %s", storedSSID);
  WiFi.begin(storedSSID, storedPass);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    currentIP = WiFi.localIP().toString();
    Serial.println();
    Serial.printf("[STA] Terhubung! IP: %s\n", currentIP.c_str());
  } else {
    currentIP = "0.0.0.0";
    Serial.println();
    Serial.println("[STA] Gagal terhubung, gunakan AP mode");
  }
}

// ============================================
// WIFI: Cek koneksi & handle reconnect state
// ============================================
void manageWiFi() {
  unsigned long now = millis();

  // Handle reconnect setelah config baru
  if (wifiState == WIFI_RECONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      wifiState = WIFI_NORMAL;
      currentIP = WiFi.localIP().toString();
      Serial.printf("[STA] Reconnect berhasil! IP: %s\n", currentIP.c_str());
    } else if (now - wifiReconnectStart > 15000) {
      // Timeout 15 detik — gagal reconnect
      wifiState = WIFI_NORMAL;
      currentIP = "0.0.0.0";
      Serial.println("[STA] Reconnect gagal (timeout). AP tetap tersedia.");
    }
    return;  // Skip normal check saat reconnecting
  }

  // Cek berkala setiap 30 detik
  if (now - lastWifiCheck < WIFI_CHECK_INTERVAL) return;
  lastWifiCheck = now;

  if (WiFi.status() == WL_CONNECTED) {
    currentIP = WiFi.localIP().toString();
  } else {
    Serial.println("[STA] Koneksi terputus, mencoba reconnect...");
    WiFi.begin(storedSSID, storedPass);
  }
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=====================================");
  Serial.println("  IoT Relay Control System v1.3");
  Serial.println("  Device: " + String(DEVICE_NAME));
  Serial.println("=====================================");

  // 1. Inisialisasi relay
  initRelayPins();

  // 2. Muat WiFi dari EEPROM (jika ada)
  loadWifiFromEEPROM(storedSSID, storedPass);

  // 3. Mulai AP mode (selalu aktif)
  WiFi.mode(WIFI_AP_STA);
  startAP();

  // 4. Koneksi STA
  connectSTA();

  // 5. Mulai DNS server (captive portal)
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  Serial.println("[DNS] Captive portal aktif");

  // 6. Daftarkan route & mulai server
  registerRoutes();
  server.begin();
  Serial.println("[SERVER] HTTP server berjalan di port 80");
  Serial.println("=====================================");
}

// ============================================
// LOOP
// ============================================
void loop() {
  dnsServer.processNextRequest();  // Captive portal
  server.handleClient();           // HTTP requests
  manageWiFi();                    // WiFi state management
}
