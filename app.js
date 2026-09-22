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
    autoRotate: true, // Rotasi 4D otomatis aktif secara default!
    autoTour: true, // Tur edukasi otomatis antar bagian/komponen
    theme: 'light' // Default 'light'
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

    playTypingTick() {
        if (!state.soundEnabled) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1000 + Math.random() * 400, now);
            gain.gain.setValueAtTime(0.012, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.02);
        } catch (e) {
            // Safe fallback
        }
    }
}

const sfx = new SoundEffects();

// --- High-Performance Typewriter Animation Engine (Sequential & Async Queue) ---
class TypewriterEngine {
    constructor() {
        this.activeSessions = new Map();
        this.currentQueue = null;
        this.queueId = 0;
        this.lastSoundTime = 0;
    }

    stop(element) {
        if (!element) return;
        if (this.activeSessions.has(element)) {
            const session = this.activeSessions.get(element);
            if (session.timer) clearTimeout(session.timer);
            if (session.cursor && session.cursor.parentNode) {
                session.cursor.remove();
            }
            this.activeSessions.delete(element);
        }
    }

    stopAll() {
        this.queueId++; // Batalkan sequence yang sedang berjalan
        this.currentQueue = null;
        for (const [element, session] of this.activeSessions.entries()) {
            if (session.timer) clearTimeout(session.timer);
            if (session.cursor && session.cursor.parentNode) {
                session.cursor.remove();
            }
        }
        this.activeSessions.clear();
        document.querySelectorAll('.info-card.active-explaining').forEach(el => el.classList.remove('active-explaining'));
    }

    finish(element) {
        if (!element || !this.activeSessions.has(element)) return;
        const session = this.activeSessions.get(element);
        if (session.timer) clearTimeout(session.timer);
        element.textContent = session.fullText;
        if (session.cursor && session.cursor.parentNode) {
            session.cursor.remove();
        }
        this.activeSessions.delete(element);
    }

    finishAll() {
        this.queueId++;
        // Selesaikan elemen yang sedang aktif mengetik saat ini
        for (const [element, session] of this.activeSessions.entries()) {
            if (session.timer) clearTimeout(session.timer);
            element.textContent = session.fullText;
            if (session.cursor && session.cursor.parentNode) {
                session.cursor.remove();
            }
        }
        this.activeSessions.clear();

        // Langsung isi seluruh elemen antrean berikutnya dengan teks lengkap seketika
        if (this.currentQueue && this.currentQueue.items) {
            for (let i = this.currentQueue.index; i < this.currentQueue.items.length; i++) {
                const item = this.currentQueue.items[i];
                if (item.element) {
                    item.element.textContent = item.text || '';
                    const oldCursor = item.element.querySelector('.typewriter-cursor');
                    if (oldCursor) oldCursor.remove();
                }
            }
            this.currentQueue = null;
        }

        document.querySelectorAll('.info-card.active-explaining').forEach(el => el.classList.remove('active-explaining'));
    }

    isTyping() {
        return this.activeSessions.size > 0 || this.currentQueue !== null;
    }

    // Menggulir kartu popover secara halus agar elemen yang sedang dijelaskan selalu terlihat
    autoScrollCard(targetElement) {
        if (!targetElement) return;
        const card = document.querySelector('.popover-card');
        if (!card) return;

        const target = targetElement.closest('.info-card') || targetElement;

        // Jika bagian Tahukah Anda? (kartu paling bawah), scroll penuh ke paling bawah
        if (target.id === 'comp-funfact' || target.classList.contains('tip-card') || target.querySelector('#comp-funfact')) {
            card.scrollTo({
                top: card.scrollHeight,
                behavior: 'smooth'
            });
            return;
        }

        const cardRect = card.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        // Cek jika elemen berada di luar batas pandang kartu
        if (targetRect.bottom > cardRect.bottom - 15 || targetRect.top < cardRect.top + 15) {
            const relativeTop = (targetRect.top - cardRect.top) + card.scrollTop;
            const targetScrollTop = Math.max(0, relativeTop - (card.clientHeight - targetRect.height) / 2);
            card.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }
    }

    type(element, text, options = {}) {
        return new Promise((resolve) => {
            if (!element) return resolve();
            this.stop(element);

            const targetText = String(text || '');
            if (!targetText) {
                element.textContent = '';
                return resolve();
            }

            const {
                speed = 24,         // Kecepatan membaca santai yang nyaman (~21-26ms)
                delay = 0,
                showCursor = true,
                sound = true,
                onComplete = null
            } = options;

            element.textContent = '';
            let cursor = null;
            if (showCursor) {
                cursor = document.createElement('span');
                cursor.className = 'typewriter-cursor';
                element.appendChild(cursor);
            }

            const session = {
                fullText: targetText,
                timer: null,
                cursor: cursor
            };
            this.activeSessions.set(element, session);

            let charIndex = 0;

            const step = () => {
                if (!this.activeSessions.has(element)) {
                    return resolve();
                }

                if (charIndex < targetText.length) {
                    const char = targetText[charIndex];
                    charIndex++;

                    if (cursor && cursor.parentNode === element) {
                        cursor.before(document.createTextNode(char));
                    } else {
                        element.textContent = targetText.slice(0, charIndex);
                    }

                    // Auto-scroll halus saat kursor mengetik mendekati bagian bawah kartu popover
                    if (element.id === 'comp-funfact' || (element.closest && element.closest('.tip-card'))) {
                        const card = document.querySelector('.popover-card');
                        if (card && (charIndex % 4 === 0 || char === ' ')) {
                            card.scrollTo({ top: card.scrollHeight, behavior: 'smooth' });
                        }
                    } else if (cursor && (charIndex % 3 === 0 || char === ' ')) {
                        const card = document.querySelector('.popover-card');
                        if (card) {
                            const cursorRect = cursor.getBoundingClientRect();
                            const cardRect = card.getBoundingClientRect();
                            if (cursorRect.bottom > cardRect.bottom - 35) {
                                card.scrollTop += 26;
                            }
                        }
                    }

                    // Bunyi ketikan halus (di-throttle agar rhythmic dan tidak bertumpuk)
                    if (sound && state.soundEnabled && (charIndex % 2 === 0 || char === ' ')) {
                        const now = performance.now();
                        if (now - this.lastSoundTime > 55) {
                            this.lastSoundTime = now;
                            sfx.playTypingTick();
                        }
                    }

                    // Jeda alami saat bertemu tanda baca
                    let nextDelay = speed;
                    if (char === '.' || char === '!' || char === '?') {
                        nextDelay += 85;
                    } else if (char === ',' || char === ';' || char === ':') {
                        nextDelay += 45;
                    }

                    session.timer = setTimeout(step, nextDelay);
                } else {
                    this.activeSessions.delete(element);

                    if (cursor && cursor.parentNode === element) {
                        setTimeout(() => {
                            if (cursor.parentNode === element) {
                                cursor.classList.add('fade-out');
                                setTimeout(() => {
                                    if (cursor.parentNode === element) cursor.remove();
                                }, 250);
                            }
                        }, 250);
                    }

                    if (onComplete) onComplete();
                    resolve();
                }
            };

            if (delay > 0) {
                session.timer = setTimeout(step, delay);
            } else {
                step();
            }
        });
    }

    // Menjalankan pengetikan secara BERURUTAN dari atas ke bawah (Top-to-Bottom Sequence)
    async typeSequence(items, options = {}) {
        this.stopAll();
        const thisQueueId = ++this.queueId;

        // Reset posisi scroll kartu popover ke paling atas saat mulai
        const card = document.querySelector('.popover-card');
        if (card) {
            card.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Kosongkan semua teks dalam antrean dari awal agar muncul bersih dari atas ke bawah
        for (const item of items) {
            if (item.element) {
                item.element.textContent = '';
                const oldCursor = item.element.querySelector('.typewriter-cursor');
                if (oldCursor) oldCursor.remove();
            }
            if (item.cardElement) {
                item.cardElement.classList.remove('active-explaining');
            }
        }

        this.currentQueue = {
            id: thisQueueId,
            items: items,
            index: 0
        };

        const defaultPause = options.pauseBetween !== undefined ? options.pauseBetween : 100;

        for (let i = 0; i < items.length; i++) {
            if (this.queueId !== thisQueueId) return; // Dibatalkan pengguna
            this.currentQueue.index = i;

            const item = items[i];
            if (!item.element) continue;

            // Berikan highlight kartu yang sedang aktif dijelaskan
            if (item.cardElement) {
                item.cardElement.classList.add('active-explaining');
            }

            // Jika item memerlukan auto-scroll ke posisinya
            if (item.autoScroll) {
                this.autoScrollCard(item.cardElement || item.element);
            }

            const itemSpeed = item.speed !== undefined ? item.speed : (options.speed || 24);

            await this.type(item.element, item.text, {
                speed: itemSpeed,
                showCursor: item.showCursor !== false,
                sound: item.sound !== false
            });

            if (this.queueId !== thisQueueId) return;

            // Jika sudah sampai bawah, otomatis scroll kartu agar bagian yang baru selesai sepenuhnya terlihat
            if (item.autoScroll) {
                this.autoScrollCard(item.cardElement || item.element);
            }

            // Jeda beberapa detik setelah penjelasannya selesai agar sempat dibaca sebelum pindah ke bagian berikutnya
            const pauseTime = item.pauseAfter !== undefined ? item.pauseAfter : defaultPause;

            if (pauseTime > 0) {
                await new Promise(r => setTimeout(r, pauseTime));
            }

            if (this.queueId !== thisQueueId) return;

            // Lepas highlight aktif setelah jeda selesai
            if (item.cardElement) {
                item.cardElement.classList.remove('active-explaining');
            }
        }

        if (this.queueId === thisQueueId) {
            this.currentQueue = null;
            if (options.onComplete) {
                options.onComplete();
            }
        }
    }
}

const typewriter = new TypewriterEngine();

// --- RAM Component Educational Dataset ---
const ramComponentsData = [
    {
        id: 'pcb',
        name: 'Printed Circuit Board (FR-4 Green PCB)',
        badge: 'Papan Sirkuit Otentik',
        type: 'Multi-Layer FR-4 Substrate',
        location: 'Papan Sirkuit Hijau Modul RAM',
        material: 'Fiberglass Epoxy (FR-4) & Lapisan Tembaga',
        function: 'Menjadi pondasi fisik dan menyediakan jalur bus sirkuit interkoneksi berkecepatan tinggi antara chip DRAM, kapasitor, dan pin konektor motherboard.',
        architecture: 'Menggunakan papan multi-lapisan (8-10 layers) dengan solder mask hijau emerald standar industri OEM. Lapisan tembaga dirancang dengan serpentine delay matching agar seluruh sinyal data tiba di pin dalam waktu bersamaan (femtosecond precision).',
        funFact: 'Warna hijau klasik pada PCB berasal dari pigmen resin epoksi solder mask yang awalnya dirancang untuk memudahkan teknisi memeriksa jalur sirkuit dengan mata telanjang!',
        cameraTarget: { x: -4.5, y: -0.9, z: 0 },
        cameraPos: { x: -4.5, y: -0.5, z: 3.0 },
        worldPos: { x: -4.5, y: -0.9, z: 0.15 }
    },
    {
        id: 'dram-chips',
        name: 'DRAM IC Chips (Micron D9RGQ)',
        badge: 'Penyimpanan Utama',
        type: 'BGA (Ball Grid Array) Semiconductor',
        location: 'Permukaan Papan PCB (8 Chip Berjajar)',
        material: 'Silikon Semikonduktor & Epoxy Packaging',
        function: 'Menyimpan bit data aplikasi dan instruksi sistem operasi secara dinamis dalam miliaran sel memori berukuran nanometer selama komputer beroperasi.',
        architecture: 'Setiap chip menggunakan kemasan BGA dengan kode part legendaris "D9RGQ" (standar Micron Technology). Di dalam setiap chip terdapat miliaran sel memori 1T1C (1 Transistor & 1 Kapasitor) yang disegarkan jutaan kali per detik.',
        funFact: 'Kode part "D9RGQ" pada chip Micron adalah salah satu die memori paling legendaris di dunia PC karena terkenal sangat stabil, dingin, dan efisien daya!',
        cameraTarget: { x: -1.9, y: 0.05, z: 0 },
        cameraPos: { x: -1.9, y: 0.3, z: 2.8 },
        worldPos: { x: -1.9, y: 0.05, z: 0.15 }
    },
    {
        id: 'smd-caps',
        name: 'Kapasitor & Resistor SMD (Bypass / Decoupling)',
        badge: 'Stabilitas Daya & Sinyal',
        type: 'Surface-Mount Device (SMD 0402 Ceramic)',
        location: 'Berjajar di Bawah Chip DRAM & Di Atas Pin Emas',
        material: 'Keramik Multilayer (MLCC) & Timah Solder',
        function: 'Menyaring noise listrik (filtering), menstabilkan fluktuasi tegangan, dan mencegah penurunan tegangan sesaat saat chip DRAM membaca/menulis data secara serentak.',
        architecture: 'Dipasang sedekat mungkin dengan pin daya chip DRAM untuk meminimalkan induktansi jalur sirkuit. Puluhan kapasitor kecil ini bertindak seperti waduk mini yang menyuplai lonjakan arus instan.',
        funFact: 'Meskipun ukurannya hanya sebesar butiran gula, jika satu saja kapasitor decoupling ini retak atau hilang, RAM bisa langsung mengalami Blue Screen of Death (BSOD)!',
        cameraTarget: { x: 0.7, y: -0.7, z: 0 },
        cameraPos: { x: 0.7, y: -0.4, z: 2.2 },
        worldPos: { x: 0.7, y: -0.72, z: 0.15 }
    },
    {
        id: 'gold-pins',
        name: 'Gold Contact Pins (Konektor Emas 288-Pin)',
        badge: 'Transmisi Sinyal Bus',
        type: 'Konektor Tepi DIMM (Edge Connector)',
        location: 'Sepanjang Tepi Bawah Modul RAM',
        material: 'Tembaga Dilapisi Emas Murni 24K (Hard Gold Plating)',
        function: 'Menghubungkan jalur bus data, bus alamat, clock, dan suplai daya listrik modul RAM langsung ke slot DIMM motherboard.',
        architecture: 'Pada standar DDR4/DDR5, tepi jajaran pin ini sengaja dibuat melengkung lembut (convex curve) di bagian tengah, bukan lurus datar. Bentuk ini dirancang oleh JEDEC untuk mengurangi gaya tekan saat pemasangan (insertion force).',
        funFact: 'Emas 24-karat digunakan bukan untuk pamer kemewahan, melainkan karena emas tidak pernah berkarat/teroksidasi dan memiliki hambatan listrik paling rendah!',
        cameraTarget: { x: 2.5, y: -1.3, z: 0 },
        cameraPos: { x: 2.5, y: -0.8, z: 3.0 },
        worldPos: { x: 2.5, y: -1.35, z: 0.1 }
    },
    {
        id: 'notch',
        name: 'Key Notch (Takik Pengaman Mekanis)',
        badge: 'Standar Keamanan JEDEC',
        type: 'Takik Mekanis Physical Keying',
        location: 'Tepi Bawah Antara Blok Pin Kontak',
        material: 'Celah Pemotongan PCB Presisi',
        function: 'Mencegah kesalahan fatal seperti memasang RAM terbalik atau memasang generasi DDR yang salah ke motherboard.',
        architecture: 'Posisi celah takik pada DDR3, DDR4, dan DDR5 sengaja digeser beberapa milimeter agar modul secara fisik mustahil dimasukkan ke slot generasi yang tidak cocok.',
        funFact: 'Jika takik ini tidak ada, menyalakan komputer dengan RAM terbalik akan langsung membakar motherboard akibat korsleting jalur daya ke ground!',
        cameraTarget: { x: 0.45, y: -1.2, z: 0 },
        cameraPos: { x: 0.45, y: -0.6, z: 2.4 },
        worldPos: { x: 0.45, y: -1.25, z: 0.05 }
    },
    {
        id: 'spd',
        name: 'SPD EEPROM & Sensor Termal',
        badge: 'Identitas & Profil Memori',
        type: '8-Pin SOIC/DFN EEPROM IC',
        location: 'Area Tengah Papan PCB',
        material: 'Semikonduktor Non-Volatile',
        function: 'Menyimpan informasi identitas pabrikan, kapasitas, kecepatan (timing CL/tRCD/tRP), dan nomor seri yang dibaca oleh BIOS saat booting.',
        architecture: 'Berkomunikasi dengan prosesor dan chipset motherboard melalui bus I2C/SMBus. Data di dalam chip SPD bersifat permanen dan tidak hilang saat komputer dimatikan.',
        funFact: 'Ketika BIOS menampilkan nama RAM "Micron 16GB 3200MHz", teks tersebut sebenarnya dibaca langsung dari chip SPD kecil ini!',
        cameraTarget: { x: 0.05, y: 0.85, z: 0 },
        cameraPos: { x: 0.05, y: 0.95, z: 2.4 },
        worldPos: { x: 0.05, y: 0.85, z: 0.15 }
    },
    {
        id: 'side-notches',
        name: 'Side Retention Notches (Takik Pengunci Retensi)',
        badge: 'Pengunci Mekanis Slot',
        type: 'Takik Retensi Penjepit',
        location: 'Tepi Kiri & Kanan Papan PCB',
        material: 'Potongan Lengkung Substrat PCB',
        function: 'Sebagai titik pengait tuas klip pengunci (retention clips) pada slot RAM motherboard agar RAM tidak bergeser atau longgar.',
        architecture: 'Memiliki radius lengkungan presisi yang pas dengan tuas pengait plastik soket DIMM, memastikan RAM terkunci rapat dengan tekanan kontak konstan.',
        funFact: 'Bunyi "KLIK!" yang memuaskan saat Anda memasang RAM ke motherboard berasal dari klip soket yang melompat masuk ke takik samping ini!',
        cameraTarget: { x: -5.7, y: 0.2, z: 0 },
        cameraPos: { x: -5.7, y: 0.4, z: 2.5 },
        worldPos: { x: -5.7, y: 0.2, z: 0.1 }
    }
];

// --- Optimized Zero-Allocation 4D Tesseract Helper ---
class Tesseract4D {
    constructor(scale = 0.35) {
        this.scale = scale;
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

        // Cache 3D projected vertices array to eliminate garbage collection in render loop
        this.temp3D = new Array(16).fill(0).map(() => [0, 0, 0]);
    }

    projectTo3D(angleXW, angleYW, targetArray) {
        const cosXW = Math.cos(angleXW), sinXW = Math.sin(angleXW);
        const cosYW = Math.cos(angleYW), sinYW = Math.sin(angleYW);
        const distance = 2.2;

        for (let i = 0; i < 16; i++) {
            const v = this.vertices4D[i];
            const x = v[0], y = v[1], z = v[2], w = v[3];

            const x1 = x * cosXW - w * sinXW;
            const w1 = x * sinXW + w * cosXW;

            const y1 = y * cosYW - w1 * sinYW;
            const w2 = y * sinYW + w1 * cosYW;

            const factor = 1 / (distance - w2);
            this.temp3D[i][0] = x1 * factor;
            this.temp3D[i][1] = y1 * factor;
            this.temp3D[i][2] = z * factor;
        }

        let ptr = 0;
        for (let edge of this.edges) {
            const p1 = this.temp3D[edge[0]];
            const p2 = this.temp3D[edge[1]];
            targetArray[ptr++] = p1[0];
            targetArray[ptr++] = p1[1];
            targetArray[ptr++] = p1[2];
            targetArray[ptr++] = p2[0];
            targetArray[ptr++] = p2[1];
            targetArray[ptr++] = p2[2];
        }
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
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.02);

        // 2. Camera Setup (Responsif terhadap layar Mobile)
        const isMobile = window.innerWidth <= 768;
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, isMobile ? 0.6 : 1.2, isMobile ? 14.2 : 8.5);

        // 3. Robust WebGL Renderer Setup
        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                failIfMajorPerformanceCaveat: false
            });
        } catch (e) {
            console.warn('Fallback standard renderer initialized');
            this.renderer = new THREE.WebGLRenderer({ alpha: true });
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.setClearColor(0xf1f5f9, 1);
        this.container.appendChild(this.renderer.domElement);

        // WebGL Context Loss Recovery Listener
        const canvas = this.renderer.domElement;
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost. Restoring renderer...');
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored successfully.');
            this.setupLighting();
            this.renderer.render(this.scene, this.camera);
        }, false);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 14;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.15;

        // 5. Lighting
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

        // Hide Loading Screen & Start interaction hint typewriter
        setTimeout(() => {
            const ls = document.getElementById('loading-screen');
            if (ls) ls.classList.add('hidden');

            const hintElem = document.getElementById('interaction-hint-text');
            if (hintElem) {
                const hintText = "RAM Berotasi Otomatis dalam Ruang 4D • Klik Hotspot Glowing atau Komponen untuk melihat Penjelasan Langsung di Objek";
                typewriter.type(hintElem, hintText, { delay: 500, speed: 20 });
            }
        }, 400);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        // Main Studio Key Light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(6, 10, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);

        // Fill Light
        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
        fillLight.position.set(-6, 4, -4);
        this.scene.add(fillLight);

        // Accent Rim Light
        const rimLight = new THREE.DirectionalLight(0xa855f7, 1.1);
        rimLight.position.set(0, -6, -6);
        this.scene.add(rimLight);
    }

    // Procedural Circuit Trace Texture Canvas - Authentic Emerald Green OEM FR-4 PCB
    createPCBTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 1. Deep Authentic Emerald / Forest Green FR-4 Substrate Base
        const bgGrad = ctx.createLinearGradient(0, 0, 2048, 512);
        bgGrad.addColorStop(0, '#0d5c2c');
        bgGrad.addColorStop(0.5, '#116d35');
        bgGrad.addColorStop(1, '#0b4f25');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 2048, 512);

        // 2. FR-4 Fiberglass Woven Weave Substrate Texture
        ctx.fillStyle = 'rgba(19, 115, 54, 0.35)';
        for (let x = 0; x < 2048; x += 6) {
            ctx.fillRect(x, 0, 1.5, 512);
        }
        for (let y = 0; y < 512; y += 6) {
            ctx.fillRect(0, y, 2048, 1.5);
        }

        // 3. Copper Ground Planes & Internal Routing Shading
        ctx.fillStyle = 'rgba(8, 62, 30, 0.55)';
        ctx.fillRect(40, 360, 1968, 100);

        // 4. Chip Positions in texture space (corresponding to the 8 chips across width)
        const chipCentersX = [230, 460, 690, 920, 1150, 1380, 1610, 1830];

        // Draw bus routing lines from each chip down to connector pads
        chipCentersX.forEach((cx, chipIdx) => {
            const w = 170, h = 210, topY = 120;
            const leftX = cx - w / 2, rightX = cx + w / 2;

            // Footprint corner brackets (Silkscreen white)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2;
            const bLen = 14;
            // Top-left
            ctx.beginPath(); ctx.moveTo(leftX, topY + bLen); ctx.lineTo(leftX, topY); ctx.lineTo(leftX + bLen, topY); ctx.stroke();
            // Top-right
            ctx.beginPath(); ctx.moveTo(rightX - bLen, topY); ctx.lineTo(rightX, topY); ctx.lineTo(rightX, topY + bLen); ctx.stroke();
            // Bottom-left
            ctx.beginPath(); ctx.moveTo(leftX, topY + h - bLen); ctx.lineTo(leftX, topY + h); ctx.lineTo(leftX + bLen, topY + h); ctx.stroke();
            // Bottom-right
            ctx.beginPath(); ctx.moveTo(rightX - bLen, topY + h); ctx.lineTo(rightX, topY + h); ctx.lineTo(rightX, topY + h - bLen); ctx.stroke();

            // Silkscreen designator
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px Fira Code, monospace';
            ctx.fillText(`U${chipIdx + 1}`, leftX, topY - 8);

            // BGA solder balls footprint pattern under chip
            ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
            for (let bx = leftX + 18; bx <= rightX - 18; bx += 16) {
                for (let by = topY + 20; by <= topY + h - 20; by += 16) {
                    ctx.beginPath();
                    ctx.arc(bx, by, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Copper Signal Bus Traces down to gold contact pins
            ctx.strokeStyle = 'rgba(218, 178, 88, 0.7)';
            ctx.lineWidth = 1.8;
            for (let t = -60; t <= 60; t += 12) {
                ctx.beginPath();
                const startX = cx + t;
                const startY = topY + h + 24;
                ctx.moveTo(startX, startY);
                const midY = startY + 40;
                const midX = startX + (t > 0 ? 15 : -15);
                ctx.lineTo(midX, midY);
                ctx.lineTo(midX, 440);
                ctx.stroke();

                // Small via holes on traces
                ctx.fillStyle = '#dfb85b';
                ctx.beginPath();
                ctx.arc(midX, midY + 15, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#063817';
                ctx.beginPath();
                ctx.arc(midX, midY + 15, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Serpentine / Meander Delay Matching High-Speed Traces between chips
            if (chipIdx < chipCentersX.length - 1) {
                const nextX = chipCentersX[chipIdx + 1];
                ctx.strokeStyle = 'rgba(218, 178, 88, 0.6)';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                let sx = cx + w / 2 + 10;
                let sy = topY + 40;
                ctx.moveTo(sx, sy);
                while (sx < nextX - w / 2 - 10) {
                    ctx.lineTo(sx + 5, sy - 8);
                    ctx.lineTo(sx + 10, sy + 8);
                    sx += 10;
                }
                ctx.stroke();
            }

            // SMD Capacitor Solder Pads under chip
            for (let c = 0; c < 4; c++) {
                const padX = cx - 45 + c * 30;
                const padY = topY + h + 12;
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(padX - 6, padY - 3, 12, 6);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '10px Fira Code, monospace';
                ctx.fillText(`C${chipIdx * 4 + c + 1}`, padX - 8, padY + 15);
            }
        });

        // 5. Hundreds of Copper Test Vias across the Board
        for (let i = 0; i < 180; i++) {
            const vx = 60 + Math.random() * 1920;
            const vy = 40 + Math.random() * 400;
            ctx.fillStyle = 'rgba(223, 184, 91, 0.85)';
            ctx.beginPath();
            ctx.arc(vx, vy, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#073315';
            ctx.beginPath();
            ctx.arc(vx, vy, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. Silkscreen Text & Industry Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Fira Code, monospace';
        ctx.fillText('16GB 1Rx8 PC4-25600U-UA2-11 [JEDEC UNBUFFERED DIMM]', 60, 48);
        ctx.font = '13px Fira Code, monospace';
        ctx.fillText('DDR4 3200MHz CL22 1.2V • 288-PIN • RoHS COMPLIANT • HALOGEN-FREE', 60, 72);
        ctx.fillText('BOARD REV 2.4 • BP ML E238805 94V-0 2419', 60, 94);

        // Pin numbering indicators at bottom corners
        ctx.font = 'bold 14px Fira Code, monospace';
        ctx.fillText('1', 55, 465);
        ctx.fillText('144', 980, 465);
        ctx.fillText('145', 1060, 465);
        ctx.fillText('288', 1980, 465);

        // 7. Authentic OEM White Barcode Specification Sticker (Crucial / Micron Style)
        const stickerX = 1480, stickerY = 25, stickerW = 480, stickerH = 78;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.fillRect(stickerX, stickerY, stickerW, stickerH);
        ctx.shadowBlur = 0;

        // Barcode lines
        ctx.fillStyle = '#0f172a';
        let barX = stickerX + 16;
        while (barX < stickerX + 160) {
            const bWidth = Math.random() > 0.45 ? 2.5 : 1.2;
            ctx.fillRect(barX, stickerY + 12, bWidth, 38);
            barX += bWidth + 1.8;
        }

        // Sticker text
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px Fira Code, monospace';
        ctx.fillText('MICRON 16GB DDR4-3200', stickerX + 175, stickerY + 22);
        ctx.font = '10px Fira Code, monospace';
        ctx.fillText('MTA8ATF2G64AZ-3G2E1 2418', stickerX + 175, stickerY + 38);
        ctx.fillText('16GB 1Rx8 PC4-25600U-UA2-11', stickerX + 175, stickerY + 52);
        ctx.font = 'bold 9px Fira Code, monospace';
        ctx.fillText('SN: 42A8F931-E082B-ROHS CE', stickerX + 175, stickerY + 68);

        // Mini DataMatrix QR Box mockup
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(stickerX + stickerW - 45, stickerY + 18, 32, 32);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(stickerX + stickerW - 39, stickerY + 24, 8, 8);
        ctx.fillRect(stickerX + stickerW - 25, stickerY + 36, 6, 6);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        return tex;
    }

    // Procedural Chip Markings Texture Canvas - Authentic Micron 4SA77 D9RGQ
    createChipTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 1. Dark Charcoal Matte Epoxy Mold Compound Body
        ctx.fillStyle = '#18191c';
        ctx.fillRect(0, 0, 512, 512);

        // Subtle beveled edges
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, 0, 512, 8);
        ctx.fillRect(0, 0, 8, 512);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 504, 512, 8);
        ctx.fillRect(504, 0, 8, 512);

        // 2. Pin 1 Orientation Recessed Indent Dot (Top Left Corner)
        const dotGrad = ctx.createRadialGradient(50, 50, 2, 50, 50, 16);
        dotGrad.addColorStop(0, '#0a0b0d');
        dotGrad.addColorStop(0.7, '#141517');
        dotGrad.addColorStop(1, '#2a2b30');
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(50, 50, 16, 0, Math.PI * 2);
        ctx.fill();

        // 3. Laser-Etched Metallic Silk Markings (Identik Persis Foto: Micron 4SA77 D9RGQ)
        ctx.fillStyle = 'rgba(215, 222, 230, 0.72)';
        ctx.font = 'bold 36px Fira Code, monospace';

        // Micron Stylized Logo Icon
        ctx.fillText('M', 235, 140);
        ctx.font = 'bold 18px Fira Code, monospace';
        ctx.fillText('MICRON', 210, 175);

        // Laser Part & Die Code (Exact from User Photo)
        ctx.font = 'bold 34px Fira Code, monospace';
        ctx.fillText('4SA77', 195, 250);
        ctx.font = 'bold 38px Fira Code, monospace';
        ctx.fillText('D9RGQ', 195, 315);

        // Wafer Batch & Spec Markings
        ctx.font = '22px Fira Code, monospace';
        ctx.fillStyle = 'rgba(180, 190, 205, 0.55)';
        ctx.fillText('SEC 2419', 200, 385);
        ctx.font = '18px Fira Code, monospace';
        ctx.fillText('FBGA-96 D-DIE', 185, 430);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    buildRAMModel() {
        // --- 1. Main Emerald Green PCB Board ---
        const pcbWidth = 11.4;
        const pcbHeight = 2.5;
        const pcbDepth = 0.11;

        const pcbGeometry = new THREE.BoxGeometry(pcbWidth, pcbHeight, pcbDepth);
        const pcbMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.pcbTexture,
            roughness: 0.38,
            metalness: 0.15
        });

        const pcbMesh = new THREE.Mesh(pcbGeometry, pcbMaterial);
        pcbMesh.castShadow = true;
        pcbMesh.receiveShadow = true;
        pcbMesh.userData = { id: 'pcb' };
        this.ramGroup.add(pcbMesh);
        this.meshParts['pcb'] = pcbMesh;

        // Side retention notches (Latching mechanism on motherboard slot)
        const sideNotchesGroup = new THREE.Group();
        const notchGeoSide = new THREE.BoxGeometry(0.18, 0.35, pcbDepth + 0.02);
        const notchMatSide = new THREE.MeshStandardMaterial({ color: 0x09451e, roughness: 0.8 });

        const leftNotch = new THREE.Mesh(notchGeoSide, notchMatSide);
        leftNotch.position.set(-pcbWidth / 2 + 0.06, 0.2, 0);
        sideNotchesGroup.add(leftNotch);

        const rightNotch = new THREE.Mesh(notchGeoSide, notchMatSide);
        rightNotch.position.set(pcbWidth / 2 - 0.06, 0.2, 0);
        sideNotchesGroup.add(rightNotch);

        sideNotchesGroup.userData = { id: 'side-notches' };
        this.ramGroup.add(sideNotchesGroup);
        this.meshParts['side-notches'] = sideNotchesGroup;

        // --- 2. Gold Contact Pins Array (288 Pins with JEDEC Convex Curve) ---
        const pinGroup = new THREE.Group();
        const pinMaterial = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.96,
            roughness: 0.12
        });

        const pinCountPerSide = 65;
        const pinWidth = 0.048;
        const basePinHeight = 0.38;
        const pinGap = 0.068;

        // Left Pin Block (pins 1 to 65)
        for (let i = 0; i < pinCountPerSide; i++) {
            const xPos = -5.0 + i * pinGap;
            const distFromCenter = Math.abs(xPos) / 5.2;
            const curveOffset = Math.pow(distFromCenter, 1.75) * 0.08;
            const pinH = basePinHeight - curveOffset;

            const pinGeo = new THREE.BoxGeometry(pinWidth, pinH, pcbDepth + 0.02);
            const pin = new THREE.Mesh(pinGeo, pinMaterial);
            pin.position.set(xPos, -pcbHeight / 2 - basePinHeight / 2 + curveOffset / 2, 0);
            pinGroup.add(pin);
        }

        // Right Pin Block (pins 66 to 130)
        for (let i = 0; i < pinCountPerSide; i++) {
            const xPos = 0.65 + i * pinGap;
            const distFromCenter = Math.abs(xPos) / 5.2;
            const curveOffset = Math.pow(distFromCenter, 1.75) * 0.08;
            const pinH = basePinHeight - curveOffset;

            const pinGeo = new THREE.BoxGeometry(pinWidth, pinH, pcbDepth + 0.02);
            const pin = new THREE.Mesh(pinGeo, pinMaterial);
            pin.position.set(xPos, -pcbHeight / 2 - basePinHeight / 2 + curveOffset / 2, 0);
            pinGroup.add(pin);
        }

        // Key Notch Gap Marker
        const notchGeo = new THREE.BoxGeometry(0.48, 0.42, pcbDepth + 0.04);
        const notchMat = new THREE.MeshBasicMaterial({ visible: false });
        const notchMesh = new THREE.Mesh(notchGeo, notchMat);
        notchMesh.position.set(0.45, -pcbHeight / 2, 0);
        notchMesh.userData = { id: 'notch' };
        this.ramGroup.add(notchMesh);
        this.meshParts['notch'] = notchMesh;

        pinGroup.userData = { id: 'gold-pins' };
        this.ramGroup.add(pinGroup);
        this.meshParts['gold-pins'] = pinGroup;
        this.pinGroup = pinGroup;

        // --- 3. 8x DRAM IC Chips (Micron D9RGQ) ---
        const dramGroup = new THREE.Group();
        const chipWidth = 0.96;
        const chipHeight = 1.18;
        const chipDepth = 0.08;

        const chipMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.chipTexture,
            roughness: 0.48,
            metalness: 0.16
        });

        this.dramChipsArray = [];
        const chipPositionsX = [-4.5, -3.2, -1.9, -0.6, 0.7, 2.0, 3.3, 4.5];

        chipPositionsX.forEach((xPos) => {
            const chipGeo = new THREE.BoxGeometry(chipWidth, chipHeight, chipDepth);
            const chipMesh = new THREE.Mesh(chipGeo, chipMaterial);
            chipMesh.position.set(xPos, 0.05, pcbDepth / 2 + chipDepth / 2);
            chipMesh.castShadow = true;
            chipMesh.userData = { id: 'dram-chips' };
            dramGroup.add(chipMesh);
            this.dramChipsArray.push(chipMesh);
        });

        dramGroup.userData = { id: 'dram-chips' };
        this.ramGroup.add(dramGroup);
        this.meshParts['dram-chips'] = dramGroup;

        // --- 4. Micro SMD Decoupling Capacitors & Resistors ---
        const smdGroup = new THREE.Group();
        const capBodyMat = new THREE.MeshStandardMaterial({ color: 0xab7d4d, roughness: 0.6 }); // Ceramic MLCC tan
        const capSolderMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 }); // Silver solder

        // 4 Capacitors below each DRAM chip
        chipPositionsX.forEach((cx) => {
            for (let c = 0; c < 4; c++) {
                const capX = cx - 0.32 + c * 0.21;
                const capY = -0.72;
                const capZ = pcbDepth / 2 + 0.025;

                // Ceramic center body
                const bodyGeo = new THREE.BoxGeometry(0.07, 0.14, 0.04);
                const bodyMesh = new THREE.Mesh(bodyGeo, capBodyMat);
                bodyMesh.position.set(capX, capY, capZ);
                smdGroup.add(bodyMesh);

                // Top & bottom solder termination caps
                const termGeo = new THREE.BoxGeometry(0.075, 0.035, 0.042);
                const topTerm = new THREE.Mesh(termGeo, capSolderMat);
                topTerm.position.set(capX, capY + 0.055, capZ);
                smdGroup.add(topTerm);

                const btmTerm = new THREE.Mesh(termGeo, capSolderMat);
                btmTerm.position.set(capX, capY - 0.055, capZ);
                smdGroup.add(btmTerm);
            }
        });

        // Bus filtering SMD resistors above gold pins
        const resMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        for (let rx = -4.8; rx <= 4.8; rx += 0.38) {
            if (Math.abs(rx - 0.45) < 0.3) continue; // Skip key notch
            const resGeo = new THREE.BoxGeometry(0.055, 0.09, 0.03);
            const resMesh = new THREE.Mesh(resGeo, resMat);
            resMesh.position.set(rx, -1.02, pcbDepth / 2 + 0.02);
            smdGroup.add(resMesh);
        }

        smdGroup.userData = { id: 'smd-caps' };
        this.smdGroup = smdGroup;
        this.ramGroup.add(smdGroup);
        this.meshParts['smd-caps'] = smdGroup;

        // --- 5. SPD EEPROM IC Chip ---
        const spdGeo = new THREE.BoxGeometry(0.42, 0.42, 0.06);
        const spdMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.35 });
        const spdMesh = new THREE.Mesh(spdGeo, spdMat);
        spdMesh.position.set(0.05, 0.85, pcbDepth / 2 + 0.03);
        spdMesh.userData = { id: 'spd' };
        this.spdMesh = spdMesh;
        this.ramGroup.add(spdMesh);
        this.meshParts['spd'] = spdMesh;

        // --- 6. Build Zero-Allocation 4D Tesseract Meshes ---
        ramComponentsData.forEach((comp) => {
            const tess = new Tesseract4D(0.35);
            const posArray = new Float32Array(32 * 2 * 3); // 192 floats
            tess.projectTo3D(0, 0, posArray);

            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

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
                geo: lineGeo,
                posArray: posArray
            });
        });

        // Add Entire RAM Group to Scene
        this.scene.add(this.ramGroup);
    }

    // 4D Quantum Particle Cloud around RAM
    build4DQuantumParticles() {
        const count = 300;
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
            const pos = new THREE.Vector3(h.worldPos.x, h.worldPos.y, h.worldPos.z);
            pos.applyMatrix4(this.ramGroup.matrixWorld);

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

        // Pada layar Mobile/HP (<= 768px): posisikan kartu sebagai bottom sheet elegan
        // di atas toolbar agar RAM 3D di bagian atas tetap terlihat jelas tanpa terhalang!
        if (window.innerWidth <= 768) {
            popover.style.left = '8px';
            popover.style.right = '8px';
            popover.style.top = 'auto';
            popover.style.bottom = '68px';
            popover.style.maxHeight = '48vh';

            const time = Date.now() * 0.0015;
            const wVal = Math.sin(time * 2) * 1.5;
            const coordsSpan = document.getElementById('comp-4d-coords');
            if (coordsSpan) {
                coordsSpan.innerText = `4D Matrix: [W: ${(wVal >= 0 ? '+' : '') + wVal.toFixed(2)}]`;
            }
            return;
        }

        // Reset bottom/right styling jika sebelumnya dari tampilan mobile
        popover.style.bottom = 'auto';
        popover.style.right = 'auto';

        const pos = new THREE.Vector3(comp.worldPos.x, comp.worldPos.y, comp.worldPos.z);
        pos.applyMatrix4(this.ramGroup.matrixWorld);
        pos.project(this.camera);

        const container = document.getElementById('viewport-container') || document.body;
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || (window.innerHeight - 64);

        const widthHalf = containerWidth / 2;
        const heightHalf = containerHeight / 2;

        const popoverWidth = popover.offsetWidth || 390;
        const popoverHeight = popover.offsetHeight || 480;

        // Batasi tinggi maksimum popover agar selalu memiliki margin atas & bawah yang aman
        const minTop = 10; // 10px di bawah navbar
        const bottomPadding = 18; // 18px ruang aman di atas batas bawah layar / taskbar
        const maxAllowedHeight = containerHeight - minTop - bottomPadding;
        popover.style.maxHeight = `${maxAllowedHeight}px`;

        let x = (pos.x * widthHalf) + widthHalf + 25;
        // Posisikan vertikal di sekitar komponen
        let y = -(pos.y * heightHalf) + heightHalf - (popoverHeight * 0.35);

        // Batas horizontal
        if (x + popoverWidth > containerWidth - 18) {
            x = (pos.x * widthHalf) + widthHalf - popoverWidth - 25;
        }
        if (x < 18) x = 18;
        if (x + popoverWidth > containerWidth - 18) {
            x = containerWidth - popoverWidth - 18;
        }

        // Batas vertikal: pastikan popover TIDAK PERNAH keluar/ketutupan di bawah layar maupun di atas
        const currentHeight = Math.min(popover.offsetHeight, maxAllowedHeight);
        const maxTop = Math.max(minTop, containerHeight - currentHeight - bottomPadding);

        if (y > maxTop) {
            y = maxTop;
        }
        if (y < minTop) {
            y = minTop;
        }

        popover.style.left = `${Math.round(x)}px`;
        popover.style.top = `${Math.round(y)}px`;

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

        this.clearTourCountdown();
        const card = document.querySelector('.popover-card');
        if (card) card.scrollTop = 0;

        state.selectedComponent = comp;
        sfx.playWhoosh();

        const isMobile = window.innerWidth <= 768;
        const camY = isMobile ? comp.cameraPos.y + 0.6 : comp.cameraPos.y;
        const camZ = isMobile ? comp.cameraPos.z * 1.45 : comp.cameraPos.z;
        const targetY = isMobile ? comp.cameraTarget.y + 0.35 : comp.cameraTarget.y;

        gsap.to(this.camera.position, {
            x: comp.cameraPos.x,
            y: camY,
            z: camZ,
            duration: 1.2,
            ease: 'power2.out'
        });

        gsap.to(this.controls.target, {
            x: comp.cameraTarget.x,
            y: targetY,
            z: comp.cameraTarget.z,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: () => this.controls.update()
        });

        this.updatePopoverContent(comp);
        const popover = document.getElementById('inline-popover');
        if (popover) {
            popover.classList.remove('hidden');
            this.updatePopoverPosition();
        }

        this.flashComponentHighlight(comp.id, true);
    }

    updatePopoverContent(comp) {
        this.clearTourCountdown();

        const badgeElem = document.getElementById('comp-badge');
        const titleElem = document.getElementById('comp-title');
        const subtitleElem = document.getElementById('comp-subtitle');
        const funcElem = document.getElementById('comp-function');
        const archElem = document.getElementById('comp-architecture');
        const specType = document.getElementById('spec-type');
        const specLoc = document.getElementById('spec-location');
        const specMat = document.getElementById('spec-material');
        const factElem = document.getElementById('comp-funfact');

        const cardFunc = funcElem ? funcElem.closest('.info-card') : null;
        const cardArch = archElem ? archElem.closest('.info-card') : null;
        const cardSpecs = specType ? specType.closest('.info-card') : null;
        const cardFact = factElem ? factElem.closest('.info-card') : null;

        // Urutan pengetikan bertahap dari atas ke bawah:
        // Setiap bagian selesai -> jeda beberapa detik agar selesai dibaca -> pindah ke bagian berikutnya -> otomatis scroll ke bawah jika sampai bawah
        const sequenceItems = [
            // Bagian Header (Atas)
            { element: badgeElem, text: comp.badge, speed: 28, pauseAfter: 80 },
            { element: titleElem, text: comp.name, speed: 25, pauseAfter: 80 },
            { element: subtitleElem, text: comp.type, speed: 26, pauseAfter: 500 },

            // Bagian 1: Fungsi Utama (Tengah Atas)
            {
                element: funcElem,
                text: comp.function,
                speed: 21,
                cardElement: cardFunc,
                autoScroll: true,
                pauseAfter: 1800 // Jeda 1.8 detik membaca sebelum lanjut ke bagian berikutnya
            },

            // Bagian 2: Cara Kerja & Arsitektur (Tengah Bawah)
            {
                element: archElem,
                text: comp.architecture,
                speed: 21,
                cardElement: cardArch,
                autoScroll: true,
                pauseAfter: 1800 // Jeda 1.8 detik membaca
            },

            // Bagian 3: Spesifikasi & Material (Bawah)
            {
                element: specType,
                text: comp.type,
                speed: 26,
                cardElement: cardSpecs,
                autoScroll: true,
                pauseAfter: 60
            },
            { element: specLoc, text: comp.location, speed: 26, pauseAfter: 60 },
            {
                element: specMat,
                text: comp.material,
                speed: 26,
                autoScroll: true,
                pauseAfter: 1400
            },

            // Bagian 4: Tahukah Anda? (Paling Bawah - Men scroll dengan sendirinya)
            {
                element: factElem,
                text: comp.funFact,
                speed: 21,
                cardElement: cardFact,
                autoScroll: true,
                pauseAfter: 2000 // Jeda 2 detik setelah seluruh isi selesai
            }
        ];

        typewriter.typeSequence(sequenceItems, {
            onComplete: () => {
                if (state.autoTour) {
                    this.startAutoTourCountdown();
                }
            }
        });
    }

    startAutoTourCountdown() {
        if (!state.autoTour) return;
        this.clearTourCountdown();

        const bar = document.getElementById('tour-advance-bar');
        const countElem = document.getElementById('tour-timer-count');
        const card = document.querySelector('.popover-card');

        // Scroll penuh ke paling bawah kartu agar tombol dan countdown terlihat
        if (card) {
            card.scrollTo({ top: card.scrollHeight, behavior: 'smooth' });
        }

        if (!bar || !countElem) return;
        bar.classList.remove('hidden');

        let secondsLeft = 3;
        countElem.innerText = secondsLeft;

        this.tourCountdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft > 0) {
                countElem.innerText = secondsLeft;
            } else {
                this.clearTourCountdown();
                if (window.ui) {
                    window.ui.navigateComponent(1);
                }
            }
        }, 1000);
    }

    clearTourCountdown() {
        if (this.tourCountdownInterval) {
            clearInterval(this.tourCountdownInterval);
            this.tourCountdownInterval = null;
        }
        const bar = document.getElementById('tour-advance-bar');
        if (bar) bar.classList.add('hidden');
    }

    toggleAutoTour() {
        state.autoTour = !state.autoTour;
        sfx.playClick();
        const btn = document.getElementById('btn-auto-tour');
        const textSpan = document.getElementById('auto-tour-text');
        if (state.autoTour) {
            if (btn) btn.classList.add('active');
            if (textSpan) textSpan.innerText = 'Tur Otomatis: ON';
            if (!typewriter.isTyping() && state.selectedComponent) {
                this.startAutoTourCountdown();
            }
        } else {
            if (btn) btn.classList.remove('active');
            if (textSpan) textSpan.innerText = 'Tur Otomatis: OFF';
            this.clearTourCountdown();
        }
    }

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

            // Angkat 8 chip DRAM Micron mengambang ke depan
            this.dramChipsArray.forEach((chip, i) => {
                gsap.to(chip.position, { z: 0.65, duration: 0.7, delay: i * 0.03, ease: 'back.out(1.2)' });
            });

            // Angkat deretan kapasitor & resistor SMD
            if (this.smdGroup) {
                gsap.to(this.smdGroup.position, { z: 0.45, duration: 0.7, ease: 'back.out(1.2)' });
            }

            // Angkat chip SPD Hub
            if (this.spdMesh) {
                gsap.to(this.spdMesh.position, { z: 0.75, duration: 0.7, ease: 'back.out(1.2)' });
            }

            // Pisahkan jajaran pin emas ke bawah
            if (this.pinGroup) {
                gsap.to(this.pinGroup.position, { y: -0.35, duration: 0.7, ease: 'power2.out' });
            }
        } else {
            btn.classList.remove('active');
            textSpan.innerText = 'Mode Bongkar';

            this.dramChipsArray.forEach((chip) => {
                gsap.to(chip.position, { z: 0.11 / 2 + 0.08 / 2, duration: 0.5, ease: 'power2.out' });
            });

            if (this.smdGroup) {
                gsap.to(this.smdGroup.position, { z: 0, duration: 0.5, ease: 'power2.out' });
            }

            if (this.spdMesh) {
                gsap.to(this.spdMesh.position, { z: 0.11 / 2 + 0.03, duration: 0.5, ease: 'power2.out' });
            }

            if (this.pinGroup) {
                gsap.to(this.pinGroup.position, { y: 0, duration: 0.5, ease: 'power2.out' });
            }
        }
    }

    flipRAM() {
        sfx.playWhoosh();
        const targetRotY = this.ramGroup.rotation.y + Math.PI;
        gsap.to(this.ramGroup.rotation, {
            y: targetRotY,
            duration: 0.9,
            ease: 'power2.inOut'
        });
    }

    toggleHeatsink() {
        this.flipRAM();
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

    toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        sfx.playClick();
        this.applyTheme(state.theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('btn-theme');
        if (btn) {
            btn.innerHTML = theme === 'dark'
                ? '<i class="fa-solid fa-sun"></i>'
                : '<i class="fa-solid fa-moon"></i>';
            btn.title = theme === 'dark'
                ? 'Mode Terang (Light Mode)'
                : 'Mode Gelap (Dark Mode)';
        }

        if (this.scene && this.renderer) {
            if (theme === 'dark') {
                if (this.scene.fog) this.scene.fog.color.setHex(0x06090f);
                this.renderer.setClearColor(0x06090f, 1);
            } else {
                if (this.scene.fog) this.scene.fog.color.setHex(0xf1f5f9);
                this.renderer.setClearColor(0xf1f5f9, 1);
            }
        }
    }

    resetCamera() {
        sfx.playClick();
        typewriter.stopAll();
        this.clearTourCountdown();
        const isMobile = window.innerWidth <= 768;
        const defY = isMobile ? 0.6 : 1.2;
        const defZ = isMobile ? 14.2 : 8.5;
        gsap.to(this.camera.position, { x: 0, y: defY, z: defZ, duration: 1.0 });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.0, onUpdate: () => this.controls.update() });
        const popover = document.getElementById('inline-popover');
        if (popover) popover.classList.add('hidden');
        state.selectedComponent = null;
    }

    onPointerDown(event) {
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

        if (state.autoRotate) {
            this.ramGroup.rotation.y += 0.007;
            this.ramGroup.rotation.x = Math.sin(time * 0.7) * 0.08;
            this.ramGroup.rotation.z = Math.cos(time * 0.5) * 0.04;
        }

        // Animate 4D Tesseract Wireframes (Zero Allocation In-Place Update)
        const angleXW = time * 1.5;
        const angleYW = time * 0.8;

        this.tesseractMeshes.forEach((item, i) => {
            item.tess.projectTo3D(angleXW + i, angleYW + i * 0.5, item.posArray);
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

        if (this.rgbMat) {
            this.rgbMat.emissiveIntensity = 1.3 + Math.sin(time * 3) * 0.5;
        }

        const wVal = Math.sin(time * 1.5) * 1.5;
        const pitchVal = (this.ramGroup.rotation.x * 180 / Math.PI).toFixed(2);
        const yawVal = (this.ramGroup.rotation.y * 180 / Math.PI % 360).toFixed(2);

        const wElem = document.getElementById('val-4d-w');
        const pitchElem = document.getElementById('val-4d-pitch');
        const yawElem = document.getElementById('val-4d-yaw');

        if (wElem) wElem.innerText = `${wVal >= 0 ? '+' : ''}${wVal.toFixed(3)}`;
        if (pitchElem) pitchElem.innerText = `${pitchVal >= 0 ? '+' : ''}${pitchVal}°`;
        if (yawElem) yawElem.innerText = `${yawVal}°`;

        this.updateHotspotsPosition();
        this.updatePopoverPosition();

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
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
        // Theme Toggle (Dark / Light Mode)
        const themeBtn = document.getElementById('btn-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.app3D.toggleTheme());
        }

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
            typewriter.stopAll();
            this.app3D.clearTourCountdown();
            const popover = document.getElementById('inline-popover');
            if (popover) popover.classList.add('hidden');
            state.selectedComponent = null;
        });

        // Tombol Tur Edukasi Otomatis di Toolbar
        const tourBtn = document.getElementById('btn-auto-tour');
        if (tourBtn) {
            tourBtn.addEventListener('click', () => this.app3D.toggleAutoTour());
        }

        // Kontrol Bar Pindah ke Bagian Berikutnya
        const btnTourPause = document.getElementById('btn-tour-pause');
        if (btnTourPause) {
            btnTourPause.addEventListener('click', () => {
                sfx.playClick();
                this.app3D.clearTourCountdown();
            });
        }

        const btnTourSkip = document.getElementById('btn-tour-skip');
        if (btnTourSkip) {
            btnTourSkip.addEventListener('click', () => {
                sfx.playClick();
                this.app3D.clearTourCountdown();
                this.navigateComponent(1);
            });
        }

        // Klik pada popover card untuk langsung menyelesaikan pengetikan secara instan
        const popoverCard = document.querySelector('.popover-card');
        if (popoverCard) {
            popoverCard.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                if (typewriter.isTyping()) {
                    typewriter.finishAll();
                    this.app3D.clearTourCountdown();
                    popoverCard.scrollTo({ top: popoverCard.scrollHeight, behavior: 'smooth' });
                }
            });
        }

        document.getElementById('btn-next-comp').addEventListener('click', () => {
            this.app3D.clearTourCountdown();
            this.navigateComponent(1);
        });
        document.getElementById('btn-prev-comp').addEventListener('click', () => {
            this.app3D.clearTourCountdown();
            this.navigateComponent(-1);
        });

        // Navigation Modes
        document.getElementById('btn-mode-inspect').addEventListener('click', () => this.switchMode('inspect'));
        document.getElementById('btn-mode-ddr').addEventListener('click', () => this.openModal('ddr-modal'));
        const btnDdrMobile = document.getElementById('btn-ddr-mobile');
        if (btnDdrMobile) {
            btnDdrMobile.addEventListener('click', () => this.openModal('ddr-modal'));
        }
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

        // Animasi efek ketikan (typewriter) pada modal
        if (modalId === 'ddr-modal') {
            const noteElem = document.getElementById('ddr-note-text');
            if (noteElem) {
                const noteText = "RAM DDR3, DDR4, dan DDR5 memiliki posisi takik (notch) yang berbeda secara sengaja. Hal ini untuk mencegah kesalahan fisik saat memasang jenis modul RAM yang tidak didukung oleh slot motherboard!";
                typewriter.type(noteElem, noteText, { delay: 180, speed: 22 });
            }
        } else if (modalId === 'help-modal') {
            const helpTexts = [
                "Tahan & geser klik kiri mouse untuk memutar objek RAM 360°. Scroll roda mouse untuk memperbesar/memperkecil (zoom).",
                "Klik pada titik Hotspot Glowing bercahaya atau klik bagian fisik objek 3D secara langsung untuk membuka kartu penjelasan resmi.",
                "Gunakan tombol Mode Bongkar di toolbar bawah untuk memisahkan pendingin aluminium dan melihat struktur IC di dalamnya."
            ];
            const pElems = document.querySelectorAll('.help-step-desc');
            const items = [];
            pElems.forEach((p, idx) => {
                if (helpTexts[idx]) {
                    items.push({ element: p, text: helpTexts[idx], speed: 21 });
                }
            });
            typewriter.typeSequence(items, { pauseBetween: 120 });
        }
    }

    closeModal(modalId) {
        sfx.playClick();
        document.getElementById(modalId).classList.add('hidden');
        typewriter.stopAll();
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
