import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Post, Department, Comment, Notification } from '../models/index.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/peekhour';

// Password hash for "password123"
const PASSWORD_HASH = '$2a$10$TGrnDhNeOrxRJCe5xMD9duVP1B1WsvT/PDd/dWgjWQdPI6TFtqOam';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Department.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users
    console.log('👤 Creating users...');
    const users = await User.insertMany([
      {
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        mobileNumber: '1234567890',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'JD',
        bio: 'Software developer passionate about coding and coffee ☕',
        isActive: true
      },
      {
        name: 'Jane Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        mobileNumber: '1234567891',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'JS',
        bio: 'Product designer | UX enthusiast | Cat mom 🐱',
        isActive: true
      },
      {
        name: 'Mike Johnson',
        username: 'mikej',
        email: 'mike@example.com',
        mobileNumber: '1234567892',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'MJ',
        bio: 'Digital nomad 🌍 | Travel blogger',
        isActive: true
      },
      {
        name: 'Sarah Williams',
        username: 'sarahw',
        email: 'sarah@example.com',
        mobileNumber: '1234567893',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'SW',
        bio: 'Fitness coach | Nutrition expert 💪',
        isActive: true
      },
      {
        name: 'Alex Brown',
        username: 'alexb',
        email: 'alex@example.com',
        mobileNumber: '1234567894',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'AB',
        bio: 'Photographer 📸 | Visual storyteller',
        isActive: true
      },
      {
        name: 'Emily Davis',
        username: 'emilyd',
        email: 'emily@example.com',
        mobileNumber: '1234567895',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'ED',
        bio: 'Food blogger | Chef in training 👨‍🍳',
        isActive: true
      },
      {
        name: 'Chris Wilson',
        username: 'chrisw',
        email: 'chris@example.com',
        mobileNumber: '1234567896',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'CW',
        bio: 'Music producer | DJ | Vinyl collector 🎵',
        isActive: true
      },
      {
        name: 'Lisa Anderson',
        username: 'lisaa',
        email: 'lisa@example.com',
        mobileNumber: '1234567897',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'LA',
        bio: 'Marketing specialist | Brand strategist',
        isActive: true
      },
      {
        name: 'David Martinez',
        username: 'davidm',
        email: 'david@example.com',
        mobileNumber: '1234567898',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'DM',
        bio: 'Entrepreneur | Startup founder 🚀',
        isActive: true
      },
      {
        name: 'Rachel Taylor',
        username: 'rachelt',
        email: 'rachel@example.com',
        mobileNumber: '1234567899',
        passwordHash: PASSWORD_HASH,
        profileAvatar: 'RT',
        bio: 'Writer | Book lover | Coffee addict ☕📚',
        isActive: true
      }
    ]);
    console.log(`✅ Created ${users.length} users`);

    // Add user locations
    await User.findByIdAndUpdate(users[0]._id, {
      locations: [{
        country: 'USA',
        state: 'NY',
        city: 'New York',
        area: 'Manhattan',
        street: 'Main St',
        lastUsedAt: new Date()
      }]
    });

    // Set up follows
    users[0].following = [users[1]._id, users[2]._id, users[4]._id, users[8]._id];
    users[0].followers = [users[1]._id, users[2]._id, users[4]._id, users[5]._id, users[8]._id, users[9]._id];
    await users[0].save();

    users[1].following = [users[0]._id, users[5]._id, users[3]._id];
    users[1].followers = [users[0]._id];
    await users[1].save();

    // Create departments
    console.log('🏢 Creating departments...');
    const departments = await Department.insertMany([
      {
        name: 'Tech Enthusiasts',
        type: 'community',
        description: 'A community for technology lovers, developers, and innovators',
        createdBy: users[0]._id,
        location: '123 Main St, New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        isActive: true,
        members: [
          { userId: users[0]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[1]._id, role: 'member', joinedAt: new Date() },
          { userId: users[2]._id, role: 'member', joinedAt: new Date() },
          { userId: users[4]._id, role: 'moderator', joinedAt: new Date() },
          { userId: users[8]._id, role: 'member', joinedAt: new Date() }
        ]
      },
      {
        name: 'Foodies NYC',
        type: 'community',
        description: 'Discover the best food spots in New York City',
        createdBy: users[5]._id,
        location: '456 Food St, New York, NY',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        isActive: true,
        members: [
          { userId: users[5]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[0]._id, role: 'member', joinedAt: new Date() },
          { userId: users[1]._id, role: 'member', joinedAt: new Date() },
          { userId: users[9]._id, role: 'member', joinedAt: new Date() }
        ]
      },
      {
        name: 'LA Fitness Club',
        type: 'community',
        description: 'Fitness enthusiasts in Los Angeles area',
        createdBy: users[3]._id,
        location: '789 Fitness Blvd, Los Angeles, CA',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        isActive: true,
        members: [
          { userId: users[3]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[1]._id, role: 'member', joinedAt: new Date() },
          { userId: users[7]._id, role: 'member', joinedAt: new Date() }
        ]
      },
      {
        name: 'Photography Hub',
        type: 'community',
        description: 'Share your best shots and learn from professionals',
        createdBy: users[4]._id,
        location: '321 Camera Ln, London, England',
        city: 'London',
        state: 'England',
        country: 'UK',
        isActive: true,
        members: [
          { userId: users[4]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[2]._id, role: 'member', joinedAt: new Date() },
          { userId: users[0]._id, role: 'member', joinedAt: new Date() },
          { userId: users[6]._id, role: 'member', joinedAt: new Date() }
        ]
      },
      {
        name: 'Startup Founders',
        type: 'community',
        description: 'Connect with fellow entrepreneurs and share insights',
        createdBy: users[8]._id,
        location: '555 Startup Ave, San Francisco, CA',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        isActive: true,
        members: [
          { userId: users[8]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[0]._id, role: 'member', joinedAt: new Date() },
          { userId: users[7]._id, role: 'member', joinedAt: new Date() }
        ]
      },
      {
        name: 'Coffee Lovers',
        type: 'community',
        description: 'For those who take their coffee seriously',
        createdBy: users[9]._id,
        location: '888 Coffee St, Seattle, WA',
        city: 'Seattle',
        state: 'WA',
        country: 'USA',
        isActive: true,
        members: [
          { userId: users[9]._id, role: 'admin', joinedAt: new Date() },
          { userId: users[0]._id, role: 'member', joinedAt: new Date() },
          { userId: users[5]._id, role: 'member', joinedAt: new Date() },
          { userId: users[6]._id, role: 'member', joinedAt: new Date() }
        ]
      }
    ]);
    console.log(`✅ Created ${departments.length} departments`);

    // Create posts
    console.log('📝 Creating posts...');
    const posts = await Post.insertMany([
      {
        userId: users[0]._id,
        departmentId: departments[0]._id,
        content: 'Just deployed my first full-stack app! 🚀 Check it out and let me know what you think. Built with React, Node.js, and MongoDB.',
        mediaType: 'none',
        latitude: 40.7128,
        longitude: -74.0060,
        country: 'USA',
        state: 'NY',
        city: 'New York',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['coding', 'fullstack', 'react']
      },
      {
        userId: users[1]._id,
        departmentId: departments[0]._id,
        content: 'Anyone else excited about the new React 19 features? The new compiler is a game changer!',
        mediaType: 'none',
        latitude: 34.0522,
        longitude: -118.2437,
        country: 'USA',
        state: 'CA',
        city: 'Los Angeles',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['react', 'javascript']
      },
      {
        userId: users[2]._id,
        content: 'Beautiful sunset at the beach today 🌅 #photography #sunset',
        mediaUrl: '/uploads/posts/sunset.jpg',
        mediaType: 'photo',
        latitude: 51.5074,
        longitude: -0.1278,
        country: 'UK',
        state: 'England',
        city: 'London',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['photography', 'sunset']
      },
      {
        userId: users[3]._id,
        departmentId: departments[2]._id,
        content: 'Just finished a 10K run! Feeling amazing 💪 New personal record: 52 minutes!',
        mediaUrl: '/uploads/posts/run.jpg',
        mediaType: 'photo',
        latitude: 34.0522,
        longitude: -118.2437,
        country: 'USA',
        state: 'CA',
        city: 'Los Angeles',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['fitness', 'running']
      },
      {
        userId: users[4]._id,
        departmentId: departments[3]._id,
        content: 'Golden hour photography tips: The best time is 30 minutes before sunset. Here\'s my latest shot!',
        mediaUrl: '/uploads/posts/golden_hour.jpg',
        mediaType: 'photo',
        latitude: 51.5074,
        longitude: -0.1278,
        country: 'UK',
        state: 'England',
        city: 'London',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['photography', 'goldenhour']
      },
      {
        userId: users[5]._id,
        departmentId: departments[1]._id,
        content: 'Found this amazing Italian restaurant in Little Italy! Best carbonara I\'ve ever had 🍝',
        mediaUrl: '/uploads/posts/carbonara.jpg',
        mediaType: 'photo',
        latitude: 40.7128,
        longitude: -74.0060,
        country: 'USA',
        state: 'NY',
        city: 'New York',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['food', 'italian']
      },
      {
        userId: users[6]._id,
        content: 'New music track dropping this weekend! Been working on this for months. Can\'t wait to share it with you all 🎵',
        mediaType: 'none',
        latitude: 40.7128,
        longitude: -74.0060,
        country: 'USA',
        state: 'NY',
        city: 'New York',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['music', 'newrelease']
      },
      {
        userId: users[7]._id,
        departmentId: departments[0]._id,
        content: 'Tips for growing your startup: 1) Focus on product-market fit 2) Build a great team 3) Listen to your customers',
        mediaType: 'none',
        latitude: 34.0522,
        longitude: -118.2437,
        country: 'USA',
        state: 'CA',
        city: 'Los Angeles',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['startup', 'business']
      },
      {
        userId: users[8]._id,
        departmentId: departments[4]._id,
        content: 'Just closed our seed round! 🎉 Excited to announce $2M in funding. Here\'s to building something amazing!',
        mediaType: 'none',
        latitude: 37.7749,
        longitude: -122.4194,
        country: 'USA',
        state: 'CA',
        city: 'San Francisco',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['startup', 'funding']
      },
      {
        userId: users[9]._id,
        departmentId: departments[5]._id,
        content: 'Coffee brewing guide: Pour-over vs French Press - which is your favorite? Drop your thoughts below!',
        mediaUrl: '/uploads/posts/coffee.jpg',
        mediaType: 'photo',
        latitude: 47.6062,
        longitude: -122.3321,
        country: 'USA',
        state: 'WA',
        city: 'Seattle',
        postDate: new Date(),
        visibility: 'public',
        isActive: true,
        hashtags: ['coffee', 'brewing']
      }
    ]);
    console.log(`✅ Created ${posts.length} posts`);

    // Add likes to some posts
    posts[0].likes = [
      { userId: users[1]._id },
      { userId: users[2]._id },
      { userId: users[4]._id }
    ];
    await posts[0].save();

    posts[2].likes = [
      { userId: users[0]._id },
      { userId: users[3]._id },
      { userId: users[4]._id },
      { userId: users[5]._id }
    ];
    await posts[2].save();

    // Create comments
    console.log('💬 Creating comments...');
    const comments = await Comment.insertMany([
      {
        postId: posts[0]._id,
        userId: users[1]._id,
        content: 'This looks amazing! Great work 👏',
        isActive: true
      },
      {
        postId: posts[0]._id,
        userId: users[2]._id,
        content: 'Would love to see a tutorial on how you built this!',
        isActive: true
      },
      {
        postId: posts[2]._id,
        userId: users[0]._id,
        content: 'Stunning capture! What camera did you use?',
        isActive: true
      },
      {
        postId: posts[5]._id,
        userId: users[0]._id,
        content: 'I need to try this place! Adding to my list 📝',
        isActive: true
      },
      {
        postId: posts[9]._id,
        userId: users[0]._id,
        content: 'Pour-over all the way! The flavor is so much cleaner.',
        isActive: true
      }
    ]);
    console.log(`✅ Created ${comments.length} comments`);

    // Create notifications
    console.log('🔔 Creating notifications...');
    const notifications = await Notification.insertMany([
      {
        userId: users[0]._id,
        fromUserId: users[1]._id,
        type: 'like',
        message: 'liked your post',
        content: 'liked your post',
        postId: posts[0]._id,
        isRead: false,
        isActive: true
      },
      {
        userId: users[0]._id,
        fromUserId: users[1]._id,
        type: 'comment',
        message: 'commented on your post',
        content: 'This looks amazing! Great work 👏',
        postId: posts[0]._id,
        commentId: comments[0]._id,
        isRead: false,
        isActive: true
      },
      {
        userId: users[2]._id,
        fromUserId: users[0]._id,
        type: 'like',
        message: 'liked your post',
        content: 'liked your post',
        postId: posts[2]._id,
        isRead: false,
        isActive: true
      }
    ]);
    console.log(`✅ Created ${notifications.length} notifications`);

    console.log('✅ Database seeded successfully!');
    console.log(`
    📊 Summary:
    - Users: ${users.length}
    - Departments: ${departments.length}
    - Posts: ${posts.length}
    - Comments: ${comments.length}
    - Notifications: ${notifications.length}
    
    🔑 All users have password: "password123"
    
    👤 Sample usernames:
    - johndoe
    - janesmith
    - mikej
    - sarahw
    - alexb
    `);

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

seedDatabase();
