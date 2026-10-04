// "Report a problem" form and the user's own reports, with the admin's reply.
// Used by both Feedback pages. Needs /js/ui.js and /js/app-shell.js, and
// <div id="cases-root"></div> on the page.

(function () {
  const root = document.getElementById("cases-root");
  if (!root) return;
  const role = document.querySelector(".app").dataset.role;
  const user = role === "donor" ? getDonor() : getCharity();
  const userName = role === "donor" ? donorDisplayName() : user.name;

  root.innerHTML = `<form id="case-form" class="panel card">
      <div class="card-head"><h2 class="card-title">Report a Problem</h2></div>
      <p class="muted" style="margin-bottom: 1rem">For a missed pickup, unsafe food or a problem with ${
        role === "donor" ? "a charity" : "a donor"
      }. An admin reviews every report and replies below.</p>
      <div class="field-row">
        <div class="field">
          <label for="case-kind">Type</label>
          <select id="case-kind" name="kind" class="input">
            <option value="complaint">Complaint</option>
            ${
              role === "charity"
                ? '<option value="appeal">Appeal a rejected verification</option>'
                : ""
            }
          </select>
        </div>
        <div class="field">
          <label for="case-offer">Offer ID (optional)</label>
          <input type="number" id="case-offer" name="offer_id" min="1" class="input" />
        </div>
      </div>
      <div class="field">
        <label for="case-description">What happened?</label>
        <textarea id="case-description" name="description" rows="4" class="input" required></textarea>
      </div>
      <button type="submit" class="btn btn--solid">Send Report</button>
    </form>
    <div class="panel card">
      <div class="card-head"><h2 class="card-title">Your Reports</h2></div>
      <ul class="inbox" id="cases-list"></ul>
    </div>`;

  const list = document.getElementById("cases-list");

  async function loadCases() {
    if (!user.id) {
      list.innerHTML = '<li class="muted">Please log out and log in again to see your reports.</li>';
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/cases?user_type=${role}&user_id=${user.id}`
      );
      const cases = (await res.json()).cases || [];
      list.innerHTML = cases.length
        ? cases
            .map(
              (c) => `<li>
                <div>${statusBadge(c.status)} <strong>${esc(c.kind)}</strong>${
                c.offer_id ? ` · offer #${esc(c.offer_id)}` : ""
              }</div>
                <div>${esc(c.description)}</div>
                ${c.outcome ? `<div><strong>Reply:</strong> ${esc(c.outcome)}</div>` : ""}
                <span class="cell-sub">${esc(new Date(c.created_at).toLocaleString())}</span>
              </li>`
            )
            .join("")
        : '<li class="muted">You have not reported anything.</li>';
    } catch {
      list.innerHTML = '<li class="muted">Could not load your reports.</li>';
    }
  }

  document.getElementById("case-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = this.querySelector('[type="submit"]');
    setBusy(submitBtn, true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(this)),
          user_type: role,
          user_id: user.id,
          user_name: userName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("Report sent. An admin will reply here.", "success");
      this.reset();
      loadCases();
    } catch (err) {
      showToast(err.message || "Could not send the report.", "error");
    }
    setBusy(submitBtn, false);
  });

  loadCases();
})();
