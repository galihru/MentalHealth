#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <BH1750.h>
#include <Base64.h>
#include <time.h>
#include "MentalHealthNN.h"  // Include neural network header

const char* ssid = "xxxxxxxxxxxx";
const char* password = "xxxxxxxxxxxx";

// Konfigurasi GitHub
const char* gsrUrl = "https://api.github.com/repos/4211421036/MentalHealth/contents/GSR.json";
const char* maxUrl = "https://api.github.com/repos/4211421036/MentalHealth/contents/MAX30102.json";
const char* bhUrl = "https://api.github.com/repos/4211421036/MentalHealth/contents/BH1750.json";
const char* statusUrl = "https://api.github.com/repos/4211421036/MentalHealth/contents/MentalStatus.json";
const char* token = "Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 25200;  // GMT+7
const int daylightOffset_sec = 0;

// Sensor Objects
MAX30105 particleSensor;
BH1750 lightMeter;
MentalHealthNN mentalHealth; // Neural network instance

// Pin Config
const int GSR_PIN = 34;
const int WINDOW_SIZE = 5;  // Untuk moving average GSR (Boucsein, 2012)

// Variabel Sensor
float eda_buffer[WINDOW_SIZE] = {0};
int buffer_index = 0;
float beatsPerMinute, beatAvg;
byte rates[4], rateSpot = 0;
long lastBeat = 0;

// HRV calculation (SDNN)
const int RR_BUFFER_SIZE = 16;
float rrIntervals[RR_BUFFER_SIZE] = {0};
int rrIndex = 0;
unsigned long lastRRTime = 0;
float sdnn = 0;

String lastSHA_GSR, lastSHA_MAX, lastSHA_BH, lastSHA_STATUS;

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

// Fungsi untuk menghitung SDNN (Standard Deviation of NN intervals) - Castaldo et al. (2019)
float calculateSDNN() {
  float mean = 0.0f;
  for (int i = 0; i < RR_BUFFER_SIZE; i++) {
    mean += rrIntervals[i];
  }
  mean /= RR_BUFFER_SIZE;
  
  float variance = 0.0f;
  for (int i = 0; i < RR_BUFFER_SIZE; i++) {
    variance += (rrIntervals[i] - mean) * (rrIntervals[i] - mean);
  }
  variance /= RR_BUFFER_SIZE;
  
  return sqrt(variance);
}

// Fungsi untuk mendeteksi kondisi kesehatan mental dan memberikan respons
void detectMentalHealth(float edaTonic, float edaPhasic, float bpm, float hrv, float lux, 
                        MentalHealthStatus& status, float* probabilities) {
  // Periksa validitas data input
  if (isnan(bpm) || bpm <= 0) bpm = 75.0f; // Default value
  if (isnan(hrv) || hrv <= 0) hrv = 65.0f; // Default value
  if (isnan(lux)) lux = 250.0f;            // Default value
  
  // Dapatkan prediksi status kesehatan mental
  status = mentalHealth.predict(edaTonic, edaPhasic, bpm, hrv, lux);
  
  // Dapatkan probabilitas untuk setiap kelas
  mentalHealth.getPredictionProbabilities(edaTonic, edaPhasic, bpm, hrv, lux, probabilities);
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
  } else {
    Serial.println("MAX30102 initialized successfully");
    // Konfigurasi sesuai rekomendasi untuk HRV Shaffer et al. (2014)
    particleSensor.setup(); 
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }
  
  if (lightMeter.begin()) {
    Serial.println("BH1750 initialized successfully");
  } else {
    Serial.println("BH1750 not found");
  }

  // Initialize HRV buffer
  for(int i=0; i<RR_BUFFER_SIZE; i++) {
    rrIntervals[i] = 800.0; // 800ms = 75 BPM default
  }

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Mental Health Monitoring System initialized");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }
  
  static unsigned long lastUpload = 0;
  static unsigned long lastAnalysis = 0;
  static MentalHealthStatus currentStatus = NORMAL;
  static float statusProbabilities[4] = {1.0, 0.0, 0.0, 0.0};
  
  // Read GSR sensor data (Boucsein, 2012)
  float gsrRaw = analogRead(GSR_PIN);
  float edaTonic = edaMovingAverage(gsrRaw);
  float edaPhasic = gsrRaw - edaTonic;
  
  // Read MAX30102 data (heart rate & HRV) (Shaffer et al., 2014)
  long irValue = particleSensor.getIR();
  
  if(irValue > 50000) {  // Finger detected
    if(checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      
      // Calculate instant BPM
      beatsPerMinute = 60000.0 / delta;
      
      // Only use reasonable BPM values
      if(beatsPerMinute < 255 && beatsPerMinute > 20) {
        // Store BPM in array for averaging
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= 4;
        
        // Calculate average BPM
        beatAvg = 0;
        for(byte x=0; x<4; x++) beatAvg += rates[x];
        beatAvg /= 4;
        
        // Add RR interval to array for HRV calculation (milliseconds)
        rrIntervals[rrIndex] = delta;
        rrIndex = (rrIndex + 1) % RR_BUFFER_SIZE;
        
        // Calculate SDNN (HRV metric)
        sdnn = calculateSDNN();
      }
    }
  } else {
    // No finger detected
    beatsPerMinute = 0;
    beatAvg = 0;
  }

  // Read BH1750 ambient light sensor (Golden et al., 2005)
  float lux = lightMeter.readLightLevel();

  // Analyze mental health status every 5 seconds
  if (millis() - lastAnalysis >= 5000) {
    detectMentalHealth(edaTonic, edaPhasic, beatAvg, sdnn, lux, currentStatus, statusProbabilities);
    lastAnalysis = millis();
    
    // Print status to Serial
    Serial.println("-------- Mental Health Analysis --------");
    Serial.print("EDA Tonic: "); Serial.print(edaTonic);
    Serial.print(" | EDA Phasic: "); Serial.println(edaPhasic);
    Serial.print("Heart Rate: "); Serial.print(beatAvg);
    Serial.print(" BPM | HRV (SDNN): "); Serial.println(sdnn);
    Serial.print("Ambient Light: "); Serial.print(lux); Serial.println(" lux");
    Serial.print("Mental Status: "); Serial.println(mentalHealth.getStatusString(currentStatus));
    Serial.print("Description: "); Serial.println(mentalHealth.getStatusDescription(currentStatus));
    Serial.print("Confidence: Normal ("); Serial.print(statusProbabilities[0] * 100);
    Serial.print("%), Stress ("); Serial.print(statusProbabilities[1] * 100);
    Serial.print("%), Anxiety ("); Serial.print(statusProbabilities[2] * 100);
    Serial.print("%), Depression ("); Serial.print(statusProbabilities[3] * 100);
    Serial.println("%)");
    Serial.println("---------------------------------------");
  }

  // Upload data to GitHub every 10 seconds
  if(millis() - lastUpload >= 10000) {
    String timestamp = getTimestamp();
    
    // Buat dokumen JSON untuk masing-masing sensor
    DynamicJsonDocument gsrDoc(256);
    gsrDoc["sensor"] = "GSR";
    gsrDoc["tonic"] = edaTonic;
    gsrDoc["phasic"] = edaPhasic;
    gsrDoc["timestamp"] = timestamp;
    
    DynamicJsonDocument maxDoc(256);
    maxDoc["sensor"] = "MAX30102";
    maxDoc["bpm"] = beatAvg;
    maxDoc["hrv"] = sdnn;
    maxDoc["timestamp"] = timestamp;
    
    DynamicJsonDocument bhDoc(256);
    bhDoc["sensor"] = "BH1750";
    bhDoc["lux"] = lux;
    bhDoc["timestamp"] = timestamp;
    
    // Dokumen untuk status kesehatan mental
    DynamicJsonDocument statusDoc(512);
    statusDoc["status"] = mentalHealth.getStatusString(currentStatus);
    statusDoc["description"] = mentalHealth.getStatusDescription(currentStatus);
    statusDoc["normal_prob"] = statusProbabilities[0];
    statusDoc["stress_prob"] = statusProbabilities[1];
    statusDoc["anxiety_prob"] = statusProbabilities[2];
    statusDoc["depression_prob"] = statusProbabilities[3];
    statusDoc["timestamp"] = timestamp;

    // Upload ke GitHub
    if(lastSHA_GSR == "") lastSHA_GSR = getCurrentSHA(gsrUrl);
    uploadToGitHub(gsrDoc, gsrUrl, lastSHA_GSR);
    
    if(lastSHA_MAX == "") lastSHA_MAX = getCurrentSHA(maxUrl);
    uploadToGitHub(maxDoc, maxUrl, lastSHA_MAX);
    
    if(lastSHA_BH == "") lastSHA_BH = getCurrentSHA(bhUrl);
    uploadToGitHub(bhDoc, bhUrl, lastSHA_BH);
    
    if(lastSHA_STATUS == "") lastSHA_STATUS = getCurrentSHA(statusUrl);
    uploadToGitHub(statusDoc, statusUrl, lastSHA_STATUS);

    Serial.println("Data uploaded to GitHub");
    lastUpload = millis();
  }
}
