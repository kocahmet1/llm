# 🚀 Deployment Guide for Render.com

This guide will help you deploy the Multi-LLM Question Solver on Render.com for reliable, production-ready hosting.

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to a GitHub repository
2. **Render.com Account**: Sign up at [render.com](https://render.com)
3. **API Keys**: Obtain API keys from:
   - [OpenAI API](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/account/keys)

## 🔑 API Key Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

### Anthropic API Key
1. Go to [Anthropic Console](https://console.anthropic.com/account/keys)
2. Click "Create Key"
3. Copy the generated key (starts with `sk-ant-`)

## 🌐 Deploy to Render

### Step 1: Create New Web Service

1. **Log into Render.com**
2. **Click "New +"** → **"Web Service"**
3. **Connect GitHub repository** containing your code
4. **Configure the service:**

   - **Name**: `llm-question-solver`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your preferred branch)
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`

### Step 2: Build & Start Commands

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

### Step 3: Environment Variables

In the Render dashboard, add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Anthropic API key |
| `NODE_ENV` | `production` | Production environment |

### Step 4: Advanced Settings

**Instance Type**: `Starter` (Free tier) or `Standard` for better performance

**Auto Deploy**: ✅ Enable for automatic deployments on git push

**Health Check Path**: `/api/health`

### Step 5: Deploy

1. **Review settings**
2. **Click "Create Web Service"**
3. **Wait for deployment** (5-10 minutes)
4. **Access your app** at the provided Render URL

## 🔧 Post-Deployment Configuration

### Custom Domain (Optional)
1. Go to **Settings** → **Custom Domains**
2. Add your domain name
3. Configure DNS records as shown

### SSL Certificate
- Render automatically provides SSL certificates
- Your app will be accessible via HTTPS

### Monitoring
- Check **Logs** tab for runtime information
- Monitor **Metrics** for performance data
- Set up **Health Checks** for uptime monitoring

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Check your package.json scripts
npm run build:client
```

**Environment Variables Not Set:**
- Verify all API keys are correctly entered
- Check for typos in variable names
- Ensure no extra spaces

**API Errors:**
- Verify API keys have sufficient credits
- Check API key permissions
- Monitor rate limits

**File Upload Issues:**
- Render has a 100MB deployment size limit
- Large files are automatically cleaned up

### Debug Steps

1. **Check Logs:**
   ```
   Render Dashboard → Your Service → Logs
   ```

2. **Test Health Endpoint:**
   ```
   https://your-app.onrender.com/api/health
   ```

3. **Verify Environment:**
   ```javascript
   // Add to server.js temporarily
   console.log('Environment check:', {
     hasOpenAI: !!process.env.OPENAI_API_KEY,
     hasAnthropic: !!process.env.ANTHROPIC_API_KEY
   });
   ```

## 📊 Performance Optimization

### Free Tier Limitations
- **Sleep after 15 minutes** of inactivity
- **First request may be slow** (cold start)
- **750 hours/month** limit

### Upgrade Benefits
- **No sleep** on paid plans
- **Faster performance**
- **More concurrent requests**
- **Better reliability**

### Optimization Tips
1. **Use starter plan** ($7/month) for better performance
2. **Enable health checks** to reduce cold starts
3. **Monitor API usage** to control costs
4. **Implement caching** for repeated requests

## 🔒 Security Best Practices

### API Key Security
- **Never commit** API keys to git
- **Use environment variables** only
- **Rotate keys** periodically
- **Monitor usage** for unusual activity

### Rate Limiting
The app includes built-in rate limiting:
- **50 requests per 15 minutes** per IP
- **Prevents abuse**
- **Protects API quotas**

### File Security
- **Only image files** accepted
- **Size limits** enforced (10MB)
- **Automatic cleanup** of uploaded files

## 💰 Cost Management

### API Costs (Estimated per 1000 requests)
- **OpenAI GPT-4o-mini**: ~$0.10
- **Anthropic Claude**: ~$0.15
- **Total per 1000 requests**: ~$0.25

### Render Hosting Costs
- **Free Tier**: $0/month (limited)
- **Starter**: $7/month (recommended)
- **Standard**: $25/month (high traffic)

### Cost Optimization
1. **Monitor API usage** in respective dashboards
2. **Set billing alerts** for each API provider
3. **Implement caching** for repeated queries
4. **Use rate limiting** to prevent abuse

## 📈 Scaling

### Traffic Growth
- **Start with Starter plan** ($7/month)
- **Monitor performance** metrics
- **Upgrade to Standard** if needed
- **Consider multiple instances** for high traffic

### API Scaling
- **Monitor rate limits** of each API provider
- **Implement retry logic** for failed requests
- **Consider API key rotation** for high volume
- **Cache responses** where appropriate

## 🔄 Maintenance

### Regular Tasks
1. **Monitor logs** weekly
2. **Check API quotas** monthly
3. **Update dependencies** quarterly
4. **Rotate API keys** annually

### Updates
- **Auto-deploy** enabled for easy updates
- **Test changes** locally first
- **Monitor deployment** logs
- **Rollback** if issues occur

## 📞 Support

### Render Support
- **Documentation**: [render.com/docs](https://render.com/docs)
- **Community**: [Discord](https://discord.gg/render)
- **Support tickets** for paid plans

### API Provider Support
- **OpenAI**: [help.openai.com](https://help.openai.com)
- **Anthropic**: [support.anthropic.com](https://support.anthropic.com)

---

**🎉 Congratulations! Your Multi-LLM Question Solver is now live on Render.com**

**Live URL**: `https://your-app-name.onrender.com` 