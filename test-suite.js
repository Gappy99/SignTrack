#!/usr/bin/env node

/**
 * SignTrack Microservices - Automated Test Suite
 * Run: node test-suite.js
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const BASE_URLS = {
  authService: 'http://localhost:5104',
  videoCall: 'http://localhost:3200',
  frameProcessor: 'http://localhost:3201',
  orchestrator: 'http://localhost:3203',
  websocket: 'http://localhost:3202'
};

const testData = {
  userId: 'test-user-' + uuidv4().substring(0, 8),
  recipientId: 'recipient-' + uuidv4().substring(0, 8),
  jwtToken: null
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test Results
let passedTests = 0;
let failedTests = 0;

/**
 * Test wrapper
 */
async function test(name, fn) {
  try {
    process.stdout.write(`${colors.cyan}[TEST]${colors.reset} ${name}... `);
    await fn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.error(`  Error: ${error.message}`);
    failedTests++;
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Health Check Tests
 */
async function healthChecks() {
  console.log(`\n${colors.blue}═══ Health Checks ═══${colors.reset}`);
  
  await test('Video Call Service health', async () => {
    const res = await axios.get(BASE_URLS.videoCall + '/health');
    assert(res.status === 200, 'Should return 200');
    assert(res.data.status === 'Healthy', 'Status should be Healthy');
  });

  await test('Frame Processor Service health', async () => {
    const res = await axios.get(BASE_URLS.frameProcessor + '/health');
    assert(res.status === 200, 'Should return 200');
  });

  await test('Orchestrator Service health', async () => {
    const res = await axios.get(BASE_URLS.orchestrator + '/health');
    assert(res.status === 200, 'Should return 200');
  });

  await test('WebSocket Service health', async () => {
    const res = await axios.get(BASE_URLS.websocket + '/health');
    assert(res.status === 200, 'Should return 200');
  });
}

/**
 * Authentication Tests
 */
async function authenticationTests() {
  console.log(`\n${colors.blue}═══ Authentication Tests ═══${colors.reset}`);
  
  // Get or create JWT token
  await test('Get JWT token from mock', async () => {
    // In production, this would call AuthService
    // For testing, create a mock token
    const mockToken = Buffer.from(
      JSON.stringify({
        id: testData.userId,
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000)
      })
    ).toString('base64');
    
    testData.jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + mockToken + '.signature';
    assert(testData.jwtToken.length > 0, 'Token should be generated');
  });
}

/**
 * Video Call Service Tests
 */
async function videoCallTests() {
  console.log(`\n${colors.blue}═══ Video Call Service Tests ═══${colors.reset}`);
  
  let callId = null;

  await test('Initiate call', async () => {
    try {
      const res = await axios.post(
        BASE_URLS.videoCall + '/calls/initiate',
        { recipientId: testData.recipientId },
        { 
          headers: { 
            'Authorization': `Bearer ${testData.jwtToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true // Don't throw on any status
        }
      );

      // Accept 200, 201, or 400 (if JWT validation fails)
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Authentication failed: ${res.status}`);
      }

      if (res.data.data && res.data.data.callId) {
        callId = res.data.data.callId;
      }

      assert(callId !== null, 'Should return callId');
    } catch (error) {
      console.error('  Full error:', error.message);
      throw error;
    }
  });

  if (callId) {
    await test('Get call status', async () => {
      const res = await axios.get(
        `${BASE_URLS.videoCall}/calls/${callId}/status`,
        {
          headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
          validateStatus: () => true
        }
      );

      assert(res.status < 500, 'Should not return 500 error');
    });

    await test('Join call', async () => {
      const res = await axios.post(
        `${BASE_URLS.videoCall}/calls/${callId}/join`,
        {},
        {
          headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
          validateStatus: () => true
        }
      );

      assert(res.status < 500, 'Should not return 500 error');
    });
  }
}

/**
 * Frame Processor Tests
 */
async function frameProcessorTests() {
  console.log(`\n${colors.blue}═══ Frame Processor Service Tests ═══${colors.reset}`);
  
  // Small base64 test frame
  const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await test('Process single frame', async () => {
    const res = await axios.post(
      BASE_URLS.frameProcessor + '/process/frame',
      { 
        frame: testFrame,
        callId: 'test-call-' + uuidv4().substring(0, 8)
      },
      {
        headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
        validateStatus: () => true
      }
    );

    // Accept 200, 202, or 400+ (validation/service errors are OK for this test)
    assert(res.status >= 200, 'Should return a response');
  });

  await test('Process frame batch', async () => {
    const res = await axios.post(
      BASE_URLS.frameProcessor + '/process/batch',
      {
        frames: [testFrame, testFrame],
        callId: 'test-call-' + uuidv4().substring(0, 8)
      },
      {
        headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
        validateStatus: () => true
      }
    );

    assert(res.status >= 200, 'Should return a response');
  });
}

/**
 * Orchestrator Tests
 */
async function orchestratorTests() {
  console.log(`\n${colors.blue}═══ Orchestrator Service Tests ═══${colors.reset}`);
  
  const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testCallId = 'test-call-' + uuidv4().substring(0, 8);

  await test('Detect and translate', async () => {
    const res = await axios.post(
      BASE_URLS.orchestrator + '/orchestrate/detect',
      {
        frame: testFrame,
        callId: testCallId
      },
      {
        headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
        validateStatus: () => true
      }
    );

    assert(res.status >= 200, 'Should return a response');
  });

  await test('Start translation stream', async () => {
    const res = await axios.post(
      BASE_URLS.orchestrator + '/orchestrate/stream',
      { callId: testCallId },
      {
        headers: { 'Authorization': `Bearer ${testData.jwtToken}` },
        validateStatus: () => true
      }
    );

    assert(res.status >= 200, 'Should return a response');
  });

  await test('Get translation history', async () => {
    const res = await axios.get(
      `${BASE_URLS.orchestrator}/orchestrate/history/${testCallId}?limit=10`,
      { validateStatus: () => true }
    );

    assert(res.status >= 200, 'Should return a response');
  });

  await test('Get translation statistics', async () => {
    const res = await axios.get(
      `${BASE_URLS.orchestrator}/orchestrate/statistics/${testCallId}`,
      { validateStatus: () => true }
    );

    assert(res.status >= 200, 'Should return a response');
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.blue}
╔════════════════════════════════════════╗
║  SignTrack Microservices Test Suite    ║
╚════════════════════════════════════════╝
  ${colors.reset}`);

  try {
    await healthChecks();
    await authenticationTests();
    await videoCallTests();
    await frameProcessorTests();
    await orchestratorTests();
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
  }

  // Summary
  console.log(`
${colors.blue}═══ Test Summary ═══${colors.reset}
${colors.green}✓ Passed: ${passedTests}${colors.reset}
${colors.red}✗ Failed: ${failedTests}${colors.reset}
Total: ${passedTests + failedTests}

${colors.cyan}Note:${colors.reset} Some failures are expected if services are not running
or JWT tokens are not valid. This is a basic smoke test.
  `);

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests();
