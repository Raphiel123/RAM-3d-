/* ==========================================================================
   RAM 3D Inspector - Main Application Logic (Three.js Engine & 4D UI)
   Modul Pembelajaran Interaktif Arsitektur & Organisasi Komputer
   ========================================================================== */

// --- Global Application State ---
const state = {
    soundEnabled: true,
    explodedView: false,
    hotspotsVisible: true,
    heatsinkVisible: true,
    selectedComponent: null,
    currentMode: 'inspect', // 'inspect', 'ddr'
    autoRotate: true // Rotasi 4D otomatis aktif secara default!
};

// --- Web Audio API SFX Synthesizer ---
class SoundEffects {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    }

    playClick() {
        if (!state.soundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playWhoosh() {
        if (!state.soundEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playSuccess() {
        if (!state.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.2);
        });
    }

    playError() {
        if (!state.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(140, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}

const sfx = new SoundEffects();

// --- RAM Component Educational Dataset ---
const ramComponentsData = [
    {
        id: 'gold-pins',
        name: 'Gold Contact Pins (Konektor Emas)',
        badge: 'Transmisi Sinyal',
        type: 'Konektor Fisik (288-Pin)',
        location: 'Tepi Bawah Modul RAM',
        material: 'Tembaga Lapisan Emas Murni 24K',
        function: 'Menghubungkan sirkuit modul RAM secara langsung dengan slot DIMM pada motherboard untuk menyalurkan sinyal data, alamat, dan daya listrik.',
        architecture: 'Terdiri dari 288 pin kontak terpisah (pada DDR4/DDR5). Lapisan emas digunakan karena emas sangat tahan korosi dan memiliki konduktivitas listrik yang sangat tinggi sehingga mencegah penurunan kualitas sinyal frekuensi tinggi.',
        funFact: 'Pada RAM DDR4 & DDR5, jajaran pin ini tidak rata lurus melainkan sedikit melengkung di tengah untuk mengurangi tekanan saat dipasang ke motherboard!',
        cameraTarget: { x: 0, y: -1.3, z: 0 },
        cameraPos: { x: 0, y: -0.8, z: 3.5 },
        worldPos: { x: 2, y: -1.3, z: 0.1 }
    },
    {
        id: 'dram-chips',
        name: 'DRAM IC Chips (Chip Memori)',
        badge: 'Penyimpanan Utama',
        type: 'Integrated Circuit (IC)',
        location: 'Permukaan Papan Sirkuit (PCB)',
        material: 'Silikon Semikonduktor',
        function: 'Tempat menyimpan data aplikasi dan instruksi sistem operasi secara sementara selama komputer menyala (volatile memory).',
        architecture: 'Di dalam setiap chip DRAM terdapat miliaran sel memori mikro yang terdiri dari satu transistor dan satu kapasitor (1T1C). Kapasitor menyimpan muatan listrik yang mewakili biner 1 atau 0, dan harus terus disegarkan (refresh) jutaan kali per detik.',
        funFact: 'Satu chip RAM kecil berukuran 1x1 cm bisa menampung lebih dari 8 Miliar sel kapasitor mikroskopis!',
        cameraTarget: { x: -2.5, y: -0.2, z: 0 },
        cameraPos: { x: -2.5, y: 0.3, z: 3.2 },
        worldPos: { x: -2.5, y: -0.2, z: 0.2 }
    },
    {
        id: 'notch',
        name: 'Key Notch (Takik Pengaman)',
        badge: 'Fitur Keamanan',
        type: 'Takik Mekanis Physical Keying',
        location: 'Tengah Jajaran Pin Bawah',
        material: 'Celah Potongan PCB',
        function: 'Mencegah modul RAM dipasang terbalik atau memasang jenis RAM yang salah (misal memaksa masuk RAM DDR4 ke slot DDR5).',
        architecture: 'Setiap generasi RAM (DDR3, DDR4, DDR5) memiliki posisi celah takik yang berbeda secara presisi (bergeser beberapa milimeter). Hal ini memastikan kompatibilitas fisik total dengan slot motherboard.',
        funFact: 'Jika tidak ada Notch ini, salah memasang RAM terbalik dapat merusak motherboard dan chip memori seketika akibat korsleting daya!',
        cameraTarget: { x: 0.4, y: -1.2, z: 0 },
        cameraPos: { x: 0.4, y: -0.5, z: 2.8 },
        worldPos: { x: 0.4, y: -1.3, z: 0 }
    },
    {
        id: 'pmic',
        name: 'PMIC (Power Management IC)',
        badge: 'Manajemen Daya DDR5',
        type: 'Chip Pengatur Tegangan',
        location: 'Area Tengah Atas PCB (Center-Top)',
        material: 'Semikonduktor & Induktor Daya',
        function: 'Mengatur, mengonversi, dan membagikan tegangan listrik 12V dari PSU menjadi tegangan presisi rendah (1.1V) yang dibutuhkan chip RAM.',
        architecture: 'Pada DDR4, manajemen daya dilakukan oleh motherboard. Namun pada standar DDR5 JEDEC, PMIC dipindahkan langsung ke area tengah atas papan RAM untuk efisiensi daya dan stabilitas sinyal listrik.',
        funFact: 'Inovasi PMIC langsung di modul RAM membuat overclocking memori DDR5 jauh lebih stabil dibanding generasi terdahulu!',
        cameraTarget: { x: 0, y: 0.75, z: 0 },
        cameraPos: { x: 0, y: 1.0, z: 2.8 },
        worldPos: { x: 0, y: 0.75, z: 0.15 }
    },
    {
        id: 'heatspreader',
        name: 'Heat Spreader & RGB Strip',
        badge: 'Pendingin & Estetika',
        type: 'Heatsink Pasif Aluminium',
        location: 'Melapisi Kedua Sisi RAM',
        material: 'Aluminium Anodized & Akrilik Lightbar',
        function: 'Menyerap dan meratakan panas berlebih yang dihasilkan oleh chip DRAM saat bekerja berat, serta memberikan estetika visual.',
        architecture: 'Menggunakan pad termal (thermal pad) yang menempel langsung antara chip DRAM dan plat aluminium. Panas dialirkan secara konduksi ke sirip pendingin dan dibuang ke udara casing komputer.',
        funFact: 'Pada RAM kencang bertipe High-Performance (XMP/EXPO), pendingin aluminium sangat krusial untuk mencegah penurunan performa (thermal throttling).',
        cameraTarget: { x: 1.5, y: 0.5, z: 0 },
        cameraPos: { x: 1.5, y: 1.2, z: 4.5 },
        worldPos: { x: 2.5, y: 0.8, z: 0.3 }
    },
    {
        id: 'pcb',
        name: 'Printed Circuit Board (PCB)',
        badge: 'Papan Sirkuit',
        type: 'Multi-layer Substrate',
        location: 'Tepi Bawah / Substrat Papan RAM',
        material: 'Fiberglass (FR-4) & Tembaga',
        function: 'Menjadi pondasi fisik tempat menempelnya seluruh komponen elektronik dan menyediakan jalur sirkuit listrik interkoneksi.',
        architecture: 'PCB RAM berkualitas tinggi terdiri dari 8 hingga 10 lapisan (layers) sirkuit tembaga mikroskopis yang ditumpuk secara presisi. Lapisan internal khusus digunakan untuk mengisolasi sinyal bus data berkecepatan giga-hertz agar tidak saling terganggu (crosstalk).',
        funFact: 'Warna terang atau metallic putih pada PCB berasal dari lapisan khusus bernama White Solder Mask yang melindungi jalur tembaga.',
        cameraTarget: { x: -4.5, y: -0.9, z: 0 },
        cameraPos: { x: -4.5, y: -0.5, z: 3.0 },
        worldPos: { x: -4.5, y: -1.05, z: 0.15 }
    },
    {
        id: 'spd',
        name: 'SPD Hub & Thermal Sensor',
        badge: 'Profil Memori & Suhu',
        type: 'SPD Hub IC (Standar DDR5)',
        location: 'Area Tengah Atas PCB (Berdampingan PMIC)',
        material: 'Semikonduktor & Sensor Suhu Integrated',
        function: 'Menyimpan informasi identitas, kapasitas, kecepatan, latency, profil overclocking (Intel XMP / AMD EXPO), serta memantau suhu operasional RAM secara real-time.',
        architecture: 'Pada modul DDR5, chip SPD tradisional digantikan oleh SPD Hub yang mengintegrasikan pengontrol bus I3C dan sensor suhu terpadu yang terletak berdampingan dengan PMIC di area tengah atas PCB.',
        funFact: 'SPD Hub pada DDR5 mendukung protokol bus I3C yang bekerja jauh lebih cepat dibanding bus I2C kuno pada generasi DDR4!',
        cameraTarget: { x: 0.8, y: 0.75, z: 0 },
        cameraPos: { x: 0.8, y: 0.95, z: 2.8 },
        worldPos: { x: 0.8, y: 0.75, z: 0.15 }
    }
];

// --- 4D Tesseract Geometry Helper ---
class Tesseract4D {
    constructor(scale = 0.3) {
        this.scale = scale;
        // 16 Vertices of a 4D Hypercube: (+-1, +-1, +-1, +-1)
        this.vertices4D = [];
        for (let x of [-1, 1]) {
            for (let y of [-1, 1]) {
                for (let z of [-1, 1]) {
                    for (let w of [-1, 1]) {
                        this.vertices4D.push([x * scale, y * scale, z * scale, w * scale]);
                    }
                }
            }
        }

        // Edges connecting vertices that differ in exactly one coordinate (32 edges)
        this.edges = [];
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                let diff = 0;
                for (let k = 0; k < 4; k++) {
                    if (this.vertices4D[i][k] !== this.vertices4D[j][k]) diff++;
                }
                if (diff === 1) {
                    this.edges.push([i, j]);
                }
            }
        }
    }

    // Rotate vertices in 4D space (XW and YW planes) and project to 3D
    projectTo3D(angleXW, angleYW) {
        const projected3D = [];
        const cosXW = Math.cos(angleXW), sinXW = Math.sin(angleXW);
        const cosYW = Math.cos(angleYW), sinYW = Math.sin(angleYW);

        for (let v of this.vertices4D) {
            let [x, y, z, w] = v;

            // Rotate in XW plane
            let x1 = x * cosXW - w * sinXW;
            let w1 = x * sinXW + w * cosXW;

            // Rotate in YW plane
            let y1 = y * cosYW - w1 * sinYW;
            let w2 = y * sinYW + w1 * cosYW;

            // Perspective Projection from 4D to 3D: distance d = 2.2
            const distance = 2.2;
            const factor = 1 / (distance - w2);

            projected3D.push(new THREE.Vector3(x1 * factor, y1 * factor, z * factor));
        }

        // Return array of positions for LineSegments (32 edges * 2 points * 3 coords = 192 floats)
        const linePositions = [];
        for (let edge of this.edges) {
            const p1 = projected3D[edge[0]];
            const p2 = projected3D[edge[1]];
            linePositions.push(p1.x, p1.y, p1.z);
            linePositions.push(p2.x, p2.y, p2.z);
        }
        return new Float32Array(linePositions);
    }
}

// --- Three.js Application Engine ---
class RAM3DApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.ramGroup = new THREE.Group();
        this.meshParts = {};
        this.hotspotElements = [];
        this.tesseractMeshes = [];
        this.quantumParticles = null;

        this.pcbTexture = this.createPCBTexture();
        this.chipTexture = this.createChipTexture();

        this.init();
    }

    init() {
        // 1. Scene Setup (Bright Light Background)
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.02);

        // 2. Camera Setup
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.2, 8.5);

        // 3. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.setClearColor(0xf1f5f9, 1);
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 14;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.15;

        // 5. Lighting (Bright High-End Studio Lights)
        this.setupLighting();

        // 6. Build 3D RAM Model
        this.buildRAMModel();

        // 7. Build 4D Quantum Particle Field
        this.build4DQuantumParticles();

        // 8. Create Hotspots & Popover
        this.setupHotspots();

        // 9. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // 10. Start Render Loop
        this.animate();

        // Hide Loading Screen
        setTimeout(() => {
            const ls = document.getElementById('loading-screen');
            if (ls) ls.classList.add('hidden');
        }, 500);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        // Main Studio Key Light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(6, 10, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        this.scene.add(keyLight);

        // Fill Light (Sky Blue Tint)
        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
        fillLight.position.set(-6, 4, -4);
        this.scene.add(fillLight);

        // Accent Rim Light (Violet Glow)
        const rimLight = new THREE.DirectionalLight(0xa855f7, 1.1);
        rimLight.position.set(0, -6, -6);
        this.scene.add(rimLight);
    }

    // Procedural Circuit Trace Texture Canvas (Bright Light Silver PCB with Gold Traces)
    createPCBTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Light Silver-Emerald PCB Background
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 1024, 256);

        // Subtle PCB grid texture
        ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
        for (let x = 0; x < 1024; x += 12) {
            ctx.fillRect(x, 0, 2, 256);
        }

        // Gold Circuit Traces Lines
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
        ctx.lineWidth = 1.8;

        for (let i = 0; i < 70; i++) {
            ctx.beginPath();
            let x = Math.random() * 1024;
            let y = Math.random() * 256;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 50);
            ctx.stroke();
        }

        // Gold Solder Pads Grid
        ctx.fillStyle = 'rgba(217, 119, 6, 0.6)';
        for (let x = 40; x < 980; x += 28) {
            for (let y = 30; y < 220; y += 38) {
                ctx.fillRect(x, y, 3, 3);
            }
        }

        // Text engraving on PCB
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.font = 'bold 12px Fira Code, monospace';
        ctx.fillText('DDR5-6400 CL32 HIGH-SPEED PCB REV 4.0 [4D HYPER-ARCH]', 40, 245);

        return new THREE.CanvasTexture(canvas);
    }

    // Procedural Chip Markings Texture Canvas
    createChipTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 256, 256);

        // Brand Marking & Specs Text
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.font = 'bold 22px Fira Code, monospace';
        ctx.fillText('HYNIX DRAM', 30, 70);
        ctx.font = '16px Fira Code, monospace';
        ctx.fillText('DDR5 16GB IC', 30, 110);
        ctx.fillText('H5CG48MEBD', 30, 140);
        ctx.fillText('2402-AA9 4D', 30, 170);

        // Pin 1 Indicator Circle
        ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
        ctx.beginPath();
        ctx.arc(30, 30, 8, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    buildRAMModel() {
        // --- 1. Main PCB Board ---
        const pcbWidth = 11;
        const pcbHeight = 2.6;
        const pcbDepth = 0.12;

        const pcbGeometry = new THREE.BoxGeometry(pcbWidth, pcbHeight, pcbDepth);
        const pcbMaterial = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            map: this.pcbTexture,
            roughness: 0.25,
            metalness: 0.4
        });

        const pcbMesh = new THREE.Mesh(pcbGeometry, pcbMaterial);
        pcbMesh.castShadow = true;
        pcbMesh.receiveShadow = true;
        pcbMesh.userData = { id: 'pcb' };
        this.ramGroup.add(pcbMesh);
        this.meshParts['pcb'] = pcbMesh;

        // --- 2. Gold Contact Pins Array (288 Pins) ---
        const pinGroup = new THREE.Group();
        const pinMaterial = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            metalness: 0.98,
            roughness: 0.1
        });

        const pinCountPerSide = 65;
        const pinWidth = 0.05;
        const pinHeight = 0.35;
        const pinGap = 0.07;

        // Left Pin Block
        for (let i = 0; i < pinCountPerSide; i++) {
            const pinGeo = new THREE.BoxGeometry(pinWidth, pinHeight, pcbDepth + 0.02);
            const pin = new THREE.Mesh(pinGeo, pinMaterial);
            const xPos = -4.8 + i * pinGap;
            pin.position.set(xPos, -pcbHeight / 2 - pinHeight / 4, 0);
            pinGroup.add(pin);
        }

        // Right Pin Block (Separated by Key Notch)
        for (let i = 0; i < pinCountPerSide; i++) {
            const pinGeo = new THREE.BoxGeometry(pinWidth, pinHeight, pcbDepth + 0.02);
            const pin = new THREE.Mesh(pinGeo, pinMaterial);
            const xPos = 0.4 + i * pinGap;
            pin.position.set(xPos, -pcbHeight / 2 - pinHeight / 4, 0);
            pinGroup.add(pin);
        }

        // Key Notch Gap Marker
        const notchGeo = new THREE.BoxGeometry(0.5, 0.4, pcbDepth + 0.04);
        const notchMat = new THREE.MeshBasicMaterial({ visible: false });
        const notchMesh = new THREE.Mesh(notchGeo, notchMat);
        notchMesh.position.set(0.1, -pcbHeight / 2, 0);
        notchMesh.userData = { id: 'notch' };
        this.ramGroup.add(notchMesh);
        this.meshParts['notch'] = notchMesh;

        pinGroup.userData = { id: 'gold-pins' };
        this.ramGroup.add(pinGroup);
        this.meshParts['gold-pins'] = pinGroup;

        // --- 3. DRAM IC Chips (8 Chips on Front) ---
        const dramGroup = new THREE.Group();
        const chipWidth = 0.9;
        const chipHeight = 1.1;
        const chipDepth = 0.1;

        const chipMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            map: this.chipTexture,
            roughness: 0.4,
            metalness: 0.4
        });

        this.dramChipsArray = [];
        const chipPositionsX = [-4.0, -2.8, -1.6, -0.4, 1.2, 2.4, 3.6, 4.6];

        chipPositionsX.forEach((xPos) => {
            const chipGeo = new THREE.BoxGeometry(chipWidth, chipHeight, chipDepth);
            const chipMesh = new THREE.Mesh(chipGeo, chipMaterial);
            chipMesh.position.set(xPos, -0.2, pcbDepth / 2 + chipDepth / 2);
            chipMesh.castShadow = true;
            chipMesh.userData = { id: 'dram-chips' };
            dramGroup.add(chipMesh);
            this.dramChipsArray.push(chipMesh);
        });

        dramGroup.userData = { id: 'dram-chips' };
        this.ramGroup.add(dramGroup);
        this.meshParts['dram-chips'] = dramGroup;

        // --- 4. PMIC & SPD Hub Micro Components ---
        const pmicGeo = new THREE.BoxGeometry(0.65, 0.65, 0.12);
        const pmicMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.85,
            roughness: 0.25
        });
        const pmicMesh = new THREE.Mesh(pmicGeo, pmicMat);
        pmicMesh.position.set(0, 0.75, pcbDepth / 2 + 0.06);
        pmicMesh.userData = { id: 'pmic' };
        this.ramGroup.add(pmicMesh);
        this.meshParts['pmic'] = pmicMesh;

        const spdGeo = new THREE.BoxGeometry(0.45, 0.45, 0.08);
        const spdMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });
        const spdMesh = new THREE.Mesh(spdGeo, spdMat);
        spdMesh.position.set(0.8, 0.75, pcbDepth / 2 + 0.04);
        spdMesh.userData = { id: 'spd' };
        this.ramGroup.add(spdMesh);
        this.meshParts['spd'] = spdMesh;

        // --- 5. Bright Platinum Aluminium Heat Spreader & RGB Strip ---
        this.heatsinkGroup = new THREE.Group();

        const hsWidth = 11.2;
        const hsHeight = 2.0;
        const hsDepth = 0.08;

        const hsMaterial = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            metalness: 0.92,
            roughness: 0.18
        });

        // Front Plate
        const frontHsGeo = new THREE.BoxGeometry(hsWidth, hsHeight, hsDepth);
        this.frontHsMesh = new THREE.Mesh(frontHsGeo, hsMaterial);
        this.frontHsMesh.position.set(0, 0.5, pcbDepth / 2 + chipDepth + hsDepth / 2 + 0.02);
        this.frontHsMesh.castShadow = true;
        this.frontHsMesh.userData = { id: 'heatspreader' };
        this.heatsinkGroup.add(this.frontHsMesh);

        // Back Plate
        const backHsGeo = new THREE.BoxGeometry(hsWidth, hsHeight, hsDepth);
        this.backHsMesh = new THREE.Mesh(backHsGeo, hsMaterial);
        this.backHsMesh.position.set(0, 0.5, -(pcbDepth / 2 + chipDepth + hsDepth / 2 + 0.02));
        this.backHsMesh.castShadow = true;
        this.backHsMesh.userData = { id: 'heatspreader' };
        this.heatsinkGroup.add(this.backHsMesh);

        // Top Neon RGB Light Strip Bar
        const rgbGeo = new THREE.BoxGeometry(11.25, 0.35, 0.3);
        this.rgbMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            emissive: 0x0284c7,
            emissiveIntensity: 1.6,
            roughness: 0.1
        });
        const rgbBar = new THREE.Mesh(rgbGeo, this.rgbMat);
        rgbBar.position.set(0, 1.5, 0);
        this.rgbBar = rgbBar;
        this.heatsinkGroup.add(rgbBar);

        this.heatsinkGroup.userData = { id: 'heatspreader' };
        this.ramGroup.add(this.heatsinkGroup);
        this.meshParts['heatspreader'] = this.heatsinkGroup;

        // --- 6. Build 4D Tesseract Wireframe Meshes for each Hotspot Component ---
        ramComponentsData.forEach((comp) => {
            const tess = new Tesseract4D(0.35);
            const lineGeo = new THREE.BufferGeometry();
            const initialPos = tess.projectTo3D(0, 0);
            lineGeo.setAttribute('position', new THREE.BufferAttribute(initialPos, 3));

            const lineMat = new THREE.LineBasicMaterial({
                color: 0x7c3aed,
                transparent: true,
                opacity: 0.65,
                linewidth: 1.5
            });

            const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
            lineMesh.position.set(comp.worldPos.x, comp.worldPos.y, comp.worldPos.z);
            this.ramGroup.add(lineMesh);

            this.tesseractMeshes.push({
                mesh: lineMesh,
                tess: tess,
                basePos: comp.worldPos,
                geo: lineGeo
            });
        });

        // Add Entire RAM Group to Scene
        this.scene.add(this.ramGroup);
    }

    // 4D Quantum Particle Cloud around RAM
    build4DQuantumParticles() {
        const count = 350;
        const geometry = new THREE.BufferGeometry();
        this.particle4DData = [];
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 16;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 8;
            const w = (Math.random() - 0.5) * 4;
            this.particle4DData.push({ x, y, z, w });

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMaterial = new THREE.PointsMaterial({
            color: 0x0284c7,
            size: 0.08,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.quantumParticles = new THREE.Points(geometry, pMaterial);
        this.scene.add(this.quantumParticles);
    }

    setupHotspots() {
        const container = document.getElementById('viewport-container') || this.container;

        ramComponentsData.forEach((comp) => {
            const node = document.createElement('div');
            node.className = 'hotspot-node';
            node.id = `hotspot-${comp.id}`;
            node.setAttribute('data-id', comp.id);

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-vector-square hotspot-icon';
            node.appendChild(icon);

            const label = document.createElement('div');
            label.className = 'hotspot-label';

            const titleSpan = document.createElement('span');
            titleSpan.innerText = comp.name.split(' (')[0];
            label.appendChild(titleSpan);

            const badge4D = document.createElement('span');
            badge4D.className = 'hotspot-4d-badge';
            badge4D.id = `badge4d-${comp.id}`;
            badge4D.innerText = '4D: W = +0.00';
            label.appendChild(badge4D);

            node.appendChild(label);

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                sfx.playClick();
                this.selectComponent(comp.id);
            });

            container.appendChild(node);
            this.hotspotElements.push({ element: node, worldPos: comp.worldPos, id: comp.id });
        });
    }

    updateHotspotsPosition() {
        if (!state.hotspotsVisible) {
            this.hotspotElements.forEach(h => h.element.style.display = 'none');
            return;
        }

        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        const time = Date.now() * 0.0015;

        this.hotspotElements.forEach((h, idx) => {
            // Get transformed 3D world position considering RAM rotation
            const pos = new THREE.Vector3(h.worldPos.x, h.worldPos.y, h.worldPos.z);
            pos.applyMatrix4(this.ramGroup.matrixWorld);

            // Compute 4D dimension value shifting dynamically with rotation
            const wVal = Math.sin(time * 2 + idx * 0.8) * 1.5;
            const badge = document.getElementById(`badge4d-${h.id}`);
            if (badge) {
                badge.innerText = `4D Matrix: [W: ${wVal >= 0 ? '+' : ''}${wVal.toFixed(2)}]`;
            }

            pos.project(this.camera);

            if (pos.z > 1) {
                h.element.style.display = 'none';
                return;
            }

            const x = (pos.x * widthHalf) + widthHalf;
            const y = -(pos.y * heightHalf) + heightHalf;

            h.element.style.display = 'flex';
            h.element.style.left = `${x}px`;
            h.element.style.top = `${y}px`;
        });
    }

    updatePopoverPosition() {
        const popover = document.getElementById('inline-popover');
        if (!popover || popover.classList.contains('hidden') || !state.selectedComponent) return;

        const comp = state.selectedComponent;
        const pos = new THREE.Vector3(comp.worldPos.x, comp.worldPos.y, comp.worldPos.z);
        pos.applyMatrix4(this.ramGroup.matrixWorld);
        pos.project(this.camera);

        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;

        let x = (pos.x * widthHalf) + widthHalf + 25;
        let y = -(pos.y * heightHalf) + heightHalf - 120;

        // Edge checks to keep popover card inside screen bounds
        const popoverWidth = 420;
        const popoverHeight = 450;

        if (x + popoverWidth > window.innerWidth - 20) {
            x = (pos.x * widthHalf) + widthHalf - popoverWidth - 25;
        }
        if (x < 20) x = 20;

        if (y + popoverHeight > window.innerHeight - 20) {
            y = window.innerHeight - popoverHeight - 20;
        }
        if (y < 70) y = 70;

        popover.style.left = `${x}px`;
        popover.style.top = `${y}px`;

        // Update live 4D coordinates on Popover Card Header
        const time = Date.now() * 0.0015;
        const wVal = Math.sin(time * 2) * 1.5;
        const coordsSpan = document.getElementById('comp-4d-coords');
        if (coordsSpan) {
            coordsSpan.innerText = `4D Matrix: X: ${comp.worldPos.x.toFixed(1)}, Y: ${comp.worldPos.y.toFixed(1)}, Z: ${comp.worldPos.z.toFixed(1)}, W: ${(wVal >= 0 ? '+' : '') + wVal.toFixed(2)}`;
        }
    }

    selectComponent(id) {
        const comp = ramComponentsData.find(c => c.id === id);
        if (!comp) return;

        state.selectedComponent = comp;
        sfx.playWhoosh();

        // 1. Smooth Camera Focus Transition using GSAP
        gsap.to(this.camera.position, {
            x: comp.cameraPos.x,
            y: comp.cameraPos.y,
            z: comp.cameraPos.z,
            duration: 1.2,
            ease: 'power2.out'
        });

        gsap.to(this.controls.target, {
            x: comp.cameraTarget.x,
            y: comp.cameraTarget.y,
            z: comp.cameraTarget.z,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: () => this.controls.update()
        });

        // 2. Open Inline Popover Directly on the 3D Component
        this.updatePopoverContent(comp);
        const popover = document.getElementById('inline-popover');
        if (popover) {
            popover.classList.remove('hidden');
            this.updatePopoverPosition();
        }

        this.flashComponentHighlight(comp.id, true);
    }

    updatePopoverContent(comp) {
        document.getElementById('comp-badge').innerText = comp.badge;
        document.getElementById('comp-title').innerText = comp.name;
        document.getElementById('comp-subtitle').innerText = comp.type;
        document.getElementById('comp-function').innerText = comp.function;
        document.getElementById('comp-architecture').innerText = comp.architecture;
        document.getElementById('spec-type').innerText = comp.type;
        document.getElementById('spec-location').innerText = comp.location;
        document.getElementById('spec-material').innerText = comp.material;
        document.getElementById('comp-funfact').innerText = comp.funFact;
    }

    // Visual 3D Component Flash Animation
    flashComponentHighlight(componentId, isCorrect) {
        const targetPart = this.meshParts[componentId];
        if (!targetPart) return;

        const flashColor = new THREE.Color(isCorrect ? 0x0284c7 : 0xe11d48);
        const materials = new Set();

        if (targetPart.isMesh && targetPart.material) {
            materials.add(targetPart.material);
        } else if (targetPart.isGroup) {
            targetPart.traverse(child => {
                if (child.isMesh && child.material) {
                    materials.add(child.material);
                }
            });
        }

        materials.forEach(mat => {
            if (!mat) return;

            if (mat.userData.origEmissive === undefined) {
                mat.userData.origEmissive = mat.emissive ? mat.emissive.getHex() : 0x000000;
                mat.userData.origIntensity = mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0.0;
            }

            if (mat.userData.flashTimeout) {
                clearTimeout(mat.userData.flashTimeout);
            }

            const targetIntensity = 1.2;

            if (mat.emissive) {
                mat.emissive.copy(flashColor);
                mat.emissiveIntensity = targetIntensity;

                mat.userData.flashTimeout = setTimeout(() => {
                    mat.emissive.setHex(mat.userData.origEmissive);
                    mat.emissiveIntensity = mat.userData.origIntensity;
                    mat.userData.flashTimeout = null;
                }, 750);
            }
        });
    }

    toggleExplodedView() {
        state.explodedView = !state.explodedView;
        sfx.playClick();

        const textSpan = document.getElementById('exploded-text');
        const btn = document.getElementById('btn-exploded');

        if (state.explodedView) {
            btn.classList.add('active');
            textSpan.innerText = 'Gabungkan Komponen';

            gsap.to(this.frontHsMesh.position, { z: 1.5, duration: 0.8, ease: 'back.out(1.2)' });
            gsap.to(this.backHsMesh.position, { z: -1.5, duration: 0.8, ease: 'back.out(1.2)' });

            this.dramChipsArray.forEach((chip, i) => {
                gsap.to(chip.position, { z: 0.45, duration: 0.6, delay: i * 0.03 });
            });
        } else {
            btn.classList.remove('active');
            textSpan.innerText = 'Mode Bongkar';

            gsap.to(this.frontHsMesh.position, { z: 0.12 + 0.1 + 0.04 + 0.02, duration: 0.6 });
            gsap.to(this.backHsMesh.position, { z: -(0.12 + 0.1 + 0.04 + 0.02), duration: 0.6 });

            this.dramChipsArray.forEach((chip) => {
                gsap.to(chip.position, { z: 0.06 + 0.05, duration: 0.5 });
            });
        }
    }

    toggleHeatsink() {
        state.heatsinkVisible = !state.heatsinkVisible;
        sfx.playClick();

        const btn = document.getElementById('btn-toggle-heatsink');
        const textSpan = document.getElementById('heatsink-text');

        if (state.heatsinkVisible) {
            this.heatsinkGroup.visible = true;
            btn.classList.add('active');
            textSpan.innerText = 'Sembunyikan Pendingin';
        } else {
            this.heatsinkGroup.visible = false;
            btn.classList.remove('active');
            textSpan.innerText = 'Tampilkan Pendingin';
        }
    }

    toggleAutoRotate() {
        state.autoRotate = !state.autoRotate;
        sfx.playClick();

        const btn = document.getElementById('btn-autorotate');
        const textSpan = document.getElementById('autorotate-text');

        if (state.autoRotate) {
            btn.classList.add('active');
            textSpan.innerText = 'Rotasi 4D: ON';
        } else {
            btn.classList.remove('active');
            textSpan.innerText = 'Rotasi 4D: OFF';
        }
    }

    resetCamera() {
        sfx.playClick();
        gsap.to(this.camera.position, { x: 0, y: 1.2, z: 8.5, duration: 1.0 });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.0, onUpdate: () => this.controls.update() });
        const popover = document.getElementById('inline-popover');
        if (popover) popover.classList.add('hidden');
        state.selectedComponent = null;
    }

    onPointerDown(event) {
        // Ignore clicks if clicking inside the popover UI card or controls toolbar
        if (event.target.closest('#inline-popover') || event.target.closest('.controls-toolbar') || event.target.closest('.navbar')) {
            return;
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.ramGroup.children, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            while (hitObj && !hitObj.userData.id && hitObj.parent) {
                hitObj = hitObj.parent;
            }

            if (hitObj && hitObj.userData.id) {
                const componentId = hitObj.userData.id;
                sfx.playClick();
                this.selectComponent(componentId);
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();

        const time = Date.now() * 0.001;

        // Continuous 3D/4D Auto-Rotation of RAM module ("gambar ramnya bergerak sendiri")
        if (state.autoRotate) {
            this.ramGroup.rotation.y += 0.007; // Continuous rotation around Y
            this.ramGroup.rotation.x = Math.sin(time * 0.7) * 0.08; // Gentle 4D pitch wobble
            this.ramGroup.rotation.z = Math.cos(time * 0.5) * 0.04; // Gentle 4D roll wobble
        }

        // Animate 4D Tesseract Wireframes on each Hotspot component
        const angleXW = time * 1.5;
        const angleYW = time * 0.8;

        this.tesseractMeshes.forEach((item, i) => {
            const newPositions = item.tess.projectTo3D(angleXW + i, angleYW + i * 0.5);
            item.geo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
            item.geo.attributes.position.needsUpdate = true;
        });

        // Animate 4D Quantum Particles Cloud
        if (this.quantumParticles) {
            const posAttr = this.quantumParticles.geometry.attributes.position;
            const positions = posAttr.array;

            for (let i = 0; i < this.particle4DData.length; i++) {
                const p = this.particle4DData[i];
                const w = Math.sin(time + i * 0.1) * 2;
                const factor = 1 / (2.5 - w);
                positions[i * 3] = p.x * factor;
                positions[i * 3 + 1] = p.y * factor;
                positions[i * 3 + 2] = p.z * factor;
            }
            posAttr.needsUpdate = true;
        }

        // Breathing animation for RGB bar
        if (this.rgbMat) {
            this.rgbMat.emissiveIntensity = 1.3 + Math.sin(time * 3) * 0.5;
        }

        // Realtime update of 4D HUD Matrix Values
        const wVal = Math.sin(time * 1.5) * 1.5;
        const pitchVal = (this.ramGroup.rotation.x * 180 / Math.PI).toFixed(2);
        const yawVal = (this.ramGroup.rotation.y * 180 / Math.PI % 360).toFixed(2);

        const wElem = document.getElementById('val-4d-w');
        const pitchElem = document.getElementById('val-4d-pitch');
        const yawElem = document.getElementById('val-4d-yaw');

        if (wElem) wElem.innerText = `${wVal >= 0 ? '+' : ''}${wVal.toFixed(3)}`;
        if (pitchElem) pitchElem.innerText = `${pitchVal >= 0 ? '+' : ''}${pitchVal}°`;
        if (yawElem) yawElem.innerText = `${yawVal}°`;

        // Update positions of HTML 3D Hotspots & Popover
        this.updateHotspotsPosition();
        this.updatePopoverPosition();

        this.renderer.render(this.scene, this.camera);
    }
}

// --- Main Application UI Controller ---
class UIController {
    constructor() {
        this.app3D = null;
        this.bindEvents();
    }

    init(app3D) {
        this.app3D = app3D;
    }

    bindEvents() {
        // Audio Toggle
        document.getElementById('btn-sound').addEventListener('click', () => {
            state.soundEnabled = !state.soundEnabled;
            const btn = document.getElementById('btn-sound');
            btn.innerHTML = state.soundEnabled
                ? '<i class="fa-solid fa-volume-high"></i>'
                : '<i class="fa-solid fa-volume-xmark"></i>';
            sfx.playClick();
        });

        // Controls Toolbar
        document.getElementById('btn-autorotate').addEventListener('click', () => this.app3D.toggleAutoRotate());
        document.getElementById('btn-reset-cam').addEventListener('click', () => this.app3D.resetCamera());
        document.getElementById('btn-exploded').addEventListener('click', () => this.app3D.toggleExplodedView());
        document.getElementById('btn-toggle-heatsink').addEventListener('click', () => this.app3D.toggleHeatsink());

        document.getElementById('btn-toggle-hotspots').addEventListener('click', () => {
            state.hotspotsVisible = !state.hotspotsVisible;
            sfx.playClick();
            document.getElementById('btn-toggle-hotspots').classList.toggle('active', state.hotspotsVisible);
            this.app3D.updateHotspotsPosition();
        });

        // Inline Popover Card Controls
        document.getElementById('btn-close-popover').addEventListener('click', () => {
            sfx.playClick();
            const popover = document.getElementById('inline-popover');
            if (popover) popover.classList.add('hidden');
            state.selectedComponent = null;
        });

        document.getElementById('btn-next-comp').addEventListener('click', () => this.navigateComponent(1));
        document.getElementById('btn-prev-comp').addEventListener('click', () => this.navigateComponent(-1));

        // Navigation Modes
        document.getElementById('btn-mode-inspect').addEventListener('click', () => this.switchMode('inspect'));
        document.getElementById('btn-mode-ddr').addEventListener('click', () => this.openModal('ddr-modal'));
        document.getElementById('btn-help').addEventListener('click', () => this.openModal('help-modal'));

        // Modals Close
        document.getElementById('btn-close-ddr').addEventListener('click', () => this.closeModal('ddr-modal'));
        document.getElementById('btn-close-help').addEventListener('click', () => this.closeModal('help-modal'));
    }

    navigateComponent(direction) {
        if (!state.selectedComponent) {
            this.app3D.selectComponent(ramComponentsData[0].id);
            return;
        }

        const currentIndex = ramComponentsData.findIndex(c => c.id === state.selectedComponent.id);
        let nextIndex = currentIndex + direction;

        if (nextIndex >= ramComponentsData.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = ramComponentsData.length - 1;

        this.app3D.selectComponent(ramComponentsData[nextIndex].id);
    }

    switchMode(mode) {
        sfx.playClick();
        state.currentMode = mode;

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (mode === 'inspect') {
            document.getElementById('btn-mode-inspect').classList.add('active');
            document.getElementById('ddr-modal').classList.add('hidden');
            this.app3D.updateHotspotsPosition();
        }
    }

    openModal(modalId) {
        sfx.playClick();
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal(modalId) {
        sfx.playClick();
        document.getElementById(modalId).classList.add('hidden');
    }
}

// --- Initialize App on Window Load ---
let app, ui;
window.addEventListener('DOMContentLoaded', () => {
    app = new RAM3DApp();
    ui = new UIController();
    ui.init(app);
    window.app = app;
    window.ui = ui;
});
