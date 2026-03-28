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
let currentRecord = null;

function showWarn(msg){
  q("warn").textContent = msg;
  q("warn").style.display = "block";
}
function clearWarn(){ q("warn").style.display="none"; }

function validateRecord(rec) {
  // Normalize DB field names
  const dateApplied = rec.date_applied ?? rec.dateApplied;
  const productName = rec.product_name ?? rec.productName;
  const pcp = rec.pcp_act_number ?? rec.pcpActNumber;
  const chem = rec.chemical_volume_l ?? rec.chemicalVolumeL;
  const water = rec.water_volume_l ?? rec.waterVolumeL;
  const lat = rec.geometry_center_lat ?? rec.geometryCenterLat;
  const lng = rec.geometry_center_lng ?? rec.geometryCenterLng;

  const missing = [];
  if (!dateApplied) missing.push("Date");
  if (!productName) missing.push("Product Name");
  if (!pcp) missing.push("PCP Act #");
  // Value of 0 is stored as a placeholder for an empty field when saving a draft
  if (chem == null || chem === "" || Number(chem) === 0) missing.push("Chemical Volume (L)");
  if (water == null || water === "" || Number(water) === 0) missing.push("Water Volume (L)");
  // Catch blank or missing lat/lng
  if (!lat || !lng) missing.push("Location (lat/lng)");
  console.log(lat, lng);

  return {missing, dateApplied, productName, pcp, chem, water, lat, lng};
}

// Update submit button so that user can't submit records that are already submitted or are missing fields
function updateSubmitButton(isDraft, missingCount) {
  const submitButton = q("btnSubmit");
  if (!submitButton) return;
  // Only show the submit button if it's a draft
  submitButton.style.display = isDraft ? "" : "none";
  // Disable the button if it's not a draft or there are missing fields
  submitButton.disabled = !isDraft || missingCount > 0;
}

async function loadRec(){
  // Try to load the record
  try {
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

    // Store the current record
    currentRecord = r;
    // Validate the record and show the warnings
    const validatedRecord = validateRecord(r);
    if (validatedRecord.missing.length) showWarn("Missing required: " + validatedRecord.missing.join(", "));
    else clearWarn();

    // Hide the edit and submit buttons if the record isn't a draft
    const isDraft = r.status === "DRAFT";
    const editBtn = q("btnEditLoc");

    // Only show the edit button if it's a draft
    if (editBtn) editBtn.style.display = isDraft ? "" : "none";
    updateSubmitButton(isDraft, validatedRecord.missing.length);

    q("summary").innerHTML = `
      <div><b>ID:</b> ${r.id}</div>
      <div><b>Date:</b> ${validatedRecord.dateApplied}</div>
      <div><b>Product:</b> ${validatedRecord.productName}</div>
      <div><b>PCP Act #:</b> ${validatedRecord.pcp}</div>
      <div><b>Chemical Volume:</b> ${validatedRecord.chem} L</div>
      <div><b>Water Volume:</b> ${validatedRecord.water} L</div>
      <div><b>Location:</b> ${validatedRecord.lat != null ? Number(validatedRecord.lat).toFixed(6) : "—"}, ${validatedRecord.lng != null ? Number(validatedRecord.lng).toFixed(6) : "—"}</div>
      <div><b>Status:</b> ${fmtStatus(r.status)}</div>
      <div><b>Notes:</b> ${r.notes || ""}</div>
    `;
  }
  // Show the error message if the record couldn't be loaded for some reason
  catch(e){alert(e.message )};
}

async function submit(){
  try{
    // Get the most recent version of the record
    const record = await apiFetch(`/records/${encodeURIComponent(id)}`);
    if (!record) {
      alert("Record not found");
      return;
    }

    const validatedRecord = validateRecord(record);
    // Do not let the user submit a record with missing fields
    if (validatedRecord.missing.length) {
      // Store the record so that it can the most updated version will be edited
      currentRecord = record;
      showWarn("Missing required: " + validatedRecord.missing.join(", "));
      updateSubmitButton(record.status === "DRAFT", validateRecord.missing.length);
      return;
    }

    await apiFetch(`/records/${encodeURIComponent(id)}/submit/`, { method:"POST", body:"{}" });
    location.href = `operator-confirm.html?id=${encodeURIComponent(id)}`;
  }
  catch(e){ alert(e.message); }
}

// make sure the buttons exist before adding event listener
const editBtn = q("btnEditLoc");
if (editBtn) editBtn.addEventListener("click", () => location.href = `operator-new-record.html?id=${encodeURIComponent(id)}`);
const submitBtn = q("btnSubmit");
if (submitBtn) submitBtn.addEventListener("click", submit);

loadRec();
