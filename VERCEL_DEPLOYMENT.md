# 🚀 Vercel Deployment Guide for Iwanyu Vendor Dashboard

## 📋 Pre-Deployment Checklist

### ✅ What's Ready for Deployment:
- ✅ Frontend (React)
- ✅ Backend API (Converted to serverless functions)
- ✅ Database (Neon PostgreSQL)
- ✅ Authentication (JWT + Forgot Password)
- ✅ Email Service (Brevo SMTP)
- ⚠️ File uploads (Need to migrate to Vercel Blob)

## 🔧 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## 📁 Step 2: Project Structure Verification

Your project now has:
```
/
├── frontend/          # React app
├── backend/
│   ├── api/          # Serverless functions
│   │   └── auth/     # Auth endpoints
│   ├── services/     # Email service
│   ├── utils/        # Auth utilities
│   └── prisma/       # Database schema
├── vercel.json       # Vercel configuration
└── package.json      # Root package.json
```

## 🚀 Step 3: Deploy to Vercel

### Option A: Deploy via CLI
```bash
cd /Users/dushimiyimanadavy/dashboard
vercel --prod
```

### Option B: Deploy via GitHub (Recommended)
1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings (see below)

## ⚙️ Step 4: Environment Variables in Vercel

Add these environment variables in Vercel dashboard:

### Database
```
DATABASE_URL=postgresql://neondb_owner:V9o5G1vM1pXy@ep-proud-sea-a5wxhvz6-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Authentication
```
JWT_SECRET=your-super-secure-production-jwt-secret-key
```

### Email (Brevo SMTP)
```
NODE_ENV=production
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=88e59b001@smtp-brevo.com
SMTP_PASS=Uyhf23mW7bGHX1AR
FROM_EMAIL=noreply@iwanyu.store
FRONTEND_URL=https://your-domain.vercel.app
```

## 📊 Step 5: Database Migration

After deployment, run Prisma migration:
```bash
# In your local terminal
cd backend
npx prisma db push
```

## 📂 Step 6: File Upload Migration (Required)

Current file uploads won't work on Vercel serverless. Choose one option:

### Option A: Vercel Blob (Recommended)
```bash
npm install @vercel/blob
```

### Option B: External Service
- Cloudinary
- AWS S3
- Google Cloud Storage

## 🌐 Step 7: Frontend Configuration

Create `/frontend/.env.production`:
```bash
REACT_APP_API_URL=https://your-domain.vercel.app/api
```

## 🔧 Step 8: Build Configuration

Verify your `vercel.json` is correct:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    },
    {
      "src": "backend/api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

## 🧪 Step 9: Test Deployment

After deployment, test these endpoints:
- ✅ https://your-domain.vercel.app (Frontend)
- ✅ https://your-domain.vercel.app/api/auth/login
- ✅ https://your-domain.vercel.app/api/auth/register
- ✅ https://your-domain.vercel.app/api/auth/forgot-password

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@prisma/client'"
**Solution:** Add to `vercel.json`:
```json
{
  "functions": {
    "backend/api/**/*.js": {
      "includeFiles": "backend/prisma/**"
    }
  }
}
```

### Issue: CORS errors
**Solution:** Already handled in serverless functions with CORS headers.

### Issue: File uploads failing
**Solution:** Migrate to Vercel Blob (see Step 6).

### Issue: Environment variables not working
**Solution:** Set them in Vercel dashboard, not in .env files.

## 📁 Files Created for Deployment

### Serverless Functions:
- ✅ `/backend/api/auth/login.js`
- ✅ `/backend/api/auth/register.js`
- ✅ `/backend/api/auth/forgot-password.js`
- ✅ `/backend/api/auth/reset-password.js`
- ✅ `/backend/api/auth/me.js`
- ✅ `/backend/utils/auth.js`

### Configuration:
- ✅ `/vercel.json`

### Still Needed:
- ⚠️ Product management endpoints
- ⚠️ File upload migration to Vercel Blob
- ⚠️ Frontend environment configuration

## 🎯 Next Steps

1. **Deploy basic version** with auth
2. **Add remaining API endpoints** 
3. **Migrate file uploads** to Vercel Blob
4. **Test all features** in production
5. **Set up custom domain** (optional)

---

**Ready to deploy your Iwanyu dashboard to Vercel!** 🛍️✨

### Quick Deploy Command:
```bash
cd /Users/dushimiyimanadavy/dashboard
vercel --prod
``` 