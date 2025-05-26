# GitHub Environments Configuration

This guide explains how to set up GitHub environments for proper deployment management.

## Creating Environments

Go to your repository settings → Environments and create the following:

### 1. Staging Environment

**Name:** `staging`

**Settings:**
- ✅ **Required reviewers:** None (automatic deployment)
- ✅ **Wait timer:** 0 minutes
- ✅ **Deployment branches:** `develop` branch only
- ✅ **Environment URL:** `https://staging.iotpilot.app`

**Environment Secrets:**
```
STAGING_HOST=staging.your-domain.com
STAGING_USER=iotpilot
STAGING_SSH_KEY=<your-staging-ssh-private-key>
STAGING_SSH_PORT=22
STAGING_DEPLOY_PATH=/opt/iotpilot-staging
```

### 2. Production Environment

**Name:** `production`

**Settings:**
- ✅ **Required reviewers:** 1-2 team members
- ✅ **Wait timer:** 5 minutes (safety buffer)
- ✅ **Deployment branches:** `main` branch only
- ✅ **Environment URL:** `https://iotpilot.app`

**Environment Secrets:**
```
PRODUCTION_HOST=your-domain.com
PRODUCTION_USER=iotpilot
PRODUCTION_SSH_KEY=<your-production-ssh-private-key>
PRODUCTION_SSH_PORT=22
PRODUCTION_DEPLOY_PATH=/opt/iotpilot
```

## Environment Protection Rules

### Staging Protection
- **No protection** - Deploy automatically on push to `develop`
- **Branch restrictions:** Only `develop` branch
- **Reviewers:** None

### Production Protection
- **Required reviewers:** At least 1 admin/maintainer
- **Wait timer:** 5 minutes minimum
- **Branch restrictions:** Only `main` branch
- **Deployment hours:** Optional - restrict to business hours

## Environment Variables

### Staging-Specific Variables
```bash
# In your staging server's .env file
DOMAIN=staging.iotpilot.app
NODE_ENV=staging
LOG_LEVEL=debug
ENABLE_DEBUG_LOGS=true

# Use separate databases
POSTGRES_DB=iotpilot_staging
INFLUXDB_BUCKET=devices_staging

# Relaxed security for testing
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
```

### Production-Specific Variables
```bash
# In your production server's .env file
DOMAIN=iotpilot.app
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_DEBUG_LOGS=false

# Production databases
POSTGRES_DB=iotpilot
INFLUXDB_BUCKET=devices

# Strict security
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

## Deployment Flow

### Development → Staging
1. Push changes to `develop` branch
2. CI tests run automatically
3. If tests pass, deploy to staging automatically
4. Staging URL: `https://staging.iotpilot.app`

### Staging → Production
1. Merge `develop` into `main` via Pull Request
2. PR requires code review approval
3. CI tests run on `main` branch
4. If tests pass, production deployment waits for approval
5. Admin approves deployment after 5-minute wait timer
6. Deploy to production automatically
7. Production URL: `https://iotpilot.app`

## Manual Deployment

### Via GitHub Interface
1. Go to **Actions** → **CI/CD Pipeline**
2. Click **Run workflow**
3. Select branch and environment
4. Click **Run workflow**

### Via GitHub CLI
```bash
# Deploy staging
gh workflow run ci.yml --ref develop

# Deploy production
gh workflow run ci.yml --ref main
```

## Monitoring Deployments

### GitHub Environment Dashboard
- Go to **Code** tab → **Environments**
- View deployment history and status
- See active deployments and URLs

### Deployment Status Badges
Add to your README.md:
```markdown
![Staging](https://github.com/yourusername/iotpilot/deployments/staging/badge.svg)
![Production](https://github.com/yourusername/iotpilot/deployments/production/badge.svg)
```

## Rollback Procedures

### Automatic Rollback
The deployment script includes automatic rollback on failure:
- Health check failures trigger rollback
- Database migration failures trigger rollback
- Service startup failures trigger rollback

### Manual Rollback via GitHub
1. Go to **Actions** → **Deployments**
2. Find the last successful deployment
3. Click **Re-run jobs**

### Manual Rollback via SSH
```bash
# SSH to server
ssh iotpilot@your-server.com

# Navigate to deployment directory
cd /opt/iotpilot

# Check git history
git log --oneline -10

# Rollback to specific commit
git reset --hard <previous-commit-hash>

# Restart services
docker compose up -d --force-recreate

# Verify health
curl -f https://iotpilot.app/api/health
```

## Environment-Specific Testing

### Staging Tests
```bash
# Test staging deployment
curl -f https://staging.iotpilot.app/api/health

# Test device registration
curl -X POST https://staging.iotpilot.app/api/devices \
  -H "Content-Type: application/json" \
  -d '{"device_id": "test-device-001", "hostname": "test"}'

# Test Grafana
curl -f https://staging.iotpilot.app/grafana/api/health
```

### Production Smoke Tests
```bash
# Production health check
curl -f https://iotpilot.app/api/health

# SSL certificate check
echo | openssl s_client -connect iotpilot.app:443 -servername iotpilot.app

# DNS resolution check
nslookup iotpilot.app
```

## Advanced Configuration

### Blue-Green Deployment
For zero-downtime deployments, you can implement blue-green strategy:

1. **Prepare second server** (green)
2. **Deploy to green** while blue serves traffic
3. **Switch traffic** from blue to green
4. **Keep blue** as rollback option

### Canary Deployment
For gradual rollouts:

1. **Deploy to subset** of production servers
2. **Monitor metrics** for issues
3. **Gradually increase** traffic to new version
4. **Complete rollout** if no issues

### Multi-Region Deployment
For global availability:

1. **Setup regions:** US, EU, Asia
2. **Regional environments** in GitHub
3. **Regional secrets** for each environment
4. **DNS-based** traffic routing

## Troubleshooting

### Common Issues

#### SSH Connection Fails
```bash
# Test SSH manually
ssh -i ~/.ssh/iotpilot-deploy iotpilot@your-server.com

# Check SSH agent
ssh-add -l

# Verify key format
head -1 ~/.ssh/iotpilot-deploy
# Should start with -----BEGIN OPENSSH PRIVATE KEY-----
```

#### Environment Secret Not Found
1. Check secret name matches exactly
2. Verify environment name is correct
3. Ensure environment exists in repository settings

#### Deployment Hangs
1. Check server disk space: `df -h`
2. Check Docker daemon: `sudo systemctl status docker`
3. Check network connectivity: `ping github.com`

#### Health Check Fails
1. Check application logs: `docker compose logs iotpilot-app`
2. Check database connectivity: `docker compose exec postgres pg_isready`
3. Check port binding: `netstat -tulpn | grep :3000`

### Debug Commands
```bash
# Check environment variables
printenv | grep IOTPILOT

# Check Docker resources
docker system df

# Check service status
docker compose ps

# Check container health
docker compose exec iotpilot-app curl -f http://localhost:3000/api/health
```