// CharityRequests.js - Handles fetching and rendering charity food requests for donors

document.addEventListener('DOMContentLoaded', function () {
  fetchCharityRequests();
});

function fetchCharityRequests() {
  const section = document.getElementById('charity-requests-section');
  if (!section) return;
  section.innerHTML = '<div class="text-gray-500">Loading requests...</div>';
  fetch('http://localhost:3000/api/charity-requests')
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.requests.length) {
        section.innerHTML = '<div class="text-gray-500">No open requests from charities at this time.</div>';
        return;
      }
      let html = `<table class="w-full text-sm border border-[#d5e7d0] rounded-xl bg-white mt-6">
        <thead><tr class="border-b border-[#d5e7d0]">
          <th class="px-4 py-3">Charity</th>
          <th class="px-4 py-3">Food Item</th>
          <th class="px-4 py-3">Quantity</th>
          <th class="px-4 py-3">Pickup Location</th>
          <th class="px-4 py-3">Date Needed</th>
          <th class="px-4 py-3">Notes</th>
          <th class="px-4 py-3">Action</th>
        </tr></thead><tbody>`;
      data.requests.forEach(req => {
        html += `<tr class="border-t border-[#d5e7d0]">
          <td class="px-4 py-2 text-[#5e974e]">${req.org_name}</td>
          <td class="px-4 py-2">${req.food_item}</td>
          <td class="px-4 py-2">${req.quantity}</td>
          <td class="px-4 py-2">${req.pickup_location}</td>
          <td class="px-4 py-2">${req.date ? new Date(req.date).toLocaleDateString() : ''}</td>
          <td class="px-4 py-2">${req.notes || ''}</td>
          <td class="px-4 py-2">
            <button class="bg-[#53d22c] hover:bg-[#43b81a] text-white px-4 py-1 rounded-full text-xs font-bold" onclick="window.location.href='CharityRequestDetails.html?id=${req.id}'">View</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
      section.innerHTML = html;
    })
    .catch(() => {
      section.innerHTML = '<div class="text-red-500">Failed to load requests.</div>';
    });
}
