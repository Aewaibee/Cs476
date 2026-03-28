/*
 * Final review before submission.
 * Submission triggers the workflow status change to SUBMITTED.
 */
requireAuth("ADMIN");
setHeader("View Record");
setNavActive();

const params = new URLSearchParams(location.search);
const viewId = params.get("id");
if(!viewId){
  alert("Missing record id");
  location.href="admin-search.html";
}

function showWarn(msg){
  q("warn").textContent = msg;
  q("warn").style.display = "block";
}
function clearWarn(){ q("warn").style.display="none"; }

async function loadRec(){
  // Fetch the record to view
  const record = await apiFetch(`/records/${encodeURIComponent(viewId)}`);
  if(!record){
    alert("Record not found");
    location.href="admin-search.html";
    return;
  }

  // Normalize DB field names
  const dateApplied = record.date_applied ?? record.dateApplied;
  const productName = record.product_name ?? record.productName;
  const pcp = record.pcp_act_number ?? record.pcpActNumber;
  const chem = record.chemical_volume_l ?? record.chemicalVolumeL;
  const water = record.water_volume_l ?? record.waterVolumeL; 
  const lat = record.geometry_center_lat ?? record.geometryCenterLat;
  const lng = record.geometry_center_lng ?? record.geometryCenterLng;
  const missing = [];
  if(!productName) missing.push("Product Name");
  if(!pcp) missing.push("PCP Act #");
  if(lat == null || lng == null) missing.push("Location (lat/lng)");

  if(missing.length) showWarn("Missing required: " + missing.join(", "));
  else clearWarn();

  q("summary").innerHTML = `
    <div><b>ID:</b> ${record.id}</div>
    <div><b>Date:</b> ${dateApplied}</div>
    <div><b>Product:</b> ${productName}</div>
    <div><b>PCP Act #:</b> ${pcp}</div>
    <div><b>Chemical Volume:</b> ${chem} L</div>
    <div><b>Water Volume:</b> ${water} L</div>
    <div><b>Operator:</b> ${record.operator_email}</div>
    <div><b>Location:</b> ${lat != null ? Number(lat).toFixed(6) : "—"}, ${lng != null ? Number(lng).toFixed(6) : "—"}</div>
    <div><b>Status:</b> ${fmtStatus(record.status)}</div>
    <div><b>Notes:</b> ${record.notes || ""}</div>
  `;

  const btnApprove = q("btnApprove");
  const btnFlag = q("btnFlag");
  if (btnApprove) btnApprove.disabled = (record.status !== "SUBMITTED");
  if (btnFlag) btnFlag.disabled = (record.status !== "SUBMITTED");
}

/** Approve changes status to APPROVED */
async function approve() {
  const btn = q("btnApprove");
  // If they somehow clicked twice or got through the button being disabled, ignore it
  if (!btn || btn.disabled) return;
  // Disable the button after clicking on it
  btn.disabled = true;

  try {
    await apiFetch(`/records/${encodeURIComponent(viewId)}/approve/`, {
      method: "POST",
      body: JSON.stringify({ status: "APPROVED" })
    });
    location.href = "admin-search.html";
  }
  catch (e) {
    alert(e.message);
    // Re enable the button if there was an error approving it
    btn.disabled = false;
  }
}

/** Flag changes status to FLAGGED */
async function flagRec() {
  const btn = q("btnFlag");
  // If they somehow clicked twice or got through the button being disabled, ignore it
  if (!btn || btn.disabled) return;
  // Disable the button after clicking on it
  btn.disabled = true;

  try {
    await apiFetch(`/records/${encodeURIComponent(viewId)}/flag/`, {
      method: "POST",
      body: JSON.stringify({ status: "FLAGGED" })
    });
    location.href = "admin-search.html";
  }
  catch (e) {
    alert(e.message);
    // Re enable the button if there was an error flagging it
    btn.disabled = false;
  }
}

if (q("btnApprove")) q("btnApprove").addEventListener("click", approve);
if (q("btnFlag")) q("btnFlag").addEventListener("click", flagRec);
// async function goBack(){

//   try{
//     await apiFetch(`/records/${encodeURIComponent(id)}/submit/`, { method:"POST", body:"{}" });
//     location.href = `operator-confirm.html?id=${encodeURIComponent(id)}`;
//   }catch(e){ alert(e.message); }
// }

// q("btnBack").addEventListener("click", goBack);

loadRec();
