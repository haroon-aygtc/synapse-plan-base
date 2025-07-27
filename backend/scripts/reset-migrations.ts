import { DataSource } from 'typeorm';
import { AppDataSource } from '../libs/database/src/config/database.config';

/**
 * Migration Reset Script
 * 
 * This script helps reset the database migration state when there are conflicts.
 * It will:
 * 1. Drop the migrations table to reset migration tracking
 * 2. Clean up any existing tables (optional)
 * 3. Allow for a fresh migration run
 * 
 * WARNING: This will delete all data in the database!
 * Only use this in development or when you want to start fresh.
 */

async function resetMigrations() {
  console.log('🔄 Starting migration reset...');
  
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    // Drop the migrations table to reset migration tracking
    console.log('🗑️  Dropping migrations table...');
    await AppDataSource.query(`DROP TABLE IF EXISTS "migrations" CASCADE`);
    
    // Optionally drop all existing tables (uncomment if you want a completely clean slate)
    console.log('🗑️  Dropping all existing tables...');
    
    const tables = [
      'subscriptions',
      'test_executions',
      'test_scenarios', 
      'testing_sandboxes',
      'notifications',
      'workflow_executions',
      'tool_executions',
      'agent_executions',
      'sessions',
      'widgets',
      'workflows',
      'tools',
      'agents',
      'ai_providers',
      'users',
      'organizations',
      'knowledge_documents',
      'prompt_templates',
      'hitl_requests'
    ];

    for (const table of tables) {
      try {
        await AppDataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`   ✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop table ${table}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Drop enums
    console.log('🗑️  Dropping enums...');
    const enums = [
      'notification_channel_enum',
      'notification_type_enum', 
      'hitl_priority_enum',
      'hitl_status_enum',
      'agent_event_enum',
      'execution_status_enum',
      'subscription_plan_enum',
      'user_role_enum'
    ];

    for (const enumType of enums) {
      try {
        await AppDataSource.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE`);
        console.log(`   ✅ Dropped enum: ${enumType}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop enum ${enumType}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log('✅ Migration reset completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Run: npm run migration:run');
    console.log('2. Run: npm run seed:run (optional - for sample data)');
    console.log('3. Start your application: npm run start:dev');
    
  } catch (error) {
    console.error('❌ Migration reset failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetMigrations()
    .then(() => {
      console.log('🎉 Migration reset script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration reset script failed:', error);
      process.exit(1);
    });
}

export { resetMigrations }; 