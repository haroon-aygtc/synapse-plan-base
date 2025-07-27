# 🚀 SynapseAI Backend - Local Development Setup

This guide will help you set up the SynapseAI backend for local development with a local PostgreSQL database.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm** or **yarn**

## 🗄️ Database Setup

### 1. Install PostgreSQL

#### Windows (using Laragon)
- Download and install [Laragon](https://laragon.org/)
- Laragon includes PostgreSQL by default
- Start Laragon and ensure PostgreSQL is running

#### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or using Postgres.app
# Download from https://postgresapp.com/
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

Connect to PostgreSQL and create the database:

```bash
# Connect as postgres user
psql -U postgres

# Create database
CREATE DATABASE synapseai;

# Create user (optional - you can use postgres user)
CREATE USER synapseai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE synapseai TO synapseai_user;

# Exit psql
\q
```

### 3. Install Required Extensions

```bash
# Connect to the synapseai database
psql -U postgres -d synapseai

# Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

# Exit psql
\q
```

## 🔧 Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Update Environment Variables

Edit `.env` file with your local database settings:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=synapseai
DATABASE_SSL=false
DATABASE_LOGGING=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-for-development
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3000

# Optional: AI Provider Keys (for testing)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

## 🗄️ Database Migration

### 1. Test Database Connection

First, test your database connection:

```bash
npm run db:test
```

This will:
- Test the database connection
- Check required extensions
- Verify permissions
- Show existing tables and migrations

### 2. Run Migrations

If the connection test passes, run the migrations:

```bash
npm run migration:run
```

This will create all the necessary tables and indexes.

### 3. (Optional) Reset Migrations

If you encounter migration conflicts, you can reset the database:

```bash
npm run migration:reset
npm run migration:run
```

**⚠️ Warning:** This will delete all data in the database!

### 4. (Optional) Seed Sample Data

To populate the database with sample data:

```bash
npm run seed:run
```

## 🚀 Running the Application

### Development Mode

```bash
npm run start:dev
```

The application will be available at `http://localhost:3001`

### Production Mode

```bash
npm run build
npm run start:prod
```

## 🔍 Verification

### 1. Health Check

Test the application health:

```bash
curl http://localhost:3001/health
```

### 2. API Documentation

Access the Swagger documentation at:
`http://localhost:3001/docs`

### 3. Database Verification

Check that all tables were created:

```bash
psql -U postgres -d synapseai -c "\dt"
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `ECONNREFUSED` or `password authentication failed`

**Solutions:**
- Ensure PostgreSQL is running
- Check your database credentials in `.env`
- Verify the database exists: `psql -U postgres -l`
- Reset PostgreSQL password if needed

#### 2. Migration Conflicts

**Error:** `relation "organizations" already exists`

**Solutions:**
```bash
# Reset migrations and start fresh
npm run migration:reset
npm run migration:run
```

#### 3. Permission Denied

**Error:** `permission denied for database synapseai`

**Solutions:**
```sql
-- Connect as postgres user
GRANT ALL PRIVILEGES ON DATABASE synapseai TO your_username;
GRANT ALL PRIVILEGES ON SCHEMA public TO your_username;
```

#### 4. Extensions Not Found

**Error:** `extension "uuid-ossp" is not available`

**Solutions:**
```sql
-- Install missing extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Debug Commands

```bash
# Test database connection
npm run db:test

# Check migration status
npm run migration:status

# View application logs
npm run start:dev

# Check PostgreSQL status (Linux/macOS)
sudo systemctl status postgresql
# or
brew services list | grep postgresql
```

## 📚 Development Workflow

### 1. Making Database Changes

1. Create a new migration:
   ```bash
   npm run migration:generate -- src/migrations/YourMigrationName
   ```

2. Edit the generated migration file

3. Run the migration:
   ```bash
   npm run migration:run
   ```

### 2. Adding Sample Data

1. Edit `scripts/seed.ts`
2. Run the seed script:
   ```bash
   npm run seed:run
   ```

### 3. Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for development
- Keep your JWT secrets secure
- Regularly update dependencies

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run db:test` for diagnostics
3. Check the application logs
4. Verify your PostgreSQL installation

## 🎉 Success!

Once everything is set up, you should see:

- ✅ Database connection successful
- ✅ All migrations applied
- ✅ Application running on `http://localhost:3001`
- ✅ Health check endpoint responding
- ✅ Swagger documentation available

You're now ready to develop with the SynapseAI backend! 🚀 