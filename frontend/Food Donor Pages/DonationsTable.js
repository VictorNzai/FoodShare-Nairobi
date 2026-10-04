// The donor's offers and donations in one table, with a status filter and a
// details dialog. Used by FoodDonor.html and Donations.html.
// Needs /js/ui.js and /js/app-shell.js, and these elements on the page:
// #donationsBody, #donation-status-filter, #donation-modal, #modal-content

let allDonations = [];

async function loadDonations() {
  const donor = getDonor();
  const tbody = document.getElementById("donationsBody");
  tableLoading(tbody, ["num", "text", "two", "badge", "btn"]);
  try {
    // A donor's activity lives in two tables: offers to a charity, and donations
    const [offersRes, donationsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/donor-offers?donor_id=${donor.id}`),
      fetch(`${API_BASE_URL}/api/donations?donor_id=${donor.id}`),
    ]);
    const offersData = await offersRes.json();
    const donationsData = await donationsRes.json();
    // Normalize both to a common shape
    const offers = (offersData.offers || []).map((o) => ({
      id: o.id,
      charity_name: o.charity_name || "-",
      food_type: o.food_type,
      description: o.description,
      quantity: o.quantity,
      unit: o.unit,
      expiry: o.expiry,
      pickup_address: o.pickup_address,
      notes: o.notes,
      status: o.status || "Pending",
      created_at: o.created_at,
      type: "offer",
    }));
    const donations = (donationsData.donations || []).map((d) => ({
      id: d.id,
      charity_name: d.charity_orgname || d.charity_name || "-",
      food_type: d.category || d.food_type,
      description: d.description,
      quantity: d.quantity,
      unit: d.unit,
      expiry: d.expiry,
      pickup_address: d.pickup_address,
      notes: d.notes,
      status: d.status || "Scheduled",
      created_at: d.created_at,
      type: "donation",
    }));
    allDonations = [...offers, ...donations].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    renderDonationsTable();
  } catch (e) {
    tbody.innerHTML = noteRow(5, "Failed to load donations.");
    console.error("Error fetching donations:", e);
  }
}

function renderDonationsTable() {
  const filter = document
    .getElementById("donation-status-filter")
    .value.toLowerCase();
  const rows = allDonations
    .map((d, index) => ({ d, index }))
    .filter(
      ({ d }) => filter === "all" || String(d.status).toLowerCase() === filter
    );
  document.getElementById("donationsBody").innerHTML = rows.length
    ? rows
        .map(
          ({ d, index }) => `<tr>
            <td class="num">#${esc(d.id)}</td>
            <td>${esc(d.charity_name || "-")}</td>
            <td>${esc(d.food_type)} - ${esc(d.description || "")}
              <span class="cell-sub">${esc(d.quantity)} ${esc(d.unit)}</span></td>
            <td>${statusBadge(d.status)}</td>
            <td><button type="button" class="btn btn--quiet" onclick="showDonation(${index})">View Details</button></td>
          </tr>`
        )
        .join("")
    : noteRow(5, "No donations found for this status.");
}

function formatDateTime(value) {
  const date = new Date(value);
  return value && !isNaN(date) ? date.toLocaleString() : value || "-";
}

function showDonation(index) {
  const d = allDonations[index];
  if (!d) return;
  const rows = [
    [d.type === "offer" ? "Offer ID" : "Donation ID", `#${d.id}`],
    ["Charity", d.charity_name || "-"],
    ["Food Type", d.food_type],
    ["Description", d.description || "-"],
    ["Quantity", `${d.quantity} ${d.unit}`],
    ["Expiry Date", d.expiry ? String(d.expiry).slice(0, 10) : "-"],
    ["Pickup Address", d.pickup_address || "-"],
    ["Notes", d.notes || "-"],
    ["Created At", formatDateTime(d.created_at)],
  ];
  document.getElementById("modal-content").innerHTML =
    rows
      .map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`)
      .join("") + `<dt>Status</dt><dd>${statusBadge(d.status)}</dd>`;
  document.getElementById("donation-modal").showModal();
}

document
  .getElementById("donation-status-filter")
  .addEventListener("change", renderDonationsTable);
loadDonations();
