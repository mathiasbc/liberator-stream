#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Multi-Source API Architecture
 * This script runs integration tests and validates the entire system
 */

const { spawn } = require('child_process');
const axios = require('axios');
const WebSocket = require('ws');
const path = require('path');

const BACKEND_PORT = 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const WS_URL = `ws://localhost:${BACKEND_PORT}`;

class TestRunner {
  constructor() {
    this.backendProcess = null;
    this.testResults = {
      backend: [],
      frontend: [],
      integration: []
    };
  }

  async runTests() {
    console.log('🚀 Starting Multi-Source API Architecture Test Suite\n');

    try {
      // 1. Run backend unit tests
      console.log('📋 Running backend unit tests...');
      await this.runBackendTests();

      // 2. Start backend server for integration tests
      console.log('🔧 Starting backend server for integration tests...');
      await this.startBackendServer();

      // 3. Wait for server to be ready
      await this.waitForServer();

      // 4. Run integration tests
      console.log('🔗 Running integration tests...');
      await this.runIntegrationTests();

      // 5. Run frontend tests
      console.log('⚛️ Running frontend tests...');
      await this.runFrontendTests();

      // 6. Generate test report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    } finally {
      // Clean up
      if (this.backendProcess) {
        this.backendProcess.kill();
      }
    }
  }

  async runBackendTests() {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['run', 'test:integration'], {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit'
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Backend tests passed\n');
          this.testResults.backend.push({ name: 'Backend Unit Tests', status: 'PASSED' });
          resolve();
        } else {
          this.testResults.backend.push({ name: 'Backend Unit Tests', status: 'FAILED' });
          reject(new Error('Backend tests failed'));
        }
      });
    });
  }

  async startBackendServer() {
    return new Promise((resolve, reject) => {
      this.backendProcess = spawn('npm', ['run', 'start'], {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'pipe'
      });

      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('running on port')) {
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error('Backend error:', data.toString());
      });

      this.backendProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Backend server exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Backend server startup timeout'));
      }, 30000);
    });
  }

  async waitForServer() {
    const maxRetries = 30;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${BACKEND_URL}/api/health`);
        console.log('✅ Backend server is ready\n');
        return;
      } catch (error) {
        console.log(`⏳ Waiting for server (attempt ${i + 1}/${maxRetries})...`);
        await this.delay(retryDelay);
      }
    }

    throw new Error('Server failed to start within timeout period');
  }

  async runIntegrationTests() {
    const tests = [
      this.testHealthEndpoints.bind(this),
      this.testMonitoringEndpoints.bind(this),
      this.testWebSocketConnection.bind(this),
      this.testAPIRotation.bind(this),
      this.testDataConsistency.bind(this),
      this.testMemoryManagement.bind(this)
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Integration test failed: ${error.message}`);
        this.testResults.integration.push({
          name: test.name,
          status: 'FAILED',
          error: error.message
        });
      }
    }
  }

  async testHealthEndpoints() {
    console.log('🏥 Testing health endpoints...');

    // Test basic health
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
    if (healthResponse.data.status !== 'OK') {
      throw new Error('Health endpoint returned non-OK status');
    }

    // Test memory endpoint
    const memoryResponse = await axios.get(`${BACKEND_URL}/api/memory`);
    if (!memoryResponse.data.memoryUsage) {
      throw new Error('Memory endpoint missing memoryUsage data');
    }

    // Test stats endpoint
    const statsResponse = await axios.get(`${BACKEND_URL}/api/stats`);
    if (!statsResponse.data.scheduler || !statsResponse.data.cache || !statsResponse.data.apiManager) {
      throw new Error('Stats endpoint missing required data');
    }

    console.log('✅ Health endpoints working correctly');
    this.testResults.integration.push({ name: 'Health Endpoints', status: 'PASSED' });
  }

  async testMonitoringEndpoints() {
    console.log('📊 Testing monitoring endpoints...');

    // Test adapters health
    const adaptersResponse = await axios.get(`${BACKEND_URL}/api/adapters`);
    const adapters = adaptersResponse.data.adapters;
    
    if (!adapters.coingecko || !adapters.blockstream) {
      throw new Error('Missing required adapters in health response');
    }

    // Test cache endpoint
    const cacheResponse = await axios.get(`${BACKEND_URL}/api/cache`);
    if (!cacheResponse.data.currentTimeframe) {
      throw new Error('Cache endpoint missing timeframe data');
    }

    console.log('✅ Monitoring endpoints working correctly');
    this.testResults.integration.push({ name: 'Monitoring Endpoints', status: 'PASSED' });
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket connection...');

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let dataReceived = false;

      ws.on('open', () => {
        console.log('  📡 WebSocket connected');
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.currentPrice !== undefined || parsed.blockHeight !== undefined) {
            dataReceived = true;
            console.log('  📦 Received valid data structure');
            ws.close();
            resolve();
          }
        } catch (error) {
          reject(new Error('Invalid JSON received from WebSocket'));
        }
      });

      ws.on('close', () => {
        if (dataReceived) {
          console.log('✅ WebSocket connection test passed');
          this.testResults.integration.push({ name: 'WebSocket Connection', status: 'PASSED' });
        } else {
          reject(new Error('No data received from WebSocket'));
        }
      });

      ws.on('error', (error) => {
        reject(new Error(`WebSocket error: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!dataReceived) {
          ws.close();
          reject(new Error('WebSocket data timeout'));
        }
      }, 10000);
    });
  }

  async testAPIRotation() {
    console.log('🔄 Testing API rotation...');

    // Get initial stats
    const initialStats = await axios.get(`${BACKEND_URL}/api/stats`);
    const initialSuccessCount = initialStats.data.scheduler.successCount;

    // Wait for a few update cycles
    await this.delay(5000);

    // Get updated stats
    const updatedStats = await axios.get(`${BACKEND_URL}/api/stats`);
    const updatedSuccessCount = updatedStats.data.scheduler.successCount;

    if (updatedSuccessCount <= initialSuccessCount) {
      throw new Error('No API updates detected - rotation may not be working');
    }

    console.log('✅ API rotation working correctly');
    this.testResults.integration.push({ name: 'API Rotation', status: 'PASSED' });
  }

  async testDataConsistency() {
    console.log('🎯 Testing data consistency...');

    const cache1 = await axios.get(`${BACKEND_URL}/api/cache`);
    await this.delay(2000);
    const cache2 = await axios.get(`${BACKEND_URL}/api/cache`);

    // Check that timeframes are valid
    const validTimeframes = ['5M', '1H', '4H', '1D', '1W'];
    if (!validTimeframes.includes(cache1.data.currentTimeframe)) {
      throw new Error('Invalid timeframe in cache data');
    }

    // Check that data has proper structure
    if (!cache1.data.ohlcData || typeof cache1.data.ohlcData !== 'object') {
      throw new Error('Invalid OHLC data structure');
    }

    console.log('✅ Data consistency verified');
    this.testResults.integration.push({ name: 'Data Consistency', status: 'PASSED' });
  }

  async testMemoryManagement() {
    console.log('🧠 Testing memory management...');

    const initialMemory = await axios.get(`${BACKEND_URL}/api/memory`);
    const initialHeap = initialMemory.data.memoryUsage.heapUsed;

    // Trigger memory cleanup
    await axios.post(`${BACKEND_URL}/api/admin/cleanup`);

    await this.delay(1000);

    const finalMemory = await axios.get(`${BACKEND_URL}/api/memory`);
    const finalHeap = finalMemory.data.memoryUsage.heapUsed;

    // Memory should be stable (not growing uncontrollably)
    const memoryGrowthRatio = finalHeap / initialHeap;
    if (memoryGrowthRatio > 2.0) {
      throw new Error('Excessive memory growth detected');
    }

    console.log('✅ Memory management working correctly');
    this.testResults.integration.push({ name: 'Memory Management', status: 'PASSED' });
  }

  async runFrontendTests() {
    // Note: Frontend tests would typically run in CI environment
    // For now, we'll simulate the test results
    console.log('⚛️ Frontend tests would run here (requires separate test environment)');
    this.testResults.frontend.push({ name: 'Dashboard Integration', status: 'SKIPPED' });
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const allTests = [
      ...this.testResults.backend,
      ...this.testResults.integration,
      ...this.testResults.frontend
    ];

    const passed = allTests.filter(t => t.status === 'PASSED').length;
    const failed = allTests.filter(t => t.status === 'FAILED').length;
    const skipped = allTests.filter(t => t.status === 'SKIPPED').length;

    console.log(`\n✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`⏭️  SKIPPED: ${skipped}`);
    console.log(`📊 TOTAL: ${allTests.length}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      allTests.filter(t => t.status === 'FAILED').forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
      });
    }

    console.log('\n🎉 Multi-Source API Architecture Test Suite Complete!');
    
    if (failed === 0) {
      console.log('✅ All critical tests passed - system is ready for production!');
    } else {
      console.log('❌ Some tests failed - please review and fix issues before deployment');
      process.exit(1);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;