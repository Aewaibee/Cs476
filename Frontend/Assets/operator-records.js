/**
 * operator-records.js
 * Filter and list records for the operator.
 */
requireAuth("OPERATOR");
setHeader("My Records");
setNavActive();

async function load(){
  const rows = await apiFetch("/records/my");
  const st = q("status").value;

  // Filter on the client for simplicity
  const filtered = (st === "ALL") ? rows : rows.filter(r => r.status === st);

  const tbody = q("tbl").querySelector("tbody");
  tbody.innerHTML = filtered.map(r => {
    const date = r.date_applied ?? r.dateApplied;
    const product = r.product_name ?? r.productName;
    const pcp = r.pcp_act_number ?? r.pcpActNumber;
    return `
      <tr>
        <td>${date}</td>
        <td>${product}</td>
        <td>${pcp}</td>
        <td>${fmtStatus(r.status)}</td>
        <td><a href="operator-review.html?id=${encodeURIComponent(r.id)}"><button class="secondary">View</button></a></td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="5" class="small">No records.</td></tr>`;
}

q("btnRefresh").addEventListener("click", load);
q("status").addEventListener("change", load);
load();