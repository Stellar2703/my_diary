# 📝 LOGGING CONFIGURATION GUIDE

## Overview

PeekHour uses **Winston Logger** for production-grade logging with:
- Structured JSON logging
- Automatic log rotation
- Multiple transport options
- Customizable formatting
- Environment-based configuration

---

## 📋 CONFIGURATION OPTIONS

### In `.env` file:

```bash
# ==================== LOGGING ====================
LOG_LEVEL=info                           # Levels: error, warn, info, debug
LOG_DIR=./logs                           # Directory for log files
LOG_MAX_SIZE=5242880                     # 5MB - max size before rotation
LOG_MAX_FILES=5                          # Number of rotated log files to keep
LOG_DATE_FORMAT=YYYY-MM-DD HH:mm:ss      # Timestamp format in logs
LOG_FILE_COMBINED=combined.log           # File for all logs
LOG_FILE_ERROR=error.log                 # File for error logs only
LOG_REQUEST_FORMAT=combined              # Morgan format: combined, short, dev
ENABLE_REQUEST_LOGGING=true              # Enable HTTP request logging
ENABLE_ERROR_STACK_TRACES=true           # Include stack traces in error logs
LOG_PERFORMANCE_METRICS=false            # Log query performance (debug only)
SENTRY_ENVIRONMENT=development           # Sentry environment
```

---

## 🎯 LOG LEVELS

| Level | Severity | Use Case |
|-------|----------|----------|
| **error** | Critical | Errors that need immediate attention |
| **warn** | High | Warnings and potential issues |
| **info** | Medium | General application events |
| **debug** | Low | Detailed debugging information |

### Setting Log Level:
```bash
# Production (errors and warnings only)
LOG_LEVEL=warn

# Development (all logs)
LOG_LEVEL=debug

# Staging (info level)
LOG_LEVEL=info
```

---

## 📁 LOG FILES LOCATION

Logs are stored in the directory specified by `LOG_DIR`:

```
backend/logs/
├── combined.log        # All logs (auto-rotated)
├── combined.log.1      # Previous rotation
├── error.log           # Errors only (auto-rotated)
└── error.log.1         # Previous rotation
```

### Log Rotation:
- Max file size: 5MB (configurable via `LOG_MAX_SIZE`)
- Max files kept: 5 (configurable via `LOG_MAX_FILES`)
- Oldest files automatically deleted when limit reached

---

## 🔧 USING THE LOGGER IN CODE

### Basic Usage:

```javascript
import logger from '../config/logger.js';

// Different log levels
logger.error('Database connection failed', { error: err.message });
logger.warn('Request rate limit approaching', { userId: 123 });
logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
logger.debug('Query execution time', { duration: 45, query: 'find' });
```

### Helper Methods:

```javascript
// HTTP logging
logger.http('GET /api/posts', { statusCode: 200, duration: 125 });

// Database logging
logger.db('User created', { userId: '123', table: 'users' });

// Authentication logging
logger.auth('Failed login attempt', { email: 'user@example.com', ip: '192.168.1.1' });

// Security logging
logger.security('Suspicious activity detected', { type: 'brute_force', ip: '192.168.1.1' });
```

### Logging with Metadata:

```javascript
// Structured logging with context
logger.info('Payment processed', {
  userId: 123,
  amount: 99.99,
  paymentId: 'pay_123',
  duration: 1250,
  status: 'success'
});

// Error with full context
logger.error('API request failed', {
  endpoint: '/api/posts',
  method: 'POST',
  statusCode: 500,
  error: error.message,
  userId: 123,
  timestamp: new Date()
});
```

---

## 📊 LOG FORMAT

### Console Output (with colors):
```
[2024-04-24 12:34:56] [INFO] User logged in {"userId":123,"ip":"192.168.1.1"}
[2024-04-24 12:34:57] [ERROR] Database error {"error":"Connection timeout"}
```

### File Output (JSON):
```json
{
  "timestamp": "2024-04-24 12:34:56",
  "level": "INFO",
  "message": "User logged in",
  "userId": 123,
  "ip": "192.168.1.1",
  "service": "peekhour-api"
}
```

### Stack Traces:
When `ENABLE_ERROR_STACK_TRACES=true`, error logs include full stack traces:
```
[2024-04-24 12:34:57] [ERROR] Database error {"error":"Connection timeout"}
Error: Connection timeout
    at connectDB (backend/config/database.js:15:10)
    at runServer (backend/server.js:45:20)
    at Object.<anonymous> (backend/server.js:150:5)
```

---

## 🔍 VIEWING LOGS

### Real-time Monitoring:

```bash
# Watch all logs as they come in
tail -f backend/logs/combined.log

# Watch error logs only
tail -f backend/logs/error.log

# Follow with timestamps
tail -f backend/logs/combined.log | grep ERROR

# Show last 100 lines
tail -100 backend/logs/combined.log
```

### Log Analysis:

```bash
# Count log levels
grep "ERROR" backend/logs/combined.log | wc -l
grep "WARN" backend/logs/combined.log | wc -l

# Find logs for specific user
grep "userId\":123" backend/logs/combined.log

# Search by time range
grep "12:34" backend/logs/combined.log

# Count unique errors
grep "ERROR" backend/logs/error.log | sort | uniq -c
```

### Using External Tools:

```bash
# With jq (JSON query tool)
tail -f backend/logs/combined.log | jq '.level, .message'

# With grep + awk
grep ERROR backend/logs/error.log | awk '{print $3, $4}'
```

---

## 🎛️ ENVIRONMENT-SPECIFIC CONFIGURATIONS

### Development:
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_STACK_TRACES=true
LOG_PERFORMANCE_METRICS=true
```

### Staging:
```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_STACK_TRACES=true
LOG_PERFORMANCE_METRICS=false
```

### Production:
```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false
ENABLE_ERROR_STACK_TRACES=false
LOG_PERFORMANCE_METRICS=false
```

---

## 🔐 SECURITY CONSIDERATIONS

### What to Log:
✅ Request methods and endpoints  
✅ Response status codes  
✅ Error messages and types  
✅ User actions (login, logout, etc.)  
✅ Security events (failed logins, rate limit hits)  
✅ System events (startup, shutdown, crashes)  

### What NOT to Log:
❌ Passwords or security tokens  
❌ API keys or secrets  
❌ Full request/response bodies (sensitive data)  
❌ Personal information (SSN, credit cards)  
❌ Database credentials  

### Safe Logging Example:
```javascript
// ✅ GOOD - Safe information only
logger.info('User login attempt', {
  userId: user.id,        // Safe
  ip: req.ip,            // Safe
  timestamp: new Date()  // Safe
});

// ❌ BAD - Exposes sensitive data
logger.info('User login', {
  password: user.password,     // ❌ NEVER
  token: authToken,            // ❌ NEVER
  body: req.body              // ❌ NEVER
});
```

---

## 📈 MONITORING & ALERTING

### Log Aggregation Services:

To monitor logs in production, integrate with:

1. **ELK Stack (Elasticsearch, Logstash, Kibana)**
   ```bash
   # Ship logs to Logstash
   tail -f backend/logs/combined.log | nc logstash.example.com 5000
   ```

2. **Datadog**
   ```bash
   # Install agent and configure
   DD_AGENT_MAJOR_VERSION=7 bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_mac_os.sh)"
   ```

3. **Sentry** (for error tracking)
   ```bash
   # Set SENTRY_DSN in .env
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
   ```

4. **CloudWatch** (AWS)
   ```bash
   # Stream logs to CloudWatch
   aws logs create-log-stream --log-group-name peekhour --log-stream-name backend
   ```

---

## 🛠️ TROUBLESHOOTING

### Issue: Logs not appearing

**Solution 1**: Check LOG_LEVEL is appropriate
```bash
# If LOG_LEVEL=error, info/debug logs won't appear
LOG_LEVEL=info
```

**Solution 2**: Verify log directory exists
```bash
mkdir -p backend/logs
chmod 755 backend/logs
```

**Solution 3**: Check file permissions
```bash
ls -la backend/logs/
chmod 644 backend/logs/*.log
```

### Issue: Log files growing too large

**Solution**: Reduce LOG_MAX_SIZE or set up log rotation
```bash
# Reduce max file size
LOG_MAX_SIZE=2097152  # 2MB instead of 5MB

# Increase number of rotated files
LOG_MAX_FILES=10
```

### Issue: Performance impact from logging

**Solution**: Adjust LOG_LEVEL based on environment
```bash
# Production - log only warnings and errors
LOG_LEVEL=warn

# Disable request logging if not needed
ENABLE_REQUEST_LOGGING=false

# Disable performance metrics logging
LOG_PERFORMANCE_METRICS=false
```

---

## 📚 LOGGING BEST PRACTICES

1. **Use Appropriate Levels**
   - error: Application errors
   - warn: Potential issues
   - info: Important events
   - debug: Development only

2. **Include Context**
   - Always include user ID for user actions
   - Include request ID for tracing
   - Include operation duration for performance

3. **Sanitize Data**
   - Never log passwords, tokens, or keys
   - Mask sensitive information
   - Use IDs instead of full objects

4. **Consistent Format**
   - Use structured logging (JSON)
   - Include timestamp
   - Include log level

5. **Monitor Logs**
   - Set up alerts for errors
   - Monitor log file size
   - Archive old logs regularly

---

## 🔗 RELATED DOCUMENTATION

- `PRODUCTION_READY.md` - Complete deployment guide
- `backend/config/logger.js` - Logger implementation
- `backend/middleware/requestLogger.js` - HTTP request logging
- `.env.example` - Configuration template

---

## ✨ LOGGING IS NOW COMPLETE!

Your application has enterprise-grade logging configured with:
- ✅ Structured JSON logging
- ✅ Automatic log rotation
- ✅ Multiple log levels
- ✅ Environment-based configuration
- ✅ Security best practices
- ✅ Performance optimization

**Happy logging! 📝**
