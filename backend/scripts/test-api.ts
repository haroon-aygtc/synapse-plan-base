#!/usr/bin/env ts-node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

interface TestResult {
    endpoint: string;
    status: 'PASS' | 'FAIL';
    statusCode?: number;
    message: string;
    responseTime?: number;
}

async function testEndpoint(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const config: any = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            timeout: 5000,
            validateStatus: () => true, // Don't throw on any status code
        };

        if (data) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        // More realistic status evaluation
        let status: 'PASS' | 'FAIL' = 'FAIL';
        let message = '';

        if (response.status >= 200 && response.status < 300) {
            status = 'PASS';
            message = 'OK';
        } else if (response.status === 401) {
            status = 'FAIL';
            message = 'Authentication required - endpoint exists but needs auth';
        } else if (response.status === 404) {
            status = 'FAIL';
            message = 'Endpoint not found - route may not exist';
        } else if (response.status >= 500) {
            status = 'FAIL';
            message = `Server Error: ${response.statusText}`;
        } else {
            status = 'FAIL';
            message = `Unexpected status: ${response.status}`;
        }

        return {
            endpoint,
            status,
            statusCode: response.status,
            message,
            responseTime
        };
    } catch (error: any) {
        const responseTime = Date.now() - startTime;

        if (error.code === 'ECONNREFUSED') {
            return {
                endpoint,
                status: 'FAIL',
                message: 'Connection refused - Backend not running',
                responseTime
            };
        }

        return {
            endpoint,
            status: 'FAIL',
            message: error.message,
            responseTime
        };
    }
}

async function runApiTests() {
    console.log('🚀 Testing Backend API...');
    console.log(`📡 Base URL: ${API_BASE_URL}`);
    console.log('');

    const tests = [
        { endpoint: '/health', description: 'Health Check' },
        { endpoint: '/', description: 'Root Endpoint' },
        { endpoint: '/api', description: 'API Root' },
        { endpoint: '/api/health', description: 'API Health Check' },
        { endpoint: '/api/auth/status', description: 'Auth Status' },
        { endpoint: '/api/organizations', description: 'Organizations Endpoint' },
        { endpoint: '/api/users', description: 'Users Endpoint' },
        { endpoint: '/api/agents', description: 'Agents Endpoint' },
        { endpoint: '/api/notifications', description: 'Notifications Endpoint' },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
        process.stdout.write(`Testing ${test.description.padEnd(25)} ... `);

        const result = await testEndpoint(test.endpoint);
        results.push(result);

        const statusIcon = result.status === 'PASS' ? '✅' : '❌';
        const statusCode = result.statusCode ? `[${result.statusCode}]` : '';
        const responseTime = result.responseTime ? `(${result.responseTime}ms)` : '';

        console.log(`${statusIcon} ${statusCode} ${responseTime}`);

        if (result.status === 'FAIL') {
            console.log(`   └─ ${result.message}`);
        }
    }

    console.log('');
    console.log('📊 Test Summary:');
    console.log('─'.repeat(50));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);

    if (failed === 0) {
        console.log('');
        console.log('🎉 All tests passed! Backend is working correctly.');
    } else {
        console.log('');
        console.log('⚠️  Some tests failed. Check the details above.');

        // Check if backend is running at all
        const connectionFailed = results.some(r => r.message.includes('Connection refused'));
        if (connectionFailed) {
            console.log('');
            console.log('💡 Troubleshooting:');
            console.log('1. Make sure the backend is running: npm run start:dev');
            console.log('2. Check if port 3001 is available');
            console.log('3. Verify database connection');
        }
    }

    return { passed, failed, total };
}

// Additional database connectivity test
async function testDatabaseConnection() {
    console.log('');
    console.log('🗄️  Testing Database Connection...');

    try {
        // Load environment variables
        require('dotenv').config();
        
        // Test database directly using pg
        const { Client } = require('pg');
        const client = new Client({
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432'),
            user: process.env.DATABASE_USERNAME || 'postgres',
            password: process.env.DATABASE_PASSWORD || '',
            database: process.env.DATABASE_NAME || 'synapseai',
            connectTimeout: 3000
        });

        await client.connect();
        const result = await client.query('SELECT NOW() as current_time');
        await client.end();
        
        console.log('✅ Database connection: OK');
        console.log(`   └─ Connected to: ${process.env.DATABASE_NAME || 'synapseai'}`);
    } catch (error: any) {
        console.log('❌ Database connection: FAILED');
        console.log(`   └─ ${error.message}`);
    }
}

// Redis connectivity test
async function testRedisConnection() {
    console.log('');
    console.log('🔴 Testing Redis Connection...');

    try {
        // Load environment variables
        require('dotenv').config();
        
        // Test Redis directly using ioredis
        const Redis = require('ioredis');
        const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            connectTimeout: 3000,
            lazyConnect: true
        });

        await redis.connect();
        const result = await redis.ping();
        await redis.disconnect();
        
        console.log('✅ Redis connection: OK');
        console.log(`   └─ Ping response: ${result}`);
    } catch (error: any) {
        console.log('❌ Redis connection: FAILED');
        console.log(`   └─ ${error.message}`);
    }
}

// Main execution
async function main() {
    const startTime = Date.now();

    const results = await runApiTests();
    await testDatabaseConnection();
    await testRedisConnection();

    const totalTime = Date.now() - startTime;

    console.log('');
    console.log(`⏱️  Total test time: ${totalTime}ms`);

    // Exit with error code if tests failed
    if (results.failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export { runApiTests, testEndpoint };