# 🏥 CharityDashboard.html - Fixes Applied

## 🐛 Issues Fixed

### Issue 1: TypeError - Cannot set properties of null (setting 'onclick')
**Error:** `CharityDashboard.html:495 Uncaught TypeError: Cannot set properties of null (setting 'onclick')`

**Root Cause:**
Code was trying to set `onclick` handlers for elements that don't exist in the HTML:
- `sidebar-requests` ❌ (doesn't exist)
- `sidebar-reports` ❌ (doesn't exist)

**Fix Applied:**
Added null checks before setting onclick handlers:

```javascript
// Only add onclick if elements exist
const sidebarRequests = document.getElementById("sidebar-requests");
if (sidebarRequests) {
  sidebarRequests.onclick = function () {
    // ... functionality
  };
}

const sidebarReports = document.getElementById("sidebar-reports");
if (sidebarReports) {
  sidebarReports.onclick = function () {
    // ... functionality
  };
}
```

✅ **Result:** No more TypeError errors

---

### Issue 2: 400 Bad Request on donor-offers endpoint
**Error:** `GET https://foodshare-nairobi-1.onrender.com/api/donor-offers?charity=Strathmore&status=Completed 400 (Bad Request)`

**Root Cause:**
Frontend was using wrong API endpoint format:
- **Wrong:** `/api/donor-offers?charity=Strathmore&status=Completed` ❌
  - Using query parameters
  - Using charity name instead of ID
  
Backend expects:
- **Correct:** `/api/donor-offers/:charity_id` ✅
  - Using URL parameter
  - Requires numeric charity ID

**Fix Applied:**

1. **Get charity ID from localStorage:**
```javascript
let charityId = null;
try {
  const charity = JSON.parse(localStorage.getItem('charity'));
  if (charity && charity.id) {
    charityId = charity.id;
    orgName = charity.orgname;
  }
} catch {}
```

2. **Use correct API endpoint format:**
```javascript
// OLD (wrong):
fetch(`${API_BASE_URL}/api/donor-offers?charity=${encodeURIComponent(orgName)}&status=Completed`)

// NEW (correct):
fetch(`${API_BASE_URL}/api/donor-offers/${charityId}`)
```

3. **Filter completed offers on client side:**
```javascript
donorOffers = offersData.offers.filter(offer => offer.status === 'Completed');
```

✅ **Result:** API call now succeeds (200 OK)

---

### Bonus: Auto URL Detection
Added automatic detection for local vs production environments:

```javascript
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000" // Local development
    : "https://foodshare-nairobi-1.onrender.com"; // Production

console.log("🌐 Using API Base URL:", API_BASE_URL);
```

✅ **Result:** Works seamlessly in both local and production environments

---

## 📋 Summary of Changes

### File: `frontend/Charity Pages/CharityDashboard.html`

**Changes Made:**

1. ✅ Added `API_BASE_URL` auto-detection (lines 315-325)
2. ✅ Replaced all hardcoded URLs with `${API_BASE_URL}`
3. ✅ Added null checks for sidebar onclick handlers (lines 496-514)
4. ✅ Fixed donor-offers API call:
   - Get charity ID from localStorage
   - Use correct endpoint format `/api/donor-offers/${charityId}`
   - Filter completed offers on client side

---

## 🧪 Testing

### Test 1: Verify No TypeError
1. Open CharityDashboard.html
2. Open browser console (F12)
3. ✅ Should see NO TypeError about onclick

### Test 2: Verify API Calls Work
1. Open CharityDashboard.html
2. Open browser console (F12)
3. Open Network tab
4. ✅ Should see: `GET /api/donor-offers/123` returning 200 OK
5. ❌ Should NOT see: 400 Bad Request errors

### Test 3: Verify URL Detection
1. **Local:** Open via `http://localhost:5500/`
   - Console should show: `🌐 Using API Base URL: http://localhost:3000`
   
2. **Production:** Open via `https://foodsharenairobi.netlify.app/`
   - Console should show: `🌐 Using API Base URL: https://foodshare-nairobi-1.onrender.com`

---

## 🎯 Expected Results

### Before (Broken):
```
❌ TypeError: Cannot set properties of null
❌ 400 Bad Request on donor-offers
❌ Hardcoded production URLs
```

### After (Fixed):
```
✅ No TypeError errors
✅ 200 OK on donor-offers
✅ Auto URL detection working
✅ Recent activity table loading correctly
```

---

## 🔍 Additional Notes

### Why charity ID is needed:
The backend route is defined as:
```javascript
// backend/Routes/donor_offers.js
router.get('/:charity_id', async (req, res) => {
  const { charity_id } = req.params;
  const sql = `SELECT * FROM donor_offers WHERE charity_id = ? ORDER BY created_at DESC`;
  // ...
});
```

It expects the charity ID as a **URL parameter**, not a query parameter.

### Where charity ID comes from:
When a charity logs in, the server returns:
```javascript
{
  success: true,
  message: 'Charity login successful',
  charity: {
    id: 123,              // ← This is what we need!
    orgname: 'Strathmore',
    email: 'charity@example.com',
    // ...
  }
}
```

This data is stored in `localStorage.setItem('charity', JSON.stringify(charityData))`.

---

## 📞 Still Having Issues?

### If you get 400 Bad Request:
1. **Check localStorage has charity data:**
   ```javascript
   console.log(JSON.parse(localStorage.getItem('charity')));
   ```
   Should show: `{id: 123, orgname: "...", ...}`

2. **Check charity ID is being used:**
   ```javascript
   // In browser console after page load
   console.log('Charity ID:', charityId);
   ```
   Should show a number, not null

3. **Check Network tab:**
   - URL should be: `/api/donor-offers/123`
   - NOT: `/api/donor-offers?charity=...`

### If localStorage is empty:
- You need to log in as a charity first
- Go to Login page → Select "Charity" → Enter credentials
- After login, charity data is automatically stored

---

## 🎉 Summary

Both errors are now fixed:
1. ✅ No more TypeError on missing elements
2. ✅ Donor offers API works correctly
3. ✅ Auto URL detection for local/production

CharityDashboard should now work perfectly in both local and production environments! 🚀

---

*Fixed: January 2025*

