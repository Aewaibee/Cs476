requireAuth("ADMIN");
setHeader("Admin Dashboard");
setNavActive();

(async function(){
  const rows = await apiFetch("/admin/records");
  const pending = rows.filter(r => r.status === "SUBMITTED").length;
  const flagged = rows.filter(r => r.status === "FLAGGED").length;

  q("kpis").innerHTML = `
    <div class="card kpi"><div class="label">Pending Review</div><div class="value">${pending}</div></div>
    <div class="card kpi"><div class="label">Flagged</div><div class="value">${flagged}</div></div>
  `;

  const tbody = q("tbl").querySelector("tbody");
  tbody.innerHTML = rows.slice(0,12).map(r => `
    <tr>
      <td>${r.date_applied}</td>
      <td>${r.operator_email}</td>
      <td>${r.product_name}</td>
      <td>${fmtStatus(r.status)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="small">No records in the system.</td></tr>`;
})();
