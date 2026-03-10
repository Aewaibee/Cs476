requireAuth("ADMIN");
setHeader("Map View");
setNavActive();

(async function () {
  const rows = await apiFetch("/admin/records/map");
  const tbody = q("tbl").querySelector("tbody");

  tbody.innerHTML = rows.map(r => {
    const lat = Number(r.geometry_lat).toFixed(6);
    const lng = Number(r.geometry_lng).toFixed(6);
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    return `
      <tr style="cursor:pointer" onclick="window.open('${url}','_blank')">
        <td>${r.date_applied}</td>
        <td>${r.operator_email}</td>
        <td>${r.product_name}</td>
        <td>${lat}</td>
        <td>${lng}</td>
        <td>${fmtStatus(r.status)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="6" class="small">No geocoded records.</td></tr>`;
})();