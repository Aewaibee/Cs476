/**
 * operator-confirm.js
 * Shows confirmation after submit.
 */
requireAuth("OPERATOR");
setHeader("Confirmation");
setNavActive();

const params = new URLSearchParams(location.search);
const id = params.get("id");
if(!id){
  alert("Missing record id");
  location.href="operator-dashboard.html";
}

(async function(){
  const rows = await apiFetch("/records/my");
  const r = rows.find(x => x.id === id);
  if(!r){
    q("box").textContent = "Record not found.";
    return;
  }
  q("box").innerHTML = `<b>✔ Record Submitted</b><br/>
    <div class="small">Record ID: ${r.id}</div>
    <div class="small">Status: ${r.status}</div>
    <div class="small" style="margin-top:6px">Next: Admin will review the record.</div>`;
})();