export const DEFAULT_MAP_CENTER: [number, number] = [106.4975, 10.9715]
export const DEFAULT_MAP_ZOOM = 14.8
export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '4A7ex43XNIzlzIcSnO8d'

/**
 * Bản đồ Vệ Tinh Google Hybrid Sạch (Google Satellite + Tự Động Nạp Hoàng Sa & Trường Sa từ Google + MapTiler Vector Sạch trong đất liền - 0% Rác Quán Xá)
 */
import type { StyleSpecification } from 'maplibre-gl'

export const GOOGLE_HYBRID_STYLE: StyleSpecification = Object.freeze( {
  version: 8,
  id: 'hybrid',
  name: 'Satellite Hybrid',
  glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=4A7ex43XNIzlzIcSnO8d',
  sprite: 'https://api.maptiler.com/maps/hybrid/sprite',
  bearing: 0,
  pitch: 0,
  center: [0, 0],
  zoom: 1,
  sources: {
    "maptiler_planet": {
      "url": "https://api.maptiler.com/tiles/v3/tiles.json?key=4A7ex43XNIzlzIcSnO8d",
      "type": "vector"
    },
    "satellite": {
      "type": "raster",
      "tiles": [
        "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
      ],
      "tileSize": 256,
      "maxzoom": 22,
      "attribution": "&copy; Google Maps"
    },
    "google-vn-hybrid": {
      "type": "raster",
      "tiles": [
        "https://mt0.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}"
      ],
      "tileSize": 256,
      "maxzoom": 22,
      "attribution": "&copy; Google Maps"
    }
  },
  layers: [
    { "id": "Satellite", "type": "raster", "source": "satellite", "minzoom": 0, "maxzoom": 22, "layout": { "visibility": "visible" }, "paint": { "raster-opacity": 1.0 } },
    { "id": "google-vn-regional-hybrid", "type": "raster", "source": "google-vn-hybrid", "minzoom": 0, "maxzoom": 9.5, "layout": { "visibility": "visible" }, "paint": { "raster-opacity": 1.0 } },
    { "id": "Country border", "type": "line", "source": "maptiler_planet", "source-layer": "boundary", "layout": { "line-cap": "round", "line-join": "round", "visibility": "visible" }, "paint": { "line-color": "hsl(0, 0%, 94%)", "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 3, 0.5, 9, 1.5, 22, 32] }, "filter": ["all", ["==", "admin_level", 2], ["==", "maritime", 0], ["==", "disputed", 0]], "minzoom": 9.5 },
    { "id": "Road labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "transportation_name", "layout": { "symbol-placement": "line", "symbol-spacing": ["step", ["zoom"], 250, 21, 900], "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Regular"], "text-letter-spacing": 0.1, "text-rotation-alignment": "map", "text-size": ["interpolate", ["linear", 0.75, 1, 0.75, 1], ["zoom"], 10, 8, 16, 10, 24, 14], "text-transform": "none", "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 100%)", "text-halo-color": "hsl(0, 0%, 17%)", "text-halo-width": 1 }, "filter": ["all", ["==", "$type", "LineString"], ["!=", "class", "ferry"]], "minzoom": 9.5 },
    { "id": "Place labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "place", "minzoom": 9.5, "maxzoom": 16, "layout": { "symbol-sort-key": ["to-number", ["get", "rank"]], "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Regular"], "text-max-width": 10, "text-size": ["interpolate", ["linear", 0.5, 1, 0.5, 1], ["zoom"], 3, 9, 6, 10, 8, 12, 10, 14], "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 100%)", "text-halo-blur": 0.5, "text-halo-color": "hsl(0, 0%, 0%)", "text-halo-width": 1 }, "filter": ["all", ["==", "$type", "Point"], ["!in", "class", "city", "country", "province", "state", "place"]] },
    { "id": "City labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "place", "minzoom": 9.5, "maxzoom": 16, "layout": { "symbol-sort-key": ["to-number", ["get", "rank"]], "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Regular"], "text-max-width": 10, "text-size": ["interpolate", ["linear", 0.5, 1, 0.5, 1], ["zoom"], 4, 11, 6, 13, 8, 16, 12, 18, 16, 20], "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 100%)", "text-halo-blur": 0.5, "text-halo-color": "hsl(0, 0%, 0%)", "text-halo-width": 1 }, "filter": ["all", ["==", "$type", "Point"], ["==", "class", "city"], ["!=", "capital", 2]] },
    { "id": "State labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "place", "minzoom": 9.5, "maxzoom": 8, "layout": { "symbol-sort-key": ["to-number", ["get", "rank"]], "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Italic"], "text-letter-spacing": 0.05, "text-max-width": 10, "text-size": ["interpolate", ["linear", 0.75, 1], ["zoom"], 3, ["step", ["get", "rank"], 12, 1, 11, 2, 11], 6, ["step", ["get", "rank"], 13, 1, 12, 2, 12], 9, ["step", ["get", "rank"], 22, 1, 14, 2, 14]], "text-transform": "none", "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 90%)", "text-halo-blur": 1, "text-halo-color": "hsl(0, 0%, 0%)", "text-halo-width": 1, "text-opacity": ["step", ["zoom"], 0, 3, ["case", ["<=", ["get", "rank"], 3], 1, 0], 7, ["case", ["<=", ["get", "rank"], 3], 0, 1]] }, "filter": ["all", ["==", "$type", "Point"], ["in", "class", "state", "province"], ["<=", "rank", 6]] },
    { "id": "Capital city labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "place", "minzoom": 9.5, "maxzoom": 16, "layout": { "symbol-sort-key": ["to-number", ["get", "rank"]], "text-anchor": "center", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Bold"], "text-max-width": 8, "text-offset": [0.4, 0], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 12, 6, 14, 8, 16, 12, 22], "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 100%)", "text-halo-blur": 0.5, "text-halo-color": "hsl(0, 0%, 0%)", "text-halo-width": 1 }, "filter": ["all", ["==", "capital", 2], ["==", "class", "city"]] },
    { "id": "Country labels", "type": "symbol", "source": "maptiler_planet", "source-layer": "place", "minzoom": 9.5, "maxzoom": 12, "layout": { "symbol-sort-key": ["to-number", ["get", "rank"]], "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Noto Sans Bold"], "text-max-width": 10, "text-size": ["interpolate", ["linear", 0.75, 1, 0.75, 1], ["zoom"], 1, ["step", ["get", "rank"], 13, 1, 12, 2, 12], 4, ["step", ["get", "rank"], 15, 1, 14, 2, 14], 6, ["step", ["get", "rank"], 23, 1, 18, 2, 18], 9, ["step", ["get", "rank"], 27, 1, 22, 2, 22]], "visibility": "visible" }, "paint": { "text-color": "hsl(0, 0%, 100%)", "text-halo-blur": 1, "text-halo-color": "hsl(0, 0%, 0%)", "text-halo-width": 1 }, "filter": ["all", ["==", "$type", "Point"], ["in", "class", "country"], ["!=", "iso_a2", "VA"]] },
    { "id": "Public", "type": "symbol", "source": "maptiler_planet", "source-layer": "poi", "minzoom": 13, "layout": { "icon-image": ["case", ["in", "Tòa án", ["get", "name"]], "town_hall", ["in", "UBND", ["get", "name"]], "landmark", ["in", "Ủy ban", ["get", "name"]], "landmark", ["in", "Viện kiểm sát", ["get", "name"]], "police", ["in", "Công an", ["get", "name"]], "police", ["==", ["get", "class"], "police"], "police", ["==", ["get", "class"], "fire_station"], "fire_station", "town_hall"], "icon-size": 1.05, "symbol-sort-key": ["to-number", ["get", "rank"]], "text-anchor": "top", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Roboto Regular", "Noto Sans Regular"], "text-max-width": 8, "text-offset": [0, 0.9], "text-optional": false, "text-padding": 2, "text-size": { "stops": [[12, 10], [16, 12], [22, 14]] }, "visibility": "visible", "icon-optional": true }, "paint": { "icon-color": ["case", ["in", "Tòa án", ["get", "name"]], "#f59e0b", ["in", "UBND", ["get", "name"]], "#818cf8", ["in", "Ủy ban", ["get", "name"]], "#818cf8", ["in", "Viện kiểm sát", ["get", "name"]], "#38bdf8", ["in", "Công an", ["get", "name"]], "#38bdf8", "#818cf8"], "icon-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.8, 16, 0], "icon-halo-color": "hsl(0, 0%, 100%)", "icon-halo-width": 2, "icon-opacity": 1, "text-color": "#ffffff", "text-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.5, 16, 0], "text-halo-color": "#0f172a", "text-halo-width": 2.5, "text-opacity": 1 }, "metadata": {}, "filter": ["all", ["==", "$type", "Point"], ["in", "class", "townhall", "town_hall", "courthouse", "police", "fire_station"], ["has", "name"]] },
    { "id": "Education", "type": "symbol", "source": "maptiler_planet", "source-layer": "poi", "minzoom": 13, "layout": { "icon-image": "school", "icon-size": 1.05, "symbol-sort-key": ["to-number", ["get", "rank"]], "text-anchor": "top", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Roboto Regular", "Noto Sans Regular"], "text-max-width": 8, "text-offset": [0, 0.9], "text-optional": false, "text-padding": 2, "text-size": { "stops": [[12, 10], [16, 12], [22, 14]] }, "visibility": "visible", "icon-optional": true }, "paint": { "icon-color": "#38bdf8", "icon-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.8, 16, 0], "icon-halo-color": "hsl(0, 0%, 100%)", "icon-halo-width": 2, "icon-opacity": 1, "text-color": "#ffffff", "text-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.5, 16, 0], "text-halo-color": "#0f172a", "text-halo-width": 2.5, "text-opacity": 1 }, "metadata": {}, "filter": ["all", ["==", "$type", "Point"], ["in", "class", "school", "college", "university"], ["has", "name"]] },
    { "id": "Bridge Icons", "type": "symbol", "source": "maptiler_planet", "source-layer": "transportation", "minzoom": 11, "layout": { "symbol-placement": "line-center", "icon-image": "bridge_icon", "icon-size": 0.65, "icon-padding": 45, "symbol-spacing": 600, "visibility": "visible" }, "paint": { "icon-color": "#f59e0b", "icon-halo-blur": ["interpolate", ["linear"], ["zoom"], 11, 1, 14, 0.8, 16, 0], "icon-halo-color": "hsl(0, 0%, 100%)", "icon-halo-width": 2, "icon-opacity": 1 }, "filter": ["all", ["==", "$type", "LineString"], ["==", "brunnel", "bridge"], ["in", "class", "motorway", "trunk", "primary"]] },
    { "id": "Healthcare", "type": "symbol", "source": "maptiler_planet", "source-layer": "poi", "minzoom": 13, "layout": { "icon-image": "hospital", "icon-size": 1.05, "symbol-sort-key": ["to-number", ["get", "rank"]], "text-anchor": "top", "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"], ["get", "name:en"]], "text-font": ["Roboto Regular", "Noto Sans Regular"], "text-max-width": 8, "text-offset": [0, 0.9], "text-optional": false, "text-padding": 2, "text-size": { "stops": [[12, 10], [16, 12], [22, 14]] }, "visibility": "visible", "icon-optional": true }, "paint": { "icon-color": "#f43f5e", "icon-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.8, 16, 0], "icon-halo-color": "hsl(0, 0%, 100%)", "icon-halo-width": 2, "icon-opacity": 1, "text-color": "#ffffff", "text-halo-blur": ["interpolate", ["linear"], ["zoom"], 12, 1, 14, 0.5, 16, 0], "text-halo-color": "#0f172a", "text-halo-width": 2.5, "text-opacity": 1 }, "metadata": {}, "filter": ["all", ["==", "$type", "Point"], ["==", "class", "hospital"], ["has", "name"]] }




  ]
}) as unknown as StyleSpecification
