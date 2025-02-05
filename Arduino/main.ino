#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <BH1750.h>
#include <Base64.h>
#include <time.h>

// Konfigurasi WiFi
const char* ssid = "xxxxx";
const char* password = "xxxxx";

// Konfigurasi GitHub
const char* gsrUrl = "https://api.github.com/repos/[USER]/[REPO]/contents/GSR.json";
const char* maxUrl = "https://api.github.com/repos/[USER]/[REPO]/contents/MAX30102.json";
const char* bhUrl = "https://api.github.com/repos/[USER]/[REPO]/contents/BH1750.json";
const char* token = "Bearer [GITHUB_TOKEN]";

// Konfigurasi waktu
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 25200;  // GMT+7
const int daylightOffset_sec = 0;

// Sensor Objects
MAX30105 particleSensor;
BH1750 lightMeter;

// Pin Config
const int GSR_PIN = 34;
const int WINDOW_SIZE = 5;  // Untuk moving average GSR (Boucsein, 2012)

// Variabel Sensor
float eda_buffer[WINDOW_SIZE] = {0};
int buffer_index = 0;
float beatsPerMinute, beatAvg;
byte rates[4], rateSpot = 0;
long lastBeat = 0;

String lastSHA_GSR, lastSHA_MAX, lastSHA_BH;

String getCurrentSHA(const char* url) {
  HTTPClient http;
  String sha = "";
  http.begin(url);
  http.addHeader("Authorization", token);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    sha = doc["sha"].as<String>();
  }
  http.end();
  return sha;
}

void uploadToGitHub(DynamicJsonDocument doc, const char* url, String& lastSHA) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", token);

  String jsonStr;
  serializeJson(doc, jsonStr);
  String encodedData = base64::encode(jsonStr);

  String payload = "{\"message\":\"Update data\",\"content\":\"" + encodedData + "\",\"sha\":\"" + lastSHA + "\"}";

  int httpCode = http.PUT(payload);
  if (httpCode == HTTP_CODE_OK) {
    DynamicJsonDocument respDoc(1024);
    deserializeJson(respDoc, http.getString());
    lastSHA = respDoc["content"]["sha"].as<String>();
  }
  http.end();
}

String getTimestamp() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "";
  char buffer[20];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

// Fungsi moving average untuk EDA tonic (Boucsein, 2012)
float edaMovingAverage(float newVal) {
  eda_buffer[buffer_index] = newVal;
  buffer_index = (buffer_index + 1) % WINDOW_SIZE;
  float sum = 0;
  for(int i=0; i<WINDOW_SIZE; i++) sum += eda_buffer[i];
  return sum/WINDOW_SIZE;
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 20) {
    delay(500);
    Serial.print(".");
    wifiTimeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi");
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  } else {
    Serial.println("\nFailed to connect WiFi");
    ESP.restart();
  }
  
  // Inisialisasi Sensor
  Wire.begin();
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found");
  }
  particleSensor.setup();
  lightMeter.begin();

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }
  static unsigned long lastUpload = 0;
  
  // Baca semua sensor
  float gsrRaw = analogRead(GSR_PIN);
  float edaTonic = edaMovingAverage(gsrRaw);
  float edaPhasic = gsrRaw - edaTonic;  // Boucsein (2012)
  
  long irValue = particleSensor.getIR();
  if(irValue > 50000 && checkForBeat(irValue)) {  // Shaffer et al. (2014)
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);
    if(beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= 4;
      beatAvg = 0;
      for(byte x=0; x<4; x++) beatAvg += rates[x];
      beatAvg /= 4;
    }
  }

  float lux = lightMeter.readLightLevel();  // Golden et al. (2005)

  if(millis() - lastUpload >= 10000) {  // Upload setiap 10 detik
    String timestamp = getTimestamp();
    
    // Buat dokumen JSON untuk masing-masing sensor
    DynamicJsonDocument gsrDoc(256);
    gsrDoc["sensor"] = "GSR";
    gsrDoc["tonic"] = edaTonic;
    gsrDoc["phasic"] = edaPhasic;
    gsrDoc["timestamp"] = timestamp;
    
    DynamicJsonDocument maxDoc(256);
    maxDoc["sensor"] = "MAX30102";
    maxDoc["bpm"] = beatsPerMinute;
    maxDoc["hrv"] = beatAvg;  // SDNN dihitung offline
    maxDoc["timestamp"] = timestamp;
    
    DynamicJsonDocument bhDoc(256);
    bhDoc["sensor"] = "BH1750";
    bhDoc["lux"] = lux;
    bhDoc["timestamp"] = timestamp;

    // Upload ke GitHub
    if(lastSHA_GSR == "") lastSHA_GSR = getCurrentSHA(gsrUrl);
    uploadToGitHub(gsrDoc, gsrUrl, lastSHA_GSR);
    
    if(lastSHA_MAX == "") lastSHA_MAX = getCurrentSHA(maxUrl);
    uploadToGitHub(maxDoc, maxUrl, lastSHA_MAX);
    
    if(lastSHA_BH == "") lastSHA_BH = getCurrentSHA(bhUrl);
    uploadToGitHub(bhDoc, bhUrl, lastSHA_BH);

    lastUpload = millis();
  }
}
