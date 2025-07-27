import { DataSource } from 'typeorm';
import { AppDataSource } from '../libs/database/src/config/database.config';

/**
 * Database Connection Test Script
 * 
 * This script tests the database connection and provides diagnostic information
 * for troubleshooting local PostgreSQL setup issues.
 */

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  console.log('=====================================');
  
  try {
    // Test basic connection
    console.log('📡 Attempting to connect to database...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection successful!');
    } else {
      console.log('✅ Database already connected!');
    }

    // Get connection info
    const connection = AppDataSource;
    const options = connection.options as any;
    
    console.log('\n📊 Connection Information:');
    console.log(`   Host: ${options.host || 'N/A'}`);
    console.log(`   Port: ${options.port || 'N/A'}`);
    console.log(`   Database: ${options.database || 'N/A'}`);
    console.log(`   Username: ${options.username || 'N/A'}`);
    console.log(`   SSL: ${options.ssl ? 'Enabled' : 'Disabled'}`);

    // Test basic query
    console.log('\n🧪 Testing basic query...');
    const result = await connection.query('SELECT version() as version, current_database() as database, current_user as user');
    console.log('✅ Basic query successful!');
    console.log(`   PostgreSQL Version: ${result[0].version}`);
    console.log(`   Current Database: ${result[0].database}`);
    console.log(`   Current User: ${result[0].user}`);

    // Check if required extensions exist
    console.log('\n🔧 Checking required extensions...');
    const extensions = ['uuid-ossp', 'pg_trgm', 'btree_gin', 'pg_stat_statements', 'pgcrypto'];
    
    for (const ext of extensions) {
      try {
        const extResult = await connection.query(`SELECT * FROM pg_extension WHERE extname = '${ext}'`);
        if (extResult.length > 0) {
          console.log(`   ✅ ${ext}: Installed`);
        } else {
          console.log(`   ⚠️  ${ext}: Not installed`);
        }
      } catch (error) {
        console.log(`   ❌ ${ext}: Error checking - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check existing tables
    console.log('\n📋 Checking existing tables...');
    const tablesResult = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.length > 0) {
      console.log(`   Found ${tablesResult.length} existing tables:`);
      tablesResult.forEach((row: any) => {
        console.log(`     - ${row.table_name}`);
      });
    } else {
      console.log('   No existing tables found');
    }

    // Check migrations table
    console.log('\n🔄 Checking migrations table...');
    try {
      const migrationsResult = await connection.query('SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5');
      if (migrationsResult.length > 0) {
        console.log(`   Found ${migrationsResult.length} recent migrations:`);
        migrationsResult.forEach((row: any) => {
          console.log(`     - ${row.timestamp}: ${row.name}`);
        });
      } else {
        console.log('   No migrations found');
      }
    } catch (error) {
      console.log('   ⚠️  Migrations table does not exist (this is normal for fresh databases)');
    }

    // Test database permissions
    console.log('\n🔐 Testing database permissions...');
    try {
      await connection.query('CREATE TABLE IF NOT EXISTS test_permissions (id SERIAL PRIMARY KEY, name TEXT)');
      await connection.query('INSERT INTO test_permissions (name) VALUES ($1)', ['test']);
      await connection.query('SELECT * FROM test_permissions WHERE name = $1', ['test']);
      await connection.query('DELETE FROM test_permissions WHERE name = $1', ['test']);
      await connection.query('DROP TABLE test_permissions');
      console.log('   ✅ Full CRUD permissions confirmed');
    } catch (error) {
      console.log(`   ❌ Permission test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n✅ Database connection test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. If all tests passed, run: npm run migration:run');
    console.log('2. If you need to reset, run: npm run migration:reset');
    console.log('3. Start your application: npm run start:dev');

  } catch (error) {
    console.error('\n❌ Database connection test failed!');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running on your local machine');
    console.log('2. Verify your database credentials in .env file');
    console.log('3. Check if the database "synapseai" exists');
    console.log('4. Ensure your PostgreSQL user has proper permissions');
    
    console.log('\n💡 Common solutions:');
    console.log('- Create database: CREATE DATABASE synapseai;');
    console.log('- Grant permissions: GRANT ALL PRIVILEGES ON DATABASE synapseai TO postgres;');
    console.log('- Check PostgreSQL service: sudo service postgresql status (Linux) or brew services list (macOS)');
    
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('\n🎉 Database connection test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database connection test failed:', error);
      process.exit(1);
    });
}

export { testDatabaseConnection }; 