/*
 * Stores coordinates (lat/lng) for the record.
 * In a real product you might use Leaflet/Google Maps.
 * This version stays within pure HTML/JS requirements.
 */
requireAuth("OPERATOR");
setHeader("Location Selection");
setNavActive();

const params = new URLSearchParams(location.search);
const id = params.get("id");
if (!id) {
  alert("Missing record id");
  location.href = "operator-dashboard.html";
}

function showErr(msg) {
  q("msg").textContent = msg;
  q("msg").style.display = "block";
}
function clearErr() { q("msg").style.display = "none"; }

///////////////////////////////////////////////////////////////////////////
const DEFAULT_VIEW = [[50.4452, -104.6189], 13];
const map = L.map('operatorMap').setView(DEFAULT_VIEW[0], DEFAULT_VIEW[1]);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})
osm.addTo(map);

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Draw controls for when nothing has been drawn yet (only allow polygon)
const drawControlFull = new L.Control.Draw({
  draw: {
    polyline: false,
    polygon: true,
    circle: false,
    rectangle: false,
    marker: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems
  }
});

// Only keep edit and delete when there is an existing polygon (only allow one at a time)
const drawControlEdit = new L.Control.Draw({
  draw: false,
  edit: {
    featureGroup: drawnItems
  }
});

// Add the initial control
map.addControl(drawControlFull);

//
// Map Function
//

// Helper function to get center coordinates from polygon to display in lat/lng fields
function getCenterCoords(layer) {
  const latlngs = layer.getLatLngs()[0];
  let latSum = 0;
  let lngSum = 0;
  latlngs.forEach(latlng => {
    latSum += latlng.lat;
    lngSum += latlng.lng;
  });
  const centerLat = latSum / latlngs.length;
  const centerLng = lngSum / latlngs.length;
  return { lat: centerLat, lng: centerLng };
}

// Make a small polygon around a point
function makePolyFromPoint(lat, lng) {
  // Used to make a small square around the entered coordinates (keeps it as a polygon)
  const polyOffset = 0.0002; // small visible box on the map
  const newPoly = [
    { lat: lat + polyOffset, lng: lng + polyOffset },
    { lat: lat + polyOffset, lng: lng - polyOffset },
    { lat: lat - polyOffset, lng: lng - polyOffset },
    { lat: lat - polyOffset, lng: lng + polyOffset }
  ];
  return newPoly;
}

// Load existing polygon if one exists
(async function loadExistingPolygon() {
  try {
    const rec = await apiFetch(`/records/${encodeURIComponent(id)}/`);
    if (!rec) return;
    // Use polygon from backend if one existed
    const polygonCoords = rec.geometry_polygon;
    if (polygonCoords) {
      const layer = L.polygon(polygonCoords.map(coord => [coord.lat, coord.lng]));
      drawnItems.addLayer(layer);
      map.fitBounds(layer.getBounds());
      // Change the toolbar to edit/delete only if there is already a polygon
      try {
        drawControlFull.remove();
        drawControlEdit.addTo(map);
      }
      catch (e) {}
    }
    // Get the calculated center points from backend
    const centerLat = rec.geometry_center_lat;
    const centerLng = rec.geometry_center_lng;
    if (centerLat != null && centerLng != null) {
      q("lat").value = Number(centerLat).toFixed(6);
      q("lng").value = Number(centerLng).toFixed(6);
      updateOSM(true);
    }
  } catch (err) {
  }
}) ();


//
// Map event handlers
//

map.on("draw:created", function(e) {
  const layer = e.layer;

  // Make sure to clear any existing layers before adding the new one
  if (drawnItems.getLayers().length > 0) drawnItems.clearLayers();
  drawnItems.addLayer(layer);

  // Swap the toolbars
  drawControlFull.remove();
  drawControlEdit.addTo(map);

  // Show center coordinates in lat and long fields
  const center = getCenterCoords(layer);
  q("lat").value = center.lat.toFixed(6);
  q("lng").value = center.lng.toFixed(6);
  updateOSM(true);

  console.log(layer.getLatLngs()[0]);
});

map.on("draw:edited", function(e) {
  const layers = drawnItems.getLayers();
  if (layers.length > 0) {
    const layer = layers[0];
    const center = getCenterCoords(layer);
    q("lat").value = center.lat.toFixed(6);
    q("lng").value = center.lng.toFixed(6);
    updateOSM(true);
  }
  
  // const center = getCenterCoords(layer);
  // q("lat").value = center.lat.toFixed(6);
  // q("lng").value = center.lng.toFixed(6);
  // updateOSM();
});

map.on("draw:deleted", function(e) {
  // Re-enable drawing when polygon is deleted
  if (drawnItems.getLayers().length === 0) {
    drawControlEdit.remove();
    drawControlFull.addTo(map);
  }

  // Update lat/lng fields and OSM link when polygon is deleted
  q("lat").value = "";
  q("lng").value = "";
  updateOSM(false);
});
///////////////////////////////////////////////////////////////////////////

/*
 * Update the OpenStreetMap link to help the user verify coordinates.
 */
function updateOSM(fromPolygon = false) {
  const lat = q("lat").value.trim();
  const lng = q("lng").value.trim();
  const a = q("osm");
  if (lat && lng) {
    a.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
    a.textContent = a.href;

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!fromPolygon) {
      // Make sure to clear any existing layers before adding the new (calculated) one
      if (drawnItems.getLayers().length > 0) drawnItems.clearLayers();
      const layer = L.polygon(makePolyFromPoint(latNum, lngNum));

      // Add the layer and recenter
      drawnItems.addLayer(layer);
      map.fitBounds(layer.getBounds());

      // Swap the toolbars
      drawControlFull.remove();
      drawControlEdit.addTo(map);
    }
    
  } 
  else {
    a.href = "#";
    a.textContent = "Enter coordinates first";

    // If one of the coordinates was removed, remove the polygon from the map
    if (drawnItems.getLayers().length > 0) drawnItems.clearLayers();
    console.log(drawnItems.getLayers().length);
    drawControlEdit.remove();
    drawControlFull.addTo(map);
    map.setView(DEFAULT_VIEW[0], DEFAULT_VIEW[1]);
  }
}

function useGeo() {
  clearErr();
  if (!navigator.geolocation) {
    showErr("Geolocation not supported.");
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    q("lat").value = pos.coords.latitude.toFixed(6);
    q("lng").value = pos.coords.longitude.toFixed(6);
    updateOSM(false);
  }, () => showErr("Could not get location (permission denied)."));
}

async function saveLocation() {
  clearErr();
  try {
    const lat_raw = q("lat").value;
    const lng_raw = q("lng").value;
    const lat = Number(lat_raw);
    const lng = Number(lng_raw);
    if (lat_raw.trim() === "" || lng_raw.trim() === "") throw new Error("Latitude and Longitude are required.");
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error("Latitude/Longitude must be numbers.");
    const locationText = q("locationText").value.trim() || undefined;

    const layers = drawnItems.getLayers();
    let polygonCoords = null;

    // If there is a drawn polygon, use it. Otherwise, make a small polygon around the inputted lat and lng
    if (layers.length > 0) {
      console.log(layers.length);
      const layer = layers[0];
      polygonCoords = layer.getLatLngs()[0];
    }
    else {
      console.log(lat, lng);
      if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) throw new Error("Please draw a polygon or enter coordinates.");
      // Used to make a small square around the entered coordinates (keeps it as a polygon)
      polygonCoords = makePolyFromPoint(lat, lng);
    }


    // Get the current operator
    const user = getUser();
    // Fetch the operator's records and find matching one
    const rowData = await apiFetch(`/records/?operator_email=${encodeURIComponent(user.email)}`);
    const rows = rowData.records;
    const rec = rows.find(r => r.id === id);
    if (!rec) throw new Error("Record not found.");

    // Normalize DB row names if needed
    const payload = {
      operator_email : user.email,
      id: rec.id,
      date_applied: rec.date_applied ?? rec.dateApplied,
      product_name: rec.product_name ?? rec.productName,
      pcp_act_number: rec.pcp_act_number ?? rec.pcpActNumber,
      chemical_volume_l: Number(rec.chemical_volume_l ?? rec.chemicalVolumeL),
      water_volume_l: Number(rec.water_volume_l ?? rec.waterVolumeL),
      notes: rec.notes || undefined,
      location_text: locationText,
      geometry_polygon: polygonCoords
    };

    await apiFetch(`/records/${encodeURIComponent(id)}/`, { method: "PUT", body: JSON.stringify(payload) });
    location.href = `operator-review.html?id=${encodeURIComponent(id)}`;
  } catch (e) { showErr(e.message); }
}

q("lat").addEventListener("input", () => updateOSM(false));
q("lng").addEventListener("input", () => updateOSM(false));
q("btnGeo").addEventListener("click", useGeo);
q("btnBack").addEventListener("click", () => history.back());
q("btnSave").addEventListener("click", saveLocation);