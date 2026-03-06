# AWS Amplify Console Deployment - Step-by-Step Guide

**Status:** Ready to Deploy ✅  
**Backend:** Live ✅  
**Frontend:** Built & Configured ✅

---

## Prerequisites Checklist

- ✅ Backend deployed to AWS
- ✅ Frontend built successfully
- ✅ `amplify.yml` configuration file created
- ✅ `frontend/public/_redirects` file created
- ✅ `frontend/.env` configured with API endpoint
- ✅ Code committed to Git
- ⏭️ Code pushed to GitHub/GitLab/Bitbucket

---

## Step 1: Push Code to Git Repository

### If using GitHub:

```bash
# Check current remote
git remote -v

# If no remote exists, add one:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git push -u origin main
```

### If using GitLab:

```bash
git remote add origin https://gitlab.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### If using Bitbucket:

```bash
git remote add origin https://bitbucket.org/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2: Open AWS Amplify Console

1. **Navigate to AWS Amplify:**
   - Open: https://console.aws.amazon.com/amplify
   - Or search for "Amplify" in AWS Console

2. **Ensure you're in the correct region:**
   - Region: `us-east-1` (same as backend)

---

## Step 3: Create New Amplify App

1. **Click "New app"** (orange button in top right)

2. **Select "Host web app"**

3. **Choose your Git provider:**
   - GitHub
   - GitLab
   - Bitbucket
   - AWS CodeCommit

4. **Authorize AWS Amplify:**
   - Click "Authorize" when prompted
   - Grant access to your repositories
   - You may need to sign in to your Git provider

---

## Step 4: Select Repository and Branch

1. **Select your repository:**
   - Find: `YOUR_REPO_NAME`
   - Click on it

2. **Select branch:**
   - Choose: `main` (or your default branch)
   - Click "Next"

---

## Step 5: Configure Build Settings

Amplify will auto-detect your configuration from `amplify.yml`.

**Verify these settings:**

### App name:
```
bloomway-ai
```

### Environment:
```
production
```

### Build settings (auto-detected from amplify.yml):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### Advanced settings (optional):

**Environment variables:**
- Key: `VITE_API_BASE_URL`
- Value: `https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod/`

(This is already in `.env` but adding here ensures it's available during build)

**Click "Next"**

---

## Step 6: Review and Deploy

1. **Review all settings:**
   - App name: `bloomway-ai`
   - Repository: Your repo
   - Branch: `main`
   - Build settings: Auto-detected

2. **Click "Save and deploy"**

---

## Step 7: Monitor Deployment

Amplify will now:

### Phase 1: Provision (1-2 minutes)
- Setting up build environment
- Allocating resources

### Phase 2: Build (2-3 minutes)
- Cloning repository
- Installing dependencies (`npm ci`)
- Building application (`npm run build`)

### Phase 3: Deploy (1-2 minutes)
- Uploading artifacts to CDN
- Configuring routing rules
- Provisioning SSL certificate

### Phase 4: Verify (30 seconds)
- Running health checks
- Finalizing deployment

**Total time: ~5 minutes**

---

## Step 8: Get Your URL

Once deployment completes:

1. **Copy your Amplify URL:**
   ```
   https://main.d1234567890abc.amplifyapp.com
   ```

2. **Test the deployment:**
   - Click on the URL
   - You should see the BloomWay AI homepage

---

## Step 9: Verify Deployment

### Test Homepage:
```bash
curl -I https://YOUR_AMPLIFY_URL.amplifyapp.com
```

Expected: `HTTP/2 200`

### Test Routing (SPA):
```bash
curl -I https://YOUR_AMPLIFY_URL.amplifyapp.com/repos/123
```

Expected: `HTTP/2 200` (should return index.html)

### Test API Connection:

1. Open your Amplify URL in browser
2. Try to ingest a repository:
   - Enter: `https://github.com/HARSH160804/testrepo`
   - Click "Analyze Repository"
3. Should redirect to status page and show progress

---

## Step 10: Configure Custom Domain (Optional)

### If you have a custom domain:

1. **In Amplify Console:**
   - Go to: App Settings → Domain management
   - Click "Add domain"

2. **Enter your domain:**
   - Example: `bloomway.ai`
   - Click "Configure domain"

3. **Update DNS:**
   - Amplify will provide DNS records
   - Add these to your domain registrar
   - Wait for DNS propagation (~15 minutes)

4. **SSL Certificate:**
   - Amplify automatically provisions SSL
   - Wait for certificate validation (~15 minutes)

5. **Access your app:**
   - `https://bloomway.ai`
   - `https://www.bloomway.ai`

---

## Continuous Deployment (Automatic)

Now that Amplify is connected to your Git repository:

### Every time you push to main:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

**Amplify will automatically:**
1. Detect the push
2. Start a new build
3. Deploy the new version
4. Send you an email notification

### Build notifications:

- Success: Green checkmark ✅
- Failure: Red X ❌
- In progress: Yellow spinner 🔄

---

## Monitoring and Logs

### View Build Logs:

1. Go to Amplify Console
2. Click on your app
3. Click on a build
4. View detailed logs for each phase

### View Access Logs:

1. App Settings → Monitoring
2. View:
   - Request count
   - Data transfer
   - Error rates
   - Response times

### CloudWatch Integration:

Amplify automatically sends logs to CloudWatch:
```bash
aws logs tail /aws/amplify/bloomway-ai --follow
```

---

## Troubleshooting

### Build Fails:

**Check build logs:**
1. Click on failed build
2. Expand "Build" phase
3. Look for error messages

**Common issues:**
- Missing dependencies: Check `package.json`
- Build command fails: Verify `amplify.yml`
- Environment variables: Check App Settings

### 404 Errors on Routes:

**Verify redirect rules:**
1. Check `frontend/public/_redirects` exists
2. Content should be: `/*    /index.html   200`
3. Redeploy if needed

### API Connection Issues:

**Check environment variables:**
1. App Settings → Environment variables
2. Verify `VITE_API_BASE_URL` is set
3. Should be: `https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod/`

**Check CORS:**
1. API Gateway → Your API → CORS
2. Verify Amplify domain is allowed
3. Or use `*` for testing

### Slow Performance:

**Enable caching:**
1. Already configured in `amplify.yml`
2. Verify cache is working in build logs

**Check CDN:**
1. Amplify uses CloudFront automatically
2. First load may be slow (cold start)
3. Subsequent loads should be fast

---

## Rollback

### If deployment fails or has issues:

1. **Go to Amplify Console**
2. **Click on your app**
3. **View build history**
4. **Find last successful build**
5. **Click "Redeploy this version"**

---

## Cost Monitoring

### View costs:

1. Amplify Console → App → Usage
2. Shows:
   - Build minutes used
   - Data transfer
   - Storage

### Estimated monthly cost:

- Build minutes: ~100 builds × $0.01 = $1
- Hosting: ~50GB served × $0.15 = $7.50
- Storage: ~5GB × $0.023 = $0.12
- **Total: ~$8.62/month**

---

## Next Steps After Deployment

1. ✅ Verify deployment works
2. ⏭️ Test all features end-to-end
3. ⏭️ Configure custom domain (optional)
4. ⏭️ Set up monitoring alerts
5. ⏭️ Add staging environment
6. ⏭️ Configure branch deployments

---

## Support

### AWS Amplify Documentation:
- https://docs.amplify.aws/

### AWS Amplify Console:
- https://console.aws.amazon.com/amplify

### Community Support:
- Discord: https://discord.gg/amplify
- GitHub: https://github.com/aws-amplify

---

## Quick Reference

### Your Configuration:

- **Backend API:** `https://x7xqq42tpj.execute-api.us-east-1.amazonaws.com/Prod/`
- **Region:** `us-east-1`
- **App Name:** `bloomway-ai`
- **Branch:** `main`
- **Build Config:** `amplify.yml`
- **Redirect Rules:** `frontend/public/_redirects`

### Important Files:

- `amplify.yml` - Build configuration
- `frontend/public/_redirects` - SPA routing
- `frontend/.env` - Environment variables
- `frontend/dist/` - Build output

---

**Ready to deploy!** Follow the steps above to deploy your frontend to AWS Amplify Console.

🚀 **Good luck with your deployment!**
