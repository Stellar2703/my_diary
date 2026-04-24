# PeekHour Backend API

Complete backend API for PeekHour location-based social media platform.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Make sure MongoDB is running
# Start MongoDB service (if not running)
mongod

# Seed the database with initial data
npm run seed
```

### 3. Configure Environment
```bash
# Create .env file with your settings
# Example:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/peekhour
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

Required variables in `.env`:
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/peekhour)
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_EXPIRE` - Token expiration (default: 7d)
- `FRONTEND_URL` - Frontend URL for CORS

## API Documentation

See main README.md for complete API endpoint documentation.

## File Structure

- `config/` - Database configuration
- `controllers/` - Business logic
- `middleware/` - Authentication, validation, upload
- `routes/` - API routes
- `models/` - MongoDB schemas
- `database/` - Seed scripts
- `uploads/` - User uploaded files

## Security

- JWT authentication
- bcrypt password hashing
- Input validation
- NoSQL injection protection
- File upload restrictions
- CORS configuration

## Database

MongoDB 4.4+ with the following main collections:
- users
- posts
- departments
- comments
- notifications
- stories
- messages
- conversations

See `models/` directory for complete schemas.
