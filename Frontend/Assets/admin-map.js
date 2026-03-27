requireAuth("ADMIN");
setHeader("Map View");
setNavActive();

// Initialize leaflet map
const map = L.map('adminMap').setView([50.4452, -104.6189], 13);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})
osm.addTo(map);

let currentLayer = null;

function showRecordOnMap(record) {
  // Remove existing polygon from the map before adding new one
  if (currentLayer) {
    map.removeLayer(currentLayer);
    currentLayer = null;
  }

  const polygon = record.geometry_polygon;
  if (polygon && polygon.length > 2) {
    // Leaflet wants the coordinate as a list of lists rather than list of dicts
    const latlngs = polygon.map(coord => [coord.lat, coord.lng]);
    currentLayer = L.polygon(latlngs).addTo(map);
    map.fitBounds(currentLayer.getBounds());
  }
}

(async function () {
  const row_data = await apiFetch("/records/");
  const rows = row_data.records;
  const tbody = q("tbl").querySelector("tbody");

  tbody.innerHTML = rows.map(r => {
    const lat = Number(r.geometry_center_lat).toFixed(6);
    const lng = Number(r.geometry_center_lng).toFixed(6);
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    return `
      <tr data-id="${r.id}" style="cursor:pointer">
        <td>${r.date_applied}</td>
        <td>${r.operator_email}</td>
        <td>${r.product_name}</td>
        <td>${lat}</td>
        <td>${lng}</td>
        <td>${fmtStatus(r.status)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="6" class="small">No geocoded records.</td></tr>`;

  tbody.addEventListener("click", function(e) {
    // Make sure that you are getting the table row
    const tr = e.target.closest("tr");
    const id = tr.dataset.id;
    // Search for the record matching the row's id
    const rec = rows.find(r => String(r.id) === String(id));
    if (rec) showRecordOnMap(rec);
  })
})();