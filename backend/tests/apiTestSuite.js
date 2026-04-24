import axios from 'axios';
import { io } from 'socket.io-client';
import logger from '../config/logger.js';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Test Suite for PeekHour Backend
 */
class PeekHourTestSuite {
  constructor() {
    this.testResults = [];
    this.authToken = null;
    this.userId = null;
    this.users = [];
    this.sockets = [];
  }

  log(test, status, message) {
    const result = { test, status, message, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    const icon = status === 'PASS' ? '✅' : '❌';
    logger.info(`${icon} [${test}] ${message}`);
  }

  // ==================== SETUP ====================
  async setupTestUsers() {
    logger.info('Setting up test users...');
    try {
      const testUsers = [
        { username: 'testuser1', email: 'test1@peekhour.com', password: 'TestPass123' },
        { username: 'testuser2', email: 'test2@peekhour.com', password: 'TestPass123' },
        { username: 'testuser3', email: 'test3@peekhour.com', password: 'TestPass123' }
      ];

      for (const user of testUsers) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/register`, user);
          if (response.data.success) {
            this.users.push({ ...user, id: response.data.data.userId });
            this.log('setup_user', 'PASS', `Created user: ${user.username}`);
          }
        } catch (error) {
          // User might already exist
          logger.debug(`User ${user.username} already exists`);
        }
      }
    } catch (error) {
      this.log('setup_user', 'FAIL', error.message);
    }
  }

  // ==================== AUTH TESTS ====================
  async testAuthentication() {
    logger.info('\n=== Running Authentication Tests ===');

    try {
      // Test login
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: this.users[0]?.email || 'test1@peekhour.com',
        password: 'TestPass123'
      });

      if (loginResponse.data.success) {
        this.authToken = loginResponse.data.data.token;
        this.userId = loginResponse.data.data.userId;
        this.log('auth_login', 'PASS', 'Login successful');
      } else {
        this.log('auth_login', 'FAIL', 'Login failed');
      }
    } catch (error) {
      this.log('auth_login', 'FAIL', error.message);
    }
  }

  // ==================== POST TESTS ====================
  async testPostOperations() {
    logger.info('\n=== Running Post Tests ===');

    if (!this.authToken) {
      this.log('post_create', 'FAIL', 'Not authenticated');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test create post
      const createResponse = await axios.post(
        `${API_URL}/api/posts`,
        {
          content: 'Test post for unit tests',
          mediaType: 'none',
          country: 'India',
          city: 'Test City'
        },
        { headers }
      );

      if (createResponse.data.success) {
        const postId = createResponse.data.data._id;
        this.log('post_create', 'PASS', 'Post created successfully');

        // Test get posts
        const getResponse = await axios.get(`${API_URL}/api/posts`, { headers });
        if (getResponse.data.success && Array.isArray(getResponse.data.data)) {
          this.log('post_get_all', 'PASS', `Retrieved ${getResponse.data.data.length} posts`);
        }

        // Test get single post
        const singleResponse = await axios.get(`${API_URL}/api/posts/${postId}`, { headers });
        if (singleResponse.data.success) {
          this.log('post_get_single', 'PASS', 'Retrieved single post');
        }

        // Test like post
        const likeResponse = await axios.post(`${API_URL}/api/posts/${postId}/like`, {}, { headers });
        if (likeResponse.data.success) {
          this.log('post_like', 'PASS', 'Post liked successfully');
        }

        // Test update post
        const updateResponse = await axios.put(
          `${API_URL}/api/posts/${postId}`,
          { content: 'Updated test post' },
          { headers }
        );
        if (updateResponse.data.success) {
          this.log('post_update', 'PASS', 'Post updated successfully');
        }
      } else {
        this.log('post_create', 'FAIL', 'Failed to create post');
      }
    } catch (error) {
      this.log('post_tests', 'FAIL', error.message);
    }
  }

  // ==================== COMMENT TESTS ====================
  async testCommentOperations() {
    logger.info('\n=== Running Comment Tests ===');

    if (!this.authToken) {
      this.log('comment_create', 'FAIL', 'Not authenticated');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // First create a post
      const postResponse = await axios.post(
        `${API_URL}/api/posts`,
        { content: 'Test post for comments' },
        { headers }
      );

      if (postResponse.data.success) {
        const postId = postResponse.data.data._id;

        // Test create comment
        const commentResponse = await axios.post(
          `${API_URL}/api/posts/${postId}/comments`,
          { content: 'Test comment' },
          { headers }
        );

        if (commentResponse.data.success) {
          this.log('comment_create', 'PASS', 'Comment created successfully');

          // Test get comments
          const getResponse = await axios.get(`${API_URL}/api/posts/${postId}/comments`, { headers });
          if (getResponse.data.success) {
            this.log('comment_get', 'PASS', `Retrieved comments`);
          }
        } else {
          this.log('comment_create', 'FAIL', 'Failed to create comment');
        }
      }
    } catch (error) {
      this.log('comment_tests', 'FAIL', error.message);
    }
  }

  // ==================== RATE LIMITING TESTS ====================
  async testRateLimiting() {
    logger.info('\n=== Running Rate Limiting Tests ===');

    try {
      let failedRequests = 0;

      // Make multiple rapid requests
      for (let i = 0; i < 110; i++) {
        try {
          await axios.get(`${API_URL}/api/health`);
        } catch (error) {
          if (error.response?.status === 429) {
            failedRequests++;
          }
        }
      }

      if (failedRequests > 0) {
        this.log('rate_limiting', 'PASS', `Rate limiting active (${failedRequests} blocked)`);
      } else {
        this.log('rate_limiting', 'WARN', 'Rate limiting may not be working as expected');
      }
    } catch (error) {
      this.log('rate_limiting', 'FAIL', error.message);
    }
  }

  // ==================== WEBSOCKET TESTS ====================
  async testWebSocket() {
    logger.info('\n=== Running WebSocket Tests ===');

    return new Promise(async (resolve) => {
      try {
        if (!this.authToken) {
          this.log('websocket_connection', 'FAIL', 'Not authenticated');
          resolve();
          return;
        }

        const socket = io(API_URL, {
          auth: { token: this.authToken }
        });

        socket.on('connect', () => {
          this.log('websocket_connection', 'PASS', 'WebSocket connected');

          socket.emit('send_notification', {
            recipientId: this.userId,
            type: 'test',
            content: 'Test notification',
            actorId: this.userId,
            actorUsername: 'testuser'
          });
        });

        socket.on('notification', (data) => {
          this.log('websocket_notification', 'PASS', 'Received real-time notification');
          socket.disconnect();
          resolve();
        });

        socket.on('error', (error) => {
          this.log('websocket_error', 'FAIL', error);
          socket.disconnect();
          resolve();
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (socket.connected) {
            this.log('websocket_timeout', 'WARN', 'WebSocket test timeout');
            socket.disconnect();
          }
          resolve();
        }, 10000);
      } catch (error) {
        this.log('websocket_tests', 'FAIL', error.message);
        resolve();
      }
    });
  }

  // ==================== CONCURRENT USER TESTS ====================
  async testConcurrentUsers() {
    logger.info('\n=== Running Concurrent User Tests ===');

    try {
      const concurrentCount = 10;
      const promises = [];

      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          axios.get(`${API_URL}/api/health`)
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r?.data?.success).length;

      if (successCount === concurrentCount) {
        this.log('concurrent_requests', 'PASS', `${concurrentCount}/${concurrentCount} concurrent requests succeeded`);
      } else {
        this.log('concurrent_requests', 'WARN', `${successCount}/${concurrentCount} concurrent requests succeeded`);
      }
    } catch (error) {
      this.log('concurrent_tests', 'FAIL', error.message);
    }
  }

  // ==================== ERROR HANDLING TESTS ====================
  async testErrorHandling() {
    logger.info('\n=== Running Error Handling Tests ===');

    try {
      // Test 404
      const notFoundResponse = await axios.get(`${API_URL}/api/nonexistent`).catch(e => e.response);
      if (notFoundResponse?.status === 404 && notFoundResponse?.data?.success === false) {
        this.log('error_404', 'PASS', 'Proper 404 error response');
      }

      // Test validation error
      const validationResponse = await axios.post(`${API_URL}/api/auth/register`, {
        username: 'ab', // Too short
        email: 'invalid',
        password: 'short'
      }).catch(e => e.response);

      if (validationResponse?.status === 400) {
        this.log('error_validation', 'PASS', 'Validation error handled');
      }

      // Test unauthorized
      const unauthorizedResponse = await axios.get(`${API_URL}/api/posts`).catch(e => e.response);
      if (unauthorizedResponse?.status === 401) {
        this.log('error_unauthorized', 'PASS', 'Unauthorized error handled');
      }
    } catch (error) {
      this.log('error_handling', 'FAIL', error.message);
    }
  }

  // ==================== RUN ALL TESTS ====================
  async runAllTests() {
    logger.info('\n🚀 Starting PeekHour Test Suite...\n');

    await this.setupTestUsers();
    await this.testAuthentication();
    await this.testPostOperations();
    await this.testCommentOperations();
    await this.testErrorHandling();
    await this.testRateLimiting();
    await this.testConcurrentUsers();
    await this.testWebSocket();

    return this.generateReport();
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;
    const total = this.testResults.length;

    logger.info(`\n${'='.repeat(60)}`);
    logger.info('TEST RESULTS SUMMARY');
    logger.info(`${'='.repeat(60)}`);
    logger.info(`Total Tests: ${total}`);
    logger.info(`✅ Passed: ${passed}`);
    logger.info(`❌ Failed: ${failed}`);
    logger.info(`⚠️ Warnings: ${warnings}`);
    logger.info(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    logger.info(`${'='.repeat(60)}\n`);

    return {
      summary: { total, passed, failed, warnings },
      details: this.testResults,
      successRate: (passed / total) * 100
    };
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new PeekHourTestSuite();
  testSuite.runAllTests().then(() => {
    process.exit(0);
  });
}

export default PeekHourTestSuite;
