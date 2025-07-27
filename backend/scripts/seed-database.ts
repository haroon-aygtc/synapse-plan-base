import { DataSource } from 'typeorm';
import { AppDataSource } from '../libs/database/src/config/database.config';

async function seedDatabase() {
  const dataSource = new DataSource(AppDataSource.options);
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connected successfully');

    // Run the seed migration
    const queryRunner = dataSource.createQueryRunner();
    
    console.log('🌱 Starting database seeding...');

    // Create default organization
    await queryRunner.query(`
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
      ) ON CONFLICT (slug) DO NOTHING
    `);
    console.log('✅ Default organization created');

    // Create system admin user
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "organizationId", "email", "passwordHash", 
        "firstName", "lastName", "role", "isActive", 
        "emailVerified", "createdAt", "updatedAt"
      ) 
      SELECT 
        uuid_generate_v4(),
        o."id",
        'admin@system.local',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/hL.LBHyuu', -- 'admin123'
        'System',
        'Administrator',
        'SUPER_ADMIN',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ System admin user created');

    // Create default AI providers
    await queryRunner.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "isDefault", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        'OpenAI GPT-4',
        'openai',
        '{"model": "gpt-4", "apiKey": "", "baseURL": "https://api.openai.com/v1"}',
        false,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ OpenAI provider created');

    await queryRunner.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "isDefault", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        'Anthropic Claude',
        'anthropic',
        '{"model": "claude-3-sonnet-20240229", "apiKey": "", "baseURL": "https://api.anthropic.com"}',
        false,
        false,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Anthropic provider created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Default credentials:');
    console.log('   Email: admin@system.local');
    console.log('   Password: admin123');
    console.log('   Organization: default-org');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await dataSource.destroy();
  }
}

seedDatabase(); 