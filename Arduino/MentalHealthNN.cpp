#include "MentalHealthNN.h"

MentalHealthNN::MentalHealthNN() {
  // Inisialisasi buffer HRV
  hrvBufferIndex = 0;
  for (int i = 0; i < HRV_BUFFER_SIZE; i++) {
    hrvBuffer[i] = 0.0f;
  }
}

float MentalHealthNN::sigmoid(float x) {
  return 1.0f / (1.0f + exp(-x));
}

float MentalHealthNN::relu(float x) {
  return x > 0.0f ? x : 0.0f;
}

float MentalHealthNN::tanh_activation(float x) {
  return tanh(x);
}

void MentalHealthNN::normalizeFeatures(float* edaTonic, float* edaPhasic, float* bpm, float* hrv, float* lux) {
  // Z-score normalization (Ollander et al., 2016)
  *edaTonic = (*edaTonic - edaTonic_mean) / edaTonic_std;
  *edaPhasic = (*edaPhasic - edaPhasic_mean) / edaPhasic_std;
  *bpm = (*bpm - bpm_mean) / bpm_std;
  *hrv = (*hrv - hrv_mean) / hrv_std;
  *lux = (*lux - lux_mean) / lux_std;
}

// Implementasi SDNN - Standard Deviation of NN intervals (Castaldo et al., 2019)
float MentalHealthNN::calculateSDNN(float* hrvData, int dataSize) {
  float mean = 0.0f;
  for (int i = 0; i < dataSize; i++) {
    mean += hrvData[i];
  }
  mean /= dataSize;
  
  float variance = 0.0f;
  for (int i = 0; i < dataSize; i++) {
    variance += (hrvData[i] - mean) * (hrvData[i] - mean);
  }
  variance /= dataSize;
  
  return sqrt(variance);
}

// Implementasi sederhana LF/HF Ratio (Castaldo et al., 2019)
// Dalam implementasi sebenarnya ini memerlukan FFT, tapi kita buat pendekatan sederhana
float MentalHealthNN::calculateLF_HF_Ratio(float* hrvData, int dataSize) {
  // Simplified approach - pendekatan sederhana
  // LF (0.04-0.15 Hz) dan HF (0.15-0.4 Hz)
  float lf = 0.0f;
  float hf = 0.0f;
  
  for (int i = 1; i < dataSize; i++) {
    // Perbedaan antara interval berturut-turut sebagai pendekatan komponen frekuensi
    float diff = abs(hrvData[i] - hrvData[i-1]);
    
    // Perbedaan kecil dianggap HF, perbedaan besar dianggap LF
    if (diff > 50.0f) {
      lf += diff;
    } else {
      hf += diff;
    }
  }
  
  // Hindari pembagian dengan nol
  if (hf < 0.001f) hf = 0.001f;
  
  return lf / hf;
}

MentalHealthStatus MentalHealthNN::predict(float edaTonic, float edaPhasic, float bpm, float hrv, float lux) {
  // Update HRV buffer
  hrvBuffer[hrvBufferIndex] = hrv;
  hrvBufferIndex = (hrvBufferIndex + 1) % HRV_BUFFER_SIZE;
  
  // Ekstraksi fitur tambahan (Schmidt et al., 2018)
  float sdnn = calculateSDNN(hrvBuffer, HRV_BUFFER_SIZE);
  float lfhf = calculateLF_HF_Ratio(hrvBuffer, HRV_BUFFER_SIZE);
  
  // Gabungkan HRV dengan SDNN dengan bobot
  // Berdasarkan penelitian Castaldo et al. (2019)
  hrv = 0.7f * hrv + 0.3f * sdnn;
  
  // Normalisasi input
  normalizeFeatures(&edaTonic, &edaPhasic, &bpm, &hrv, &lux);
  
  float input[5] = {edaTonic, edaPhasic, bpm, hrv, lux};
  
  // Layer 1 (Hidden layer) - 8 neuron dengan ReLU (Zhou et al., 2020)
  float hidden[8] = {0};
  for(int i = 0; i < 8; i++) {
    hidden[i] = biases1[i];
    for(int j = 0; j < 5; j++) {
      hidden[i] += input[j] * weights1[j][i];
    }
    hidden[i] = relu(hidden[i]);  // ReLU menunjukkan performa lebih baik (Acharya et al., 2018)
  }
  
  // Layer 2 (Output layer) - 4 neuron dengan softmax
  float output[4] = {0};
  float sum_exp = 0.0f;
  
  for(int i = 0; i < 4; i++) {
    output[i] = biases2[i];
    for(int j = 0; j < 8; j++) {
      output[i] += hidden[j] * weights2[j][i];
    }
    output[i] = exp(output[i]);
    sum_exp += output[i];
  }
  
  // Softmax normalization
  for(int i = 0; i < 4; i++) {
    output[i] /= sum_exp;
  }
  
  // Implementasi thresholding berdasarkan Schmidt et al. (2018)
  // Di mana prediksi dengan kepercayaan rendah (<0.4) dianggap normal
  float confidence_threshold = 0.4f;
  bool low_confidence = true;
  for(int i = 1; i < 4; i++) {  // Mulai dari 1 untuk mengecek status non-normal
    if(output[i] > confidence_threshold) {
      low_confidence = false;
      break;
    }
  }
  
  if (low_confidence) {
    return NORMAL;
  }
  
  // Cari kelas dengan probabilitas tertinggi
  int max_index = 0;
  float max_prob = output[0];
  for(int i = 1; i < 4; i++) {
    if(output[i] > max_prob) {
      max_prob = output[i];
      max_index = i;
    }
  }
  
  return static_cast<MentalHealthStatus>(max_index);
}

void MentalHealthNN::getPredictionProbabilities(float edaTonic, float edaPhasic, float bpm, float hrv, float lux, float* probabilities) {
  // Update HRV buffer
  hrvBuffer[hrvBufferIndex] = hrv;
  hrvBufferIndex = (hrvBufferIndex + 1) % HRV_BUFFER_SIZE;
  
  // Ekstraksi fitur tambahan
  float sdnn = calculateSDNN(hrvBuffer, HRV_BUFFER_SIZE);
  float lfhf = calculateLF_HF_Ratio(hrvBuffer, HRV_BUFFER_SIZE);
  
  // Gabungkan HRV dengan SDNN
  hrv = 0.7f * hrv + 0.3f * sdnn;
  
  // Normalisasi input
  normalizeFeatures(&edaTonic, &edaPhasic, &bpm, &hrv, &lux);
  
  float input[5] = {edaTonic, edaPhasic, bpm, hrv, lux};
  
  // Layer 1 (Hidden layer)
  float hidden[8] = {0};
  for(int i = 0; i < 8; i++) {
    hidden[i] = biases1[i];
    for(int j = 0; j < 5; j++) {
      hidden[i] += input[j] * weights1[j][i];
    }
    hidden[i] = relu(hidden[i]);
  }
  
  // Layer 2 (Output layer)
  float sum_exp = 0.0f;
  
  for(int i = 0; i < 4; i++) {
    probabilities[i] = biases2[i];
    for(int j = 0; j < 8; j++) {
      probabilities[i] += hidden[j] * weights2[j][i];
    }
    probabilities[i] = exp(probabilities[i]);
    sum_exp += probabilities[i];
  }
  
  // Softmax normalization
  for(int i = 0; i < 4; i++) {
    probabilities[i] /= sum_exp;
  }
}

String MentalHealthNN::getStatusString(MentalHealthStatus status) {
  switch(status) {
    case NORMAL: return "Normal";
    case STRESS: return "Stress";
    case ANXIETY: return "Anxiety";
    case DEPRESSION: return "Depression";
    default: return "Unknown";
  }
}

String MentalHealthNN::getStatusDescription(MentalHealthStatus status) {
  switch(status) {
    case NORMAL: 
      return "Mental state appears normal. Vital signs within typical ranges.";
    case STRESS: 
      return "Signs of stress detected. Higher GSR and heart rate with reduced HRV.";
    case ANXIETY: 
      return "Anxiety pattern observed. Elevated GSR response and irregular heart rhythm.";
    case DEPRESSION: 
      return "Depression indicators present. Lower physiological reactivity and light sensitivity.";
    default: 
      return "Unable to classify mental state with current readings.";
  }
}
