# AWS Amplify Deployment Guide

## Prerequisites

- AWS Account with Amplify access
- GitHub/GitLab/Bitbucket repository (or use manual deployment)
- Backend already deployed (✅ Complete)

---

## Option 1: Amplify Hosting Console (Recommended - CI/CD)

### Step 1: Push Code to Git Repository

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Production deployment ready"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Create Amplify App via Console

1. **Open AWS Amplify Console:**
   - Go to: https://console.aws.amazon.com/amplify
   - Click "New app" → "Host web app"

2. **Connect Repository:**
   - Select your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize AWS Amplify to access your repository
   - Select your repository and branch (main)
   - Click "Next"

3. **Configure Build Settings:**
   - App name: `bloomway-ai`
   - Environment: `production`
   - Build settings will auto-detect from `amplify.yml`
   - Click "Next"

4. **Review and Deploy:**
   - Review all settings
   - Click "Save and deploy"

### Step 3: Wait for Deployment

Amplify will:
1. Provision build environment (~2 minutes)
2. Install dependencies (~1 minute)
3. Build application (~1 minute)
4. Deploy to CDN (~1 minute)

Total time: ~5 minutes

### Step 4: Get Your URL

Once deployed, you'll get a URL like:
```
https://main.d1234567890abc.amplifyapp.com
```

---

## Option 2: Amplify CLI (Manual Deployment)

### Step 1: Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

### Step 2: Configure Amplify

```bash
# Configure AWS credentials
amplify configure

# Follow the prompts:
# - Sign in to AWS Console
# - Specify AWS Region: us-east-1
# - Create IAM user with AdministratorAccess-Amplify
# - Enter access key and secret key
```

### Step 3: Initialize Amplify in Frontend

```bash
cd frontend

# Initialize Amplify
amplify init

# Answer prompts:
# - Enter a name for the project: bloomwayai
# - Enter a name for the environment: prod
# - Choose your default editor: (your choice)
# - Choose the type of app: javascript
# - What javascript framework: react
# - Source Directory Path: src
# - Distribution Directory Path: dist
# - Build Command: npm run build
# - Start Command: npm run dev
# - Do you want to use an AWS profile? Yes
# - Please choose the profile: default
```

### Step 4: Add Hosting

```bash
# Add hosting with CloudFront and S3
amplify add hosting

# Answer prompts:
# - Select the plugin module: Hosting with Amplify Console
# - Choose a type: Manual deployment
```

### Step 5: Publish

```bash
# Build and deploy
amplify publish

# This will:
# 1. Build your app (npm run build)
# 2. Upload to S3
# 3. Configure CloudFront
# 4. Provide your app URL
```

---

## Option 3: Manual S3 + CloudFront (Alternative)

If you prefer more control:

### Step 1: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://bloomway-frontend-prod --region us-east-1

# Configure for static website hosting
aws s3 website s3://bloomway-frontend-prod \
  --index-document index.html \
  --error-document index.html
```

### Step 2: Upload Build

```bash
# Upload from frontend/dist
aws s3 sync frontend/dist/ s3://bloomway-frontend-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "_redirects"

# Upload index.html with no-cache
aws s3 cp frontend/dist/index.html s3://bloomway-frontend-prod/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

### Step 3: Make Bucket Public

```bash
# Create bucket policy
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bloomway-frontend-prod/*"
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket bloomway-frontend-prod \
  --policy file://bucket-policy.json
```

### Step 4: Create CloudFront Distribution (Optional)

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name bloomway-frontend-prod.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html

# Note: This takes 15-20 minutes to deploy globally
```

---

## Environment Variables

The frontend is already configured with the API endpoint in `.env`:

```env
VITE_API_BASE_URL=https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod/
```

### For Amplify Console:

Add environment variables in the Amplify Console:
1. Go to App Settings → Environment variables
2. Add: `VITE_API_BASE_URL` = `https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod/`

### For Amplify CLI:

Environment variables are read from `.env` file automatically.

---

## Custom Domain (Optional)

### Using Amplify Console:

1. Go to App Settings → Domain management
2. Click "Add domain"
3. Enter your domain (e.g., bloomway.ai)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (~15 minutes)

### Using Route 53:

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name bloomway.ai \
  --caller-reference $(date +%s)

# Add A record pointing to Amplify app
# (Get Amplify app domain from console)
```

---

## Monitoring and Logs

### Amplify Console:

- Build logs: App → Build history → View logs
- Access logs: App → Monitoring → Access logs
- Performance: App → Monitoring → Performance

### CloudWatch:

```bash
# View Amplify logs
aws logs tail /aws/amplify/bloomway-ai --follow
```

---

## Continuous Deployment

### Amplify Console (Git-based):

Automatic deployment on every push to main branch:
1. Push code to GitHub
2. Amplify detects changes
3. Automatically builds and deploys
4. Notifies via email/SNS

### Amplify CLI:

Manual deployment:
```bash
cd frontend
amplify publish
```

---

## Rollback

### Amplify Console:

1. Go to App → Build history
2. Find previous successful build
3. Click "Redeploy this version"

### Amplify CLI:

```bash
# Rollback to previous version
amplify env checkout <previous-env>
amplify publish
```

---

## Cost Estimate

### Amplify Hosting:

- Build minutes: $0.01/minute
- Hosting: $0.15/GB served
- Storage: $0.023/GB/month

**Estimated monthly cost for moderate traffic:**
- ~100 builds/month: $5
- ~50GB served: $7.50
- ~5GB storage: $0.12
- **Total: ~$12.62/month**

### S3 + CloudFront:

- S3 storage: $0.023/GB/month
- CloudFront: $0.085/GB (first 10TB)
- **Total: ~$5-10/month**

---

## Verification

After deployment, verify:

```bash
# Test homepage
curl -I https://your-amplify-url.amplifyapp.com

# Test API connectivity
curl https://your-amplify-url.amplifyapp.com/api/health

# Test routing (should return index.html)
curl -I https://your-amplify-url.amplifyapp.com/repos/123
```

---

## Troubleshooting

### Build Fails:

1. Check build logs in Amplify Console
2. Verify `amplify.yml` configuration
3. Ensure all dependencies in `package.json`
4. Check Node version compatibility

### 404 Errors on Routes:

1. Verify `_redirects` file exists in `frontend/public/`
2. Check Amplify rewrites configuration
3. Ensure SPA routing is enabled

### API Connection Issues:

1. Verify `VITE_API_BASE_URL` environment variable
2. Check CORS configuration in API Gateway
3. Verify API endpoint is accessible

### Slow Build Times:

1. Enable build cache in `amplify.yml`
2. Use `npm ci` instead of `npm install`
3. Optimize dependencies

---

## Next Steps

1. ✅ Deploy frontend to Amplify
2. ⏭️ Configure custom domain (optional)
3. ⏭️ Set up monitoring and alerts
4. ⏭️ Configure CI/CD pipeline
5. ⏭️ Add staging environment
6. ⏭️ Set up automated testing

---

## Support

### AWS Amplify Documentation:
- https://docs.amplify.aws/
- https://docs.aws.amazon.com/amplify/

### Amplify Console:
- https://console.aws.amazon.com/amplify

### Community:
- Discord: https://discord.gg/amplify
- GitHub: https://github.com/aws-amplify

---

**Ready to deploy!** Choose your preferred method above and follow the steps.
