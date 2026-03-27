requireAuth("ADMIN");
setHeader("Search Records");
setNavActive();

let lastQuery = "";

async function search() {
  const operator = q("operator").value.trim();
  const product = q("product").value.trim();
  const status = q("status").value;


  const qs = new URLSearchParams();
  if (operator) qs.set("operator_email", operator);
  if (product) qs.set("product_name", product);
  if (status && status !== "ALL") qs.set("status", status); // ALL tries to filter to an "ALL" status which doesn't exist, so skip it

  lastQuery = qs.toString();

  const row_data = await apiFetch("/records/?" + lastQuery);
  const rows = row_data.records;
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
async function approve(id) {
  await apiFetch(`/records/${encodeURIComponent(id)}/approve/`, {
    method: "POST",
    body: JSON.stringify({ status: "APPROVED" })
  });
  await search();
}

/** Flag changes status to FLAGGED */
async function flagRec(id) {
  await apiFetch(`/records/${encodeURIComponent(id)}/flag/`, {
    method: "POST",
    body: JSON.stringify({ status: "FLAGGED" })
  });
  await search();
}

/** Reset filters and re-search */
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
  const url = API_BASE + `/records/export?type=${encodeURIComponent(type)}&` + lastQuery;

  fetch(url, { headers: { Authorization: "Bearer " + token } })
    .then(async res => {
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }

      const blob = await res.blob();

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

// Expose functions for inline onclick handlers
window.approve = approve;
window.flagRec = flagRec;
