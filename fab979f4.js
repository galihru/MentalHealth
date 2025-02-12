import { FaceMesh } from 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';

window.onload = function () {
    const skeletonContainer = document.getElementById('skeleton-container');
    skeletonContainer.parentNode.removeChild(skeletonContainer);
};
// face-analysis.js
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
let lastFaceID = null;

// Fungsi hash sederhana untuk generate FaceID
function djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0; // Konversi ke unsigned 32-bit integer
}

// Fungsi untuk mengubah landmark wajah menjadi hash unik
function generateFaceID(landmarks) {
    // Normalisasi koordinat landmark dengan presisi 4 digit desimal
    let hashString = landmarks.map(lm =>
        lm.x.toFixed(4) +
        lm.y.toFixed(4) +
        lm.z.toFixed(4)
    ).join('');

    return djb2Hash(hashString).toString(16); // Konversi ke hexadecimal
}

// Konfigurasi Threshold (Berdasarkan penelitian)
const EMOTION_THRESHOLDS = {
    HAPPY: 0.65,
    SAD: 0.6,
    ANGRY: 0.55,
    SURPRISED: 0.5,
    NEUTRAL: 0.7
};

// Inisialisasi Face Mesh
const faceMesh = new FaceMesh.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Fungsi Utama Deteksi Emosi
function analyzeEmotions(landmarks) {
    const emotions = {
        happy: calculateHappiness(landmarks),
        sad: calculateSadness(landmarks),
        angry: calculateAnger(landmarks),
        surprised: calculateSurprise(landmarks),
        neutral: calculateNeutral(landmarks)
    };

    // Normalisasi ke persentase
    const total = Object.values(emotions).reduce((a, b) => a + b, 0);
    Object.keys(emotions).forEach(key => {
        emotions[key] = (emotions[key] / total * 100).toFixed(1);
    });

    return emotions;
}

// Perhitungan Berdasarkan Action Units (Berdasarkan penelitian)
function calculateHappiness(landmarks) {
    // AU12 - Lip Corner Puller (Frontiers in Psychology 2022)
    const lipCornerLeft = landmarks[61];
    const lipCornerRight = landmarks[291];
    const lipStretch = Math.hypot(
        lipCornerRight.x - lipCornerLeft.x,
        lipCornerRight.y - lipCornerLeft.y
    );

    // AU6 - Cheek Raiser (IEEE TAFFC 2021)
    const cheekLeft = landmarks[123];
    const eyeLeft = landmarks[159];
    const cheekRaiseLeft = eyeLeft.y - cheekLeft.y;

    if (!landmarks[61] || !landmarks[291] || !landmarks[123] || !landmarks[159]) {
        return 0;
    }

    return Math.min(1, lipStretch * 2 + cheekRaiseLeft * 3);
}

function calculateSadness(landmarks) {
    // AU15 - Lip Corner Depressor (IEEE TAFFC 2021)
    const lipCornerLeft = landmarks[61];
    const lipBottom = landmarks[17];
    const lipDepression = lipBottom.y - lipCornerLeft.y;

    // AU1 - Inner Brow Raiser (Frontiers in Psychology 2022)
    const browInnerLeft = landmarks[105];
    const browInnerRight = landmarks[334];
    const browRaise = (browInnerLeft.y + browInnerRight.y) / 2;

    return Math.min(1, lipDepression * 1.5 + browRaise * 2);
}

function calculateAnger(landmarks) {
    // AU4 - Brow Lowerer (IEEE TAFFC 2021)
    const browOuterLeft = landmarks[46];
    const browInnerLeft = landmarks[105];
    const browLowerLeft = browInnerLeft.y - browOuterLeft.y;

    // AU23 - Lip Tightener
    const lipTop = landmarks[0];
    const lipBottom = landmarks[17];
    const lipCompression = lipBottom.y - lipTop.y;

    return Math.min(1, browLowerLeft * 2 + lipCompression * 1.2);
}

function calculateSurprise(landmarks) {
    // AU5 - Upper Lid Raiser
    const eyelidLeft = landmarks[159];
    const eyeLeft = landmarks[145];
    const eyeOpenness = eyeLeft.y - eyelidLeft.y;

    // AU26 - Jaw Drop
    const chin = landmarks[152];
    const nose = landmarks[4];
    const jawDrop = chin.y - nose.y;

    return Math.min(1, eyeOpenness * 2 + jawDrop * 0.8);
}

function calculateNeutral(landmarks) {
    // Menghitung deviasi dari posisi netral
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

// Analisis Kesehatan Mental (Berdasarkan IEEE Transactions on Affective Computing)
function getMentalHealthConclusion(emotions) {
    const { happy, sad, angry, surprised, neutral } = emotions;

    if (sad > 40 && happy < 20 && neutral < 30) {
        return {
            conclusion: "Potensi gejala depresi terdeteksi",
            advice: "Rekomendasi: Konsultasi dengan profesional kesehatan mental. Pola emosi menunjukkan tanda-tanda depresi.\nKunjungi Media Sosial Berikut Untuk Berkonsultasi\nhttps://www.instagram.com/peercounselor.unnes?igsh=MXhodHc0bmhpdGdnag=="
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

function autoLinkify(text) {
    // Regex untuk mendeteksi URL dalam teks
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" title="${url}">${url}</a>`;
    });
}

async function updateUI(emotions) {
    Object.entries(emotions).forEach(([emotion, value]) => {
        document.getElementById(emotion).textContent = value;
    });

    const mentalHealth = getMentalHealthConclusion(emotions);
    document.getElementById('conclusion').textContent = mentalHealth.conclusion;

    // Konversi URL dalam teks menjadi <a>
    const adviceElement = document.getElementById('advice');
    adviceElement.innerHTML = autoLinkify(mentalHealth.advice);
}
// Face Mesh Handler
faceMesh.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    let currentFaceID = '';
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        currentFaceID = generateFaceID(landmarks);

        // Update FaceID hanya jika berbeda dengan sebelumnya
        if (currentFaceID !== lastFaceID) {
            document.documentElement.setAttribute('FaceID', currentFaceID);
            lastFaceID = currentFaceID;
        }

        const emotions = analyzeEmotions(landmarks);
        updateUI(emotions);

        results.multiFaceLandmarks.forEach(landmarks => {
            drawLandmarks(landmarks);
        });
    } else {
        // Jika tidak ada wajah terdeteksi
        if (lastFaceID !== null) {
            document.documentElement.setAttribute('FaceID', '');
            lastFaceID = null;
        }
    }

    canvasCtx.restore();
});

// Fungsi gambar landmark
function drawLandmarks(landmarks) {
    canvasCtx.fillStyle = '#00FF00';
    landmarks.forEach(landmark => {
        const x = landmark.x * canvasElement.width;
        const y = landmark.y * canvasElement.height;

        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 1, 0, 1 * Math.PI); // Radius diperkecil
        canvasCtx.fill();
    });
}

// Inisialisasi Kamera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({ image: videoElement });
    },
    width: 640,  // Diubah ke resolusi yang lebih realistis
    height: 480
});

camera.start();

// Navigation and Modal Code
const navItems = document.querySelectorAll('.nav-item');
const modals = document.querySelectorAll('.modal');
const closeBtns = document.querySelectorAll('.close-btn');
const timeButtons = document.querySelectorAll('.time-btn');
const currentFaceID = document.documentElement.getAttribute('FaceID');
// Bluetooth Handling
const deviceElement = document.querySelector('.device');
const deviceModal = document.getElementById('deviceModal');
const modalBody = deviceModal.querySelector('.modal-body');
const modalBodyID = document.getElementById('modalBody');
let bluetoothDevice = null;

// Tambahkan ini di bagian atas kode JS
const notifIcon = document.querySelector('.notif');
const notifikasiModal = document.getElementById('notifikasiModal');
const historyModal = document.getElementById('historyModal');
const grafikModal = document.getElementById('graphModal');

// Handle klik ikon notifikasi
notifIcon.addEventListener('click', () => {
    notifikasiModal.classList.add('show');
});

// Show modal if URL contains hash with modal ID
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash === '#notifikasiModal') {
        notifikasiModal.classList.add('show');
    }
    if (hash === '#historyModal') {
        history.classList.add('show');
    }
    if (hash === '#graphModal') {
        grafikModal.classList.add('show');
    }
});

// Check hash on page load
if (window.location.hash === '#notifikasiModal') {
    notifikasiModal.classList.add('show');
}
if (window.location.hash === '#historyModal') {
    historyModal.classList.add('show');
}
if (window.location.hash === '#graphModal') {
    grafikModal.classList.add('show');
}

// Cek dukungan Web Bluetooth API
if (!navigator.bluetooth) {
    deviceElement.setAttribute('state', 'not found');
    console.error('Browser tidak mendukung Web Bluetooth API');
}

// Handle klik device
deviceElement.addEventListener('click', async () => {
    deviceModal.classList.add('show');
    await scanDevices();
});

// Initialize Charts
function initializeCharts() {
    // Heart Rate Chart
    const heartRateCtx = document.getElementById('heartRateChart').getContext('2d');
    new Chart(heartRateCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Heart Rate',
                data: [75, 82, 78, 85, 80, 83, 79],
                borderColor: '#4CAF50',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });

    // Blood Pressure Chart
    const bpCtx = document.getElementById('bpChart').getContext('2d');
    new Chart(bpCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Systolic',
                data: [120, 118, 122, 119, 121, 117, 120],
                borderColor: '#FF9800',
                tension: 0.4,
                fill: false
            }, {
                label: 'Diastolic',
                data: [80, 79, 82, 81, 80, 78, 80],
                borderColor: '#2196F3',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Initialize charts when graph modal is opened
document.querySelector('[data-page="graph"]').addEventListener('click', () => {
    setTimeout(initializeCharts, 300);
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show corresponding modal
                const page = item.dataset.page;
                if (page === 'history') {
                    document.getElementById('historyModal').classList.add('show');
                } else if (page === 'graph') {
                    document.getElementById('graphModal').classList.add('show');
                }
            });
        });

        // Time range buttons functionality
        timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.closest('.graph-card');
                parent.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Close modal functionality
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                modal.classList.remove('show');
            });
        });

        // Swipe to close functionality
        modals.forEach(modal => {
            const modalHeader = modal.querySelector('.modal-header');
            const modalContent = modal.querySelector('.modal-content');
            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            modalHeader.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startY = touch.clientY;
                isDragging = true;
            });

            modal.addEventListener('touchmove', (e) => {
                if (!isDragging) return;

                const touch = e.touches[0];
                currentY = touch.clientY;
                const deltaY = currentY - startY;

                if (deltaY > 0) {
                    modalContent.style.transform = `translateY(${deltaY}px)`;
                    e.preventDefault();
                }
            });

            modal.addEventListener('touchend', () => {
                if (!isDragging) return;

                const deltaY = currentY - startY;

                if (deltaY > 100) {
                    modal.classList.remove('show');
                }

                modalContent.style.transform = '';
                isDragging = false;
                startY = 0;
                currentY = 0;
            });

            // Close modal when clicking overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Horizontal scroll for cards
        const cardsContainer = document.querySelector('.cards-container');
        let isScrolling = false;
        let startX;
        let scrollLeft;

        cardsContainer.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startX = e.touches[0].pageX - cardsContainer.offsetLeft;
            scrollLeft = cardsContainer.scrollLeft;
        });

        cardsContainer.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.touches[0].pageX - cardsContainer.offsetLeft;
            const walk = (x - startX) * 2;
            cardsContainer.scrollLeft = scrollLeft - walk;
        });

        cardsContainer.addEventListener('touchend', () => {
            isScrolling = false;
        });
    });
});

// Pindahkan fungsi swipe-to-close ke luar loop navItems
modals.forEach(modal => {
    const modalHeader = modal.querySelector('.modal-header');
    const modalContent = modal.querySelector('.modal-content');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    modalHeader.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startY = touch.clientY;
        isDragging = true;
    });

    modal.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const touch = e.touches[0];
        currentY = touch.clientY;
        const deltaY = currentY - startY;

        if (deltaY > 0) {
            modalContent.style.transform = `translateY(${deltaY}px)`;
            modalContent.style.transition = 'transform 0.1s'; // Tambahkan transisi halus
            e.preventDefault();
        }
    });

    modal.addEventListener('touchend', () => {
        if (!isDragging) return;

        const deltaY = currentY - startY;
        modalContent.style.transition = 'transform 0.3s'; // Transisi saat menutup

        if (deltaY > 100) {
            modal.classList.remove('show');
            modalContent.style.transform = 'translateY(100%)';
            setTimeout(() => {
                modalContent.style.transform = '';
                modalContent.style.transition = '';
            }, 300);
        } else {
            modalContent.style.transform = '';
        }

        isDragging = false;
        startY = 0;
        currentY = 0;
    });

    // Handle klik overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});
// Scan perangkat Bluetooth
async function scanDevices() {
    try {
        modalBodyID.innerHTML = '<div class="loading">Mencari perangkat...</div>';

        // Filter berdasarkan nama ESP32 atau service UUID
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'] // Ganti dengan service UUID ESP32
        });

        updateDeviceStatus('connected');
        setupDisconnectHandler();
        connectToDevice();
    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'NotFoundError') {
            updateDeviceStatus('not found');
        } else {
            updateDeviceStatus('failed');
        }
    }
}
// Update status device
function updateDeviceStatus(status, deviceName = 'MentalHealthDevice') {
    deviceElement.setAttribute('state', status);
    deviceElement.textContent = deviceName; // Update nama perangkat
    deviceModal.classList.remove('show');
}

// Handle disconnect
function setupDisconnectHandler() {
    bluetoothDevice.addEventListener('gattserverdisconnected', () => {
        updateDeviceStatus('failed');
        // Reset nilai sensor
        resetSensorData();
    });
}

// Koneksi ke device
async function connectToDevice() {
    try {
        const server = await bluetoothDevice.gatt.connect();
        const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b'); // Ganti dengan service UUID
        const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8'); // Ganti dengan characteristic UUID

        // Listen for sensor data updates
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleSensorData);
    } catch (error) {
        console.error('Koneksi gagal:', error);
        updateDeviceStatus('failed');
    }
}

// Handle data sensor
function handleSensorData(event) {
    const value = event.target.value;
    // Parsing data dari ESP32 (sesuaikan dengan format data Anda)
    const data = {
        heartRate: value.getUint8(0),
        bloodPressure: `${value.getUint8(1)}/${value.getUint8(2)}`,
        sleep: value.getFloat32(3)
    };

    // Update UI
    updateSensorData(data);
    updateCharts(data);
}
// Update tampilan sensor
function updateSensorData(data) {
    document.querySelector('.metric-card.green .metric-value').textContent = data.heartRate;
    document.querySelector('.metric-card.orange .metric-value').textContent = data.bloodPressure;
    document.querySelector('.metric-card.purple .metric-value').textContent = data.sleep.toFixed(1);
}

// Reset data sensor
function resetSensorData() {
    const resetValues = {
        heartRate: '--',
        bloodPressure: '--/--',
        sleep: '0.0'
    };
    updateSensorData(resetValues);
}

// Update grafik
function updateCharts(data) {
    // Implementasi update chart sesuai data sensor
    // Contoh:
    const chart = Chart.getChart('heartRateChart');
    if (chart) {
        chart.data.datasets[0].data.push(data.heartRate);
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.update();
    }
}
// Pindahkan close button handler ke luar loop
closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        modal.classList.remove('show');
    });
});

// Modal content data
const modalContents = {
    blood: {
        title: "Informasi Blood Pressure",
        content: "Blood pressure atau tekanan darah adalah tekanan yang dialami dinding pembuluh darah saat darah dipompa oleh jantung ke seluruh tubuh. Pengukuran normal adalah 120/80 mmHg."
    },
    emosional: {
        title: "Informasi Metric Emosional",
        content: `
        <p>Metric emosional menunjukkan persentase emosi yang terdeteksi dari ekspresi wajah. Ini membantu memahami kondisi emosional pengguna sepanjang waktu.</p>
        <br>
        <img src="https://4211421036.github.io/MentalHealth/ref/infoemo.png" alt="Emotion Metrics" />
        <p>Gambar 1 Ilustrasi unit tindakan wajah (AU) yang mengindentifikasikan Mental Health. Dari Baris 1 Kiri ke Kanan (AU 1, AU 2 AU 4 AU 5 AU 6 AU 7); Baris 2 Kiri ke Kanan (AU 10 AU 12 AU 14 AU 15 AU 16 AU 18); dan Baris 3 Kiri ke kanan (AU 22 AU 25 AU 26 AU 43).
        <br>`
    },
    sensor: {
        title: "Informasi Realtime Sensor",
        content: "Sensor realtime menampilkan data kesehatan terkini seperti detak jantung, tekanan darah, dan durasi tidur yang diukur menggunakan sensor yang terhubung."
    },
    heartrate: {
        title: "Informasi Heart Rate",
        content: "Sensor realtime menampilkan data kesehatan terkini seperti detak jantung, tekanan darah, dan durasi tidur yang diukur menggunakan sensor yang terhubung."
    }
};

// Initialize modal functionality
document.addEventListener('DOMContentLoaded', function () {
    const infoIcons = document.querySelectorAll('.fa-circle-info');
    let startY = 0;
    let currentModal = null;
    let isDragging = false;

    // Create modal for each info icon
    infoIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const modalType = this.getAttribute('data-modal');
            const modalContent = modalContents[modalType];

            if (!modalContent) return;

            // Create or update modal
            let modal = document.querySelector(`.modal[data-type="${modalType}"]`);

            if (!modal) {
                modal = createModal(modalType, modalContent);
                document.body.appendChild(modal);
            }

            currentModal = modal;
            modal.classList.add('active');
        });
    });

    // Function to create modal
    function createModal(type, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('data-type', type);

        modal.innerHTML = `
            <div class="modal-content" data-type="${type}-content">
                <div class="swipe-indicator"></div>
                <div class="modal-header">
                    <h2 class="modal-title">${content.title}</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    ${content.content}
                </div>
            </div>
        `;

        // Add event listeners for swipe
        modal.addEventListener('touchstart', handleTouchStart, false);
        modal.addEventListener('touchmove', handleTouchMove, false);
        modal.addEventListener('touchend', handleTouchEnd, false);

        // Close button functionality
        modal.querySelector('.close-btn').addEventListener('click', () => {
            closeAndRemoveModal(modal);
        });

        return modal;
    }

    // Function to close and remove modal
    function closeAndRemoveModal(modal) {
        modal.classList.remove('active');
        // Tunggu animasi selesai sebelum menghapus modal
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            if (currentModal === modal) {
                currentModal = null;
            }
        }, 300); // Sesuaikan dengan durasi animasi CSS
    }

    // Touch event handlers
    function handleTouchStart(e) {
        startY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        if (!startY) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) { // Only allow downward swipe
            e.preventDefault();
            const modalContent = this.querySelector('.modal-content');
            modalContent.style.transform = `translateY(${diff}px)`;
        }
    }

    function handleTouchEnd(e) {
        if (!currentModal) return;

        const modalContent = currentModal.querySelector('.modal-content');
        const currentY = e.changedTouches[0].clientY;
        const diff = currentY - startY;

        if (diff > 100) { // If swiped down more than 100px, close the modal
            closeAndRemoveModal(currentModal);
        }

        modalContent.style.transform = '';
        startY = null;
    }
});
