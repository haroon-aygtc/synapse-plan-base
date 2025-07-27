#!/usr/bin/env ts-node

// Use require for pg to avoid TypeScript issues
const { Client } = require('pg');

// Load environment variables
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'synapseai',
};

async function checkAndSetupDatabase() {
  console.log('🔍 Checking database connection...');
  
  // First, connect to postgres database to check if our target database exists
  const adminClient = new Client({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.username,
    password: DB_CONFIG.password,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if target database exists
    const dbCheckResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_CONFIG.database]
    );

    if (dbCheckResult.rows.length === 0) {
      console.log(`📦 Creating database: ${DB_CONFIG.database}`);
      await adminClient.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }

    await adminClient.end();

    // Now connect to our target database
    const client = new Client({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.username,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
    });

    await client.connect();
    console.log(`✅ Connected to ${DB_CONFIG.database} database`);

    // Check and add missing columns
    await ensureRequiredColumns(client);

    await client.end();
    console.log('🎉 Database setup completed successfully!');

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

async function ensureRequiredColumns(client: any) {
  console.log('🔧 Checking required columns...');

  const columnsToCheck = [
    {
      table: 'organizations',
      column: 'stripeCustomerId',
      type: 'varchar(255)',
      nullable: true
    },
    {
      table: 'organizations',
      column: 'privacySettings',
      type: 'jsonb',
      nullable: true,
      default: "'{}'"
    },
    {
      table: 'notification_deliveries',
      column: 'organizationId',
      type: 'uuid',
      nullable: true
    },
    {
      table: 'notifications',
      column: 'templateId',
      type: 'uuid',
      nullable: true
    },
    {
      table: 'ai_providers',
      column: 'status',
      type: 'varchar(50)',
      nullable: true,
      default: "'inactive'"
    }
  ];

  for (const col of columnsToCheck) {
    try {
      // Check if column exists
      const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);

      if (columnExists.rows.length === 0) {
        console.log(`➕ Adding column ${col.table}.${col.column}`);
        
        let alterQuery = `ALTER TABLE "${col.table}" ADD COLUMN "${col.column}" ${col.type}`;
        if (col.default) {
          alterQuery += ` DEFAULT ${col.default}`;
        }
        if (col.nullable === false) {
          alterQuery += ' NOT NULL';
        }

        await client.query(alterQuery);
        console.log(`✅ Added ${col.table}.${col.column}`);
      } else {
        console.log(`✅ Column ${col.table}.${col.column} exists`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Warning: Could not check/add ${col.table}.${col.column}:`, error.message);
    }
  }

  // Ensure connection_stats.organizationId can be nullable for system stats
  try {
    await client.query(`
      ALTER TABLE "connection_stats" 
      ALTER COLUMN "organizationId" DROP NOT NULL
    `);
    console.log('✅ Made connection_stats.organizationId nullable');
  } catch (error: any) {
    // Column might already be nullable
    console.log('ℹ️  connection_stats.organizationId already nullable or doesn\'t exist');
  }

  console.log('✅ Column checks completed');
}

async function testConnection() {
  console.log('🧪 Testing database connection...');
  
  const client = new Client({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.username,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful');
    console.log(`📅 Current database time: ${result.rows[0].current_time}`);
    await client.end();
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting database setup...');
  console.log(`📊 Database config: ${DB_CONFIG.username}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  await checkAndSetupDatabase();
  await testConnection();
  
  console.log('');
  console.log('🎯 Next steps:');
  console.log('1. Run migrations: npm run migration:run');
  console.log('2. Start the application: npm run start:dev');
}

if (require.main === module) {
  main().catch(console.error);
}

export { checkAndSetupDatabase, testConnection };