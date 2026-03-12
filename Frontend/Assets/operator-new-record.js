/**
 * operator-new-record.js
 * Creates a new spray record draft.
 * Saves form data to backend as JSON.
 */
requireAuth("OPERATOR");
setHeader("New Record");
setNavActive();

// Default date to today's date (YYYY-MM-DD)
function todayYMD(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
q("dateApplied").value = todayYMD();

function showErr(msg){
  q("msg").textContent = msg;
  q("msg").style.display = "block";
}
function clearErr(){ q("msg").style.display="none"; }

/**
 * Build request payload with basic validation.
 * This supports usability ("error tolerant" + "easy to learn").
 */
function buildPayload(){
  const dateApplied = q("dateApplied").value;
  const productName = q("productName").value.trim();
  const pcpActNumber = q("pcpActNumber").value.trim();
  const chemicalVolumeL = Number(q("chemicalVolumeL").value);
  const waterVolumeL = Number(q("waterVolumeL").value);
  const notes = q("notes").value.trim();

  if(!dateApplied) throw new Error("Date Applied is required.");
  if(!productName) throw new Error("Product Name is required.");
  if(!pcpActNumber) throw new Error("PCP Act # is required.");
  if(Number.isNaN(chemicalVolumeL)) throw new Error("Chemical volume must be a number.");
  if(Number.isNaN(waterVolumeL)) throw new Error("Water volume must be a number.");

  return { dateApplied, productName, pcpActNumber, chemicalVolumeL, waterVolumeL, notes: notes || undefined };
}

async function saveDraft(){
  clearErr();
  try{
    const payload = buildPayload();

    // POST /records creates (or updates) a draft record
    const rec = await apiFetch("/records", { method:"POST", body: JSON.stringify(payload) });

    // Go to location page and pass record id in URL
    window.location.href = `operator-map.html?id=${encodeURIComponent(rec.id)}`;
  }catch(e){ showErr(e.message); }
}

q("btnDraft").addEventListener("click", saveDraft);
q("btnNext").addEventListener("click", saveDraft);