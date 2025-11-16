# Email OTP Setup Guide

## Issue

You're getting a **500 Internal Server Error** when trying to send OTP emails because the email service is not configured.

## What I Fixed

✅ Added proper error handling to `/api/email/send-otp` endpoint
✅ Added error handling to `/api/email/verify-otp` endpoint
✅ Now returns helpful error messages instead of crashing

## How to Fix the Email Configuration

### Step 1: Get a Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Enable **2-Step Verification** (if not already enabled)
4. After enabling 2FA, go back to **Security**
5. Scroll down to "How you sign in to Google"
6. Click on **App passwords**
7. Select app: **Mail**
8. Select device: **Other** (type "FoodShare Nairobi")
9. Click **Generate**
10. Copy the 16-character password (no spaces)

### Step 2: Update Your `.env` File

Add these variables to your `backend/.env` file:

```env
# Email Configuration for OTP
EMAIL2_USER=your-email@gmail.com
EMAIL2_PASSWORD=your-16-char-app-password

# Alternative: Use EMAIL1 or EMAIL for primary provider
# EMAIL1_USER=your-email@gmail.com
# EMAIL1_PASSWORD=your-16-char-app-password

# Optional: Specify which provider to use for OTP
EMAIL_PROVIDER_OTP=provider2
```

### Step 3: Example `.env` Configuration

Your `backend/.env` should look something like this:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=foodshare_db
DB_PORT=3306

# Email Configuration
EMAIL2_USER=foodshare.nairobi@gmail.com
EMAIL2_PASSWORD=abcd efgh ijkl mnop
EMAIL_PROVIDER_OTP=provider2

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 4: Restart Your Server

After updating the `.env` file:

```bash
# If running locally
npm start
# or
node backend/server.js

# If on Render
# Go to Render Dashboard > Your Service > Environment
# Add the EMAIL2_USER and EMAIL2_PASSWORD variables
# The service will restart automatically
```

## Deploying Email Config to Render

If you're using Render for hosting:

1. Go to your Render Dashboard
2. Select your **FoodShare Nairobi** service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add these variables:
   - Key: `EMAIL2_USER` | Value: `your-email@gmail.com`
   - Key: `EMAIL2_PASSWORD` | Value: `your-16-char-app-password`
   - Key: `EMAIL_PROVIDER_OTP` | Value: `provider2`
6. Click **Save Changes**
7. Your service will automatically redeploy

## Testing the Email OTP

After configuration:

1. Go to **DonorAccount.html**
2. Click **Verify Email Address** button
3. Check your email inbox for the OTP
4. Enter the 6-digit OTP
5. Click **Submit OTP**

## Alternative: Using a Different Email Service

If you don't want to use Gmail, you can modify `backend/Utils/mailer.js` to use:

- **SendGrid**
- **Mailgun**
- **AWS SES**
- **Outlook/Hotmail**

For Gmail alternatives, update the `service` field in `mailer.js`:

```javascript
return nodemailer.createTransport({
  service: "yahoo", // or 'outlook', 'hotmail', etc.
  auth: { user, pass },
});
```

## Security Notes

⚠️ **NEVER commit your `.env` file to Git!**

- Make sure `.env` is in your `.gitignore`
- Only share environment variables through secure channels
- Use different passwords for development and production

## Troubleshooting

### Error: "No email provider configured"

- Check that `EMAIL2_USER` and `EMAIL2_PASSWORD` are set in `.env`
- Verify the app password is correct (16 characters, no spaces)
- Restart your server after updating `.env`

### Error: "Invalid login"

- Make sure 2-Step Verification is enabled on your Google account
- Use an **App Password**, not your regular Google password
- Check that the email and password are correct

### Error: "Connection timeout"

- Check your internet connection
- Verify your firewall isn't blocking SMTP (port 587/465)
- Try using a different email provider

### OTP Not Received

- Check your spam/junk folder
- Verify the email address is correct
- Wait a few minutes (email delivery can be delayed)
- Try sending OTP again

## What Happens Now

With the error handling update:

1. ✅ The server won't crash anymore
2. ✅ You'll get a clear error message: "Failed to send OTP. Email service may not be configured."
3. ✅ You can configure email later without breaking the app
4. ✅ Other features continue to work even if email isn't configured

## Quick Fix (Temporary)

If you want to test without email for now, you can:

1. Skip email verification during testing
2. Manually mark users as verified in the database
3. Comment out the email verification button in `DonorAccount.html`

But for production, **you should configure email properly**!

---

**Need Help?** If you're still having issues, check the server logs for specific error messages.
