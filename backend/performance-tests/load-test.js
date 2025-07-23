import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up to 10 users
    { duration: "5m", target: 10 }, // Stay at 10 users
    { duration: "2m", target: 20 }, // Ramp up to 20 users
    { duration: "5m", target: 20 }, // Stay at 20 users
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.1"], // Error rate must be below 10%
    errors: ["rate<0.1"], // Custom error rate must be below 10%
  },
};

const BASE_URL = "http://localhost:3001";

// Test data
const testUser = {
  email: "test@example.com",
  password: "testpassword123",
  firstName: "Test",
  lastName: "User",
};

let authToken = "";

export function setup() {
  // Register test user
  const registerResponse = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(registerResponse, {
    "registration successful": (r) => r.status === 201 || r.status === 409, // 409 if user already exists
  });

  // Login to get auth token
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(loginResponse, {
    "login successful": (r) => r.status === 200,
  });

  const loginData = JSON.parse(loginResponse.body);
  return { token: loginData.data.accessToken };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.token}`,
  };

  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    "health check status is 200": (r) => r.status === 200,
    "health check response time < 100ms": (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(1);

  // Test agents endpoint
  const agentsResponse = http.get(`${BASE_URL}/api/agents`, { headers });
  check(agentsResponse, {
    "agents list status is 200": (r) => r.status === 200,
    "agents response time < 500ms": (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test tools endpoint
  const toolsResponse = http.get(`${BASE_URL}/api/tools`, { headers });
  check(toolsResponse, {
    "tools list status is 200": (r) => r.status === 200,
    "tools response time < 500ms": (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test workflows endpoint
  const workflowsResponse = http.get(`${BASE_URL}/api/workflows`, { headers });
  check(workflowsResponse, {
    "workflows list status is 200": (r) => r.status === 200,
    "workflows response time < 500ms": (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test creating an agent
  const newAgent = {
    name: `Test Agent ${Math.random().toString(36).substring(7)}`,
    description: "A test agent for load testing",
    systemPrompt: "You are a helpful assistant.",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 1000,
  };

  const createAgentResponse = http.post(
    `${BASE_URL}/api/agents`,
    JSON.stringify(newAgent),
    { headers },
  );
  check(createAgentResponse, {
    "create agent status is 201": (r) => r.status === 201,
    "create agent response time < 1000ms": (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  if (createAgentResponse.status === 201) {
    const agentData = JSON.parse(createAgentResponse.body);
    const agentId = agentData.data.id;

    sleep(1);

    // Test agent execution
    const executeAgentResponse = http.post(
      `${BASE_URL}/api/agents/${agentId}/execute`,
      JSON.stringify({
        message: "Hello, how are you?",
      }),
      { headers },
    );

    check(executeAgentResponse, {
      "execute agent status is 200": (r) => r.status === 200,
      "execute agent response time < 5000ms": (r) => r.timings.duration < 5000,
    }) || errorRate.add(1);

    sleep(1);

    // Clean up - delete the test agent
    const deleteAgentResponse = http.del(
      `${BASE_URL}/api/agents/${agentId}`,
      null,
      { headers },
    );
    check(deleteAgentResponse, {
      "delete agent status is 200": (r) => r.status === 200,
    });
  }

  sleep(2);
}

export function teardown(data) {
  // Clean up test data if needed
  console.log("Load test completed");
}
