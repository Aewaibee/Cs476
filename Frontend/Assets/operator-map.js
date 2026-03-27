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

/*
 * Update the OpenStreetMap link to help the user verify coordinates.
 */
function updateOSM() {
  const lat = q("lat").value.trim();
  const lng = q("lng").value.trim();
  const a = q("osm");
  if (lat && lng) {
    a.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
    a.textContent = a.href;
  } else {
    a.href = "#";
    a.textContent = "Enter coordinates first";
  }
}
q("lat").addEventListener("input", updateOSM);
q("lng").addEventListener("input", updateOSM);

function useGeo() {
  clearErr();
  if (!navigator.geolocation) {
    showErr("Geolocation not supported.");
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    q("lat").value = pos.coords.latitude.toFixed(6);
    q("lng").value = pos.coords.longitude.toFixed(6);
    updateOSM();
  }, () => showErr("Could not get location (permission denied)."));
}

async function saveLocation() {
  clearErr();
  try {
    const lat = Number(q("lat").value);
    const lng = Number(q("lng").value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error("Latitude/Longitude must be numbers.");
    const locationText = q("locationText").value.trim() || undefined;

    // Get the current operator
    const user = getUser();
    // Fetch the operator's records and find matching one
    const rowData = await apiFetch(`/records/?operator_email=${encodeURIComponent(user.email)}`);
    const rows = rowData.records;
    const rec = rows.find(r => r.id === id);
    if (!rec) throw new Error("Record not found.");

    // Normalize DB row names if needed
    const payload = {
      id: rec.id,
      dateApplied: rec.date_applied ?? rec.dateApplied,
      productName: rec.product_name ?? rec.productName,
      pcpActNumber: rec.pcp_act_number ?? rec.pcpActNumber,
      chemicalVolumeL: Number(rec.chemical_volume_l ?? rec.chemicalVolumeL),
      waterVolumeL: Number(rec.water_volume_l ?? rec.waterVolumeL),
      notes: rec.notes || undefined,
      locationText,
      geometry: { lat, lng }
    };

    await apiFetch("/records/", { method: "POST", body: JSON.stringify(payload) });
    location.href = `operator-review.html?id=${encodeURIComponent(id)}`;
  } catch (e) { showErr(e.message); }
}

q("btnGeo").addEventListener("click", useGeo);
q("btnBack").addEventListener("click", () => history.back());
q("btnSave").addEventListener("click", saveLocation);

updateOSM();