/*
 * Final review before submission.
 * Submission triggers the workflow status change to SUBMITTED.
 */
requireAuth("OPERATOR");
setHeader("Review & Submit");
setNavActive();

const params = new URLSearchParams(location.search);
const id = params.get("id");
if(!id){
  alert("Missing record id");
  location.href="operator-dashboard.html";
}

function showWarn(msg){
  q("warn").textContent = msg;
  q("warn").style.display = "block";
}
function clearWarn(){ q("warn").style.display="none"; }

async function loadRec(){
  // Get the current operator
  const user = getUser()
  // Fetch the operator's records
  const rowData = await apiFetch(`/records/?operator_email=${encodeURIComponent(user.email)}`);
  const rows = rowData.records;
  const r = rows.find(x => x.id === id);
  if(!r){
    alert("Record not found");
    location.href="operator-dashboard.html";
    return;
  }

  // Normalize DB field names
  const dateApplied = r.date_applied ?? r.dateApplied;
  const productName = r.product_name ?? r.productName;
  const pcp = r.pcp_act_number ?? r.pcpActNumber;
  const chem = r.chemical_volume_l ?? r.chemicalVolumeL;
  const water = r.water_volume_l ?? r.waterVolumeL;
  const lat = r.geometry_lat ?? r.geometryLat;
  const lng = r.geometry_lng ?? r.geometryLng;
  const missing = [];
  if(!productName) missing.push("Product Name");
  if(!pcp) missing.push("PCP Act #");
  if(lat == null || lng == null) missing.push("Location (lat/lng)");

  if(missing.length) showWarn("Missing required: " + missing.join(", "));
  else clearWarn();

  q("summary").innerHTML = `
    <div><b>ID:</b> ${r.id}</div>
    <div><b>Date:</b> ${dateApplied}</div>
    <div><b>Product:</b> ${productName}</div>
    <div><b>PCP Act #:</b> ${pcp}</div>
    <div><b>Chemical Volume:</b> ${chem} L</div>
    <div><b>Water Volume:</b> ${water} L</div>
    <div><b>Location:</b> ${lat != null ? Number(lat).toFixed(6) : "—"}, ${lng != null ? Number(lng).toFixed(6) : "—"}</div>
    <div><b>Status:</b> ${fmtStatus(r.status)}</div>
    <div><b>Notes:</b> ${r.notes || ""}</div>
  `;
}

async function submit(){
  try{
    await apiFetch(`/records/${encodeURIComponent(id)}/submit`, { method:"POST", body:"{}" });
    location.href = `operator-confirm.html?id=${encodeURIComponent(id)}`;
  }catch(e){ alert(e.message); }
}

q("btnEditLoc").addEventListener("click", () => location.href = `operator-map.html?id=${encodeURIComponent(id)}`);
q("btnSubmit").addEventListener("click", submit);

loadRec();
