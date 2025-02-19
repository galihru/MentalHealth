// EmotionDetection.js
import { Camera } from './Camera.js';
import { FaceMesh } from './FaceMesh.js';

export class EmotionDetection {
  constructor(videoElement, canvasElement, options = {}) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.lastFaceID = null;
    this.options = {
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...options
    };

    this.EMOTION_THRESHOLDS = {
      HAPPY: 0.65,
      SAD: 0.6,
      ANGRY: 0.55,
      SURPRISED: 0.5,
      NEUTRAL: 0.7
    };

    this.initializeFaceMesh();
  }

  async initializeFaceMesh() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions(this.options);
    this.faceMesh.onResults(this.onResults.bind(this));
  }

  start() {
    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({ image: this.videoElement });
      },
      width: 640,
      height: 480
    });

    return this.camera.start();
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
    }
  }

  onResults(results) {
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

    let currentFaceID = '';
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      currentFaceID = this.generateFaceID(landmarks);

      if (currentFaceID !== this.lastFaceID) {
        document.head.setAttribute('FaceID', currentFaceID);
        this.lastFaceID = currentFaceID;
      }

      const emotions = this.analyzeEmotions(landmarks);
      this.updateUI(emotions);

      results.multiFaceLandmarks.forEach(landmarks => {
        this.drawLandmarks(landmarks);
      });
    } else {
      if (this.lastFaceID !== null) {
        document.head.setAttribute('FaceID', '');
        this.lastFaceID = null;
      }
    }

    this.canvasCtx.restore();
  }

  generateFaceID(landmarks) {
    let hashString = landmarks.map(lm =>
      lm.x.toFixed(4) +
      lm.y.toFixed(4) +
      lm.z.toFixed(4)
    ).join('');

    return this.djb2Hash(hashString).toString(16);
  }

  djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  analyzeEmotions(landmarks) {
    const emotions = {
      happy: this.calculateHappiness(landmarks),
      sad: this.calculateSadness(landmarks),
      angry: this.calculateAnger(landmarks),
      surprised: this.calculateSurprise(landmarks),
      neutral: this.calculateNeutral(landmarks)
    };

    const total = Object.values(emotions).reduce((a, b) => a + b, 0);
    Object.keys(emotions).forEach(key => {
      emotions[key] = (emotions[key] / total * 100).toFixed(1);
    });

    return emotions;
  }

  calculateHappiness(landmarks) {
    const lipCornerLeft = landmarks[61];
    const lipCornerRight = landmarks[291];
    const lipStretch = Math.hypot(
      lipCornerRight.x - lipCornerLeft.x,
      lipCornerRight.y - lipCornerLeft.y
    );

    const cheekLeft = landmarks[123];
    const eyeLeft = landmarks[159];
    const cheekRaiseLeft = eyeLeft.y - cheekLeft.y;

    if (!landmarks[61] || !landmarks[291] || !landmarks[123] || !landmarks[159]) {
      return 0;
    }

    return Math.min(1, lipStretch * 2 + cheekRaiseLeft * 3);
  }

  calculateSadness(landmarks) {
    const lipCornerLeft = landmarks[61];
    const lipBottom = landmarks[17];
    const lipDepression = lipBottom.y - lipCornerLeft.y;

    const browInnerLeft = landmarks[105];
    const browInnerRight = landmarks[334];
    const browRaise = (browInnerLeft.y + browInnerRight.y) / 2;

    return Math.min(1, lipDepression * 1.5 + browRaise * 2);
  }

  calculateAnger(landmarks) {
    const browOuterLeft = landmarks[46];
    const browInnerLeft = landmarks[105];
    const browLowerLeft = browInnerLeft.y - browOuterLeft.y;

    const lipTop = landmarks[0];
    const lipBottom = landmarks[17];
    const lipCompression = lipBottom.y - lipTop.y;

    return Math.min(1, browLowerLeft * 2 + lipCompression * 1.2);
  }

  calculateSurprise(landmarks) {
    const eyelidLeft = landmarks[159];
    const eyeLeft = landmarks[145];
    const eyeOpenness = eyeLeft.y - eyelidLeft.y;

    const chin = landmarks[152];
    const nose = landmarks[4];
    const jawDrop = chin.y - nose.y;

    return Math.min(1, eyeOpenness * 2 + jawDrop * 0.8);
  }

  calculateNeutral(landmarks) {
    let deviation = 0;
    const neutralFeatures = [
      [152, 4],  // Chin to nose
      [61, 291], // Lip corners
      [105, 334] // Brows
    ];

    neutralFeatures.forEach(([i1, i2]) => {
      deviation += Math.hypot(
        landmarks[i1].x - landmarks[i2].x,
        landmarks[i1].y - landmarks[i2].y
      );
    });

    return Math.max(0, 1 - deviation * 2);
  }

  getMentalHealthConclusion(emotions) {
    const { happy, sad, angry, surprised, neutral } = emotions;

    if (sad > 40 && happy < 20 && neutral < 30) {
      return {
        conclusion: "Potensi gejala depresi terdeteksi",
        advice: "Rekomendasi: Konsultasi dengan profesional kesehatan mental. Pola emosi menunjukkan tanda-tanda depresi.\nKunjungi Media Sosial Berikut Untuk Berkonsultasi\n https://www.instagram.com/peercounselor.unnes?igsh=MXhodHc0bmhpdGdnag=="
      };
    }

    if (angry > 35 && happy < 25) {
      return {
        conclusion: "Tingkat stres tinggi terdeteksi",
        advice: "Rekomendasi: Lakukan teknik relaksasi dan perhatikan pola tidur."
      };
    }

    if (neutral > 60) {
      return {
        conclusion: "Emosi stabil",
        advice: "Pertahankan keseimbangan emosional. Tidak terdeteksi masalah kesehatan mental signifikan."
      };
    }

    return {
      conclusion: "Kondisi emosional normal",
      advice: "Tidak terdeteksi gangguan mental utama. Tetap pantau kesehatan emosi Anda."
    };
  }

  updateUI(emotions) {
    Object.entries(emotions).forEach(([emotion, value]) => {
      document.getElementById(emotion).textContent = value;
    });

    const mentalHealth = this.getMentalHealthConclusion(emotions);
    document.getElementById("conclusion").textContent = mentalHealth.conclusion;
    document.getElementById("advice").innerHTML = this.autoLinkify(mentalHealth.advice);
  }

  autoLinkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, url => `<a href='${url}' target='_blank' title='${url}'>${url}</a>`);
  }

  drawLandmarks(landmarks) {
    this.canvasCtx.fillStyle = '#00FF00';
    landmarks.forEach(landmark => {
      const x = landmark.x * this.canvasElement.width;
      const y = landmark.y * this.canvasElement.height;

      this.canvasCtx.beginPath();
      this.canvasCtx.arc(x, y, 1, 0, 1 * Math.PI);
      this.canvasCtx.fill();
    });
  }
}
