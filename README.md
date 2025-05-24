# 🛒 Iwanyu Vendor Dashboard

A modern, full-stack vendor dashboard for the Iwanyu e-commerce platform built with React, Node.js, Express, Prisma, and PostgreSQL.

## ✨ Features

- **🔐 Authentication System**: JWT-based login and registration
- **📦 Product Management**: Full CRUD operations for vendor products
- **🎯 Product Limit Enforcement**: Maximum 10 products per vendor
- **💰 RWF Currency Support**: Prices displayed in Rwandan Francs
- **👤 Account Management**: Profile editing and settings
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile
- **🎨 Modern UI**: Clean white/gray + yellow design with flat aesthetics
- **🛡️ Secure Routes**: Protected API endpoints with authentication
- **⚡ Real-time Updates**: Instant feedback for all operations

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Context** - State management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Database (Neon)
- **JWT** - Authentication
- **bcrypt** - Password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database

### 1. Clone Repository
```bash
git clone <repository-url>
cd iwanyu-vendor-dashboard
```

### 2. Environment Setup

**Backend (`.env` in `/backend`):**
```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_super_secret_jwt_key_min_32_characters"
PORT=3001
NODE_ENV=development
```

**Frontend (`.env` in `/frontend`):**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 3. Installation & Setup
```bash
# Install all dependencies
npm run setup

# Set up database
npm run db:setup
```

### 4. Development
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:backend  # Backend on :3001
npm run dev:frontend # Frontend on :3000
```

## 🎯 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new vendor account |
| POST | `/api/auth/login` | Login vendor |
| PUT | `/api/auth/profile` | Update vendor profile |
| GET | `/api/auth/me` | Get current vendor info |

### Products (Authentication Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get vendor's products |
| POST | `/api/products` | Add new product (with limit check) |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

## 🔒 Authentication Flow

1. **Registration**: Vendors create account with business details
2. **Login**: Email/password authentication returns JWT token
3. **Protected Routes**: All product operations require valid JWT
4. **Token Management**: Automatic token refresh and logout

## 🎨 UI Components

### 🏠 Dashboard Features
- Welcome section with vendor name
- Product usage progress bar (x/10 limit)
- Responsive product grid
- Add product button (disabled at limit)
- Empty state with call-to-action

### 📝 Product Form Features
- Real-time validation
- Image upload support (up to 3)
- Category selection
- RWF price input
- Delivery/pickup options
- Modal design

### 🛍️ Product Card Features
- Product image display
- RWF price formatting
- Stock indicators
- Delivery/pickup badges
- Edit/delete actions

### 👤 Account Management
- Profile editing
- Account information display
- Quick actions sidebar

## 🔢 Product Limit Logic

The system enforces a strict 10-product limit:

1. **Backend Validation**: Checks count before creation
2. **Frontend Prevention**: Disables add button at limit
3. **Visual Feedback**: Progress bar and count display
4. **Error Handling**: Clear limit reached messages

## 🌍 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide including:

- Environment setup
- Database configuration
- Multiple hosting options (Railway, Vercel, Heroku, VPS)
- Security checklist
- Performance optimization
- Monitoring setup

### Quick Deploy Options

**Railway (Recommended):**
1. Connect GitHub repo
2. Create backend service with environment variables
3. Create frontend service with API URL

**Vercel + Railway:**
```bash
# Backend on Railway, Frontend on Vercel
cd frontend && vercel --prod
```

## 📱 Responsive Design

Fully responsive across all devices:
- **Desktop** (1024px+): Full layout with sidebar
- **Tablet** (768-1023px): Adapted grid layout  
- **Mobile** (320-767px): Stacked mobile-first design

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization
- Environment variable security
- CORS configuration

## 🎯 Currency Support

- **RWF (Rwandan Franc)** pricing
- Formatted number display (1,500 RWF)
- Whole number inputs (no decimals)
- Consistent currency throughout app

## 📊 Performance

- **Frontend**: Optimized React build, lazy loading, code splitting
- **Backend**: Efficient database queries, connection pooling
- **Database**: Indexed queries, optimized schema

## 🔧 Development Commands

```bash
# Setup & Installation
npm run setup              # Install all dependencies
npm run setup:backend      # Install backend only
npm run setup:frontend     # Install frontend only

# Development
npm run dev                # Start both servers
npm run dev:backend        # Start backend only
npm run dev:frontend       # Start frontend only

# Production
npm run build              # Build frontend for production
npm start                  # Start production backend

# Database
npm run db:generate        # Generate Prisma client
npm run db:push           # Push schema to database
npm run db:migrate        # Run database migrations
npm run db:setup          # Full database setup
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check JWT secret consistency
   - Verify token expiration

2. **Database Connection**
   - Validate DATABASE_URL
   - Ensure database is accessible

3. **CORS Issues**
   - Check API URL in frontend env
   - Verify CORS configuration

4. **Build Failures**
   ```bash
   # Clear and rebuild
   npm run setup && npm run build
   ```

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review deployment guide
3. Check application logs
4. Contact development team

## 📄 License

MIT License - see LICENSE file for details.

---

**🎉 Ready for production! Your vendors can now manage their products with ease.** 