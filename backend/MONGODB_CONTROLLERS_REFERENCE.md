# MongoDB/Mongoose Controllers - Technical Reference

## Quick Reference: All 18 Controllers

### 1. postController.js
**File**: `/backend/controllers/postController.js`
**Lines**: 665
**Imports**: `{ Post, User, Department, Comment, Notification }`

#### Core Functions
```javascript
// Create post with location tracking and notifications
createPost(req, res) - Creates post, saves user location, creates mention notifications

// Get posts with access control
getPosts(req, res) - Queries by department/location/username, respects access permissions

// Get single post
getPostById(req, res) - Fetches with populated user/department, counts comments

// Update post
updatePost(req, res) - Updates content, maintains edit history, updates hashtags

// Soft delete
deletePost(req, res) - Sets isActive = false instead of hard delete

// Like operations
toggleLike(req, res) - Uses array $push/$pull, creates like notification

// Share operations
toggleShare(req, res) - Similar to like functionality
```

#### Key Mongoose Patterns
```javascript
// Department membership validation
const department = await Department.findOne({
  _id: departmentId,
  $or: [
    { 'members.userId': userId },
    { createdBy: userId }
  ]
})

// Batch notification creation
const notifications = mentionedUsers.map(user => ({
  userId: user._id,
  fromUserId: userId,
  type: 'mention',
  ...
}))
await Notification.insertMany(notifications)

// Comment count aggregation
const commentCounts = await Comment.aggregate([
  { $match: { postId: { $in: postIds }, isActive: true } },
  { $group: { _id: '$postId', count: { $sum: 1 } } }
])

// Array element manipulation
const likeIndex = post.likes.findIndex(like => like.userId.toString() === userId)
if (likeIndex > -1) {
  post.likes.splice(likeIndex, 1)
} else {
  post.likes.push({ userId, reactedAt: new Date() })
}
await post.save()
```

---

### 2. departmentController.js
**File**: `/backend/controllers/departmentController.js`
**Imports**: `{ Department, Post, User }`

#### Core Functions
```javascript
createDepartment() - Creates new department with creator as admin
getDepartments() - Lists with filters (type, search), calculates stats
getDepartmentById() - Gets single department with stats
updateDepartment() - Updates department settings
deleteDepartment() - Soft delete (isActive = false)
joinDepartment() - Adds user to members array
leaveDepartment() - Removes user from members
```

#### Key Mongoose Patterns
```javascript
// Department creation with admin role
const department = await Department.create({
  name, type, description, ...
  createdBy: userId,
  members: [{
    userId,
    role: 'admin',
    joinedAt: new Date()
  }]
})

// Member count with stats
const memberCount = dept.members?.length || 0
const postCount = await Post.countDocuments({ 
  departmentId: dept._id, 
  isActive: true 
})

// Add member to department
await Department.findByIdAndUpdate(departmentId, {
  $push: {
    members: {
      userId,
      role: 'member',
      joinedAt: new Date()
    }
  }
})

// Remove member
await Department.findByIdAndUpdate(departmentId, {
  $pull: { members: { userId } }
})
```

---

### 3. userController.js
**File**: `/backend/controllers/userController.js`
**Imports**: `{ User, Post, Notification, Department, Comment }`

#### Core Functions
```javascript
getUserLocations() - Returns user's saved locations (sorted, limited to 10)
getNotifications() - Fetches notifications with pagination
markNotificationRead() - Updates single notification read status
markAllNotificationsRead() - Updates all unread notifications
deleteNotification() - Deletes single notification
getUserStats() - Returns counts (posts, followers, comments)
updateUserProfile() - Updates user information
```

#### Key Mongoose Patterns
```javascript
// Save location to user profile
await User.findByIdAndUpdate(userId, {
  $push: {
    locations: {
      $each: [{ country, state, city, ... }],
      $position: 0,
      $slice: 10  // Keep only last 10
    }
  }
})

// Get and filter notifications
const notifications = await Notification.find(query)
  .populate('fromUserId', 'name username profileAvatar')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean()

// Mark as read
await Notification.findOneAndUpdate(
  { _id: id, userId },
  { isRead: true }
)
```

---

### 4. authController.js
**File**: `/backend/controllers/authController.js`
**Imports**: `User from '../models/User.js'`

#### Core Functions
```javascript
register() - Creates new user with password hashing, generates JWT
login() - Authenticates user, updates lastLoginAt, returns JWT
logout() - Client-side implementation (token removal)
refreshToken() - Generates new token from valid JWT
```

#### Key Mongoose Patterns
```javascript
// Check existing user by multiple fields
const existingUser = await User.findOne({
  $or: [
    { username: username.toLowerCase() },
    { email: email.toLowerCase() },
    { mobileNumber }
  ]
})

// Create user with hashed password
const user = await User.create({
  name, username, email, mobileNumber,
  passwordHash: hashedPassword,
  profileAvatar: initials
})

// Find user by username or email for login
const user = await User.findOne({
  $or: [
    { username: username.toLowerCase() },
    { email: username.toLowerCase() }
  ]
}).select('+passwordHash')

// Update last login
user.lastLoginAt = new Date()
await user.save()
```

---

### 5. commentController.js
**File**: `/backend/controllers/commentController.js`
**Imports**: `{ Comment, Post, User }`

#### Core Functions
```javascript
addComment() - Creates comment on post, validates post exists
getComments() - Fetches comments with user info, pagination
updateComment() - Updates comment content
deleteComment() - Soft delete (isActive = false)
getCommentById() - Fetches single comment
```

#### Key Mongoose Patterns
```javascript
// Create comment
const comment = await Comment.create({
  postId, userId, content,
  isBold, isItalic,
  isActive: true
})

// Get comments with populated user
const comments = await Comment.find({ postId, isActive: true })
  .populate('userId', 'name username profileAvatar')
  .sort({ createdAt: 1 })
  .skip(skip)
  .limit(limitNum)
  .lean()

// Count total comments
const total = await Comment.countDocuments({ postId, isActive: true })

// Update comment
const comment = await Comment.findByIdAndUpdate(id, { content }, { new: true })
```

---

### 6. followController.js
**File**: `/backend/controllers/followController.js`
**Imports**: `{ User, Notification }`

#### Core Functions
```javascript
followUser() - Adds user to following list, creates notification
unfollowUser() - Removes from following list
getFollowers() - Lists user's followers with mutual info
getFollowing() - Lists users that user follows
blockUser() - Blocks user, removes follow relationships
unblockUser() - Unblocks user
getBlockedUsers() - Lists all blocked users
getFollowStats() - Returns follower/following counts
checkFollowing() - Checks if following specific user
getSuggestedUsers() - Suggests users based on connections
```

#### Key Mongoose Patterns
```javascript
// Add to following (set operation to avoid duplicates)
await User.findByIdAndUpdate(followerId, {
  $addToSet: { following: userId }
})
await User.findByIdAndUpdate(userId, {
  $addToSet: { followers: followerId }
})

// Remove from following
await User.findByIdAndUpdate(followerId, {
  $pull: { following: userId }
})

// Get followers with details
const followers = await User.find({ _id: { $in: targetUser.followers } })
  .select('username name profileAvatar bio')
  .lean()

// Suggested users with mutual followers calculation
const suggestedUsers = await User.find({
  _id: { $in: suggestionIds }
}).select('username name profileAvatar followers').lean()

const enriched = suggestedUsers.map(user => {
  const mutualFollowers = user.followers.filter(fid =>
    currentUser.following.some(myFid => myFid.equals(fid))
  ).length
  return { ...user, mutual_followers: mutualFollowers }
})
```

---

### 7. notificationController.js
**File**: `/backend/controllers/notificationController.js`
**Imports**: `{ Notification, User }`

#### Core Functions
```javascript
getNotifications() - Fetches user notifications with pagination
markAsRead() - Marks single notification as read
markAllAsRead() - Marks all unread as read
deleteNotification() - Deletes notification
getUnreadCount() - Returns count of unread notifications
```

#### Key Mongoose Patterns
```javascript
// Get notifications with filtering
const query = { userId }
if (type) query.type = type
if (unreadOnly === 'true') query.isRead = false

const notifications = await Notification.find(query)
  .populate('fromUserId', 'username name profileAvatar')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean()

// Mark as read
await Notification.findOneAndUpdate(
  { _id: notificationId, userId },
  { isRead: true }
)

// Mark all as read
await Notification.updateMany(
  { userId, isRead: false },
  { isRead: true }
)

// Get unread count
const count = await Notification.countDocuments({
  userId,
  isRead: false
})
```

---

### 8. profileController.js
**File**: `/backend/controllers/profileController.js`
**Imports**: `{ User, Post, Department, Comment }`

#### Core Functions
```javascript
getUserProfile() - Gets profile with stats and departments
getUserPosts() - Gets user's posts with pagination
getUserComments() - Gets user's comments
updateProfile() - Updates profile information
```

#### Key Mongoose Patterns
```javascript
// Get user with stats
const user = await User.findOne({ username }).select('...').lean()

// Multiple stats queries in parallel
const [postsCount, likesReceived, departmentsCount] = await Promise.all([
  Post.countDocuments({ userId: user._id, isActive: true }),
  Post.aggregate([
    { $match: { userId: user._id, isActive: true } },
    { $project: { likesCount: { $size: '$likes' } } },
    { $group: { _id: null, total: { $sum: '$likesCount' } } }
  ]),
  Department.countDocuments({
    'members.userId': user._id,
    isActive: true
  })
])

// Get user's departments
const departments = await Department.find({
  'members.userId': user._id,
  isActive: true
}).select('name type avatar members').limit(5).lean()
```

---

### 9. reactionController.js
**File**: `/backend/controllers/reactionController.js`
**Imports**: `{ Post, Comment, Notification }`

#### Core Functions
```javascript
togglePostReaction() - Add/update/remove reactions on posts
toggleCommentReaction() - Reactions on comments
getPostReactions() - Lists all reactions on post
```

#### Key Mongoose Patterns
```javascript
// Check existing reaction
const existingReactionIndex = post.reactions.findIndex(
  r => r.userId.toString() === userId
)

// Remove reaction if same type
await Post.findByIdAndUpdate(id, {
  $pull: { reactions: { userId } }
})

// Update to new reaction type
await Post.findByIdAndUpdate(id, {
  $pull: { reactions: { userId } }
})
await Post.findByIdAndUpdate(id, {
  $push: { 
    reactions: { 
      userId, reactionType, 
      createdAt: new Date() 
    } 
  }
})

// Add new reaction
await Post.findByIdAndUpdate(id, {
  $push: { 
    reactions: { 
      userId, reactionType, 
      createdAt: new Date() 
    } 
  }
})
```

---

### 10. messageController.js
**File**: `/backend/controllers/messageController.js`
**Imports**: `{ Conversation, Message, User }`

#### Core Functions
```javascript
getOrCreateConversation() - Creates or retrieves 1-on-1 conversation
getConversations() - Lists all conversations for user
getMessages() - Gets messages in conversation with pagination
sendMessage() - Creates new message, updates conversation
markAsRead() - Marks messages as read
deleteMessage() - Deletes message
```

#### Key Mongoose Patterns
```javascript
// Create 1-on-1 conversation
const existingConv = await Conversation.findOne({
  isGroup: false,
  participants: { $all: [userId, recipientId], $size: 2 }
})

const conversation = await Conversation.create({
  isGroup: false,
  participants: [userId, recipientId],
  createdBy: userId,
  isActive: true
})

// Get conversations with last message
const conversations = await Conversation.find({
  participants: userId
}).populate('participants', 'username name profileAvatar').lean()

// Get messages with pagination
const messages = await Message.find({ conversationId })
  .populate('senderId', 'username name profileAvatar')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean()

// Mark messages as read
await Message.updateMany(
  { conversationId, isRead: false, senderId: { $ne: userId } },
  { isRead: true, readAt: new Date() }
)
```

---

### 11. departmentEnhancementsController.js
**File**: `/backend/controllers/departmentEnhancementsController.js`
**Imports**: `{ Department, Event, Post }`

#### Core Functions
```javascript
addModerator() - Adds moderator with permissions
removeModerator() - Removes moderator
getModerators() - Lists department moderators
updateModerationPermissions() - Updates moderator permissions
approvePendingPost() - Approves post for department
rejectPendingPost() - Rejects pending post
```

#### Key Mongoose Patterns
```javascript
// Add moderator
await Department.findByIdAndUpdate(departmentId, {
  $push: {
    moderators: {
      userId,
      permissions: defaultPermissions,
      assignedBy: currentUserId,
      assignedAt: new Date()
    }
  }
})

// Remove moderator
await Department.findByIdAndUpdate(departmentId, {
  $pull: { moderators: { userId: moderatorId } }
})

// Approve pending post
await Department.findByIdAndUpdate(departmentId, {
  $pull: { 'pendingPosts': { postId } },
  $push: { 'pendingPosts': { ..., status: 'approved' } }
})
```

---

### 12. storyController.js
**File**: `/backend/controllers/storyController.js`
**Imports**: `{ Story, User }`

#### Core Functions
```javascript
createStory() - Creates 24-hour story
getStories() - Gets active stories from following
getUserStories() - Gets specific user's stories
viewStory() - Marks story as viewed
deleteStory() - Removes story
```

#### Key Mongoose Patterns
```javascript
// Create story with 24-hour expiration
const expiresAt = new Date()
expiresAt.setHours(expiresAt.getHours() + 24)

const story = await Story.create({
  userId, mediaUrl, mediaType,
  expiresAt,
  views: [],
  isActive: true
})

// Get active stories (MongoDB TTL deletes expired)
const stories = await Story.find({
  userId: { $in: viewableUserIds },
  expiresAt: { $gt: new Date() },
  isActive: true
}).populate('userId', 'username name profileAvatar').lean()

// Group stories by user
const groupedStories = {}
stories.forEach(story => {
  const uid = story.userId._id.toString()
  if (!groupedStories[uid]) {
    groupedStories[uid] = { 
      userId: story.userId._id,
      stories: [] 
    }
  }
  groupedStories[uid].stories.push({...})
})

// View story (add to views array)
await Story.findByIdAndUpdate(storyId, {
  $push: {
    views: {
      userId,
      viewedAt: new Date()
    }
  }
})
```

---

### 13. moderationController.js
**File**: `/backend/controllers/moderationController.js`
**Imports**: `{ Report, Ban, ModerationLog, Post, Comment, User }`

#### Core Functions
```javascript
createReport() - Creates content/user report
getReports() - Lists reports (admin only) with pagination
reviewReport() - Reviews and acts on report
banUser() - Bans user with optional expiration
unbanUser() - Removes ban
getModerationLogs() - Lists moderation actions
```

#### Key Mongoose Patterns
```javascript
// Create report
const existing = await Report.findOne({
  reporterId: userId,
  targetType, targetId,
  status: 'pending'
})

await Report.create({
  reporterId: userId,
  targetType, targetId,
  reason, description,
  status: 'pending'
})

// Get reports with pagination
const reports = await Report.find(query)
  .populate('reporterId', 'username name')
  .populate('reviewedBy', 'username name')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean()

// Ban user
await Ban.create({
  userId,
  bannedBy: adminId,
  reason,
  expiresAt: banExpiry,
  isActive: true
})

// Log moderation action
await ModerationLog.create({
  moderatorId: userId,
  action: 'ban_user',
  targetType: 'user',
  targetId: bannedUserId,
  reason
})
```

---

### 14. securityController.js
**File**: `/backend/controllers/securityController.js`
**Imports**: `{ User, TwoFactorAuth, LoginHistory, Session }`

#### Core Functions
```javascript
enable2FA() - Generates 2FA secret and QR code
verify2FA() - Verifies token and enables 2FA
disable2FA() - Disables 2FA for user
getLoginHistory() - Gets user's login history
createSession() - Creates new session
validateSession() - Validates session token
```

#### Key Mongoose Patterns
```javascript
// Enable 2FA with upsert
await TwoFactorAuth.findOneAndUpdate(
  { userId },
  {
    userId,
    secret: secret.base32,
    isEnabled: false
  },
  { upsert: true, new: true }
)

// Verify and activate 2FA
const auth = await TwoFactorAuth.findOne({ userId })
const verified = speakeasy.totp.verify({...})
auth.isEnabled = true
await auth.save()

// Create login history
await LoginHistory.create({
  userId,
  ipAddress, userAgent, device,
  browser, os,
  location: { country, city },
  success: true
})

// Auto-cleanup: LoginHistory has TTL index for 90 days
// Auto-cleanup: Session has TTL index on expiresAt
```

---

### 15. analyticsController.js
**File**: `/backend/controllers/analyticsController.js`
**Imports**: `{ User, Post, Comment, Department }`

#### Core Functions
```javascript
getUserAnalytics() - User posts/followers/engagement stats
getDepartmentAnalytics() - Department member/post stats
getEngagementMetrics() - Engagement over time
```

#### Key Mongoose Patterns
```javascript
// Get user stats
const user = await User.findById(userId)
const totalPosts = await Post.countDocuments({ userId, isActive: true })
const totalReactions = userPosts.reduce((sum, post) => 
  sum + (post.reactions?.length || 0), 0
)

// Aggregation for engagement analysis
const posts = await Post.find({
  userId,
  createdAt: { $gte: dateThreshold }
}).select('createdAt reactions')

const postEngagement = await Promise.all(
  posts.map(async post => {
    const commentCount = await Comment.countDocuments({ postId: post._id })
    return {
      date: new Date(post.createdAt).toISOString().split('T')[0],
      reactions: post.reactions?.length || 0,
      comments: commentCount
    }
  })
)

// Group engagement by date
const engagementByDate = postEngagement.reduce((acc, item) => {
  if (!acc[item.date]) {
    acc[item.date] = { date: item.date, reactions: 0, comments: 0 }
  }
  acc[item.date].reactions += item.reactions
  acc[item.date].comments += item.comments
  return acc
}, {})
```

---

### 16. nestedCommentsController.js
**File**: `/backend/controllers/nestedCommentsController.js`
**Imports**: `{ Comment, Post, Notification }`

#### Core Functions
```javascript
createCommentReply() - Creates reply to comment (max 5 levels deep)
getCommentReplies() - Gets all replies to comment
deleteReply() - Deletes reply comment
updateReply() - Updates reply content
```

#### Key Mongoose Patterns
```javascript
// Create nested reply with depth tracking
const parentComment = await Comment.findById(parentCommentId)
const newDepth = (parentComment.depth || 0) + 1

if (newDepth > 5) {
  return res.status(400).json({ error: 'Max depth reached' })
}

const newComment = await Comment.create({
  postId, userId, content,
  parentId: parentCommentId,
  depth: newDepth
})

// Get all replies to a comment
const replies = await Comment.find({
  parentId: commentId,
  isActive: true
}).populate('userId', 'username name avatar').lean()

// Create notification for reply
if (parentComment.userId.toString() !== userId) {
  await Notification.create({
    userId: parentComment.userId,
    type: 'comment',
    content: 'replied to your comment',
    commentId: newComment._id,
    fromUserId: userId
  })
}
```

---

### 17. searchController.js
**File**: `/backend/controllers/searchController.js`
**Imports**: `{ Post, User, Department, Comment }`

#### Core Functions
```javascript
advancedSearch() - Multi-type search with filters (posts/users/departments/hashtags)
searchPosts() - Full-text search on posts
searchUsers() - Search users by username/name
searchDepartments() - Search departments
searchHashtags() - Search posts by hashtag
```

#### Key Mongoose Patterns
```javascript
// Text search on posts
const postQuery = { isActive: true }
if (query) {
  postQuery.$text = { $search: query }
}

// Location filtering
if (country) postQuery.country = country
if (state) postQuery.state = state
if (city) postQuery.city = city

// Date range filtering
if (dateFrom || dateTo) {
  postQuery.postDate = {}
  if (dateFrom) postQuery.postDate.$gte = new Date(dateFrom)
  if (dateTo) postQuery.postDate.$lte = new Date(dateTo)
}

// Media filtering
if (hasMedia === 'true') {
  postQuery.mediaUrl = { $ne: null }
}

// Sort by relevance for text search
let sort = {}
if (sortBy === 'recent') {
  sort = { postDate: -1 }
}

let posts = await Post.find(postQuery)
  .populate('userId', 'username name profileAvatar')
  .sort(sort)
  .skip(skip)
  .limit(limitNum)
  .lean()

// Get comment counts for found posts
const commentCounts = await Comment.aggregate([
  { $match: { postId: { $in: postIds } } },
  { $group: { _id: '$postId', count: { $sum: 1 } } }
])
```

---

### 18. postEnhancementsController.js
**File**: `/backend/controllers/postEnhancementsController.js`
**Imports**: `{ Post, User, Notification }`

#### Core Functions
```javascript
editPost() - Edits post with history tracking
deletePost() - Hard deletes post
savePost() - Saves post to collection
getSavedPosts() - Gets user's saved posts
removeSavedPost() - Removes post from saved
```

#### Key Mongoose Patterns
```javascript
// Edit post with history
const post = await Post.findOne({ _id: id, userId })

// Preserve edit history
if (post.editHistory.length < 10) {
  post.editHistory.push({
    content: post.content,
    editedBy: userId,
    editedAt: new Date()
  })
}

// Update content and extract new hashtags
post.content = content
post.hashtags = extractHashtags(content)
post.mentions = extractMentions(content)

await post.save()

// Notify newly mentioned users
await notifyMentions(post._id, post.mentions, userId)

// Delete post
const result = await Post.findOneAndDelete({ _id: id, userId })

// Save post to collection
await Post.findByIdAndUpdate(id, {
  $push: {
    savedBy: {
      userId,
      collectionName,
      savedAt: new Date()
    }
  }
})

// Get saved posts
const posts = await Post.find({
  'savedBy.userId': userId,
  isActive: true
}).lean()
```

---

## Common Mongoose Patterns Summary

### Array Operations
```javascript
// Push - add to array
{ $push: { array: item } }
{ $push: { array: { $each: [item1, item2] } } }  // Multiple

// Pull - remove from array
{ $pull: { array: { condition } } }

// AddToSet - add unique to array
{ $addToSet: { array: item } }

// Pop - remove first/last
{ $pop: { array: 1 } }  // Last item
{ $pop: { array: -1 } } // First item

// Size - count array elements
{ $size: '$array' }  // In aggregation
```

### Query Operators
```javascript
// Comparison
{ field: { $eq: value } }
{ field: { $ne: value } }
{ field: { $gt: value } }
{ field: { $gte: value } }
{ field: { $lt: value } }
{ field: { $lte: value } }
{ field: { $in: [val1, val2] } }
{ field: { $nin: [val1, val2] } }

// Logical
{ $or: [condition1, condition2] }
{ $and: [condition1, condition2] }
{ $not: condition }
{ $nor: [condition1, condition2] }

// Text search (requires text index)
{ $text: { $search: 'query string' } }

// Array queries
{ array: item }  // Contains item
{ array: { $in: [item1, item2] } }  // Contains any
{ array: { $all: [item1, item2] } }  // Contains all
{ array: { $elemMatch: condition } }  // Element matching condition
{ array: { $size: 3 } }  // Array of exactly 3 items
```

### Pagination Pattern
```javascript
const page = parseInt(req.query.page) || 1
const limit = parseInt(req.query.limit) || 20
const skip = (page - 1) * limit

const data = await Model.find()
  .skip(skip)
  .limit(limit)
  .lean()

const total = await Model.countDocuments()

response.pagination = {
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1
}
```

### Error Handling Pattern
```javascript
try {
  // Validate input
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' })
  }

  // Query database
  const data = await Model.findById(id)

  // Check existence
  if (!data) {
    return res.status(404).json({ error: 'Not found' })
  }

  // Check authorization
  if (data.userId.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  // Success response
  res.json({
    success: true,
    data,
    message: 'Operation successful'
  })
} catch (error) {
  // Log error
  
  // Return error response
  res.status(500).json({
    success: false,
    error: 'Operation failed',
    message: error.message
  })
}
```

---

## Performance Tips

1. **Use Lean Queries** for read-only operations
   ```javascript
   const data = await Model.find().lean()  // Faster, returns plain objects
   ```

2. **Project Fields** to reduce data transfer
   ```javascript
   const data = await Model.find().select('field1 field2 -field3')
   ```

3. **Populate Strategically** - only when needed
   ```javascript
   const data = await Model.find().populate('userId', 'name email')
   ```

4. **Use Aggregation** for complex queries
   ```javascript
   const results = await Model.aggregate([...])
   ```

5. **Index Frequently Queried Fields**
   - Created automatically for `unique: true` fields
   - Use `.index()` for other frequent queries

6. **Batch Operations**
   ```javascript
   await Model.insertMany(array)  // Better than individual saves
   ```

---

## Testing Controllers

### Unit Test Example
```javascript
import { expect } from 'chai'
import sinon from 'sinon'
import * as postController from '../controllers/postController.js'
import { Post, User, Department } from '../models/index.js'

describe('postController', () => {
  let req, res, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    req = {
      user: { id: 'userId123' },
      body: {},
      params: {},
      query: {}
    }
    res = {
      json: sandbox.spy(),
      status: sandbox.stub().returnsThis()
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should create a post', async () => {
    const mockPost = { _id: 'post123', userId: 'userId123' }
    sandbox.stub(Post, 'create').resolves(mockPost)
    sandbox.stub(User, 'findByIdAndUpdate').resolves()
    sandbox.stub(Department, 'findOne').resolves(null)

    req.body = { content: 'Test post', country: 'India', state: 'NY', city: 'NY' }

    await postController.createPost(req, res)

    expect(res.json.calledOnce).to.be.true
    expect(res.json.args[0][0].success).to.be.true
  })
})
```

---

Generated: 2026-04-24
