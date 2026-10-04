// CharityRequests.js - Fetches and renders charity food requests on the donor dashboard

document.addEventListener("DOMContentLoaded", function () {
  fetchCharityRequests();
});

function fetchCharityRequests() {
  const section = document.getElementById("charity-requests-section");
  if (!section) return;
  // The table is there from the start; its rows are placeholders until loaded
  section.innerHTML = `<div class="table-wrap"><table class="table">
    <thead><tr>
      <th>Charity</th>
      <th>Food Item</th>
      <th>Quantity</th>
      <th>Pickup Location</th>
      <th>Date Needed</th>
      <th>Notes</th>
      <th>Action</th>
    </tr></thead>
    <tbody></tbody></table></div>`;
  const tbody = section.querySelector("tbody");
  tableLoading(tbody, ["text", "text", "num", "text", "num", "text", "btn"], 4);
  fetch(`${API_BASE_URL}/api/charity-requests`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.requests.length) {
        section.innerHTML =
          '<p class="muted">No open requests from charities at this time.</p>';
        return;
      }
      // Urgent needs first; the server already sorts the rest by date
      tbody.innerHTML = [...data.requests]
        .sort((a, b) => (b.urgent || 0) - (a.urgent || 0))
        .map(
            (req) => `<tr>
              <td>${esc(req.org_name)}</td>
              <td>${esc(req.food_item)}${
              req.urgent ? " " + statusBadge("Urgent") : ""
            }</td>
              <td class="num">${esc(req.quantity)}</td>
              <td>${esc(req.pickup_location)}</td>
              <td class="num">${
                req.date ? new Date(req.date).toLocaleDateString() : ""
              }</td>
              <td>${esc(req.notes || "")}</td>
              <td><a class="btn btn--solid" href="CharityRequestDetails.html?id=${encodeURIComponent(
                req.id
              )}">View</a></td>
            </tr>`
          )
          .join("");
    })
    .catch(() => {
      section.innerHTML = '<p class="muted">Failed to load requests.</p>';
    });
}
