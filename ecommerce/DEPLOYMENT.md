# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB (local or Docker)
- Git

### Steps

1. **Clone and Setup**
```bash
cd ecommerce
npm run install-all
```

2. **Configure Environment**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB** (if not using Docker)
```bash
docker run -d -p 27017:27017 mongo
```

4. **Start Development Servers**
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

---

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

### Quick Start
```bash
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

---

## Production Deployment

### AWS ECS

1. **Build and Push Docker Images**
```bash
docker build -f Dockerfile.frontend -t your-registry/ecommerce-frontend:latest .
docker build -f Dockerfile.backend -t your-registry/ecommerce-backend:latest .

docker push your-registry/ecommerce-frontend:latest
docker push your-registry/ecommerce-backend:latest
```

2. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name ecommerce
```

3. **Create Task Definitions** in AWS Console

4. **Create Services and Run Tasks**

### Heroku

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Heroku Apps**
```bash
heroku create ecommerce-backend
heroku create ecommerce-frontend
```

3. **Set Environment Variables**
```bash
heroku config:set MONGODB_URI=... --app ecommerce-backend
heroku config:set JWT_SECRET=... --app ecommerce-backend
```

4. **Deploy**
```bash
git push heroku main
```

### DigitalOcean

1. **Install `doctl` CLI**

2. **Create Resources**
```bash
doctl kubernetes cluster create ecommerce-cluster
```

3. **Deploy Using Docker Compose or Kubernetes**

### AWS RDS for MongoDB

1. **Create MongoDB Atlas Cluster** (Alternative: AWS DocumentDB)

2. **Update Connection String**
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ecommerce
```

3. **Deploy Application**

---

## Environment Variables for Production

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ecommerce
JWT_SECRET=your_super_secret_key_min_32_chars
STRIPE_SECRET_KEY=sk_live_your_key
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (.env.production)
```
VITE_API_URL=https://api.yourdomain.com
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

1. **Install Certbot**
```bash
sudo apt-get install certbot python3-certbot-nginx
```

2. **Get Certificate**
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

3. **Configure Nginx**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api/ {
        proxy_pass http://backend:5000;
    }
}
```

---

## Database Backup

### MongoDB Backup
```bash
mongodump --uri "mongodb+srv://user:password@cluster.mongodb.net/ecommerce" --out ./backup

# Restore
mongorestore --uri "mongodb+srv://user:password@cluster.mongodb.net/ecommerce" ./backup
```

---

## Monitoring & Logging

### Using Cloud Providers
- **AWS CloudWatch** - Logs and metrics
- **DigitalOcean Monitoring** - CPU, memory, disk
- **DataDog** - APM and monitoring
- **New Relic** - Performance monitoring

### Local Logging
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Performance Optimization

1. **Enable GZIP Compression**
```bash
# In Express backend
const compression = require('compression');
app.use(compression());
```

2. **Configure CDN** for static assets

3. **Database Indexing**
```javascript
await Product.collection.createIndex({ name: "text", description: "text" });
```

4. **API Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

---

## Security Checklist

- [ ] Change default MongoDB credentials
- [ ] Change JWT_SECRET to a strong random string
- [ ] Enable CORS properly
- [ ] Implement rate limiting
- [ ] Use HTTPS/SSL
- [ ] Set security headers
- [ ] Validate and sanitize inputs
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable authentication on all APIs
- [ ] Regular security audits

---

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, Nginx)
- Deploy multiple backend instances
- Use session store (Redis) for user sessions

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching (Redis)

### Database Scaling
- Use MongoDB Atlas for automatic scaling
- Implement sharding for large datasets
- Use read replicas

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs

# Verify ports
netstat -tulpn | grep :5000
```

### Database Connection Issues
- Verify MongoDB is running
- Check connection string
- Ensure firewall allows access

### Frontend Can't Connect to API
- Check CORS configuration
- Verify API URL in frontend
- Check API health: curl http://localhost:5000/api/health

---

## Maintenance

### Regular Tasks
- Update dependencies: `npm update`
- Check security vulnerabilities: `npm audit`
- Update Docker images: `docker pull`
- Monitor logs and metrics
- Backup database weekly

### Database Optimization
```bash
# Connect to MongoDB
mongo
use ecommerce

# Analyze query performance
db.products.find({category: "Electronics"}).explain("executionStats")

# Create indexes for frequently queried fields
db.products.createIndex({category: 1})
db.users.createIndex({email: 1})
```

---

For more information, see the main [README.md](../README.md)
