// App shell for the signed-in donor and charity pages: sidebar, mobile menu,
// session helpers and the API address. Needs /js/ui.js and /styles/app.css.
//
//   <div class="app" data-role="donor" data-page="donations">
//     <main class="app-main">…</main>
//   </div>
//   <script src="/js/ui.js"></script>
//   <script src="/js/app-shell.js"></script>

const API_BASE_URL = "https://foodshare-nairobi-1.onrender.com";

const esc = escapeHtml;

// ---- Session (kept in localStorage by Login.html) ----
function readStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

function getDonor() {
  return readStored("donor") || {};
}

// The charity's details are stored under "jwt"
function getCharity() {
  return readStored("jwt") || {};
}

function donorDisplayName(donor = getDonor()) {
  return (
    (donor.fullname || "").trim() ||
    (donor.name || "").trim() ||
    (localStorage.getItem("donorName") || "").trim() ||
    "Donor"
  );
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function logout() {
  localStorage.clear();
  window.location.href = "/Login.html";
}

// ---- Shell ----
(function renderShell() {
  const app = document.querySelector(".app[data-role]");
  if (!app) return;
  const role = app.dataset.role;

  const icon = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    dashboard:
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    heart:
      '<path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.6a4.3 4.3 0 017.5 2.9c0 5.4-7.5 10-7.5 10z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',
    message: '<path d="M4 5h16v11H9l-5 4V5z"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    inbox:
      '<path d="M4 13l2-8h12l2 8v6H4v-6z"/><path d="M4 13h5a3 3 0 006 0h5"/>',
    logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };

  const donor = getDonor();
  const charity = getCharity();
  const NAV = {
    donor: {
      label: "Donor",
      dir: "/Food%20Donor%20Pages/",
      userName: donorDisplayName(donor),
      signedIn: Boolean(donor.id),
      items: [
        ["dashboard", "Dashboard", "FoodDonor.html", "dashboard"],
        ["donations", "Donations", "Donations.html", "box"],
        ["charities", "Charities", "BrowseCharities.html", "heart"],
        ["requests", "Charity Requests", "CharityRequestsPage.html", "list"],
        ["account", "Account", "DonorAccount.html", "user"],
        ["feedback", "Feedback", "Feedback.html", "message"],
      ],
      // Nudge donors who haven't verified their email yet
      alertOn: donor.verified ? null : "account",
    },
    charity: {
      label: "Charity",
      dir: "/Charity%20Pages/",
      userName: charity.name || "Charity",
      signedIn: Boolean(charity.name),
      items: [
        ["dashboard", "Dashboard", "CharityDashboard.html", "dashboard"],
        ["post-need", "Post Food Need", "PostFoodNeed.html", "plus"],
        ["offers", "Browse Donor Offers", "BrowseDonorOffers.html", "inbox"],
        ["requests", "Requests", "Requests.html", "list"],
        ["profile", "Profile", "Profile.html", "user"],
        ["feedback", "Feedback", "Feedback.html", "message"],
      ],
      alertOn: charity.verified ? null : "profile",
    },
  }[role];

  // These pages are no use without a session
  if (!NAV.signedIn) {
    window.location.replace("/Login.html");
    return;
  }

  const links = NAV.items
    .map(
      ([id, label, file, iconName]) =>
        `<a href="${NAV.dir}${file}"${
          id === app.dataset.page ? ' class="active" aria-current="page"' : ""
        }>${icon(ICONS[iconName])}${label}${
          id === NAV.alertOn
            ? '<span class="app-nav-alert" title="Not verified yet"></span>'
            : ""
        }</a>`
    )
    .join("");

  const logo = `<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z"/></svg>`;

  app.insertAdjacentHTML(
    "afterbegin",
    `<div class="app-topbar">
      <button class="app-menu-btn" id="appMenuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="appSidebar">${icon(
        ICONS.menu
      )}</button>
      <span class="app-logo">FoodShare Kenya</span>
    </div>
    <div class="app-overlay" id="appOverlay"></div>
    <aside class="app-sidebar" id="appSidebar">
      <a href="/" class="app-logo">${logo}<span>FoodShare Kenya</span></a>
      <div class="app-role">${NAV.label}</div>
      <nav class="app-nav" aria-label="${NAV.label}">${links}</nav>
      <div class="app-sidebar-foot">
        <div class="app-user"><span class="avatar">${esc(
          initials(NAV.userName)
        )}</span><span>${esc(NAV.userName)}</span></div>
        <nav class="app-nav" aria-label="Account">
          <button type="button" id="appInbox">${icon(
            ICONS.bell
          )}Notifications</button>
          <button type="button" id="appLogout">${icon(
            ICONS.logout
          )}Logout</button>
        </nav>
      </div>
    </aside>`
  );

  const sidebar = document.getElementById("appSidebar");
  const overlay = document.getElementById("appOverlay");
  const menuBtn = document.getElementById("appMenuBtn");
  const setMenuOpen = (open) => {
    sidebar.classList.toggle("is-open", open);
    overlay.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  menuBtn.addEventListener("click", () =>
    setMenuOpen(!sidebar.classList.contains("is-open"))
  );
  overlay.addEventListener("click", () => setMenuOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });
  document.getElementById("appLogout").addEventListener("click", logout);
  const userId = role === "donor" ? donor.id : charity.id;
  if (userId) initInbox(document.getElementById("appInbox"), role, userId);
})();
