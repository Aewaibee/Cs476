requireAuth("OPERATOR");
setHeader("Operator Dashboard");
setNavActive();

(async function () {
  // Get the current operator
  const user = getUser()
  // Fetch the operator's records
  const rowData = await apiFetch(`/records/?operator_email=${encodeURIComponent(user.email)}`);
  const rows = rowData.records;

  // KPI counters
  const drafts = rows.filter(r => r.status === "DRAFT").length;
  const submitted = rows.filter(r => r.status === "SUBMITTED").length;

  // Render KPIs
  q("kpis").innerHTML = `
    <div class="card kpi"><div class="label">Drafts</div><div class="value">${drafts}</div></div>
    <div class="card kpi"><div class="label">Submitted</div><div class="value">${submitted}</div></div>
  `;

  // Render the recent records table
  const tbody = q("tbl").querySelector("tbody");
  tbody.innerHTML = rows.slice(0, 10).map(r => `
    <tr>
      <td>${r.date_applied ?? r.dateApplied}</td>
      <td>${r.product_name ?? r.productName}</td>
      <td>${fmtStatus(r.status)}</td>
      <td>
        <a href="operator-review.html?id=${encodeURIComponent(r.id)}">
          <button class="secondary">${r.status === "DRAFT" ? "Continue" : "View"}</button>
        </a>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="small">No records yet.</td></tr>`;
})();
