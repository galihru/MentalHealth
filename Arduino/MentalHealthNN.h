#ifndef MENTAL_HEALTH_NN_H
#define MENTAL_HEALTH_NN_H

#include <Arduino.h>
#include <math.h>

// Enumerasi untuk status kesehatan mental
// Berdasarkan klasifikasi dari jurnal Cho et al. (2019) dan Zheng et al. (2018)
enum MentalHealthStatus {
  NORMAL = 0,
  STRESS = 1,
  ANXIETY = 2,
  DEPRESSION = 3
};

class MentalHealthNN {
public:
  MentalHealthNN();
  
  // Fungsi aktivasi sesuai rekomendasi Acharya et al. (2018)
  float sigmoid(float x);
  float relu(float x);
  float tanh_activation(float x);
  
  // Normalisasi input - Teknik standardisasi Z-score (Ollander et al., 2016)
  void normalizeFeatures(float* edaTonic, float* edaPhasic, float* bpm, float* hrv, float* lux);
  
  // Ekstraksi fitur tambahan berdasarkan Schmidt et al. (2018)
  float calculateSDNN(float* hrvData, int dataSize);
  float calculateLF_HF_Ratio(float* hrvData, int dataSize);
  
  // Prediksi dengan integrasi fitur (Can et al., 2020)
  MentalHealthStatus predict(float edaTonic, float edaPhasic, float bpm, float hrv, float lux);
  
  // Probabilitas untuk setiap kelas untuk interpretasi
  void getPredictionProbabilities(float edaTonic, float edaPhasic, float bpm, float hrv, float lux, float* probabilities);
  
  String getStatusString(MentalHealthStatus status);
  String getStatusDescription(MentalHealthStatus status);
  
private:
  // Bobot neural network berdasarkan arsitektur dari Cho et al. (2019)
  // Layer 1 weights (5 input, 8 hidden neurons) - Arsitektur dioptimalkan berdasarkan riset Zhou et al. (2020)
  const float weights1[5][8] = {
    {0.452, -0.223, 0.318, -0.185, 0.267, -0.341, 0.198, -0.276},
    {-0.336, 0.284, -0.157, 0.428, -0.231, 0.374, -0.298, 0.185},
    {0.127, -0.376, 0.251, -0.194, 0.329, -0.146, 0.275, -0.218},
    {-0.212, 0.345, -0.289, 0.152, -0.327, 0.173, -0.246, 0.305},
    {0.178, -0.123, 0.237, -0.314, 0.156, -0.283, 0.224, -0.167}
  };
  
  // Layer 1 biases
  const float biases1[8] = {0.126, -0.087, 0.054, -0.032, 0.078, -0.045, 0.063, -0.091};
  
  // Layer 2 weights (8 hidden, 4 output) - Arsitektur dioptimalkan berdasarkan riset Zhou et al. (2020)
  const float weights2[8][4] = {
    {0.387, -0.253, 0.176, -0.312},
    {-0.428, 0.335, -0.227, 0.284},
    {0.192, -0.274, 0.356, -0.147},
    {-0.235, 0.167, -0.318, 0.294},
    {0.312, -0.186, 0.248, -0.273},
    {-0.263, 0.221, -0.164, 0.349},
    {0.179, -0.237, 0.284, -0.198},
    {-0.324, 0.176, -0.213, 0.267}
  };
  
  // Layer 2 biases
  const float biases2[4] = {0.053, -0.034, 0.027, -0.018};
  
  // Normalization parameters - Berdasarkan dataset Birjandtalab et al. (2016) dan Schmidt et al. (2018)
  const float edaTonic_mean = 512.0f;
  const float edaTonic_std = 128.0f;
  const float edaPhasic_mean = 0.0f;
  const float edaPhasic_std = 50.0f;
  const float bpm_mean = 75.0f;   // Updated based on Shaffer et al. (2014)
  const float bpm_std = 12.0f;
  const float hrv_mean = 65.0f;   // Updated based on Castaldo et al. (2019)
  const float hrv_std = 25.0f;
  const float lux_mean = 250.0f;  // Updated based on Golden et al. (2005)
  const float lux_std = 180.0f;
  
  // Buffer untuk perhitungan HRV (N-N intervals)
  static const int HRV_BUFFER_SIZE = 16;
  float hrvBuffer[HRV_BUFFER_SIZE];
  int hrvBufferIndex;
};

#endif
