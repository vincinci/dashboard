# Stack Auth Integration - Iwanyu Vendor Dashboard

## Overview

The Iwanyu Vendor Dashboard has been successfully integrated with **Stack Auth**, a modern open-source authentication platform that replaces our custom JWT authentication system. Stack Auth provides managed authentication with beautiful React components, professional UI, and enterprise-grade security.

## What is Stack Auth?

Stack Auth is an open-source authentication service that provides:
- 🔐 **Managed Authentication**: No need to handle JWTs, tokens, or sessions manually
- 🎨 **Beautiful UI Components**: Pre-built, customizable authentication components
- 🔒 **Enterprise Security**: Professional-grade security without the complexity
- 🚀 **Quick Setup**: Get authentication running in minutes
- 📱 **Multi-platform**: Supports React, Next.js, and vanilla JavaScript
- 🌐 **OAuth Support**: Built-in support for Google, GitHub, and other providers
- 👥 **Teams & Organizations**: Built-in support for multi-tenancy
- 🎛️ **Admin Dashboard**: Powerful user management interface

## Integration Details

### Frontend Changes

#### 1. Dependencies Added
```bash
npm install @stackframe/react
```

#### 2. Stack Auth Configuration (`frontend/src/stack.js`)
```javascript
import { StackClientApp } from "@stackframe/react";
import { useNavigate } from "react-router-dom";

export const stackClientApp = new StackClientApp({
  projectId: "152e4784-bdba-4155-a6c2-75dca4058e26",
  publishableClientKey: "pck_dk61bp0kgdr7a6hy9v3sbxawptfn5nntpvsxsfcqnahjr",
  tokenStore: "cookie",
  redirectMethod: {
    useNavigate,
  }
});
```

#### 3. App.js Updates
- Replaced custom `AuthProvider` with Stack Auth's `StackProvider`
- Added `StackTheme` for consistent styling
- Integrated `StackHandler` for authentication routes
- Removed custom login/register routes (handled by Stack Auth)

#### 4. Dashboard Component Updates
- Replaced `useAuth()` with `useUser()` and `useStackApp()`
- Updated API calls to use Stack Auth access tokens
- Simplified authentication logic

#### 5. Account Component Updates
- Replaced custom profile management with Stack Auth's `AccountSettings` component
- Simplified logout functionality

### Backend Changes

#### 1. Dependencies Added
```bash
npm install @stackframe/stack
```

#### 2. Stack Auth Configuration (`backend/config/stack.js`)
```javascript
const { StackServerApp } = require('@stackframe/stack');

const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  projectId: '152e4784-bdba-4155-a6c2-75dca4058e26',
  publishableClientKey: 'pck_dk61bp0kgdr7a6hy9v3sbxawptfn5nntpvsxsfcqnahjr',
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY
});
```

#### 3. Authentication Middleware (`backend/middleware/stackAuth.js`)
- Replaced JWT verification with Stack Auth token verification
- Simplified user authentication logic
- Better error handling

#### 4. API Routes Updates
- Updated all product routes to use Stack Auth middleware
- Removed custom authentication routes
- Simplified server.js configuration

## Environment Variables

### Frontend (`.env`)
```env
# Stack Auth Configuration
REACT_APP_STACK_PROJECT_ID=152e4784-bdba-4155-a6c2-75dca4058e26
REACT_APP_STACK_PUBLISHABLE_CLIENT_KEY=pck_dk61bp0kgdr7a6hy9v3sbxawptfn5nntpvsxsfcqnahjr

# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
```

### Backend (`.env`)
```env
# Stack Auth Configuration
STACK_SECRET_SERVER_KEY=ssk_tb857g2g2sg3qdacbz45dqx8p2gw8bgjxt0f7bew0t9s8

# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_B1TOLmyCUd2Q@ep-proud-sea-a5wxhvz6-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Authentication Flow

### 1. User Registration/Login
- Users visit `/handler/sign-up` or `/handler/sign-in`
- Stack Auth handles the entire authentication flow
- Beautiful, responsive UI with email/password and OAuth options
- Automatic email verification and password reset

### 2. Protected Routes
- Dashboard and Account pages automatically redirect unauthenticated users
- Uses `useUser({ or: "redirect" })` hook for seamless protection

### 3. API Authentication
- Frontend automatically includes Stack Auth access tokens in API requests
- Backend verifies tokens using Stack Auth's server SDK
- Secure, stateless authentication

## Key Benefits

### 🔒 **Enhanced Security**
- Professional-grade authentication without custom implementation
- Automatic token management and refresh
- Built-in protection against common vulnerabilities

### 🎨 **Better User Experience**
- Professional, responsive authentication UI
- Consistent design with your application
- Support for multiple authentication methods

### 🚀 **Simplified Development**
- No need to implement custom authentication logic
- Automatic session management
- Built-in account management features

### 📈 **Scalability**
- Ready for teams and organizations
- Built-in user management dashboard
- Support for advanced features like RBAC

## Available Routes

### Authentication Routes (Handled by Stack Auth)
- `/handler/sign-in` - Sign in page
- `/handler/sign-up` - Registration page
- `/handler/account-settings` - Account management
- `/handler/forgot-password` - Password reset
- `/handler/verify-email` - Email verification

### Application Routes
- `/dashboard` - Main vendor dashboard (protected)
- `/account` - Account settings (protected)
- `/` - Redirects to dashboard

## Stack Auth Dashboard

Access the Stack Auth admin dashboard at: https://app.stack-auth.com

Features:
- User management
- Analytics and insights
- Email template customization
- OAuth provider configuration
- Team and organization management

## Development Commands

### Start Development Servers
```bash
# Backend (from /backend directory)
npm start

# Frontend (from /frontend directory)
npm start
```

### Database Operations
```bash
# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

## Production Deployment

When deploying to production:

1. **Update Environment Variables**: Use production Stack Auth keys
2. **Configure Domains**: Update allowed domains in Stack Auth dashboard
3. **SSL/HTTPS**: Ensure all endpoints use HTTPS
4. **Database**: Use production database URL

## Migration from Custom Auth

### Removed Files/Components
- `frontend/src/contexts/AuthContext.js` - Replaced by Stack Auth
- `frontend/src/components/ProtectedRoute.js` - No longer needed
- `frontend/src/components/PublicRoute.js` - No longer needed
- `frontend/src/pages/Login.jsx` - Handled by Stack Auth
- `frontend/src/pages/Register.jsx` - Handled by Stack Auth
- `backend/routes/auth.js` - Authentication handled by Stack Auth
- Custom JWT middleware - Replaced by Stack Auth middleware

### Data Migration
- Existing user data in the database remains intact
- New users will be managed by Stack Auth
- Product associations continue to work with user IDs

## Support and Documentation

- **Stack Auth Documentation**: https://docs.stack-auth.com
- **Stack Auth GitHub**: https://github.com/stack-auth/stack-auth
- **Stack Auth Discord**: Join their community for support

## Next Steps

1. **Test Authentication Flow**: Verify sign-up, sign-in, and logout work correctly
2. **Customize UI**: Adjust Stack Auth components to match your brand
3. **Configure OAuth**: Add Google, GitHub, or other OAuth providers
4. **Set Up Teams**: Configure multi-tenancy if needed
5. **Production Deployment**: Deploy with production Stack Auth configuration

---

**Status**: ✅ **Integration Complete**
**Authentication**: Stack Auth (Managed)
**Frontend**: React with Stack Auth SDK
**Backend**: Node.js with Stack Auth verification
**Database**: PostgreSQL (Neon) - Compatible
**Servers**: Running on ports 3000 (frontend) and 3001 (backend) 