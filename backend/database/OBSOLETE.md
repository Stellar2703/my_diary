# OBSOLETE SQL FILES

⚠️ **These files are OBSOLETE and no longer used.**

## Migration Complete

This project has been **fully migrated from MySQL to MongoDB**. All SQL files in this directory are retained for historical reference only and should NOT be used.

## Obsolete Files

- `schema.sql` - Old MySQL database schema
- `seed.sql` - Old MySQL seed data
- `migrate.sql` - Old MySQL migration scripts
- `migrate_notifications.sql` - Old notification table migration
- `fix_notifications.sql` - Old notification fixes
- `comprehensive_schema.sql` - Old comprehensive MySQL schema

## Current Database

**Database**: MongoDB 4.4+  
**Location**: `../models/` directory  
**Seed Script**: `seedMongo.js`

All models are now defined using Mongoose schemas. See the `models/` directory for current data structures.

## Models (MongoDB)

1. User.js
2. Post.js
3. Department.js
4. Comment.js
5. Notification.js
6. Story.js
7. Message.js
8. Conversation.js
9. Report.js
10. Ban.js
11. ModerationLog.js
12. Event.js
13. TwoFactorAuth.js
14. LoginHistory.js
15. Session.js

To seed the MongoDB database:
```bash
npm run seed
```

---
*Last updated: February 19, 2026*
