# Brevo SMTP Configuration for Real Email Sending

## 🚀 Quick Setup

### Step 1: Add Environment Variables
Add these lines to your `/backend/.env` file:

```bash
# Email Configuration (Brevo SMTP)
NODE_ENV=production
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=88e59b001@smtp-brevo.com
SMTP_PASS=Uyhf23mW7bGHX1AR
FROM_EMAIL=noreply@iwanyu.store
FRONTEND_URL=http://localhost:3000
```

### Step 2: Restart Backend Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Test Configuration
Test the email by using the forgot password feature:

1. **Go to:** `http://localhost:3000/login`
2. **Click:** "Forgot your password?"
3. **Enter:** `test@iwanyu.com` (or your real email)
4. **Check logs** - You should see "✅ Password reset email sent via Brevo!"

## 🧪 Test the Forgot Password Feature

1. **Go to:** `http://localhost:3000/login`
2. **Click:** "Forgot your password?"
3. **Enter:** `test@iwanyu.com`
4. **Check your inbox** - A real email will be sent via Brevo!

## ✅ What Changes

### Before (Development):
- ❌ Fake emails using Ethereal Email
- ❌ Only preview URLs in console
- ❌ No real emails sent

### After (Brevo Production):
- ✅ Real emails sent via Brevo SMTP
- ✅ Professional email templates
- ✅ Emails arrive in actual inbox
- ✅ Iwanyu branding and styling

## 📧 Email Settings

- **Provider:** Brevo (formerly Sendinblue)
- **SMTP Server:** smtp-relay.brevo.com
- **Port:** 587 (TLS encryption)
- **Authentication:** Required
- **From Address:** noreply@iwanyu.store

## 🔒 Security Notes

- ✅ Credentials are stored securely in `.env`
- ✅ TLS encryption enabled
- ✅ Professional "from" address
- ⚠️ Keep `.env` file private (never commit to git)

## 🐛 Troubleshooting

### If emails don't send:
1. **Check environment variables** - Verify they're in `.env`
2. **Check backend logs** - Look for email success/error messages
3. **Verify Brevo account** - Ensure SMTP is enabled
4. **Check spam folder** - Emails might be filtered

### Common Issues:
- **"Authentication failed"** → Check username/password in `.env`
- **"Connection timeout"** → Check internet connection
- **"Invalid from address"** → Verify domain settings in Brevo

### Success Messages in Console:
```
✅ Password reset email sent via Brevo!
📧 Message ID: <some-id>
📧 Sent to: test@iwanyu.com
```

## 📊 Brevo Dashboard

Monitor your email sending at:
- **Dashboard:** https://app.brevo.com/
- **SMTP Settings:** https://app.brevo.com/settings/keys/smtp
- **Email Statistics:** Track delivery rates

---

## 🎯 Next Steps

After setup:
1. **Test with real email addresses**
2. **Configure custom domain** (optional)
3. **Set up email templates** in Brevo (optional)
4. **Monitor delivery rates** in Brevo dashboard

**Status: 🚀 READY FOR REAL EMAIL SENDING!** 