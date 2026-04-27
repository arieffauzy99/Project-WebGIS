// 1. Definisi Basemap
const basemaps = {
    street: 'https://basemap.mapid.io/styles/street-2d-building/style.json?key=69a8edeffdb1d3dbc8b3022c',
    satellite: 'https://basemap.mapid.io/styles/satellite/style.json?key=69a8edeffdb1d3dbc8b3022c',
    dark: 'https://basemap.mapid.io/styles/dark/style.json?key=69a8edeffdb1d3dbc8b3022c'
};

// 2. Inisialisasi Peta
const map = new maplibregl.Map({
    container: 'map',
    style: basemaps.satellite,
    center: [106.8451, -6.2146], 
    zoom: 11,
    preserveDrawingBuffer: true // WAJIB ADA agar bisa diekspor ke gambar
});

// Menambahkan Skala Peta (Metric)
const scale = new maplibregl.ScaleControl({
    maxWidth: 150,
    unit: 'metric'
});
map.addControl(scale, 'bottom-left');

// Menambahkan Kontrol Navigasi (Zoom & Rotasi)
map.addControl(new maplibregl.NavigationControl(), 'top-left');

map.doubleClickZoom.disable();

// Variabel Global
let isRouteMode = false;
let routePoints = [];
let routeMarkers = [];
let cachedData = { banjir: null, apartemen: null, halte: null, batas: null, kantor: null, stasiun: null }; 

// API URLs
const url_apartemen = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69e0a9420aa92c1c9b861e06&project_id=6985f22a2d33abfe649c7ab9';
const url_banjir = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69e0a2c89bfe4509bea2c013&project_id=6985f22a2d33abfe649c7ab9';
const url_halte = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69e0a91e9bfe4509bea4b863&project_id=6985f22a2d33abfe649c7ab9';
const url_batas = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69cb97abe4fe4912fb7513f7&project_id=6985f22a2d33abfe649c7ab9';
const url_Kantor = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69e1b1a30aa92c1c9bb45b6c&project_id=6985f22a2d33abfe649c7ab9';
const url_Stasiun = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=30b210cbf8bc423f8dcf75840f95f599&layer_id=69e1e82d9bfe4509bedc6a07&project_id=6985f22a2d33abfe649c7ab9';

// Tambahkan ini di dalam script peta kamu
map.on('mousemove', (e) => {
    const weatherPanel = document.getElementById('weather-status');
    if (weatherPanel) {
        const lng = e.lngLat.lng.toFixed(4);
        const lat = e.lngLat.lat.toFixed(4);
        const zoom = map.getZoom().toFixed(2);
        
        weatherPanel.innerHTML = `
            <div class="bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Posisis Kursor</div>
                <div class="flex gap-4">
                    <div><span class="text-[9px] font-bold text-blue-600">LNG</span> <span class="text-sm font-mono font-bold">${lng}</span></div>
                    <div><span class="text-[9px] font-bold text-blue-600">LAT</span> <span class="text-sm font-mono font-bold">${lat}</span></div>
                    <div><span class="text-[9px] font-bold text-orange-600">ZOOM</span> <span class="text-sm font-mono font-bold">${zoom}</span></div>
                </div>
            </div>
        `;
    }
});

function startClock() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('digital-date');

    function update() {
        const now = new Date();
        
        // Jam menit detik
        const timeString = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });

        // Hari dan tanggal
        const dateString = now.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        if (clockElement) clockElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString.toUpperCase();
    }

    setInterval(update, 1000);
    update();
}

// Jalankan fungsi ini
startClock();

// --- FUNGSI ELEVASI (NEW) ---
async function getElevationProfile(coordinates) {
    const chartContainer = document.getElementById('elevation-chart');
    // Ambil sampling tiap 5 koordinat agar tidak overload
    const sampling = coordinates.filter((_, index) => index % 5 === 0);
    const body = { locations: sampling.map(c => ({ latitude: c[1], longitude: c[0] })) };

    try {
        const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        
        if (result.results) {
            chartContainer.classList.remove('hidden');
            const elevations = result.results.map(d => d.elevation);
            const max = Math.max(...elevations);
            const min = Math.min(...elevations);
            const range = (max - min) || 1;

            const points = elevations.map((el, i) => {
                const x = (i / (elevations.length - 1)) * 200;
                const y = 50 - ((el - min) / range) * 40; 
                return `${x},${y}`;
            }).join(' ');

            chartContainer.innerHTML = `
                <div class="text-[9px] font-black mb-2 text-blue-800 uppercase tracking-tighter">Profil Elevasi Jalur (m)</div>
                <svg viewBox="0 0 200 50" class="w-full h-12 overflow-visible">
                    <polyline fill="none" stroke="#3b82f6" stroke-width="2" points="${points}" />
                    <text x="0" y="48" font-size="8" font-weight="bold" fill="#666">${min.toFixed(0)}m</text>
                    <text x="180" y="10" font-size="8" font-weight="bold" fill="#666">${max.toFixed(0)}m</text>
                </svg>
            `;
        }
    } catch (err) { console.error("Elevation Error:", err); }
}

async function exportMapToPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.body;
    
    // Sembunyikan elemen yang tidak perlu dicetak (tombol itu sendiri dan navigasi)
    const uiElements = document.querySelectorAll('button, .maplibregl-ctrl-top-left');
    uiElements.forEach(el => el.style.opacity = '0');

    try {
        const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 2, // Kualitas tinggi
            backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Masukkan gambar ke PDF memenuhi halaman
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        pdf.save(`Layout_Engineering_${new Date().getTime()}.pdf`);
    } catch (err) {
        console.error("PDF Export Gagal:", err);
    } finally {
        // Munculkan kembali elemen UI
        uiElements.forEach(el => el.style.opacity = '1');
    }
}

// --- FUNGSI PROXIMITY ANALYTICS (NEW) ---
function checkFloodProximity(lngLat) {
    const alertBox = document.getElementById('flood-proximity-alert');
    if (!cachedData.banjir) return;

    const userPoint = turf.point([lngLat.lng, lngLat.lat]);
    let nearestDist = Infinity;

    cachedData.banjir.features.forEach(f => {
        try {
            const distance = turf.pointToLineDistance(userPoint, turf.polygonToLine(f), {units: 'kilometers'});
            if (distance < nearestDist) nearestDist = distance;
        } catch(e) {}
    });

    if (nearestDist < 0.5) { // < 500 meter
        alertBox.classList.remove('hidden');
        alertBox.innerHTML = `⚠️ PERINGATAN: Titik ini berada dekat area risiko banjir (~${(nearestDist * 1000).toFixed(0)} meter).`;
    } else {
        alertBox.classList.add('hidden');
    }
}

// Fungsi Utama Load Layer
async function setupLayers() {
    try {
        if (!cachedData.banjir) {
            const [resBanjir, resApart, resHalte, resBatas, resKantor, resStasiun] = await Promise.all([
                fetch(url_banjir).then(r => r.json()),
                fetch(url_apartemen).then(r => r.json()),
                fetch(url_halte).then(r => r.json()),
                fetch(url_batas).then(r => r.json()),
                fetch(url_Kantor).then(r => r.json()),
                fetch(url_Stasiun).then(r => r.json())
            ]);
            cachedData.banjir = resBanjir;
            cachedData.apartemen = resApart;
            cachedData.halte = resHalte;
            cachedData.batas = resBatas;
            cachedData.kantor = resKantor;
            cachedData.stasiun = resStasiun;
        }

        if (!map.getSource('banjir-source')) {
            map.addSource('batas-source', { type: 'geojson', data: cachedData.batas });
            map.addSource('banjir-source', { type: 'geojson', data: cachedData.banjir });
            map.addSource('apartemen', { type: 'geojson', data: cachedData.apartemen });
            map.addSource('halte-source', { type: 'geojson', data: cachedData.halte });
            map.addSource('kantor-source', { type: 'geojson', data: cachedData.kantor });
            map.addSource('stasiun-source', { type: 'geojson', data: cachedData.stasiun });
            map.addSource('manual-point-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('route-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('buffer-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

            map.addLayer({ id: 'batas-layer', type: 'line', source: 'batas-source', paint: { 'line-color': '#140b01', 'line-width': 2, 'line-dasharray': [2, 1] } });
            map.addLayer({ id: 'banjir-layer', type: 'fill', source: 'banjir-source', paint: { 'fill-color': ['match', ['get', 'KELAS_RISIKO'], 'TINGGI', '#6789d0', 'SEDANG', '#8cb3e7', 'RENDAH', '#f8fcf6', '#3b82f6'], 'fill-opacity': 0.6 } });
            map.addLayer({ id: 'buffer-layer', type: 'fill', source: 'buffer-source', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.3 } });
            map.addLayer({ id: 'route-layer', type: 'line', source: 'route-source', paint: { 'line-width': 5, 'line-opacity': 0.8, 'line-color': '#10b981' } });
            map.addLayer({ id: 'apartemen-layer', type: 'circle', source: 'apartemen', paint: { 'circle-color': '#4927f3', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
            map.addLayer({ id: 'halte-layer', type: 'circle', source: 'halte-source', paint: { 'circle-color': '#ffff00', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#000' } });
            map.addLayer({ id: 'kantor-layer', type: 'circle', source: 'kantor-source', paint: { 'circle-color': '#e11d48', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
            map.addLayer({ id: 'stasiun-layer', type: 'circle', source: 'stasiun-source', paint: { 'circle-color': '#1de17c', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
            map.addLayer({ id: 'manual-point-layer', type: 'circle', source: 'manual-point-source', paint: { 'circle-color': '#f97316', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        }
        updateWeather(); // Jalankan Cuaca setelah layer siap
    } catch (err) { console.error("Gagal memuat data:", err); }
}

// Analisis POI
function updatePOIAnalysis(bufferPolygon) {
    const panel = document.getElementById('poi-analysis-panel');
    if (panel) panel.classList.remove('hidden');

    let countHalte = 0;
    let countStasiun = 0;

    if (cachedData.halte?.features) {
        cachedData.halte.features.forEach(f => {
            if (turf.booleanPointInPolygon(f.geometry.coordinates, bufferPolygon)) countHalte++;
        });
    }
    if (cachedData.stasiun?.features) {
        cachedData.stasiun.features.forEach(f => {
            if (turf.booleanPointInPolygon(f.geometry.coordinates, bufferPolygon)) countStasiun++;
        });
    }

    document.getElementById('stat-halte').innerText = `${countHalte} Titik`;
    document.getElementById('stat-stasiun').innerText = `${countStasiun} Titik`;

    const total = countHalte + countStasiun;
    const scoreEl = document.getElementById('stat-score');
    
    if (total >= 5) {
        scoreEl.innerText = "Sangat Baik";
        scoreEl.className = "text-[10px] font-black px-2 py-0.5 rounded bg-green-200 text-green-800 uppercase";
    } else if (total > 0) {
        scoreEl.innerText = "Moderat";
        scoreEl.className = "text-[10px] font-black px-2 py-0.5 rounded bg-blue-200 text-blue-800 uppercase";
    } else {
        scoreEl.innerText = "Rendah";
        scoreEl.className = "text-[10px] font-black px-2 py-0.5 rounded bg-gray-200 text-gray-800 uppercase";
    }
}

window.openStreetView = (lng, lat, title) => {
    const modal = document.getElementById('streetview-modal');
    const container = document.getElementById('pano');
    document.getElementById('streetview-title').innerText = title;
    
    // Tampilkan Modal
    modal.classList.remove('hidden');

    // Karena API Key Google Maps berbayar/harus daftar, 
    // Kita arahkan user untuk membuka koordinat langsung di Google Street View resmi
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
            <div class="bg-blue-100 p-4 rounded-full mb-4">
                <span class="text-3xl">📍</span>
            </div>
            <h4 class="text-sm font-black text-slate-800 mb-2">VERIFIKASI LAPANGAN TERSEDIA</h4>
            <p class="text-[11px] text-slate-500 mb-6 max-w-xs">
                Untuk akurasi maksimal dan tampilan 360°, silakan klik tombol di bawah untuk membuka Google Street View pada koordinat ini.
            </p>
            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" 
               target="_blank" 
               class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all uppercase tracking-widest">
                BUKA STREET VIEW (TAB BARU)
            </a>
        </div>
    `;
};

window.closeStreetView = () => {
    document.getElementById('streetview-modal').classList.add('hidden');
    document.getElementById('pano').innerHTML = ""; 
};

// Map Click Interaction
map.on('click', (e) => {
    // Jalankan Proximity Check setiap klik
    checkFloodProximity(e.lngLat);

    if (isRouteMode) {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        routePoints.push(coords);
        const marker = new maplibregl.Marker({ color: routePoints.length === 1 ? '#10b981' : '#ef4444' })
            .setLngLat(coords)
            .addTo(map);
        routeMarkers.push(marker);

        if (routePoints.length === 1) {
            document.getElementById('route-status').innerText = "Pilih Titik TUJUAN...";
        } else {
            getRoute(routePoints[0], routePoints[1]);
            isRouteMode = false;
            map.getCanvas().style.cursor = '';
        }
        return;
    }

    const features = map.queryRenderedFeatures(e.point, {
        layers: ['apartemen-layer', 'kantor-layer', 'halte-layer', 'stasiun-layer', 'manual-point-layer']
    });

    if (features.length > 0) {
        const feature = features[0];
        const [lng, lat] = feature.geometry.coordinates;
        const radius = parseFloat(document.getElementById('input-radius').value) || 1;
        const buffer = turf.buffer(turf.point([lng, lat]), radius, { units: 'kilometers' });
        
        map.getSource('buffer-source').setData(buffer);
        updatePOIAnalysis(buffer);

        const namaLokasi = feature.properties.NAMA || feature.properties.nama_halte || feature.properties.nama_kantor || feature.properties.nama || "Titik Lokasi";

        new maplibregl.Popup()
            .setLngLat([lng, lat])
            .setHTML(`
                <div class="p-2">
                    <div class="font-bold border-b mb-2 pb-1 text-xs uppercase">${namaLokasi}</div>
                    <div class="text-[10px] mb-3">Radius: ${radius} KM</div>
                    <button onclick="openStreetView(${lng}, ${lat}, '${namaLokasi}')" class="w-full bg-blue-600 text-white text-[10px] py-1.5 px-2 rounded hover:bg-blue-700 transition font-bold uppercase">STREET VIEW</button>
                </div>
            `)
            .addTo(map);
    }
});

// Double Click Manual
map.on('dblclick', (e) => {
    const coords = [e.lngLat.lng, e.lngLat.lat];
    const newPoint = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { nama: 'Titik Manual' }
        }]
    };

    map.getSource('manual-point-source').setData(newPoint);
    const radius = parseFloat(document.getElementById('input-radius').value) || 1;
    const buffer = turf.buffer(turf.point(coords), radius, { units: 'kilometers' });
    
    map.getSource('buffer-source').setData(buffer);
    updatePOIAnalysis(buffer);
    checkFloodProximity(e.lngLat);
});

// Route OSRM
async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const routeGeojson = data.routes[0].geometry;
        
        let isFlooded = false;
        if (cachedData.banjir) {
            cachedData.banjir.features.forEach(f => {
                if (turf.booleanIntersects(routeGeojson, f)) isFlooded = true;
            });
        }

        map.getSource('route-source').setData(routeGeojson);
        map.setPaintProperty('route-layer', 'line-color', isFlooded ? '#ef4444' : '#10b981');

        const statusEl = document.getElementById('route-status');
        statusEl.classList.remove('route-danger', 'route-safe');
        const dist = (data.routes[0].distance/1000).toFixed(2);
        
        if (isFlooded) {
            statusEl.classList.add('route-danger');
            statusEl.innerHTML = `⚠️ <b>JALUR RISIKO BANJIR!</b><br>Jarak: ${dist} KM`;
        } else {
            statusEl.classList.add('route-safe');
            statusEl.innerHTML = `✅ <b>JALUR AMAN</b><br>Jarak: ${dist} KM`;
        }

        // Panggil Profil Elevasi untuk rute ini
        getElevationProfile(routeGeojson.coordinates);

    } catch (e) { 
        console.error(e);
        document.getElementById('route-status').innerText = "Gagal memproses rute.";
    }
}

// Window Controls
map.on('styledata', setupLayers);
window.changeStyle = (key) => { map.setStyle(basemaps[key]); };
window.toggleLayer = (id) => {
    const visibility = map.getLayoutProperty(id, 'visibility');
    map.setLayoutProperty(id, 'visibility', (visibility === 'none' || visibility === undefined) ? 'visible' : 'none');
};
window.enableRouteMode = () => {
    isRouteMode = true;
    routePoints = [];
    routeMarkers.forEach(m => m.remove());
    routeMarkers = [];
    document.getElementById('elevation-chart').classList.add('hidden');
    if (map.getSource('route-source')) map.getSource('route-source').setData({ type: 'FeatureCollection', features: [] });
    document.getElementById('route-status').innerText = "Pilih Titik AWAL...";
    map.getCanvas().style.cursor = 'crosshair';
};

