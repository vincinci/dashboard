# 🚀 Iwanyu Vendor Dashboard - Production Deployment Guide

This guide covers deploying the Iwanyu Vendor Dashboard to production environments.

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (we recommend Neon, Supabase, or Railway)
- A hosting platform (Vercel, Netlify, Railway, Heroku, etc.)

## 🔧 Environment Setup

### Backend Environment Variables

Create a `.env` file in the `/backend` directory:

```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_super_secret_jwt_key_min_32_characters"
PORT=3001
NODE_ENV=production
```

### Frontend Environment Variables

Create a `.env` file in the `/frontend` directory:

```env
REACT_APP_API_URL=https://your-backend-domain.com/api
```

## 🗄️ Database Setup

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Run Database Migrations:**
   ```bash
   npm run db:migrate
   ```

## 🏗️ Build Process

### 1. Install All Dependencies
```bash
npm run setup
```

### 2. Build Frontend for Production
```bash
npm run build
```

This creates an optimized production build in `/frontend/build`.

## 🌐 Deployment Options

### Option 1: Railway (Recommended - Full Stack)

1. **Connect your GitHub repository to Railway**
2. **Deploy Backend:**
   - Create a new service
   - Select your repository
   - Set root directory to `/backend`
   - Add environment variables
   - Railway will auto-deploy on push

3. **Deploy Frontend:**
   - Create another service  
   - Select your repository
   - Set root directory to `/frontend`
   - Add `REACT_APP_API_URL` pointing to your backend URL

### Option 2: Vercel + Railway

1. **Deploy Backend on Railway:**
   - Follow backend steps from Option 1

2. **Deploy Frontend on Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy from frontend directory
   cd frontend
   vercel --prod
   ```

### Option 3: Heroku

1. **Backend Deployment:**
   ```bash
   # Create Heroku app
   heroku create your-app-name-api
   
   # Add PostgreSQL addon
   heroku addons:create heroku-postgresql:mini
   
   # Set environment variables
   heroku config:set JWT_SECRET="your_jwt_secret"
   heroku config:set NODE_ENV=production
   
   # Deploy
   git subtree push --prefix backend heroku main
   ```

2. **Frontend Deployment:**
   ```bash
   # Create frontend app
   heroku create your-app-name-frontend
   
   # Set buildpack
   heroku buildpacks:set heroku/nodejs
   
   # Set API URL
   heroku config:set REACT_APP_API_URL="https://your-app-name-api.herokuapp.com/api"
   
   # Deploy
   git subtree push --prefix frontend heroku main
   ```

### Option 4: DigitalOcean/VPS

1. **Server Setup:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx
   ```

2. **Deploy Application:**
   ```bash
   # Clone repository
   git clone your-repo-url
   cd iwanyu-vendor-dashboard
   
   # Setup and build
   npm run setup
   npm run build
   
   # Start backend with PM2
   cd backend
   pm2 start server.js --name "iwanyu-api"
   
   # Serve frontend with Nginx
   sudo cp -r ../frontend/build/* /var/www/html/
   ```

## 🔒 Security Checklist

- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Set secure CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable database connection SSL
- [ ] Set up proper firewall rules
- [ ] Regular security updates

## 📊 Performance Optimization

### Backend Optimizations
- [ ] Enable gzip compression
- [ ] Set up connection pooling
- [ ] Add rate limiting
- [ ] Enable caching headers
- [ ] Monitor database queries

### Frontend Optimizations
- [ ] Enable static file compression
- [ ] Set up CDN for assets
- [ ] Configure proper caching headers
- [ ] Optimize bundle size
- [ ] Enable service worker

## 🔍 Monitoring & Logging

### Recommended Tools
- **Application Monitoring:** New Relic, DataDog, or Sentry
- **Database Monitoring:** Your database provider's monitoring
- **Uptime Monitoring:** UptimeRobot or Pingdom
- **Log Management:** LogRocket or Papertrail

### Health Check Endpoints
- Backend: `GET /` - Returns API status
- Frontend: Access root URL - Should load dashboard

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues:**
   ```bash
   # Test database connection
   cd backend
   npx prisma db push
   ```

2. **CORS Errors:**
   - Ensure frontend URL is in CORS whitelist
   - Check API URL in frontend environment variables

3. **Authentication Issues:**
   - Verify JWT secret is same across environments
   - Check token expiration settings

4. **Build Failures:**
   ```bash
   # Clear cache and rebuild
   npm run setup
   npm run build
   ```

### Debug Commands
```bash
# Check backend logs
pm2 logs iwanyu-api

# Test API endpoints
curl https://your-api-url.com/

# Check frontend build
cd frontend && npm run build
```

## 📱 Mobile Responsiveness

The dashboard is fully responsive and works on:
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1023px)  
- ✅ Mobile (320px - 767px)

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run setup
      
      - name: Build frontend
        run: npm run build
      
      - name: Deploy to Railway
        # Add your deployment steps here
```

## 📞 Support

For deployment issues:
1. Check this guide thoroughly
2. Review application logs
3. Test API endpoints manually
4. Verify environment variables
5. Contact the development team

---

## 🎉 Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test user login  
- [ ] Test product CRUD operations
- [ ] Test product limit enforcement
- [ ] Verify responsive design
- [ ] Test logout functionality
- [ ] Check all error messages
- [ ] Verify security headers
- [ ] Test with real data
- [ ] Set up monitoring alerts

**🚀 Your Iwanyu Vendor Dashboard is now ready for production!** 