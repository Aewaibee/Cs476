requireAuth("OPERATOR");
setHeader("New Record");
setNavActive();

// Send user here if they would like to edit their draft
const params = new URLSearchParams(location.search);
const id = params.get("id");

// Default date to today's date (YYYY-MM-DD)
function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function showMsg(msg, msgType = "error") {
  const msgElement = q("msg");
  msgElement.textContent = msg;
  msgElement.style.display = "block";
  // Determine colour based on if it's an error or not
  msgElement.className = "notice " + (msgType === "ok" ? "ok" : "error");
}
function clearMsg() { 
  const msgElement = q("msg");
  msgElement.style.display = "none";
  msgElement.className = "notice";
}

// Get all the current form values
function getCurrentFormState() {
  return {
    date_applied: q("dateApplied").value,
    product_name: q("productName").value,
    pcp_act_number: q("pcpActNumber").value,
    chemical_volume_l: q("chemicalVolumeL").value,
    water_volume_l: q("waterVolumeL").value,
    notes: q("notes").value,
  };
}

// Autosave in case the user refreshes or leaves the page
function autosavePendingRecord() {
  setPendingSprayRecord(getCurrentFormState());
}

// Initialize the form. Can either come from editing a draft, loading a pending record, or a blank new record
(async function initForm() {
  const pending = getPendingSprayRecord();
  
  if (id) {
    try {
      // Try to load the record if an id was provided
      const rec = await apiFetch(`/records/${encodeURIComponent(id)}`);
      q("dateApplied").value = rec.date_applied || todayYMD();
      q("productName").value = rec.product_name || "";
      q("pcpActNumber").value = rec.pcp_act_number || "";
      q("chemicalVolumeL").value = rec.chemical_volume_l || "";
      q("waterVolumeL").value = rec.water_volume_l || "";
      q("notes").value = rec.notes || "";
      clearPendingSprayRecord();
      return;
    }
    catch (e) {
      // if there was an error loading try to load the pending record
      if (pending) {
        q("dateApplied").value = pending.date_applied || todayYMD();
        q("productName").value = pending.product_name || "";
        q("pcpActNumber").value = pending.pcp_act_number || "";
        q("chemicalVolumeL").value = pending.chemical_volume_l || "";
        q("waterVolumeL").value = pending.water_volume_l || "";
        q("notes").value = pending.notes || "";
        showMsg("Loaded locally saved draft.", "ok");
        return;
      }
      // Fill in the date if there was no pending record
      else {
        q("dateApplied").value = todayYMD();
      }
    }
  }
  // If there was no id, check for pending record
  else {
    if (pending) {
        q("dateApplied").value = pending.date_applied || todayYMD();
        q("productName").value = pending.product_name || "";
        q("pcpActNumber").value = pending.pcp_act_number || "";
        q("chemicalVolumeL").value = pending.chemical_volume_l || "";
        q("waterVolumeL").value = pending.water_volume_l || "";
        q("notes").value = pending.notes || "";
        showMsg("Loaded locally saved draft.", "ok");
        return;
      }
    // Fill in the date if there was no pending record
    else {
      q("dateApplied").value = todayYMD();
    }
  }
}) ();


function buildPayload() {
  // Get user so that you can get the operator email
  const user = getUser();
  if (!user) throw new Error("Not Authenticated.");
  const operator_email = user.email;

  // Get the form values and trim
  const date_applied_raw = (q("dateApplied").value || "").trim();
  const product_name_raw = (q("productName").value || "").trim();
  const pcp_act_number_raw = (q("pcpActNumber").value || "").trim();
  const chemical_volume_l_raw = (q("chemicalVolumeL").value || "").trim();
  const water_volume_l_raw = (q("waterVolumeL").value || "").trim();
  const notes = q("notes").value.trim();

  // Fill in blank fields with valid placeholder values
  const payload = {
    operator_email,
    date_applied: date_applied_raw || todayYMD(),
    product_name: product_name_raw || "",
    pcp_act_number: pcp_act_number_raw || "",
    chemical_volume_l: chemical_volume_l_raw ? Number(chemical_volume_l_raw) : 0,
    water_volume_l: water_volume_l_raw ? Number(water_volume_l_raw) : 0,
    notes: notes || undefined
  };

  return payload;
}

// General function to handle saving a draft (Save draft or Next button)
async function saveDraft() {
  clearMsg();
  try {
    const payload = buildPayload();

    let rec;
    if (id) {
      // update the existing draft
      rec = await apiFetch(`/records/${encodeURIComponent(id)}/`, { method: "PUT", body: JSON.stringify(payload) });
    }
    else {
      // create a new draft
      rec = await apiFetch("/records/", { method: "POST", body: JSON.stringify(payload) });
    }

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
    // Remove event listener so that pendingRecord doesn't get added back to local storage
    // Bug was happening where user would save draft and then pending record would be loaded
    // when the user tries to create a new record.
    window.removeEventListener("beforeunload", autosavePendingRecord);
    clearPendingSprayRecord();
    showMsg("Draft saved to server.", "ok");
  }
  else if (result.reason === "offline") {
    showMsg("Offline: saved locally to device.", "ok");
  }
}

// Handle Next button
async function handleNext() {
  const result = await saveDraft();
  if (result.success) {
    // Remove event listener so that pendingRecord doesn't get added back to local storage
    window.removeEventListener("beforeunload", autosavePendingRecord);
    clearPendingSprayRecord();
    // Handles correct ID (either new one from creating a record or existing one from editing a record)
    returnID = result.record.id ? result.record.id : id
    // Go to location page and pass record id in URL
    window.location.href = `operator-map.html?id=${encodeURIComponent(returnID)}`;
  }
  else if (result.reason === "offline") {
    showMsg("Offline: saved locally to device.", "ok");
  }
}


window.addEventListener("beforeunload", autosavePendingRecord);

q("btnDraft").addEventListener("click", handleSaveDraft);
q("btnNext").addEventListener("click", handleNext);
