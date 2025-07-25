# 🚀 Tempo AI Platform - Production Deployment Guide

This guide covers the complete production deployment of the Tempo AI Platform, including all modules and real data integration.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **PostgreSQL**: v14.0 or higher (via Docker)
- **Redis**: v6.2.0 or higher (via Docker)
- **Memory**: Minimum 8GB RAM
- **Storage**: Minimum 50GB available space

### Required API Keys
Before deployment, obtain the following API keys:

#### AI Providers
- **OpenAI API Key**: [Get from OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic API Key**: [Get from Anthropic Console](https://console.anthropic.com/)
- **Google AI API Key**: [Get from Google AI Studio](https://makersuite.google.com/app/apikey)

#### External Services
- **SERP API Key**: [Get from SerpApi](https://serpapi.com/) (for web search)
- **SendGrid API Key**: [Get from SendGrid](https://sendgrid.com/) (for emails)
- **Stripe Keys**: [Get from Stripe Dashboard](https://dashboard.stripe.com/) (for billing)

#### Monitoring (Optional)
- **DataDog API Key**: [Get from DataDog](https://app.datadoghq.com/)
- **Sentry DSN**: [Get from Sentry](https://sentry.io/)

## 🔧 Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd tempo-ai-platform
./setup-production.sh
```

### 2. Configure Environment
```bash
cp .env.production.example .env.production
# Edit .env.production with your actual API keys and configuration
nano .env.production
```

### 3. Start Services
```bash
# Start all services
docker-compose -f backend/docker-compose.yml up -d

# Run database migrations
cd backend && npm run migration:run && cd ..

# Start the application
npm run start:prod
```

## 📁 Project Structure

```
tempo-ai-platform/
├── backend/                    # NestJS Backend
│   ├── apps/gateway/          # API Gateway
│   ├── libs/database/         # Database entities & migrations
│   ├── libs/shared/           # Shared utilities
│   └── docker-compose.yml    # Infrastructure services
├── src/                       # Next.js Frontend
│   ├── app/                   # App router pages
│   ├── components/            # React components
│   ├── lib/                   # API clients & utilities
│   └── hooks/                 # Custom React hooks
├── .env.production.example    # Environment template
└── setup-production.sh       # Production setup script
```

## 🗄️ Database Setup

### Automatic Migration
The system includes comprehensive database migrations:

1. **Initial Schema** (`001-initial-schema.ts`)
   - Creates all tables with proper relationships
   - Sets up indexes for performance
   - Configures PostgreSQL extensions

2. **Row Level Security** (`002-create-rls-policies.ts`)
   - Implements multi-tenant isolation
   - Creates role-based access policies
   - Sets up database security

3. **Seed Data** (`003-seed-initial-data.ts`)
   - Creates default organization and admin user
   - Adds sample agents, tools, and workflows
   - Sets up initial prompt templates

### Manual Database Setup
If you prefer manual setup:

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d tempo_ai_platform

# Run the initialization script
\i backend/scripts/init-db.sql

# Run migrations
cd backend
npm run migration:run
```

## 🔐 Environment Configuration

### Critical Environment Variables

#### Database
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/tempo_ai_platform
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=tempo_ai_platform
DATABASE_SSL=false
DATABASE_MIGRATIONS_RUN=true
```

#### Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-256-bits-minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-256-bits-minimum
JWT_REFRESH_EXPIRES_IN=7d
```

#### AI Providers
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
```

#### External Services
```env
SERP_API_KEY=your-serp-api-key-for-web-search
SENDGRID_API_KEY=your-sendgrid-api-key-for-emails
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
```

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)
```bash
# Start all services
docker-compose -f backend/docker-compose.yml up -d

# Check service status
docker-compose -f backend/docker-compose.yml ps

# View logs
docker-compose -f backend/docker-compose.yml logs -f
```

### Option 2: Manual Deployment
```bash
# Install dependencies
npm ci
cd backend && npm ci && cd ..

# Build applications
npm run build
cd backend && npm run build && cd ..

# Start services
npm run start:prod &
cd backend && npm run start:prod &
```

### Option 3: Kubernetes (Advanced)
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n tempo-ai-platform

# Access services
kubectl port-forward svc/tempo-frontend 3000:3000
kubectl port-forward svc/tempo-backend 3001:3001
```

## 📊 Monitoring & Observability

### Built-in Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **ELK Stack**: Centralized logging
- **DataDog**: APM and monitoring (optional)

### Access Monitoring
- **Grafana**: http://localhost:3002 (admin/admin)
- **Kibana**: http://localhost:5601
- **Prometheus**: http://localhost:9090

### Health Checks
```bash
# Backend health
curl http://localhost:3001/api/v1/health

# Frontend health
curl http://localhost:3000/api/health

# Database health
docker-compose -f backend/docker-compose.yml exec postgres pg_isready
```

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable CSRF protection
- [ ] Configure helmet security headers

### SSL/TLS Setup
```bash
# Generate SSL certificates
./setup-production.sh --ssl

# Or use Let's Encrypt
certbot certonly --standalone -d your-domain.com
```

## 🧪 Testing Production Setup

### Automated Tests
```bash
# Run all tests
npm run test

# Run backend tests
cd backend && npm run test && cd ..

# Run e2e tests
npm run test:e2e
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Agent creation and execution
- [ ] Tool functionality
- [ ] Workflow execution
- [ ] Widget deployment
- [ ] Analytics tracking
- [ ] Billing integration
- [ ] Email notifications

## 📈 Performance Optimization

### Database Optimization
- Connection pooling configured (20 connections)
- Query result caching enabled
- Proper indexes on all tables
- Row-level security for multi-tenancy

### Application Optimization
- Redis caching for API responses
- Queue-based processing for heavy tasks
- CDN integration for static assets
- Gzip compression enabled

### Monitoring Performance
```bash
# Database performance
docker-compose -f backend/docker-compose.yml exec postgres psql -U postgres -d tempo_ai_platform -c "SELECT * FROM pg_stat_activity;"

# Redis performance
docker-compose -f backend/docker-compose.yml exec redis redis-cli info stats

# Application metrics
curl http://localhost:3001/api/v1/metrics
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Database backup
docker-compose -f backend/docker-compose.yml exec postgres pg_dump -U postgres tempo_ai_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
docker-compose -f backend/docker-compose.yml exec redis redis-cli BGSAVE
```

### Restore Procedures
```bash
# Restore database
docker-compose -f backend/docker-compose.yml exec -T postgres psql -U postgres tempo_ai_platform < backup_file.sql

# Restore Redis
docker-compose -f backend/docker-compose.yml exec redis redis-cli FLUSHALL
docker cp backup.rdb $(docker-compose -f backend/docker-compose.yml ps -q redis):/data/dump.rdb
docker-compose -f backend/docker-compose.yml restart redis
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose -f backend/docker-compose.yml ps postgres

# View database logs
docker-compose -f backend/docker-compose.yml logs postgres

# Reset database
docker-compose -f backend/docker-compose.yml down -v
docker-compose -f backend/docker-compose.yml up -d postgres
```

#### Memory Issues
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### API Key Issues
```bash
# Test API keys
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Check environment variables
docker-compose -f backend/docker-compose.yml exec gateway env | grep API_KEY
```

### Log Locations
- **Application Logs**: `docker-compose logs -f gateway`
- **Database Logs**: `docker-compose logs -f postgres`
- **Redis Logs**: `docker-compose logs -f redis`
- **Nginx Logs**: `/var/log/nginx/` (if using nginx)

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly
- [ ] Monitor disk usage weekly
- [ ] Review security logs daily
- [ ] Update SSL certificates annually

### Getting Help
- **Documentation**: Check the `/docs` folder
- **API Documentation**: http://localhost:3001/api/docs
- **Health Dashboard**: http://localhost:3001/api/v1/health
- **Logs**: Use `docker-compose logs -f` for real-time logs

## 🎯 Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] API keys obtained and tested
- [ ] SSL certificates configured
- [ ] Database migrations tested
- [ ] Backup procedures tested
- [ ] Monitoring configured

### Post-Deployment
- [ ] Health checks passing
- [ ] All services running
- [ ] Admin user created
- [ ] Sample data loaded
- [ ] Monitoring alerts configured
- [ ] Documentation updated

### Go-Live
- [ ] DNS configured
- [ ] Load balancer configured
- [ ] CDN configured
- [ ] Monitoring alerts active
- [ ] Backup schedule active
- [ ] Team notified

---

## 🎉 Success!

Your Tempo AI Platform is now running in production with:

✅ **Real Database Integration** - PostgreSQL with migrations and RLS
✅ **Complete API Implementation** - All CRUD operations and business logic
✅ **Production-Ready Security** - JWT, RBAC, rate limiting, CORS
✅ **Comprehensive Monitoring** - Prometheus, Grafana, ELK stack
✅ **Multi-Tenant Architecture** - Organization-based isolation
✅ **Real AI Integration** - OpenAI, Anthropic, Google AI support
✅ **Scalable Infrastructure** - Docker, Redis, queue processing
✅ **Complete Frontend** - React components with real API integration

**Default Admin Access:**
- URL: http://localhost:3000
- Email: admin@system.local
- Password: admin123

**Remember to change the default password and configure your API keys!**