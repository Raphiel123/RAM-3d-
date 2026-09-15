/* ==========================================================================
   RAM 3D Inspector - Main Application Logic (Three.js Engine & UI)
   Modul Pembelajaran Interaktif Arsitektur & Organisasi Komputer
   ========================================================================== */

// --- Global Application State ---
const state = {
    soundEnabled: true,
    explodedView: false,
    hotspotsVisible: true,
    heatsinkVisible: true,
    selectedComponent: null,
    currentMode: 'inspect' // 'inspect', 'ddr'
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
        funFact: 'Warna hijau atau hitam pada PCB berasal dari lapisan khusus bernama Solder Mask yang melindungi jalur tembaga dari oksidasi dan karat.',
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

        this.pcbTexture = this.createPCBTexture();
        this.chipTexture = this.createChipTexture();

        this.init();
    }

    init() {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x06090f, 0.04);

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
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 14;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.1;

        // 5. Lighting
        this.setupLighting();

        // 6. Build 3D RAM Model
        this.buildRAMModel();

        // 7. Create Hotspots HTML Elements
        this.setupHotspots();

        // 8. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // 9. Start Render Loop
        this.animate();

        // Hide Loading Screen
        setTimeout(() => {
            const ls = document.getElementById('loading-screen');
            if (ls) ls.classList.add('hidden');
        }, 600);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Key Light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(5, 8, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        this.scene.add(keyLight);

        // Fill Light (Soft Cyan Glow)
        const fillLight = new THREE.DirectionalLight(0x00f2fe, 0.8);
        fillLight.position.set(-6, 3, -4);
        this.scene.add(fillLight);

        // Accent Light (Violet Rim Light)
        const rimLight = new THREE.DirectionalLight(0x8a2be2, 1.0);
        rimLight.position.set(0, -5, -6);
        this.scene.add(rimLight);
    }

    // Procedural Circuit Trace Texture Canvas
    createPCBTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark Matte PCB Background
        ctx.fillStyle = '#0a1410';
        ctx.fillRect(0, 0, 1024, 256);

        // Subtle PCB grid texture
        ctx.fillStyle = 'rgba(15, 30, 22, 0.3)';
        for (let x = 0; x < 1024; x += 10) {
            ctx.fillRect(x, 0, 2, 256);
        }

        // Gold Circuit Traces Lines
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 60; i++) {
            ctx.beginPath();
            let x = Math.random() * 1024;
            let y = Math.random() * 256;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 40);
            ctx.stroke();
        }

        // Gold Solder Pads Grid
        ctx.fillStyle = 'rgba(212, 175, 55, 0.45)';
        for (let x = 40; x < 980; x += 30) {
            for (let y = 30; y < 220; y += 40) {
                ctx.fillRect(x, y, 3, 3);
            }
        }

        // Text engraving on PCB
        ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.font = 'bold 12px Fira Code, monospace';
        ctx.fillText('DDR5-6400 CL32 HIGH-SPEED PCB REV 2.4', 40, 245);

        return new THREE.CanvasTexture(canvas);
    }

    // Procedural Chip Markings Texture Canvas
    createChipTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#121418';
        ctx.fillRect(0, 0, 256, 256);

        // Brand Marking & Specs Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = 'bold 22px Fira Code, monospace';
        ctx.fillText('HYNIX DRAM', 30, 70);
        ctx.font = '16px Fira Code, monospace';
        ctx.fillText('DDR5 16GB IC', 30, 110);
        ctx.fillText('H5CG48MEBD', 30, 140);
        ctx.fillText('2402-AA9', 30, 170);

        // Pin 1 Indicator Circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
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
            color: 0x0f1914,
            map: this.pcbTexture,
            roughness: 0.35,
            metalness: 0.2
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
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.15
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

        // Key Notch Gap Marker (Virtual Mesh)
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
            color: 0x181a20,
            map: this.chipTexture,
            roughness: 0.5,
            metalness: 0.3
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

        // --- 4. PMIC & SPD Hub Micro Components (Center-Top DDR5 JEDEC Standard) ---
        // PMIC Chip (Center Top)
        const pmicGeo = new THREE.BoxGeometry(0.65, 0.65, 0.12);
        const pmicMat = new THREE.MeshStandardMaterial({
            color: 0x2d3748,
            metalness: 0.8,
            roughness: 0.2
        });
        const pmicMesh = new THREE.Mesh(pmicGeo, pmicMat);
        pmicMesh.position.set(0, 0.75, pcbDepth / 2 + 0.06);
        pmicMesh.userData = { id: 'pmic' };
        this.ramGroup.add(pmicMesh);
        this.meshParts['pmic'] = pmicMesh;

        // SPD Hub & Thermal Sensor IC Chip (Center-Top, Adjacent to PMIC)
        const spdGeo = new THREE.BoxGeometry(0.45, 0.45, 0.08);
        const spdMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.6, roughness: 0.3 });
        const spdMesh = new THREE.Mesh(spdGeo, spdMat);
        spdMesh.position.set(0.8, 0.75, pcbDepth / 2 + 0.04);
        spdMesh.userData = { id: 'spd' };
        this.ramGroup.add(spdMesh);
        this.meshParts['spd'] = spdMesh;

        // --- 5. Aluminum Heat Spreader & RGB Strip ---
        this.heatsinkGroup = new THREE.Group();

        // Front Aluminum Plate
        const hsWidth = 11.2;
        const hsHeight = 2.0;
        const hsDepth = 0.08;

        const hsMaterial = new THREE.MeshStandardMaterial({
            color: 0x1f2937,
            metalness: 0.85,
            roughness: 0.25
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

        // Top RGB Light Strip Bar
        const rgbGeo = new THREE.BoxGeometry(11.25, 0.35, 0.3);
        this.rgbMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 1.5,
            roughness: 0.1
        });
        const rgbBar = new THREE.Mesh(rgbGeo, this.rgbMat);
        rgbBar.position.set(0, 1.5, 0);
        this.rgbBar = rgbBar;
        this.heatsinkGroup.add(rgbBar);

        this.heatsinkGroup.userData = { id: 'heatspreader' };
        this.ramGroup.add(this.heatsinkGroup);
        this.meshParts['heatspreader'] = this.heatsinkGroup;

        // Add Entire RAM Group to Scene
        this.scene.add(this.ramGroup);
    }

    setupHotspots() {
        const container = document.getElementById('viewport-container') || this.container;

        ramComponentsData.forEach((comp) => {
            const node = document.createElement('div');
            node.className = 'hotspot-node';
            node.id = `hotspot-${comp.id}`;
            node.setAttribute('data-id', comp.id);

            const label = document.createElement('div');
            label.className = 'hotspot-label';
            label.innerText = comp.name.split(' (')[0];
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

        this.hotspotElements.forEach((h) => {
            const pos = new THREE.Vector3(h.worldPos.x, h.worldPos.y, h.worldPos.z);
            pos.project(this.camera);

            // Check if behind camera
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

        // 2. Open Side Info Drawer & Populate Content
        this.updateDrawerContent(comp);
        document.getElementById('info-drawer').classList.add('open');
    }

    updateDrawerContent(comp) {
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

    // Visual 3D Component Flash Animation (Cyan/Emerald for correct, Rose/Red for wrong)
    flashComponentHighlight(componentId, isCorrect) {
        const targetPart = this.meshParts[componentId];
        if (!targetPart) return;

        const flashColor = new THREE.Color(isCorrect ? 0x00f2fe : 0xff2a6d);
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

            // Cache true original emissive state once
            if (mat.userData.origEmissive === undefined) {
                mat.userData.origEmissive = mat.emissive ? mat.emissive.getHex() : 0x000000;
                mat.userData.origIntensity = mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0.0;
            }

            // Clear any pending timeout from previous clicks
            if (mat.userData.flashTimeout) {
                clearTimeout(mat.userData.flashTimeout);
            }

            // Adjust glow intensity so large components don't blow out into solid flat blocks
            const targetIntensity = (componentId === 'heatspreader' || componentId === 'pcb') ? 0.7 : 1.4;

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

            // Explode Heatspreader Plates
            gsap.to(this.frontHsMesh.position, { z: 1.5, duration: 0.8, ease: 'back.out(1.2)' });
            gsap.to(this.backHsMesh.position, { z: -1.5, duration: 0.8, ease: 'back.out(1.2)' });

            // Explode Chips slightly
            this.dramChipsArray.forEach((chip, i) => {
                gsap.to(chip.position, { z: 0.45, duration: 0.6, delay: i * 0.03 });
            });
        } else {
            btn.classList.remove('active');
            textSpan.innerText = 'Mode Bongkar (Exploded)';

            // Re-assemble
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

    resetCamera() {
        sfx.playClick();
        gsap.to(this.camera.position, { x: 0, y: 1.2, z: 8.5, duration: 1.0 });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.0, onUpdate: () => this.controls.update() });
        document.getElementById('info-drawer').classList.remove('open');
    }

    onPointerDown(event) {
        // Calculate pointer location in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.ramGroup.children, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            // Traverse up to find object with userData.id
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
        this.updateHotspotsPosition();

        const time = Date.now() * 0.001;

        // Subtle idle oscillation animation for RAM module when idle
        if (!state.selectedComponent && !state.explodedView) {
            this.ramGroup.rotation.y = Math.sin(time * 0.5) * 0.08;
        }

        // Breathing animation for RGB bar
        if (this.rgbMat) {
            this.rgbMat.emissiveIntensity = 1.3 + Math.sin(time * 3) * 0.5;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// --- Main Application UI Controller ---
class UIController {
    constructor() {
        this.app3D = null;
        this.toastTimeout = null;
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
        document.getElementById('btn-reset-cam').addEventListener('click', () => this.app3D.resetCamera());
        document.getElementById('btn-exploded').addEventListener('click', () => this.app3D.toggleExplodedView());
        document.getElementById('btn-toggle-heatsink').addEventListener('click', () => this.app3D.toggleHeatsink());

        document.getElementById('btn-toggle-hotspots').addEventListener('click', () => {
            state.hotspotsVisible = !state.hotspotsVisible;
            sfx.playClick();
            document.getElementById('btn-toggle-hotspots').classList.toggle('active', state.hotspotsVisible);
            this.app3D.updateHotspotsPosition();
        });

        // Info Drawer Controls
        document.getElementById('btn-close-drawer').addEventListener('click', () => {
            sfx.playClick();
            document.getElementById('info-drawer').classList.remove('open');
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
