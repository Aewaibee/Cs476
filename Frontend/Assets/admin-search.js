<<<<<<< HEAD
/*
 * Admin can filter records and approve/flag them.
=======
/**
 * admin-search.js
 * Admin can filter records and approve/flag them.
 * Exports demonstrate the Factory pattern on the backend.
>>>>>>> ce371b3 (frontendcomplete)
 */
requireAuth("ADMIN");
setHeader("Search Records");
setNavActive();

let lastQuery = "";

<<<<<<< HEAD
/*
 * Query the backend for filtered records.
 */
async function search() {
=======
/**
 * Query the backend for filtered records.
 */
async function search(){
>>>>>>> ce371b3 (frontendcomplete)
  const operator = q("operator").value.trim();
  const product = q("product").value.trim();
  const status = q("status").value;

<<<<<<< HEAD

  const qs = new URLSearchParams();
  if (operator) qs.set("operator", operator);
  if (product) qs.set("product", product);
  if (status) qs.set("status", status);
=======
  // Build query string (optional params)
  const qs = new URLSearchParams();
  if(operator) qs.set("operator", operator);
  if(product) qs.set("product", product);
  if(status) qs.set("status", status);
>>>>>>> ce371b3 (frontendcomplete)

  lastQuery = qs.toString();

  const rows = await apiFetch("/admin/records/search?" + lastQuery);
  q("count").textContent = "Results: " + rows.length;

  const tbody = q("tbl").querySelector("tbody");
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date_applied}</td>
      <td>${r.operator_email}</td>
      <td>${r.product_name}</td>
      <td>${fmtStatus(r.status)}</td>
      <td>
        <button class="secondary" onclick="approve('${r.id}')">Approve</button>
        <button class="secondary" onclick="flagRec('${r.id}')">Flag</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="small">No matches.</td></tr>`;
}

/** Approve changes status to APPROVED */
<<<<<<< HEAD
async function approve(id) {
  await apiFetch(`/admin/records/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status: "APPROVED" })
=======
async function approve(id){
  await apiFetch(`/admin/records/${encodeURIComponent(id)}/status`, {
    method:"POST",
    body: JSON.stringify({ status:"APPROVED" })
>>>>>>> ce371b3 (frontendcomplete)
  });
  await search();
}

/** Flag changes status to FLAGGED */
<<<<<<< HEAD
async function flagRec(id) {
  await apiFetch(`/admin/records/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status: "FLAGGED" })
=======
async function flagRec(id){
  await apiFetch(`/admin/records/${encodeURIComponent(id)}/status`, {
    method:"POST",
    body: JSON.stringify({ status:"FLAGGED" })
>>>>>>> ce371b3 (frontendcomplete)
  });
  await search();
}

/** Reset filters and re-search */
<<<<<<< HEAD
function reset() {
  q("operator").value = "";
  q("product").value = "";
  q("status").value = "ALL";
  search();
}

/*
 * Download export file from backend.
 * Uses a direct fetch() to handle binary (PDF/CSV) responses.
 */
function downloadExport(type) {
  const token = getToken();
  const url = API_BASE + `/admin/records/export?type=${encodeURIComponent(type)}&` + lastQuery;

  fetch(url, { headers: { Authorization: "Bearer " + token } })
    .then(async res => {
      if (!res.ok) {
=======
function reset(){
  q("operator").value="";
  q("product").value="";
  q("status").value="ALL";
  search();
}

/**
 * Download export file from backend.
 * Uses a direct fetch() to handle binary (PDF/CSV) responses.
 */
function downloadExport(type){
  const token = getToken();
  const url = API_BASE + `/admin/records/export?type=${encodeURIComponent(type)}&` + lastQuery;

  fetch(url, { headers: { Authorization: "Bearer " + token }})
    .then(async res => {
      if(!res.ok){
>>>>>>> ce371b3 (frontendcomplete)
        const t = await res.text();
        throw new Error(t);
      }

      const blob = await res.blob();

<<<<<<< HEAD
      // Try to read filename from Content header
=======
      // Try to read filename from Content-Disposition header
>>>>>>> ce371b3 (frontendcomplete)
      const cd = res.headers.get("content-disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const name = match ? match[1] : `export.${type.toLowerCase()}`;

      // Trigger browser download
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(e => alert(e.message));
}

q("btnSearch").addEventListener("click", search);
q("btnReset").addEventListener("click", reset);
q("btnExportJSON").addEventListener("click", () => downloadExport("JSON"));
q("btnExportCSV").addEventListener("click", () => downloadExport("CSV"));
q("btnExportPDF").addEventListener("click", () => downloadExport("PDF"));

// Initial search at page load
search();

<<<<<<< HEAD
// Expose functions for inline onclick
window.approve = approve;
window.flagRec = flagRec;
=======
// Expose functions for inline onclick handlers
window.approve = approve;
window.flagRec = flagRec;
>>>>>>> ce371b3 (frontendcomplete)
