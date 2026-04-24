# 🔧 FIXING MISSING DEPENDENCIES

## ❌ Error You Got:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'rate-limit-redis'
```

## ✅ What Was Missing:
The `package.json` files were missing these critical packages:
- `rate-limit-redis` - Redis-backed rate limiting
- `axios` - HTTP client for API calls
- `socket.io-client` - WebSocket communication

## 🔨 FIX (Run These Commands):

### Step 1: Update Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Update Frontend Dependencies
```bash
cd ..
npm install
```

### Step 3: Verify Installation
```bash
# Check if all packages are installed
npm list

# For backend
cd backend
npm list
```

### Step 4: Start the Project
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
cd backend
npm run dev

# Terminal 4: Frontend
npm run dev
```

---

## 📋 Complete Package.json Dependencies

### Backend (`backend/package.json`):
```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.0.3",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "qrcode": "^1.5.4",
    "rate-limit-redis": "^4.1.5",
    "redis": "^4.6.12",
    "sharp": "^0.33.0",
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.7.2",
    "speakeasy": "^2.0.0",
    "uuid": "^9.0.1",
    "winston": "^3.11.0"
  }
}
```

### Frontend (`package.json`):
```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "socket.io-client": "^4.7.2",
    ... (all other packages)
  }
}
```

---

## 🚀 Quick Start (After Fix)

```bash
# 1. Install dependencies
npm install           # Frontend
cd backend && npm install  # Backend

# 2. Setup environment
cd backend
cp .env.example .env
# Edit .env with your MongoDB & Redis URLs

# 3. Start services (4 terminals)
# Terminal 1
mongod

# Terminal 2
redis-server

# Terminal 3
cd backend
npm run dev

# Terminal 4 (from root)
npm run dev

# 5. Test
cd backend
npm test
```

---

## ✅ Verification

After running `npm install`, verify:

```bash
# Check all dependencies installed
npm list

# Should show:
# npm notice root app v0.1.0
# npm notice name peekhour
# ├── axios@1.6.2
# ├── socket.io-client@4.7.2
# ├── ... (all other packages)

# For backend:
cd backend
npm list

# Should show:
# npm notice name peekhour-backend
# ├── axios@1.6.2
# ├── rate-limit-redis@4.1.5
# ├── socket.io-client@4.7.2
# ├── winston@3.11.0
# ├── ... (all other packages)
```

---

## 📝 Available npm Commands

### Frontend:
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run linter
```

### Backend:
```bash
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start normally
npm test         # Run test suite
npm run test:quick  # Quick tests
npm run seed     # Seed database
npm run check    # Check integrity
```

---

## 🆘 Troubleshooting

### Issue: `npm install` fails with build errors

**Solution**: Try this:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: `sharp` installation fails (Windows)

**Solution**: Install build tools:
```bash
# Windows: 
npm install --global --production windows-build-tools

# Then run:
npm install
```

### Issue: Port 5000 already in use

**Solution**: Change port in `.env`:
```bash
PORT=5001
```

### Issue: MongoDB connection error

**Solution**: Check MongoDB is running:
```bash
# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongodb

# Or use MongoDB Atlas cloud
```

---

## ✨ NOW YOU'RE READY!

Your project is now fully set up with all dependencies installed.

**Next Steps:**
1. Run `npm install` in both directories ✅
2. Configure `.env` file
3. Start all 4 services
4. Open http://localhost:3000
5. Enjoy! 🎉

Good luck! 🚀
