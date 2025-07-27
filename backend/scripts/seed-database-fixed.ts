#!/usr/bin/env ts-node

// Load environment variables
require('dotenv').config();

// Use require for pg to avoid TypeScript issues
const { Client } = require('pg');

async function seedDatabase() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'synapseai',
  });

  try {
    await client.connect();
    console.log('✅ Database connected successfully');
    console.log(`📊 Connected to: ${process.env.DATABASE_NAME}`);
    
    console.log('🌱 Starting database seeding...');

    // Create default organization
    const orgResult = await client.query(`
      INSERT INTO "organizations" (
        "id", "organizationId", "name", "slug", "description", 
        "plan", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        uuid_generate_v4(),
        uuid_generate_v4(),
        'Default Organization',
        'default-org',
        'Default organization for initial setup',
        'FREE',
        true,
        NOW(),
        NOW()
      ) 
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `);
    
    let orgId;
    if (orgResult.rows.length > 0) {
      orgId = orgResult.rows[0].id;
      console.log('✅ Default organization created');
    } else {
      // Get existing org ID
      const existingOrg = await client.query(`SELECT id FROM "organizations" WHERE slug = 'default-org'`);
      orgId = existingOrg.rows[0].id;
      console.log('✅ Default organization already exists');
    }

    // Create system admin user
    await client.query(`
      INSERT INTO "users" (
        "id", "organizationId", "email", "passwordHash", 
        "firstName", "lastName", "role", "isActive", 
        "emailVerified", "createdAt", "updatedAt"
      ) VALUES (
        uuid_generate_v4(),
        $1,
        'admin@system.local',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/hL.LBHyuu',
        'System',
        'Administrator',
        'SUPER_ADMIN',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `, [orgId]);
    console.log('✅ System admin user created');

    // Create default AI providers
    await client.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "userId", "createdAt", "updatedAt"
      ) VALUES (
        uuid_generate_v4(),
        $1,
        'OpenAI GPT-4',
        'openai',
        '{"model": "gpt-4", "apiKey": "", "baseURL": "https://api.openai.com/v1"}',
        false,
        (SELECT id FROM users WHERE email = 'admin@system.local' LIMIT 1),
        NOW(),
        NOW()
      )
    `, [orgId]);
    console.log('✅ OpenAI provider created');

    await client.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "userId", "createdAt", "updatedAt"
      ) VALUES (
        uuid_generate_v4(),
        $1,
        'Anthropic Claude',
        'anthropic',
        '{"model": "claude-3-sonnet-20240229", "apiKey": "", "baseURL": "https://api.anthropic.com"}',
        false,
        (SELECT id FROM users WHERE email = 'admin@system.local' LIMIT 1),
        NOW(),
        NOW()
      )
    `, [orgId]);
    console.log('✅ Anthropic provider created');

    // Verify data was inserted
    const orgCount = await client.query('SELECT COUNT(*) FROM organizations');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const providerCount = await client.query('SELECT COUNT(*) FROM ai_providers');

    console.log('');
    console.log('📊 Verification:');
    console.log(`   Organizations: ${orgCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   AI Providers: ${providerCount.rows[0].count}`);

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Default credentials:');
    console.log('   Email: admin@system.local');
    console.log('   Password: admin123');
    console.log('   Organization: default-org');

  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };