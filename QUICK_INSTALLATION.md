# ⚡ QUICK INSTALLATION GUIDE

## 🎯 5-Minute Setup

### Copy-Paste Installation (Linux/Mac):

```bash
# 1. Clone repository
git clone https://github.com/your-username/peekhour.git
cd peekhour

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with your MongoDB and Redis URLs
npm install

# 3. Frontend setup
cd ..
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm install

# 4. Start services
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev

# Terminal 3: Tests
cd backend && node tests/apiTestSuite.js
```

---

## 📦 WHAT YOU NEED INSTALLED

| Component | Version | Why | Installation |
|-----------|---------|-----|--------------|
| **Node.js** | 18+ | Runtime environment | https://nodejs.org |
| **npm** | 9+ | Package manager | Comes with Node.js |
| **MongoDB** | 4.4+ | Database | Local or MongoDB Atlas |
| **Redis** | 6+ | Cache layer | Local or Redis Cloud |
| **Git** | Any | Version control | https://git-scm.com |

---

## 🚀 INSTALLATION COMMANDS BY OS

### Windows:
```batch
REM 1. Download Node.js from https://nodejs.org
REM 2. Download MongoDB from https://mongodb.com
REM 3. Download Redis from https://github.com/microsoftarchive/redis

REM 4. Clone and setup
git clone <repo-url>
cd peekhour\backend
copy .env.example .env
npm install

cd ..
echo NEXT_PUBLIC_API_URL=http://localhost:5000 > .env.local
npm install
```

### Mac:
```bash
# Install using Homebrew
brew install node mongodb redis git

# Clone and setup
git clone <repo-url>
cd peekhour/backend
cp .env.example .env
npm install

cd ..
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm install
```

### Linux (Ubuntu/Debian):
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb

# Install Redis
sudo apt-get install -y redis-server

# Setup project
git clone <repo-url>
cd peekhour/backend
cp .env.example .env
npm install

cd ..
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm install
```

---

## ✅ VERIFICATION CHECKLIST

After installation, verify everything:

```bash
# ✓ Check Node.js
node --version

# ✓ Check npm
npm --version

# ✓ Check MongoDB
mongo --eval "db.version()"

# ✓ Check Redis
redis-cli ping

# ✓ Check project
cd peekhour
npm list  # Should show all dependencies

# ✓ Run tests
cd backend
node tests/apiTestSuite.js
```

---

## 🎯 NEXT STEPS

1. **Read documentation**: Open `PRODUCTION_READY.md`
2. **Configure environment**: Edit `backend/.env`
3. **Start development**: Run all 4 commands from "Copy-Paste Installation"
4. **Test the app**: Open http://localhost:3000
5. **Read roadmap**: See `INSTALLATION_AND_FEATURES_ROADMAP.md` for features to add

---

## 🆘 TROUBLESHOOTING

**Port already in use?**
```bash
# Change port in .env
PORT=5001
```

**MongoDB connection failed?**
```bash
# Use MongoDB Atlas instead
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

**Redis connection failed?**
```bash
# Use Redis Cloud instead
REDIS_URL=redis://default:pass@host:port
```

**npm install fails?**
```bash
# Clear cache and try again
npm cache clean --force
npm install
```

Good luck! 🚀
