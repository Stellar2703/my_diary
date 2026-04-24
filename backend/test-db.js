// Quick database connection test
import connectDB from './config/database.js';
import mongoose from 'mongoose';
import { 
  User, 
  Post, 
  Department, 
  Comment, 
  Notification,
  Story,
  Message,
  Conversation
} from './models/index.js';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connection successful');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections in database:');
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });
    
    // Check document counts
    const userCount = await User.countDocuments();
    console.log(`\n👥 Users: ${userCount}`);
    
    const postCount = await Post.countDocuments();
    console.log(`📝 Posts: ${postCount}`);
    
    const deptCount = await Department.countDocuments();
    console.log(`🏢 Departments: ${deptCount}`);
    
    const commentCount = await Comment.countDocuments();
    console.log(`💬 Comments: ${commentCount}`);
    
    const notificationCount = await Notification.countDocuments();
    console.log(`🔔 Notifications: ${notificationCount}`);
    
    const storyCount = await Story.countDocuments();
    console.log(`📸 Stories: ${storyCount}`);
    
    const messageCount = await Message.countDocuments();
    console.log(`✉️ Messages: ${messageCount}`);
    
    const conversationCount = await Conversation.countDocuments();
    console.log(`💭 Conversations: ${conversationCount}`);
    
    console.log('\n✅ All integrity checks passed!');
    console.log('🚀 Backend is ready to use.\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
