# MongoDB Migration Guide

## ✅ What Has Been Completed

### 1. Database Configuration
- **File**: `backend/config/database.js`
- Converted from MySQL connection pool to MongoDB/Mongoose connection
- Added connection event handlers for better monitoring

### 2. Mongoose Models Created
All models are located in `backend/models/`:

- **User.js** - User accounts with authentication, profiles, followers/following
- **Post.js** - Posts with media, location, likes, shares, hashtags
- **Department.js** - Community departments with members and roles
- **Comment.js** - Comments with nested replies and likes
- **Notification.js** - User notifications for various events
- **Story.js** - Temporary stories (24-hour expiry)
- **Message.js** - Direct messages between users
- **index.js** - Central export file for all models

### 3. Controllers Converted
- **authController.js** - Complete conversion (register, login, profile, etc.)

### 4. Server Configuration
- **server.js** - Updated to connect to MongoDB before starting
- **package.json** - Updated dependencies (removed mysql2, added mongoose)

### 5. Seed Script
- **database/seedMongo.js** - Complete MongoDB seed script with:
  - 10 sample users (password: password123)
  - 6 departments
  - 10 posts with hashtags
  - 5 comments
  - 3 notifications
  - Follow relationships
  - Department memberships

## 📋 Controllers Remaining to Convert

The following controllers still use MySQL and need to be converted to Mongoose:

1. **postController.js** (546 lines) - High Priority
2. **departmentController.js** - High Priority
3. **userController.js** - High Priority
4. **commentController.js** - High Priority
5. **searchController.js** - High Priority
6. **followController.js**
7. **notificationController.js**
8. **profileController.js**
9. **messageController.js**
10. **storyController.js**
11. **reactionController.js**
12. **departmentEnhancementsController.js**
13. **analyticsController.js**
14. **moderationController.js**
15. **securityController.js**
16. **nestedCommentsController.js**
17. **postEnhancementsController.js**

## 🔧 Conversion Patterns

### MySQL to Mongoose Query Conversion

#### 1. **Find One Record**

**MySQL:**
```javascript
const [users] = await db.query(
  'SELECT * FROM users WHERE username = ?',
  [username]
);
const user = users[0];
```

**Mongoose:**
```javascript
const user = await User.findOne({ username });
```

#### 2. **Find Multiple Records**

**MySQL:**
```javascript
const [posts] = await db.query(
  'SELECT * FROM posts WHERE user_id = ? AND is_active = TRUE ORDER BY created_at DESC LIMIT ?',
  [userId, limit]
);
```

**Mongoose:**
```javascript
const posts = await Post.find({ 
  userId, 
  isActive: true 
})
.sort({ createdAt: -1 })
.limit(limit);
```

#### 3. **Create Record**

**MySQL:**
```javascript
const [result] = await db.query(
  'INSERT INTO posts (user_id, content, media_url) VALUES (?, ?, ?)',
  [userId, content, mediaUrl]
);
const postId = result.insertId;
```

**Mongoose:**
```javascript
const post = await Post.create({
  userId,
  content,
  mediaUrl
});
const postId = post._id;
```

#### 4. **Update Record**

**MySQL:**
```javascript
await db.query(
  'UPDATE users SET name = ?, bio = ? WHERE id = ?',
  [name, bio, userId]
);
```

**Mongoose:**
```javascript
await User.findByIdAndUpdate(userId, { name, bio });
// OR
const user = await User.findById(userId);
user.name = name;
user.bio = bio;
await user.save();
```

#### 5. **Delete Record**

**MySQL:**
```javascript
await db.query('DELETE FROM posts WHERE id = ?', [postId]);
```

**Mongoose:**
```javascript
await Post.findByIdAndDelete(postId);
// OR soft delete
await Post.findByIdAndUpdate(postId, { isActive: false });
```

#### 6. **Join Queries (Populate)**

**MySQL:**
```javascript
const [posts] = await db.query(`
  SELECT p.*, u.username, u.name, d.name as department_name
  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN departments d ON p.department_id = d.id
  WHERE p.is_active = TRUE
`);
```

**Mongoose:**
```javascript
const posts = await Post.find({ isActive: true })
  .populate('userId', 'username name')
  .populate('departmentId', 'name')
  .lean();
```

#### 7. **Count Records**

**MySQL:**
```javascript
const [result] = await db.query(
  'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
  [userId]
);
const count = result[0].count;
```

**Mongoose:**
```javascript
const count = await Post.countDocuments({ userId });
```

#### 8. **Array Operations (likes, followers, etc.)**

**MySQL (multiple tables):**
```javascript
const [result] = await db.query(
  'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
  [postId, userId]
);
```

**Mongoose (embedded arrays):**
```javascript
await Post.findByIdAndUpdate(postId, {
  $addToSet: { likes: { userId } }
});

// To remove:
await Post.findByIdAndUpdate(postId, {
  $pull: { likes: { userId } }
});
```

#### 9. **Complex Queries with Multiple Conditions**

**MySQL:**
```javascript
const [posts] = await db.query(`
  SELECT * FROM posts 
  WHERE is_active = TRUE 
  AND country = ? 
  AND city = ?
  AND media_type IN ('photo', 'video')
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`, [country, city, limit, offset]);
```

**Mongoose:**
```javascript
const posts = await Post.find({
  isActive: true,
  country,
  city,
  mediaType: { $in: ['photo', 'video'] }
})
.sort({ createdAt: -1 })
.limit(limit)
.skip(offset);
```

#### 10. **Text Search**

**MySQL:**
```javascript
const [posts] = await db.query(
  'SELECT * FROM posts WHERE content LIKE ?',
  [`%${searchTerm}%`]
);
```

**Mongoose:**
```javascript
// With text index defined in model:
const posts = await Post.find({ 
  $text: { $search: searchTerm } 
});

// Without text index (regex - slower):
const posts = await Post.find({
  content: { $regex: searchTerm, $options: 'i' }
});
```

## 🚀 Quick Start

### 1. Install MongoDB

**Windows (with Chocolatey):**
```powershell
choco install mongodb
```

**Or download from**: https://www.mongodb.com/try/download/community

### 2. Start MongoDB

```powershell
mongod --dbpath=C:\data\db
```

Or if installed as a service:
```powershell
net start MongoDB
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Update Environment Variables

Create or update `.env` file:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/peekhour

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 5. Seed Database

```bash
npm run seed
```

### 6. Start Server

```bash
npm run dev
```

## ⚠️ Important Notes

### Field Name Changes

MongoDB/Mongoose uses camelCase instead of snake_case:

| MySQL              | Mongoose       |
|--------------------|----------------|
| user_id            | userId         |
| created_at         | createdAt      |
| is_active          | isActive       |
| mobile_number      | mobileNumber   |
| password_hash      | passwordHash   |
| profile_avatar     | profileAvatar  |
| department_id      | departmentId   |
| media_url          | mediaUrl       |
| media_type         | mediaType      |
| from_user_id       | fromUserId     |

### ID References

- MySQL: `id` (integer, auto-increment)
- MongoDB: `_id` (ObjectId)

When storing references:
```javascript
// MySQL
post.user_id = 1;

// Mongoose
post.userId = mongoose.Types.ObjectId(userId);
// OR
post.userId = user._id;  // if you have the user object
```

### Array/Relationship Handling

In MongoDB, you can:
1. **Embed data** (for small, frequently accessed items)
2. **Reference** (for large or independently managed items)

Example in Post model:
- `likes` - Embedded array (small, always queried with post)
- `userId` - Reference (large user object, not always needed)

### Pagination

**MySQL:**
```javascript
LIMIT ${limit} OFFSET ${offset}
```

**Mongoose:**
```javascript
.limit(limit).skip(offset)
```

## 📝 Example: Converting a Full Controller Function

### Before (MySQL):
```javascript
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [posts] = await db.query(`
      SELECT p.*, u.username, u.name, u.profile_avatar,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_active = TRUE
    `, [id]);
    
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      data: posts[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};
```

### After (Mongoose):
```javascript
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findOne({ 
      _id: id, 
      isActive: true 
    })
    .populate('userId', 'username name profileAvatar')
    .populate('departmentId', 'name')
    .lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Add computed fields
    post.likeCount = post.likes ? post.likes.length : 0;
    post.commentCount = await Comment.countDocuments({ 
      postId: post._id,
      isActive: true 
    });
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};
```

## 🎯 Priority Order for Conversion

1. **postController.js** - Core feature
2. **departmentController.js** - Core feature  
3. **userController.js** - User management
4. **commentController.js** - Engagement
5. **searchController.js** - Discovery
6. **notificationController.js** - User experience
7. **followController.js** - Social features
8. Rest of the controllers

## 🧪 Testing

After converting a controller:

1. Test all endpoints with Postman or Thunder Client
2. Verify data structure in MongoDB Compass
3. Check console for any conversion errors
4. Test edge cases (empty results, invalid IDs, etc.)

## 📚 Resources

- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [MongoDB Query Operators](https://www.mongodb.com/docs/manual/reference/operator/query/)
- [Mongoose Populate](https://mongoosejs.com/docs/populate.html)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/)

## 🤝 Next Steps

1. Install and start MongoDB
2. Run the seed script
3. Test authentication endpoints (already converted)
4. Convert postController.js using patterns above
5. Continue with remaining controllers
6. Update frontend to handle ObjectId formats
7. Add indexes for frequently queried fields

---

**Note**: All seed users have password: `password123`

Sample credentials:
- Username: `johndoe` / Password: `password123`
- Username: `janesmith` / Password: `password123`
