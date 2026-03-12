<<<<<<< HEAD
=======
/**
 * operator-dashboard.js
 * Shows KPI counts and recent records for the logged-in operator.
 */
>>>>>>> ce371b3 (frontendcomplete)
requireAuth("OPERATOR");
setHeader("Operator Dashboard");
setNavActive();

<<<<<<< HEAD
(async function () {
    // Fetch the operator's records
    const rows = await apiFetch("/records/my");

    // KPI counters
    const drafts = rows.filter(r => r.status === "DRAFT").length;
    const submitted = rows.filter(r => r.status === "SUBMITTED").length;

    // Render KPIs
    q("kpis").innerHTML = `
=======
(async function(){
  // Fetch the operator's records
  const rows = await apiFetch("/records/my");

  // KPI counters
  const drafts = rows.filter(r => r.status === "DRAFT").length;
  const submitted = rows.filter(r => r.status === "SUBMITTED").length;

  // Render KPIs
  q("kpis").innerHTML = `
>>>>>>> ce371b3 (frontendcomplete)
    <div class="card kpi"><div class="label">Drafts</div><div class="value">${drafts}</div></div>
    <div class="card kpi"><div class="label">Submitted</div><div class="value">${submitted}</div></div>
  `;

<<<<<<< HEAD
    // Render the recent records table
    const tbody = q("tbl").querySelector("tbody");
    tbody.innerHTML = rows.slice(0, 10).map(r => `
=======
  // Render the recent records table
  const tbody = q("tbl").querySelector("tbody");
  tbody.innerHTML = rows.slice(0,10).map(r => `
>>>>>>> ce371b3 (frontendcomplete)
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
<<<<<<< HEAD
})();
=======
})();
>>>>>>> ce371b3 (frontendcomplete)
