# 🧪 Local Testing Guide

## ✅ What I Just Fixed

Your `AdminDashboard.html` now **automatically detects** if you're running locally or in production!

### The Fix:

```javascript
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000" // 🏠 Local development
    : "https://foodshare-nairobi-1.onrender.com"; // 🌐 Production
```

All 16 hardcoded URLs have been replaced with `${API_BASE_URL}`.

---

## 🚀 How to Test Locally

### Step 1: Start Your Backend Server

**Option A: Using nodemon (with auto-restart)**

```bash
cd "C:\Users\victo\Desktop\Food Share Nairobi"
npm run dev
```

**Option B: Using node (manual restart)**

```bash
cd "C:\Users\victo\Desktop\Food Share Nairobi"
npm start
```

You should see:

```
Server is running on port 3000
✅ Connected to foodshare_db successfully
```

### Step 2: Open Frontend

**Option A: Using VS Code Live Server**

1. Open `frontend/AdminPages/AdminDashboard.html` in VS Code
2. Right-click → "Open with Live Server"
3. Browser opens at `http://localhost:5500/...` or `http://127.0.0.1:5500/...`

**Option B: Using Python HTTP Server**

```bash
cd "C:\Users\victo\Desktop\Food Share Nairobi\frontend"
python -m http.server 5500
```

Then open: `http://localhost:5500/AdminPages/AdminDashboard.html`

**Option C: Direct File Open**

- Just double-click the HTML file
- Opens at `file:///C:/Users/victo/Desktop/...`

### Step 3: Check Console

Open browser console (F12) and you should see:

```
🌐 Using API Base URL: http://localhost:3000
```

✅ **If you see this, it's working!** All API calls will now go to your local backend.

---

## 🔍 How to Verify It's Working

### Test 1: Check API Base URL

Open browser console (F12) on the admin dashboard and type:

```javascript
console.log(API_BASE_URL);
```

Should show: `http://localhost:3000`

### Test 2: Test API Call

In console:

```javascript
fetch(`${API_BASE_URL}/api/health`)
  .then((r) => r.json())
  .then(console.log);
```

Should return:

```json
{ "success": true, "message": "API is healthy" }
```

### Test 3: Load Dashboard Stats

Just load the admin dashboard normally. Check console for:

- ✅ No CORS errors
- ✅ `🌐 Using API Base URL: http://localhost:3000`
- ✅ Stats loading successfully

---

## 🐛 Troubleshooting

### Problem: Still seeing 500 errors

**Check:**

1. **Backend running?**

   - Look for "Server is running on port 3000" in terminal
   - Check `http://localhost:3000/api/health` in browser

2. **Database connected?**

   - Terminal should show: "✅ Connected to foodshare_db successfully"
   - If not, check your `.env` file database credentials

3. **Right tables exist?**
   - Backend logs will show specific table errors
   - Check backend terminal for error messages

### Problem: CORS errors still appear

**Solution:**

- Make sure backend is running with the updated CORS configuration
- Restart your backend server:
  1. Press `Ctrl+C` in backend terminal
  2. Run `npm start` again
  3. Wait for "✅ Connected to foodshare_db successfully"

### Problem: API calls go to wrong URL

**Check browser console:**

- Should see: `🌐 Using API Base URL: http://localhost:3000`
- If not, hard refresh: `Ctrl + Shift + R`

**Check `window.location.hostname`:**

```javascript
console.log(window.location.hostname);
```

- Should be: `localhost` or `127.0.0.1`

---

## 📊 Expected vs Actual

### ✅ What Should Happen (Local):

```
Frontend: http://localhost:5500/AdminPages/AdminDashboard.html
    ↓
API Calls: http://localhost:3000/api/admin/dashboard-stats
    ↓
Backend: Running on localhost:3000
    ↓
Database: MySQL running locally
```

### 🌐 What Happens (Production):

```
Frontend: https://foodsharenairobi.netlify.app/AdminPages/AdminDashboard.html
    ↓
API Calls: https://foodshare-nairobi-1.onrender.com/api/admin/dashboard-stats
    ↓
Backend: Deployed on Render
    ↓
Database: MySQL on Aiven/PlanetScale
```

---

## 🎯 Success Checklist

When testing locally, you should see:

- [ ] Backend terminal: "Server is running on port 3000"
- [ ] Backend terminal: "✅ Connected to foodshare_db successfully"
- [ ] Browser console: "🌐 Using API Base URL: http://localhost:3000"
- [ ] No CORS errors in console
- [ ] No 500 errors (unless database tables missing)
- [ ] Dashboard stats loading (or showing "--" if no data)

---

## 🔄 Switching Between Local and Production

### No changes needed!

The code automatically detects:

- **Local:** `localhost` or `127.0.0.1` → uses `http://localhost:3000`
- **Production:** Any other domain → uses `https://foodshare-nairobi-1.onrender.com`

---

## 📞 Still Having Issues?

### Share This Info:

1. **Backend terminal output:**

   - Copy the last 20 lines from backend terminal
   - Look for errors, especially about database tables

2. **Browser console output:**

   - Press F12
   - Copy any errors (red text)
   - Include the "🌐 Using API Base URL" line

3. **Specific error:**
   - What endpoint is failing? (e.g., `/api/admin/dashboard-stats`)
   - What's the error message?
   - What's the status code? (500, 404, etc.)

---

## 🎉 You're All Set!

Your admin dashboard now works seamlessly in both:

- 🏠 **Local development** (localhost:3000)
- 🌐 **Production** (Render + Netlify)

No more manual URL changes needed! 🚀

---

_Happy Testing!_
