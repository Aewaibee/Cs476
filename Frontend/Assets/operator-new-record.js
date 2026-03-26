requireAuth("OPERATOR");
setHeader("New Record");
setNavActive();

// Default date to today's date (YYYY-MM-DD)
function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function showMsg(msg) {
  q("msg").textContent = msg;
  q("msg").style.display = "block";
}
function clearMsg() { q("msg").style.display = "none"; }

// Get all the current form values
function getCurrentFormState() {
  return {
    dateApplied: q("dateApplied").value,
    productName: q("productName").value,
    pcpActNumber: q("pcpActNumber").value,
    chemicalVolumeL: q("chemicalVolumeL").value,
    waterVolumeL: q("waterVolumeL").value,
    notes: q("notes").value,
  };
}

// Autosave in case the user refreshes or leaves the page
function autosavePendingRecord() {
  setPendingSprayRecord(getCurrentFormState());
}

// Check for pending spray record
const pending = getPendingSprayRecord();
// Fill in the info if there was a pending spray record
if (pending) {
  q("dateApplied").value = pending.dateApplied || "";
  q("productName").value = pending.productName || "";
  q("pcpActNumber").value = pending.pcpActNumber || "";
  q("chemicalVolumeL").value = pending.chemicalVolumeL || "";
  q("waterVolumeL").value = pending.waterVolumeL || "";
  q("notes").value = pending.notes || "";
  showMsg("Loaded locally saved draft.");
}
// Fill in the date if there was no pending record
else {
  q("dateApplied").value = todayYMD();
}


function buildPayload() {
  const dateApplied = q("dateApplied").value;
  const productName = q("productName").value.trim();
  const pcpActNumber = q("pcpActNumber").value.trim();
  const chemicalVolumeL = Number(q("chemicalVolumeL").value);
  const waterVolumeL = Number(q("waterVolumeL").value);
  const notes = q("notes").value.trim();

  if (!dateApplied) throw new Error("Date Applied is required.");
  if (!productName) throw new Error("Product Name is required.");
  if (!pcpActNumber) throw new Error("PCP Act # is required.");
  if (Number.isNaN(chemicalVolumeL)) throw new Error("Chemical volume must be a number.");
  if (Number.isNaN(waterVolumeL)) throw new Error("Water volume must be a number.");

  return { dateApplied, productName, pcpActNumber, chemicalVolumeL, waterVolumeL, notes: notes || undefined };
}

// General function to handle saving a draft (Save draft or Next button)
async function saveDraft() {
  clearMsg();
  try {
    const payload = buildPayload();

    // POST /records creates a draft record
    const rec = await apiFetch("/records", { method: "POST", body: JSON.stringify(payload) });

    clearPendingSprayRecord();
    return {success: true, record: rec};
  } 
  catch (e) {
    // Check if it failed because it was offline
    if (!navigator.onLine || e.message.toLowerCase().includes("failed to fetch")) {
      // Save the current state so it can be loaded later
      setPendingSprayRecord(getCurrentFormState());
      return {success: false, reason: "offline"};
    }
    showMsg(e.message);
    return {success: false, reason: "error"};
  }
}

// Handle Save draft button
async function handleSaveDraft() {
  const result = await saveDraft();
  if (result.success) {
    showMsg("Draft saved to server.");
  }
  else if (result.reason === "offline") {
    showMsg("Offline: saved locally to device.")
  }
}

// Handle Next button
async function handleNext() {
  const result = await saveDraft();
  if (result.success) {
    // Go to location page and pass record id in URL
    window.location.href = `operator-map.html?id=${encodeURIComponent(result.record.id)}`;
  }
  else if (result.reason === "offline") {
    showMsg("Offline: saved locally to device.")
  }
}


window.addEventListener("beforeunload", autosavePendingRecord);

q("btnDraft").addEventListener("click", handleSaveDraft);
q("btnNext").addEventListener("click", handleNext);
