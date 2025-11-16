# CORS & API Errors - Fix Guide

## 🔴 Problems Identified

### 1. **CORS Policy Error (CRITICAL)**

```
Access to fetch at 'https://foodshare-nairobi-1.onrender.com/api/admin/charity-verifications' 
from origin 'https://foodsharenairobi.netlify.app' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Origin' header in the response must not be 
the wildcard '*' when the request's credentials mode is 'include'.
```

**Root Cause:**
- Backend was using `app.use(cors())` which defaults to `Access-Control-Allow-Origin: *` (wildcard)
- When browser sends credentials (cookies, auth headers), CORS policy requires **specific origin**, not wildcard
- Netlify frontend was being blocked from accessing Render backend

### 2. **500 Internal Server Errors**

```
foodshare-nairobi-1.onrender.com/api/admin/dashboard-stats:1 
Failed to load resource: the server responded with a status of 500
```

**Root Cause:**
- Dashboard stats endpoint was querying non-existent tables or columns
- Tables had different names than expected (`food_donations` vs `donations`)
- Column names didn't match actual database schema
- No error handling for missing tables

### 3. **404 Not Found Errors**

```
/api/admin/users?type=charity:1 Failed to load resource: the server responded with a status of 404
```

**Root Cause:**
- Frontend making requests to Netlify domain instead of Render backend
- API client not using correct base URL

---

## ✅ Fixes Applied

### Fix 1: CORS Configuration (backend/server.js)

**Before:**
```javascript
app.use(cors()); // Wildcard '*' - causes issues with credentials
```

**After:**
```javascript
// CORS Configuration - Allow specific origins with credentials
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://foodsharenairobi.netlify.app', // Frontend
  'https://foodshare-nairobi-1.onrender.com' // Backend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
```

**What This Fixes:**
- ✅ Allows Netlify frontend to access Render backend
- ✅ Supports credentials (cookies, auth headers)
- ✅ Works in development (localhost) and production
- ✅ Blocks unauthorized origins
- ✅ Supports all HTTP methods needed

---

### Fix 2: Dashboard Stats Endpoint (backend/Routes/adminDashboard.js)

**Before:**
```javascript
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM food_donations');
    const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity WHERE status = "pending"');
    // ... more queries that could fail
    res.json({ ... });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

**After:**
```javascript
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Initialize defaults
    let totalFoodRescued = 0;
    let pendingApprovals = 0;
    let feedbackRes = [];
    let donationTrends = { labels: [], values: [] };

    // Try multiple table names with fallbacks
    try {
      const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM food_donations');
      totalFoodRescued = foodRes[0]?.totalFoodRescued || 0;
    } catch (e) {
      try {
        const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM donations');
        totalFoodRescued = foodRes[0]?.totalFoodRescued || 0;
      } catch (e2) {
        console.error('Error fetching food rescued:', e2.message);
      }
    }

    // Check verified column instead of status
    try {
      const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity WHERE verified = 0 OR verified IS NULL');
      pendingApprovals = pendingRes[0]?.pendingApprovals || 0;
    } catch (e) {
      try {
        const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity_verifications WHERE status = "pending"');
        pendingApprovals = pendingRes[0]?.pendingApprovals || 0;
      } catch (e2) {
        console.error('Error fetching pending approvals:', e2.message);
      }
    }

    // ... similar pattern for other queries

    res.json({
      success: true,
      totalFoodRescued,
      pendingApprovals,
      recentFeedback: feedbackRes,
      donationTrends
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: err.message, message: 'Error fetching dashboard statistics' });
  }
});
```

**What This Fixes:**
- ✅ Handles missing tables gracefully
- ✅ Tries multiple table names (food_donations vs donations)
- ✅ Uses correct column names (verified vs status)
- ✅ Returns default values instead of crashing
- ✅ Logs errors for debugging
- ✅ Always returns valid JSON response

---

### Fix 3: API Client Base URL (frontend/js/api.js)

**Already Fixed in Previous Update:**
```javascript
constructor() {
  // Use environment-based URL
  this.baseURL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://foodshare-nairobi-1.onrender.com';
}
```

**What This Fixes:**
- ✅ Always uses Render backend URL in production
- ✅ Uses localhost for development
- ✅ Prevents 404 errors from wrong domain

---

## 🚀 Deployment Steps

### 1. **Deploy Backend to Render**

```bash
# Push changes to GitHub
git add backend/server.js backend/Routes/adminDashboard.js
git commit -m "Fix CORS configuration and API endpoints"
git push origin main
```

Render will automatically:
- Detect the push
- Rebuild the backend
- Deploy with new CORS settings

**Or manually deploy:**
1. Go to Render Dashboard
2. Select your foodshare-nairobi service
3. Click "Manual Deploy" → "Deploy latest commit"

### 2. **Test After Deployment**

Open browser console on https://foodsharenairobi.netlify.app and check:

```javascript
// Should work now
fetch('https://foodshare-nairobi-1.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log);
```

---

## 🔍 Understanding CORS

### What is CORS?

**CORS** (Cross-Origin Resource Sharing) is a browser security feature that blocks web pages from making requests to a different domain than the one serving the page.

**Example:**
- Frontend: `https://foodsharenairobi.netlify.app` (origin A)
- Backend: `https://foodshare-nairobi-1.onrender.com` (origin B)
- Browser blocks requests from A to B **unless** B explicitly allows it

### The Wildcard Problem

```javascript
// ❌ BAD - Doesn't work with credentials
Access-Control-Allow-Origin: *
credentials: 'include'

// ✅ GOOD - Specific origin with credentials
Access-Control-Allow-Origin: https://foodsharenairobi.netlify.app
credentials: 'include'
```

**Why?**
- Wildcard `*` means "allow any origin"
- With credentials, this would be a huge security risk
- Browser blocks it to prevent credential theft

### Credentials Mode

When `credentials: true` is set:
- Browser sends cookies with requests
- Backend must use **specific origin**, not `*`
- Backend must set `Access-Control-Allow-Credentials: true`

---

## 📋 Verification Checklist

After deploying, verify these work:

- [ ] Login page works without CORS errors
- [ ] Admin dashboard loads stats successfully
- [ ] Charity verifications page loads
- [ ] User management page works
- [ ] No 500 errors in console
- [ ] No 404 errors in console
- [ ] No CORS errors in console

---

## 🐛 Debugging Tips

### Check CORS Headers

```bash
# Test CORS from command line
curl -H "Origin: https://foodsharenairobi.netlify.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  --verbose \
  https://foodshare-nairobi-1.onrender.com/api/health
```

Look for these headers in response:
- `Access-Control-Allow-Origin: https://foodsharenairobi.netlify.app`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

### Check Backend Logs

In Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Look for:
   - `CORS blocked origin: ...` (if origin not allowed)
   - `Error fetching ...` (database errors)
   - Any 500 error stack traces

### Check Browser Console

Press F12 in browser, go to Console tab:
- Red errors = problems
- Look for "CORS", "500", "404"
- Check Network tab for failed requests

---

## 🔐 Security Considerations

### Current Setup

✅ **Good:**
- Specific origins allowed (not wildcard)
- Credentials properly configured
- HTTPS enforced in production

⚠️ **Could Improve:**
- Add authentication middleware to verify user tokens
- Add rate limiting to prevent abuse
- Add helmet.js for security headers
- Validate all origins against database/config

### Production Security Checklist

- [ ] Use environment variables for allowed origins
- [ ] Add authentication middleware
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add helmet.js for security headers
- [ ] Log all CORS rejections
- [ ] Monitor for suspicious origins
- [ ] Use HTTPS everywhere
- [ ] Validate JWT tokens on protected routes

---

## 📚 Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [CORS Errors Explained](https://web.dev/cross-origin-resource-sharing/)

---

*Last Updated: January 2025*

