# MongoDB Setup & Troubleshooting Guide

## Quick Start - MongoDB Connection

### 1. Environment Setup

Create/update `.env` file in backend directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/peekhour
# OR for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/peekhour

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads
```

### 2. Start MongoDB

**Local MongoDB:**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**MongoDB Atlas (Cloud):**
1. Create cluster at https://www.mongodb.com/cloud/atlas
2. Create database user
3. Get connection string
4. Update MONGODB_URI in .env

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start Backend

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Test Database Connection

```bash
npm run test-db
```

---

## Database Initialization

### Seed Sample Data

```bash
npm run seed
```

This will:
- Create sample users
- Create sample posts
- Create departments
- Create comments and reactions
- Set up follow relationships

### Check Database Integrity

```bash
npm run check
```

Verifies:
- All models are properly indexed
- No orphaned references
- Data consistency

---

## Troubleshooting Guide

### Issue: MongoDB Connection Failed

**Error**: `MongooseError: Failed to connect to MongoDB`

**Solutions**:
1. Check MongoDB is running
   ```bash
   mongosh  # Should connect successfully
   ```

2. Verify connection string in .env
   ```env
   MONGODB_URI=mongodb://localhost:27017/peekhour
   ```

3. Check network connectivity to MongoDB server
   ```bash
   telnet localhost 27017  # Should connect
   ```

4. For MongoDB Atlas, whitelist IP address:
   - Go to Network Access in Atlas dashboard
   - Add your IP or 0.0.0.0/0 for development

5. Check MongoDB user credentials
   ```javascript
   // In MongoDB shell
   show users
   db.auth("username", "password")
   ```

### Issue: Collections Not Created

**Error**: `Error: Model not found`

**Solutions**:
1. Models are created on first insert, ensure first request creates a document
2. Manually create indexes:
   ```javascript
   // In backend/scripts/createIndexes.js
   import { Post, User, Comment, ... } from '../models/index.js'
   
   async function createIndexes() {
     await Post.collection.createIndex({ userId: 1, createdAt: -1 })
     await User.collection.createIndex({ username: 1 })
     // ... etc
   }
   
   createIndexes().catch(console.error)
   ```

3. Run seed script to initialize data

### Issue: Duplicate Key Error

**Error**: `MongoServerError: E11000 duplicate key error`

**Solutions**:
1. This happens on unique fields (username, email, mobileNumber)
   
2. Check for existing data:
   ```javascript
   // In MongoDB shell
   db.users.find({ username: "duplicate_username" })
   ```

3. Remove duplicate:
   ```javascript
   db.users.deleteOne({ username: "duplicate_username" })
   ```

4. Clear all data (development only):
   ```javascript
   db.dropDatabase()
   ```

### Issue: Timeout Errors

**Error**: `MongooseError: timeout of 30000ms`

**Solutions**:
1. Increase connection timeout in `backend/config/database.js`:
   ```javascript
   await mongoose.connect(MONGODB_URI, {
     serverSelectionTimeoutMS: 10000,  // Increase from 5000
     socketTimeoutMS: 60000,            // Increase from 45000
     connectTimeoutMS: 10000
   })
   ```

2. Check MongoDB server is responsive:
   ```bash
   mongosh ping
   ```

3. Check network latency to MongoDB server
   ```bash
   ping mongodb-server-address
   ```

### Issue: Memory Leak / High Memory Usage

**Symptoms**: Node process memory keeps growing

**Solutions**:
1. Avoid loading large datasets without pagination
   ```javascript
   // BAD
   const all = await Post.find({})  // Could be millions of docs
   
   // GOOD
   const page = await Post.find({}).limit(20).skip(0)
   ```

2. Use lean() for read-only queries
   ```javascript
   // Good for memory
   const data = await Post.find({}).lean()
   ```

3. Close connections on unused references
   ```javascript
   // Avoid circular references
   const post = await Post.findById(id)
   post = null  // Unreference when done
   ```

4. Check for memory leaks:
   ```bash
   node --inspect server.js
   # Then visit chrome://inspect in Chrome
   ```

### Issue: Slow Queries

**Symptoms**: API responses taking >1000ms

**Solutions**:
1. Check query performance with explain():
   ```javascript
   const explain = await Post.find({ userId }).explain('executionStats')
   console.log(explain)  // Check executionStages.stage === "COLLSCAN"
   ```

2. Add missing indexes:
   ```javascript
   // In model definition
   postSchema.index({ userId: 1, createdAt: -1 })
   ```

3. Use aggregation for complex queries:
   ```javascript
   // Better performance for large result sets
   const results = await Model.aggregate([
     { $match: { ... } },
     { $lookup: { from: 'other', localField: 'id', foreignField: '_id' } },
     { $group: { _id: '$category', count: { $sum: 1 } } },
     { $sort: { count: -1 } },
     { $limit: 10 }
   ])
   ```

4. Optimize populate:
   ```javascript
   // Avoid deep population chains
   const data = await Model.find()
     .populate('userId', 'name email')  // Only needed fields
     .lean()
   ```

5. Use database profiling:
   ```javascript
   // In MongoDB shell
   db.setProfilingLevel(1, { slowms: 100 })  // Log queries >100ms
   db.system.profile.find().sort({ ts: -1 }).limit(5)
   ```

### Issue: Data Inconsistency

**Symptoms**: Related data not synchronized

**Solutions**:
1. Use transactions for multi-step operations:
   ```javascript
   const session = await mongoose.startSession()
   session.startTransaction()
   
   try {
     await Post.create([{ ... }], { session })
     await Notification.create({ ... }, { session })
     await session.commitTransaction()
   } catch (error) {
     await session.abortTransaction()
     throw error
   } finally {
     await session.endSession()
   }
   ```

2. Implement data cleanup jobs:
   ```javascript
   // Run every hour
   setInterval(async () => {
     // Clean up expired stories
     await Story.deleteMany({ expiresAt: { $lt: new Date() } })
     
     // Clean up expired sessions
     await Session.deleteMany({ expiresAt: { $lt: new Date() } })
     
     // Clean up old login history
     const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
     await LoginHistory.deleteMany({ loginAt: { $lt: ninetyDaysAgo } })
   }, 60 * 60 * 1000)
   ```

3. Validate data on save:
   ```javascript
   // In model pre-save hook
   schema.pre('save', async function(next) {
     // Validate references exist
     if (this.userId) {
       const user = await User.findById(this.userId)
       if (!user) {
         throw new Error('Referenced user does not exist')
       }
     }
     next()
   })
   ```

### Issue: ObjectId Not Valid

**Error**: `Cast to ObjectId failed for value "xxx"`

**Solutions**:
1. Always validate before using in queries:
   ```javascript
   import mongoose from 'mongoose'
   
   if (!mongoose.Types.ObjectId.isValid(id)) {
     return res.status(400).json({ error: 'Invalid ID format' })
   }
   ```

2. Convert string IDs to ObjectId when needed:
   ```javascript
   const objectId = new mongoose.Types.ObjectId(stringId)
   ```

3. Check API clients are sending valid IDs:
   - IDs should be 24-character hex strings
   - Example: `507f1f77bcf86cd799439011`

### Issue: Document Not Found After Save

**Error**: Document saved but not immediately queryable

**Solutions**:
1. This is usually not an issue with local MongoDB

2. For MongoDB Atlas with eventual consistency:
   ```javascript
   // Add small delay before querying
   const doc = await Model.create({ ... })
   await new Promise(r => setTimeout(r, 100))
   const saved = await Model.findById(doc._id)
   ```

3. Use writeAs cursor to ensure durability:
   ```javascript
   // Already default in production
   ```

---

## Performance Optimization Tips

### 1. Database Connection Pooling
```javascript
// Already configured in database.js
// Mongoose handles connection pooling automatically
```

### 2. Batch Operations
```javascript
// Faster than individual inserts
await Post.insertMany(posts)

// Faster than individual updates
const bulk = Post.collection.initializeOrderedBulkOp()
bulk.find({ isActive: true }).updateOne({ $set: { status: 'inactive' } })
await bulk.execute()
```

### 3. Select Specific Fields
```javascript
// Reduces data transfer and memory
const users = await User.find().select('username email profileAvatar')
```

### 4. Use TTL Indexes for Cleanup
```javascript
// Story expires after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// LoginHistory expires after 90 days
loginHistorySchema.index({ loginAt: 1 }, { expireAfterSeconds: 7776000 })
```

### 5. Redis Caching
```javascript
import redis from 'redis'

const client = redis.createClient({ host: 'localhost', port: 6379 })

// Get from cache or database
export const getUserWithCache = async (userId) => {
  const cached = await client.get(`user:${userId}`)
  if (cached) return JSON.parse(cached)
  
  const user = await User.findById(userId)
  if (user) {
    await client.setex(`user:${userId}`, 3600, JSON.stringify(user))
  }
  return user
}
```

### 6. Implement Pagination Everywhere
```javascript
// Prevents loading millions of documents
export const getPosts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, parseInt(req.query.limit) || 20)
  const skip = (page - 1) * limit
  
  const posts = await Post.find()
    .skip(skip)
    .limit(limit)
    .lean()
  
  const total = await Post.countDocuments()
  return {
    data: posts,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit)
    }
  }
}
```

---

## Migration from Old Database (if needed)

### Export from Old MySQL Database

```bash
mysqldump -u root -p peekhour_db > backup.sql
```

### Create Migration Script

```javascript
// backend/scripts/migrate.js
import mysql from 'mysql2/promise'
import mongoose from 'mongoose'
import { User, Post, ... } from '../models/index.js'

const mysqlConnection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'peekhour_db'
})

// Migrate users
const [users] = await mysqlConnection.query('SELECT * FROM users')
const mongoUsers = users.map(u => ({
  _id: new mongoose.Types.ObjectId(),
  name: u.name,
  username: u.username,
  email: u.email,
  ...
}))
await User.insertMany(mongoUsers)

// Similar for other models...
```

### Run Migration

```bash
node backend/scripts/migrate.js
```

---

## Backup & Recovery

### Backup MongoDB

```bash
# Local backup
mongodump --db peekhour --out ./backup

# MongoDB Atlas backup
# Use Atlas UI: https://cloud.mongodb.com/ -> Backup section
```

### Restore MongoDB

```bash
# From local backup
mongorestore --db peekhour ./backup/peekhour

# From MongoDB Atlas
# Use restore function in Atlas UI
```

### Automated Backups

```javascript
// backend/scripts/backup.js
import { exec } from 'child_process'
import cron from 'node-cron'

// Backup daily at 2 AM
cron.schedule('0 2 * * *', () => {
  const timestamp = new Date().toISOString().split('T')[0]
  exec(`mongodump --db peekhour --out ./backups/${timestamp}`, 
    (error, stdout, stderr) => {
      if (error) console.error('Backup failed:', error)
      else console.log('Backup successful')
    }
  )
})
```

---

## Monitoring

### Enable MongoDB Profiling

```javascript
// In MongoDB shell
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### Application Monitoring

```javascript
// backend/middleware/monitoring.js
import logger from '../config/logger.js'

export const queryMonitor = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`)
    }
  })
  
  next()
}

// In server.js
app.use(queryMonitor)
```

---

## Best Practices Checklist

- [ ] MongoDB connection string uses environment variables
- [ ] Appropriate indexes on all frequently queried fields
- [ ] Pagination implemented on all list endpoints
- [ ] Lean queries used for read-only operations
- [ ] Error handling with try-catch on all async operations
- [ ] Input validation before database queries
- [ ] Authorization checks before data access
- [ ] Soft delete (isActive flag) instead of hard delete where appropriate
- [ ] TTL indexes for temporary data cleanup
- [ ] Transaction support for multi-document operations
- [ ] Rate limiting on API endpoints
- [ ] Request logging and monitoring
- [ ] Regular backups configured
- [ ] Database profiling enabled in development
- [ ] Field selection with .select() to reduce data transfer

---

## Additional Resources

- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/best-practices/)
- [MongoDB Performance](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/)

---

Generated: 2026-04-24
