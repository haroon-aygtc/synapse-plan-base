#!/usr/bin/env node

/**
 * SynapseAI CLI Tool
 * Command-line interface for the SynapseAI platform
 */

import { Command } from "commander";
import { SynapseAI } from "./client";
import { authService } from "../auth";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), ".synapseai");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface CLIConfig {
  apiKey?: string;
  baseURL?: string;
  organizationId?: string;
  currentProfile?: string;
  profiles?: Record<
    string,
    {
      apiKey: string;
      baseURL: string;
      organizationId: string;
    }
  >;
}

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Load configuration
function loadConfig(): CLIConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch (error) {
      console.error("Error loading config:", error);
    }
  }
  return {};
}

// Save configuration
function saveConfig(config: CLIConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

// Create SDK client
function createClient(config: CLIConfig): SynapseAI {
  const profile = config.currentProfile
    ? config.profiles?.[config.currentProfile]
    : null;

  return new SynapseAI({
    apiKey:
      profile?.apiKey || config.apiKey || process.env.SYNAPSE_API_KEY || "",
    baseURL:
      profile?.baseURL ||
      config.baseURL ||
      process.env.SYNAPSE_API_URL ||
      "http://localhost:3001/api",
    organizationId:
      profile?.organizationId ||
      config.organizationId ||
      process.env.SYNAPSE_ORG_ID ||
      "",
    autoConnect: false,
    debug: process.env.DEBUG === "true",
  });
}

// CLI Commands
program
  .name("synapseai")
  .description(
    "SynapseAI CLI - Command-line interface for the SynapseAI platform",
  )
  .version("1.0.0");

// Login command
program
  .command("login")
  .description("Login to SynapseAI platform")
  .option("-e, --email <email>", "Email address")
  .option("-p, --password <password>", "Password")
  .option("--profile <name>", "Profile name")
  .action(async (options) => {
    try {
      const email = options.email || (await promptInput("Email: "));
      const password = options.password || (await promptPassword("Password: "));

      const authResult = await authService.login({ email, password });

      if (authResult.success && authResult.data) {
        const config = loadConfig();
        const profileName = options.profile || "default";

        if (!config.profiles) {
          config.profiles = {};
        }

        config.profiles[profileName] = {
          apiKey: authResult.data.accessToken || "",
          baseURL: process.env.SYNAPSE_API_URL || "http://localhost:3001/api",
          organizationId: authResult.data.user?.organizationId || "",
        };

        config.currentProfile = profileName;
        saveConfig(config);

        console.log(
          `✅ Successfully logged in as ${authResult.data.user?.email || ""}`,
        );
        console.log(`📁 Profile: ${profileName}`);
        console.log(`🏢 Organization: ${authResult.data.user?.organizationId || ""}`);
      } else {
        console.error("❌ Login failed:", authResult.error);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Login error:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Agent commands
const agentCmd = program
  .command("agent")
  .description("Agent management commands");

agentCmd
  .command("list")
  .description("List all agents")
  .option("--limit <number>", "Number of agents to list", "10")
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = createClient(config);

      const agents = await client.agents.list({
        limit: parseInt(options.limit),
      });

      console.log("\n📋 Agents:");
      agents.data?.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.name} (${agent.id})`);
        console.log(`   Model: ${agent.model}`);
        console.log(
          `   Status: ${agent.isActive ? "✅ Active" : "❌ Inactive"}`,
        );
        console.log("");
      });
    } catch (error) {
      console.error("❌ Error listing agents:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

agentCmd
  .command("test <agentId>")
  .description("Test an agent with a prompt")
  .option("-p, --prompt <prompt>", "Test prompt")
  .option("-s, --stream", "Stream response")
  .action(async (agentId, options) => {
    try {
      const config = loadConfig();
      const client = createClient(config);

      const prompt =
        options.prompt || (await promptInput("Enter test prompt: "));

      console.log(`\n🧪 Testing agent ${agentId}...`);
      console.log(`📝 Prompt: ${prompt}\n`);

      if (options.stream) {
        // Stream response
        const executionId = await client.agents.execute(agentId, {
          prompt,
          stream: true,
        });

        console.log("🔄 Streaming response:");

        const unsubscribe = client.subscribe("agent_text_chunk", (chunk) => {
          if (chunk.execution_id === executionId) {
            process.stdout.write(chunk.text);
            if (chunk.is_final) {
              console.log("\n\n✅ Execution completed");
              unsubscribe();
              process.exit(0);
            }
          }
        });
      } else {
        // Regular response
        const result = await client.agents.execute(agentId, {
          prompt,
        });

        console.log("📤 Response:");
        console.log(result.output);
        console.log(`\n⏱️  Execution time: ${result.executionTimeMs}ms`);
        console.log(`🎯 Tokens used: ${result.tokensUsed}`);
        console.log(`💰 Cost: $${result.cost?.toFixed(4)}`);
      }
    } catch (error) {
      console.error("❌ Error testing agent:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Tool commands
const toolCmd = program.command("tool").description("Tool management commands");

toolCmd
  .command("list")
  .description("List all tools")
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createClient(config);

      const tools = await client.tools.list();

      console.log("\n🔧 Tools:");
      tools.data?.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name} (${tool.id})`);
        console.log(`   Description: ${tool.description}`);
        console.log(`   Endpoint: ${tool.method} ${tool.endpoint}`);
        console.log("");
      });
    } catch (error) {
      console.error("❌ Error listing tools:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Config commands
const configCmd = program
  .command("config")
  .description("Configuration management");

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const config = loadConfig();
    console.log("\n⚙️  Current Configuration:");
    console.log(JSON.stringify(config, null, 2));
  });

configCmd
  .command("set <key> <value>")
  .description("Set configuration value")
  .action((key, value) => {
    const config = loadConfig();
    config[key as keyof CLIConfig] = value;
    saveConfig(config);
    console.log(`✅ Set ${key} = ${value}`);
  });

// Profile commands
const profileCmd = program.command("profile").description("Profile management");

profileCmd
  .command("list")
  .description("List all profiles")
  .action(() => {
    const config = loadConfig();
    console.log("\n👤 Profiles:");
    if (config.profiles) {
      Object.keys(config.profiles).forEach((name) => {
        const current = name === config.currentProfile ? " (current)" : "";
        console.log(`  ${name}${current}`);
      });
    } else {
      console.log("  No profiles found");
    }
  });

profileCmd
  .command("switch <name>")
  .description("Switch to a different profile")
  .action((name) => {
    const config = loadConfig();
    if (config.profiles && config.profiles[name]) {
      config.currentProfile = name;
      saveConfig(config);
      console.log(`✅ Switched to profile: ${name}`);
    } else {
      console.error(`❌ Profile '${name}' not found`);
      process.exit(1);
    }
  });

// Utility functions
function promptInput(question: string): Promise<string> {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptPassword(question: string): Promise<string> {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });

    // Hide password input
    (rl as any).stdoutMuted = true;
    (rl as any)._writeToOutput = function _writeToOutput(
      stringToWrite: string,
    ) {
      if ((rl as any).stdoutMuted) {
        (rl as any).output.write("*");
      } else {
        (rl as any).output.write(stringToWrite);
      }
    };
  });
}

// Parse command line arguments
program.parse(process.argv);
