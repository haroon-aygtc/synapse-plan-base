# Security Implementation Guide

## Overview

This document outlines the security enhancements implemented in the SynapseAI platform, including authentication, authorization, rate limiting, and CSRF protection.

## 🔐 Security Features Implemented

### 1. Enhanced JWT Security

#### Cryptographically Secure Secrets
- **JWT secrets**: Now use cryptographically secure random keys (64+ characters)
- **Automatic generation**: If no secret is provided, system generates secure random keys
- **Separate refresh secrets**: Different secrets for access and refresh tokens
- **Token metadata**: Added issuer and audience claims for additional validation

#### Token Configuration
```bash
# Generate secure JWT secrets
openssl rand -hex 64
```

#### Shorter Token Expiry
- **Access tokens**: Reduced from 24h to 15m for better security
- **Refresh tokens**: Remain at 7d but with secure rotation
- **Automatic refresh**: Frontend automatically refreshes expired tokens

### 2. Rate Limiting Implementation

#### Global Rate Limiting
- **Default**: 100 requests per minute per IP
- **Configurable**: Via environment variables
- **Redis-backed**: Uses Redis for distributed rate limiting

#### Endpoint-Specific Limits
- **Login**: 10 attempts per minute
- **Registration**: 5 attempts per minute
- **Token refresh**: 20 attempts per minute
- **Account lockout**: 5 failed login attempts = 15-minute lockout

### 3. CSRF Protection

#### Implementation
- **CSRF tokens**: Required for state-changing operations
- **Cookie-based**: Secure, HttpOnly cookies
- **SameSite**: Strict same-site policy
- **Automatic handling**: Frontend automatically includes CSRF tokens

#### Usage
```typescript
// Frontend automatically handles CSRF tokens
const response = await apiClient.post('/api/endpoint', data);
```

### 4. Enhanced Security Headers

#### Helmet.js Configuration
- **Content Security Policy**: Prevents XSS attacks
- **HSTS**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

### 5. Frontend Authentication Integration

#### Real API Integration
- **AuthService**: Centralized authentication management
- **Token management**: Automatic token refresh and storage
- **Error handling**: Proper error handling and user feedback
- **State management**: Reactive authentication state

#### Features
- **Automatic token refresh**: Seamless user experience
- **Secure storage**: Tokens stored in localStorage with proper cleanup
- **Route protection**: Authentication state management
- **Error recovery**: Graceful handling of authentication failures

## 🚀 Setup Instructions

### 1. Backend Configuration

1. **Copy security configuration**:
   ```bash
   cp backend/.env.security.example backend/.env
   ```

2. **Generate secure JWT secrets**:
   ```bash
   # Generate JWT secret
   openssl rand -hex 64
   
   # Generate refresh secret
   openssl rand -hex 64
   ```

3. **Update environment variables**:
   ```bash
   # In backend/.env
   JWT_SECRET=your-generated-secret-here
   JWT_REFRESH_SECRET=your-generated-refresh-secret-here
   ```

### 2. Frontend Configuration

1. **Copy frontend configuration**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update API URL**:
   ```bash
   # In .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

### 3. Install Dependencies

```bash
# Install new security dependencies
npm install cookie-parser csurf @types/cookie-parser @types/csurf
```

### 4. Start Services

```bash
# Start backend services
cd backend
docker-compose up -d

# Start frontend
npm run dev
```

## 🔒 Security Best Practices

### Production Deployment

1. **Environment Variables**:
   - Never commit secrets to version control
   - Use environment-specific configurations
   - Rotate secrets regularly

2. **HTTPS Configuration**:
   ```bash
   # Enable secure cookies in production
   SECURE_COOKIES=true
   NODE_ENV=production
   ```

3. **Database Security**:
   ```bash
   # Enable SSL for database connections
   DB_SSL_ENABLED=true
   DB_SSL_REJECT_UNAUTHORIZED=true
   ```

4. **Redis Security**:
   ```bash
   # Use strong Redis password
   REDIS_PASSWORD=your-strong-redis-password
   REDIS_TLS_ENABLED=true
   ```

### Monitoring and Logging

1. **Security Events**:
   - Failed login attempts
   - Account lockouts
   - Token refresh failures
   - CSRF token violations

2. **Audit Trails**:
   - User authentication events
   - Permission changes
   - Administrative actions

## 🧪 Testing Security Features

### 1. Rate Limiting

```bash
# Test login rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### 2. CSRF Protection

```bash
# Test CSRF token requirement
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  --cookie-jar cookies.txt
```

### 3. JWT Token Validation

```bash
# Test with invalid token
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer invalid-token"
```

## 🚨 Security Checklist

- [ ] JWT secrets are cryptographically secure (64+ characters)
- [ ] Rate limiting is enabled and configured
- [ ] CSRF protection is active
- [ ] Security headers are properly configured
- [ ] HTTPS is enabled in production
- [ ] Database connections use SSL
- [ ] Redis is password-protected
- [ ] Audit logging is enabled
- [ ] Error messages don't leak sensitive information
- [ ] Input validation is comprehensive
- [ ] Authentication state is properly managed
- [ ] Token refresh mechanism works correctly

## 📞 Support

For security-related questions or to report vulnerabilities:
- Create an issue in the repository
- Follow responsible disclosure practices
- Include detailed reproduction steps

## 🔄 Regular Security Maintenance

1. **Monthly**:
   - Review security logs
   - Update dependencies
   - Rotate JWT secrets

2. **Quarterly**:
   - Security audit
   - Penetration testing
   - Review access controls

3. **Annually**:
   - Comprehensive security review
   - Update security policies
   - Staff security training
