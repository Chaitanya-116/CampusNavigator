// Sample data for search suggestions
const campusLocations = [
    'Main Library', 'Student Center', 'Engineering Building', 'Science Hall',
    'Administration Building', 'Cafeteria', 'Gymnasium', 'Art Building',
    'Business School', 'Computer Lab', 'Auditorium', 'Medical Center',
    'Residence Hall A', 'Residence Hall B', 'Parking Garage',
    'Campus Store', 'Career Services', 'Financial Aid Office'
];

let searchInput = document.getElementById('searchInput');
let suggestions = document.getElementById('suggestions');

// Leaflet map globals
let map;
// MapLibre (3D-like) instance
let map3d = null;
let allMarkers = [];
// Defer L.layerGroup() creation until Leaflet is available (in initMap)
const layerGroups = {
    academic: null,
    dining: null,
    residence: null,
    recreation: null
};

// Sample marker data by category (replace with real campus coordinates)
const MAP_CENTER = [17.089479055559895, 82.06704447947355]; // Default center (example campus)
const markerData = [
    { name: 'Main Library', coords: [17.09167, 82.06889], category: 'academic' },
    { name: 'Science Hall', coords: [17.0928, 82.0661], category: 'academic' },
    { name: 'Cafeteria', coords: [17.088056, 82.072222], category: 'dining' },
    { name: 'Coffee Shop', coords: [17.088056, 82.072222], category: 'dining' },
    { name: 'Residence Hall A', coords: [17.088055, 82.067777], category: 'residence' },
    { name: 'Residence Hall B', coords: [17.0886,82.0706], category: 'residence' },
    { name: 'Gymnasium', coords: [17.088889,82.068056 ], category: 'recreation' },
    { name: 'Sports Field', coords: [17.0877, 82.0711], category: 'recreation' }
];

// ---------- 3D Map (MapLibre) helpers ----------
function is3DActive() {
    const el = document.getElementById('map-3d');
    return !!(el && !el.classList.contains('hidden'));
}

function show3DMap() {
    const map2dEl = document.getElementById('map');
    const map3dEl = document.getElementById('map-3d');
    if (!map3dEl || !map2dEl) return;

    // Capture current 2D view to sync
    const view = getLeafletView();

    map2dEl.classList.add('hidden');
    map3dEl.classList.remove('hidden');

    if (!map3d && typeof maplibregl !== 'undefined') {
        initMap3D();
    }
    if (map3d && view) {
        // MapLibre uses [lng, lat]
        map3d.jumpTo({ center: [view.lng, view.lat], zoom: Math.max(0, view.zoom - 1), pitch: 60, bearing: -17 });
        map3d.resize();
    }
}

function show2DMap() {
    const map2dEl = document.getElementById('map');
    const map3dEl = document.getElementById('map-3d');
    if (!map3dEl || !map2dEl) return;

    // Capture current 3D view to sync
    const view = getMaplibreView();

    map3dEl.classList.add('hidden');
    map2dEl.classList.remove('hidden');

    if (map && view) {
        map.setView([view.lat, view.lng], Math.round(view.zoom + 1), { animate: false });
        setTimeout(() => map.invalidateSize(), 50);
    }
}

function getLeafletView() {
    if (!map) return null;
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
}

function getMaplibreView() {
    if (!map3d) return null;
    const center = map3d.getCenter();
    return { lat: center.lat, lng: center.lng, zoom: map3d.getZoom() };
}

function initMap3D() {
    const container = document.getElementById('map-3d');
    if (!container || typeof maplibregl === 'undefined') return;

    // Minimal raster style using OpenStreetMap tiles (no API key)
    const style = {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        },
        layers: [
            {
                id: 'osm-raster',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19
            }
        ]
    };

    map3d = new maplibregl.Map({
        container: container,
        style: style,
        center: [MAP_CENTER[1], MAP_CENTER[0]], // [lng, lat]
        zoom: 14,
        maxZoom: 19,
        pitch: 60,
        bearing: -17,
        attributionControl: true,
        hash: false
    });

    map3d.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Re-query now that DOM is available
    searchInput = document.getElementById('searchInput');
    suggestions = document.getElementById('suggestions');
    // Search input events
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    document.addEventListener('click', handleOutsideClick);

    // Initialize Leaflet map if container exists (with retry in case CDN loads slowly)
    const mapEl = document.getElementById('map');
    if (mapEl) {
        tryInitMapWithRetry(mapEl, 0);
    }

    // Zoom buttons (work for active map: 2D or 3D)
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (is3DActive() && map3d) {
                map3d.zoomIn();
            } else if (map) {
                map.zoomIn();
            }
        });
        zoomOutBtn.addEventListener('click', () => {
            if (is3DActive() && map3d) {
                map3d.zoomOut();
            } else if (map) {
                map.zoomOut();
            }
        });
    }

    // 3D toggle button
    const toggle3DBtn = document.getElementById('toggle-3d');
    if (toggle3DBtn) {
        toggle3DBtn.addEventListener('click', () => {
            if (is3DActive()) {
                // Switch to 2D
                show2DMap();
                toggle3DBtn.textContent = '3D';
            } else {
                // Switch to 3D
                show3DMap();
                toggle3DBtn.textContent = '2D';
            }
        });
    }

    // Invalidate map size after sidebar toggle on small screens
    const mapSidebarToggle = document.getElementById('map-sidebar-toggle');
    if (mapSidebarToggle) {
        mapSidebarToggle.addEventListener('click', () => {
            setTimeout(() => { if (map) map.invalidateSize(); }, 300);
        });
    }
});

// Hide suggestions when clicking outside the input and suggestions box
function handleOutsideClick(event) {
    if (!suggestions) return;
    const target = event.target;
    const withinInput = searchInput && searchInput.contains(target);
    const withinSuggestions = suggestions && suggestions.contains(target);
    if (!withinInput && !withinSuggestions) {
        suggestions.style.display = 'none';
    }
}

function handleSearchInput() {
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (query.length < 1) {
        suggestions.style.display = 'none';
        return;
    }

    // Category aliases for suggestion matching
    const categoryAliases = {
        academic: 'academic', academics: 'academic', buildings: 'academic', building: 'academic', school: 'academic',
        dining: 'dining', food: 'dining', cafeteria: 'dining', cafe: 'dining', services: 'dining', service: 'dining',
        residence: 'residence', hostel: 'residence', dorm: 'residence', housing: 'residence',
        recreation: 'recreation', sports: 'recreation', gym: 'recreation', play: 'recreation', events: 'recreation', event: 'recreation'
    };

    // 1) Category matches
    const catMatches = Array.from(new Set(
        Object.keys(categoryAliases)
            .filter(k => k.includes(query))
            .map(k => categoryAliases[k])
    ));

    // 2) Location (marker) matches
    const locMatches = campusLocations.filter(location => 
        location.toLowerCase().includes(query)
    );

    // Build suggestions HTML
    const items = [];
    if (catMatches.length) {
        items.push(`<div class="px-3 py-1 text-xs text-gray-400">Categories</div>`);
        catMatches.forEach(cat => {
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
            items.push(`<div class="suggestion-item cursor-pointer px-3 py-2 hover:bg-primary-50" onclick="selectSuggestion('category','${cat}')">${label}</div>`);
        });
    }
    if (locMatches.length) {
        items.push(`<div class="px-3 py-1 text-xs text-gray-400">Locations</div>`);
        items.push(
            ...locMatches.map(location => `<div class="suggestion-item cursor-pointer px-3 py-2 hover:bg-primary-50" onclick="selectSuggestion('location','${location.replace(/"/g, '&quot;')}')">${location}</div>`)
        );
    }

    if (items.length) {
        suggestions.innerHTML = items.join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

function selectLocation(location) {
    searchInput.value = location;
    suggestions.style.display = 'none';
    performSearch();
}

// Handle suggestion click for both categories and locations
function selectSuggestion(kind, value) {
    suggestions.style.display = 'none';
    if (kind === 'category') {
        const cat = String(value || '').toLowerCase();
        // Highlight, then open filtered map (previous method)
        highlightCategoryCard(cat);
        showCategory(cat);
    } else {
        // location fallback
        selectLocation(value);
    }
}

function performSearch() {
    const query = (searchInput?.value || '').trim();
    if (!query) return;
    // Ensure 3D is off for category/search navigation for now (2D-only)
    if (is3DActive()) {
        show2DMap();
        const toggle3DBtn = document.getElementById('toggle-3d');
        if (toggle3DBtn) toggle3DBtn.textContent = '3D';
    }

    // 1) Category-aware search: academic, dining, residence, recreation (with aliases)
    const key = query.toLowerCase();
    const categoryAliases = {
        academic: 'academic',
        academics: 'academic',
        building: 'academic',
        buildings: 'academic',
        school: 'academic',
        dining: 'dining',
        food: 'dining',
        cafeteria: 'dining',
        cafe: 'dining',
        services: 'dining',
        service: 'dining',
        residence: 'residence',
        hostel: 'residence',
        dorm: 'residence',
        housing: 'residence',
        recreation: 'recreation',
        sports: 'recreation',
        gym: 'recreation',
        play: 'recreation',
        events: 'recreation',
        event: 'recreation'
    };
    const normalizedCategory = categoryAliases[key];
    if (normalizedCategory) {
        // Scroll to and highlight the card, then open the filtered map (previous behavior)
        highlightCategoryCard(normalizedCategory);
        showCategory(normalizedCategory);
        return;
    }

    // 2) Fallback: Try to find a marker by name and focus it
    const match = allMarkers.find(m => m.options && m.options.title && m.options.title.toLowerCase().includes(key));
    if (match && map) {
        scrollToMap();
        map.setView(match.getLatLng(), 17, { animate: true });
        match.openPopup();
        return;
    }
    // If map not ready yet, look into markerData and then initialize and focus
    const md = markerData.find(({ name }) => name.toLowerCase().includes(key));
    if (md && typeof L !== 'undefined' && document.getElementById('map')) {
        scrollToMap();
        if (!map) initMap();
        // Wait a tick for markers to populate, then fly to the location and open popup
        setTimeout(() => {
            const m2 = allMarkers.find(m => (m.options?.title || '').toLowerCase() === md.name.toLowerCase());
            if (m2) {
                map.setView(m2.getLatLng(), 17, { animate: true });
                m2.openPopup();
            } else if (md.coords) {
                map.setView(md.coords, 17, { animate: true });
            }
        }, 50);
        return;
    }
}

function showCategory(category) {
    // Normalize a few aliases from header links
    const key = String(category || '').toLowerCase();
    const alias = {
        buildings: 'academic',
        events: 'recreation',
        services: 'dining'
    };
    const normalized = alias[key] || key;
    // Ensure 3D is off when filtering categories (feature is 2D-only)
    if (is3DActive()) {
        show2DMap();
        const toggle3DBtn = document.getElementById('toggle-3d');
        if (toggle3DBtn) toggle3DBtn.textContent = '3D';
    }
    // Lazy init if needed
    if (!map && typeof L !== 'undefined' && document.getElementById('map')) {
        initMap();
    }
    filterMap(normalized);
}

function openMainMap() {
    scrollToMap();
    if (!map && typeof L !== 'undefined' && document.getElementById('map')) {
        initMap();
    }
    if (map) {
        fitAllMarkers();
    }
}

// Optional: Add keyboard navigation for search
if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        } else if (e.key === 'Escape') {
            suggestions.style.display = 'none';
        }
    });
}

// ---------- Map helpers ----------
function initMap() {
    map = L.map('map', {
        center: MAP_CENTER,
        zoom: 15,
        scrollWheelZoom: true
    });

    // Scientific/Topographic basemaps
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    });
    const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
    });
    const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Labels & boundaries &copy; Esri'
    });
    const satelliteWithLabels = L.layerGroup([esriImagery, esriLabels]);
    // Attach a maxZoom hint to the composite layer for later logic
    satelliteWithLabels._maxZoom = 19;

    // Use OpenStreetMap (streets) by default for best building/road visibility
    osm.addTo(map);
    // Respect OSM max zoom initially to avoid 'map data not available' at extreme zoom
    if (typeof osm.options?.maxZoom === 'number') {
        map.setMaxZoom(osm.options.maxZoom);
    }

    // Create category layer groups now that Leaflet is available
    layerGroups.academic = L.layerGroup();
    layerGroups.dining = L.layerGroup();
    layerGroups.residence = L.layerGroup();
    layerGroups.recreation = L.layerGroup();

    // Create markers by category
    markerData.forEach(({ name, coords, category }) => {
        const marker = L.marker(coords, { title: name });
        marker.bindPopup(`<strong>${name}</strong><br/><span class="text-xs text-gray-600">${category}</span>`);
        layerGroups[category]?.addLayer(marker);
        allMarkers.push(marker);
    });

    // Add all categories by default
    Object.values(layerGroups).forEach(group => group.addTo(map));

    // Basemap and overlay controls
    const baseMaps = {
        'OpenStreetMap (Standard)': osm,
        'Satellite + Labels (Esri)': satelliteWithLabels,
        'Esri World Imagery (Satellite)': esriImagery,
        'OpenTopoMap (Topo)': openTopo
    };
    const overlayMaps = {
        'Academic': layerGroups.academic,
        'Dining': layerGroups.dining,
        'Residence': layerGroups.residence,
        'Recreation': layerGroups.recreation
    };
    L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);

    // Auto-add labels when user selects pure Esri Imagery
    map.on('baselayerchange', (e) => {
        try {
            if (e.name && typeof e.name === 'string') {
                if (e.name.includes('Esri World Imagery')) {
                    // Add labels on top of imagery
                    if (!map.hasLayer(esriLabels)) esriLabels.addTo(map);
                } else if (e.name.includes('OpenStreetMap') || e.name.includes('OpenTopoMap')) {
                    // Remove labels for non-imagery basemaps to keep it clean
                    if (map.hasLayer(esriLabels)) map.removeLayer(esriLabels);
                }
            }
            // Respect max zoom for the selected base layer to avoid missing tiles
            let allowedMax = 19;
            if (e.layer) {
                if (typeof e.layer.options?.maxZoom === 'number') {
                    allowedMax = e.layer.options.maxZoom;
                } else if (typeof e.layer._maxZoom === 'number') {
                    allowedMax = e.layer._maxZoom;
                }
            }
            if (typeof allowedMax === 'number') {
                map.setMaxZoom(allowedMax);
                if (map.getZoom() > allowedMax) {
                    map.setZoom(allowedMax);
                }
            }
        } catch (_) {}
    });

    // Scale bar (metric)
    L.control.scale({ metric: true, imperial: false }).addTo(map);

    // Live coordinates readout
    const coordsControl = L.control({ position: 'bottomleft' });
    coordsControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-control-latlng bg-white/90 rounded px-2 py-1 text-xs shadow');
        div.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        div.innerHTML = 'Lat, Lng: —';
        map.on('mousemove', (e) => {
            const lat = e.latlng.lat.toFixed(5);
            const lng = e.latlng.lng.toFixed(5);
            div.innerHTML = `Lat, Lng: ${lat}, ${lng}`;
        });
        return div;
    };
    coordsControl.addTo(map);

    // Fit view to markers
    fitAllMarkers();
}

// Retry Leaflet init in case the CDN script loads slightly after DOMContentLoaded
function tryInitMapWithRetry(mapEl, attempt) {
    const MAX_ATTEMPTS = 10; // ~3 seconds total if 300ms interval
    const INTERVAL_MS = 300;
    if (typeof L !== 'undefined') {
        initMap();
        return;
    }
    if (attempt >= MAX_ATTEMPTS) {
        mapEl.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-600"><div class="bg-white/90 rounded-lg shadow px-4 py-2 text-sm">Map library failed to load. Check your internet connection and refresh.</div></div>';
        return;
    }
    setTimeout(() => tryInitMapWithRetry(mapEl, attempt + 1), INTERVAL_MS);
}

function fitAllMarkers() {
    if (!map || allMarkers.length === 0) return;
    const group = L.featureGroup(allMarkers);
    map.fitBounds(group.getBounds().pad(0.15));
}

function filterMap(category) {
    if (!map) return;
    scrollToMap();

    // If unknown category, show all
    if (!layerGroups[category]) {
        Object.values(layerGroups).forEach(group => {
            if (!map.hasLayer(group)) group.addTo(map);
        });
        fitAllMarkers();
        return;
    }

    // Toggle to only the requested category
    Object.entries(layerGroups).forEach(([key, group]) => {
        if (key === category) {
            if (!map.hasLayer(group)) group.addTo(map);
        } else {
            if (map.hasLayer(group)) map.removeLayer(group);
        }
    });

    // Fit to visible category
    const visible = [];
    layerGroups[category].eachLayer(l => visible.push(l));
    if (visible.length) {
        const fg = L.featureGroup(visible);
        map.fitBounds(fg.getBounds().pad(0.2));
    }
}

function scrollToMap() {
    const section = document.getElementById('map-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Highlight and scroll to a Quick Link card by category, then auto-clear highlight
function highlightCategoryCard(category) {
    const id = `card-${category}`;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Add a temporary Tailwind highlight (ring and shadow)
    el.classList.add('ring-4', 'ring-primary-500', 'shadow-2xl');
    setTimeout(() => {
        el.classList.remove('ring-4', 'ring-primary-500', 'shadow-2xl');
    }, 1500);
}