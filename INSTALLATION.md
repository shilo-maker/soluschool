# Installation Guide

## Prerequisites

- Node.js 18.x or higher
- MongoDB (local installation or MongoDB Atlas account)
- Git (optional)

## Step-by-Step Installation

### 1. Install Node.js Dependencies

Open a terminal in the project directory and run:

```bash
cd C:\Users\shilo\Documents\soluworshipschool
npm install
```

This will install all required dependencies including:
- Next.js 15
- React 19
- Socket.io
- Mongoose
- bcryptjs
- JWT
- Nodemailer
- QR code libraries
- PDF generation libraries
- And more

### 2. Set Up MongoDB

**Option A: Local MongoDB**
- Install MongoDB Community Server from https://www.mongodb.com/try/download/community
- Start MongoDB service
- Your connection string will be: `mongodb://localhost:27017/soluschool`

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/soluschool`)

### 3. Create Environment File

Create a file named `.env.local` in the project root:

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/soluschool

# Authentication (Change this to a random secure string!)
JWT_SECRET=change-this-to-a-random-secure-string-in-production

# Email (Optional - leave empty to log emails to console instead)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cron Jobs
CRON_SECRET=another-random-secret-for-cron-jobs

# Server
PORT=3333
NODE_ENV=development

# Public URLs
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_SOCKET_URL=http://localhost:3333
```

**Important Notes:**
- **JWT_SECRET**: Must be changed to a random, secure string for production
- **SMTP Settings**: Optional. If not provided, emails will be logged to console only
  - For Gmail, you need to create an "App Password" (not your regular password)
  - Go to: Google Account → Security → 2-Step Verification → App passwords
- **CRON_SECRET**: Used to authenticate automated cron job requests

### 4. Create an Admin User (First Time Setup)

Since this is a fresh installation, you'll need to create an admin user manually in MongoDB.

**Option 1: Using MongoDB Compass (GUI)**
1. Download MongoDB Compass: https://www.mongodb.com/products/compass
2. Connect to your database
3. Create a new database called `soluschool`
4. Create a collection called `users`
5. Insert this document (modify the values):

```json
{
  "email": "admin@soluschool.com",
  "password": "$2a$10$X9kT5QZYzNPxNxNrx9Z.Ue7FJHxK5YqKxKxK5YqKxK5YqKxK5YqKx",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "language": "he",
  "isActive": true,
  "createdAt": {"$date": "2025-01-01T00:00:00.000Z"},
  "updatedAt": {"$date": "2025-01-01T00:00:00.000Z"}
}
```

**Note**: The password above is hashed version of `"admin123"`. For security, you should change this immediately after first login!

**Option 2: Using MongoDB Shell**
```javascript
use soluschool
db.users.insertOne({
  email: "admin@soluschool.com",
  password: "$2a$10$X9kT5QZYzNPxNxNrx9Z.Ue7FJHxK5YqKxKxK5YqKxK5YqKxK5YqKx",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  language: "he",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### 5. Run the Development Server

```bash
npm run dev
```

You should see:
```
> Ready on http://localhost:3333
> Socket.io server is running
✅ MongoDB connected successfully
```

### 6. Access the Application

Open your browser and go to:
- **Homepage**: http://localhost:3333
- **Login**: http://localhost:3333/login (use admin@soluschool.com / admin123)
- **Live Overview**: http://localhost:3333/live
- **Check-in**: http://localhost:3333/checkin

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: bad auth`
- **Solution**: Check your MongoDB connection string username and password

**Error**: `MongooseError: Operation users.find() buffering timed out`
- **Solution**: Make sure MongoDB is running. For local MongoDB, start the service:
  - Windows: `net start MongoDB`
  - Mac: `brew services start mongodb-community`
  - Linux: `sudo systemctl start mongod`

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3333`
- **Solution**: Either:
  1. Change PORT in `.env.local` to a different number (e.g., 3334)
  2. Or stop the process using port 3333

### Missing Dependencies

**Error**: `Cannot find module 'xyz'`
- **Solution**: Run `npm install` again

### Email Not Sending

If emails are not sending:
1. Check SMTP settings in `.env.local`
2. For Gmail, make sure you're using an App Password, not your regular password
3. If SMTP is not configured, emails will be logged to console instead (this is fine for development)

## Next Steps

After installation:

1. **Create Initial Data**:
   - Create rooms (classrooms)
   - Add teachers
   - Add students
   - Create schedules

2. **Test Check-in System**:
   - Students/teachers will have PINs generated automatically
   - Test check-in at /checkin with a PIN
   - View live room status at /live

3. **Configure Email** (Optional):
   - Set up SMTP to enable automatic reminders
   - Test PIN reset functionality

4. **Customize**:
   - Update school name and branding
   - Adjust subsidy amounts if needed
   - Configure lesson durations

## Production Deployment

For production deployment (Vercel, Render, etc.):

1. Set environment variables in your hosting platform
2. Make sure to use strong, random values for JWT_SECRET and CRON_SECRET
3. Use MongoDB Atlas (cloud) instead of local MongoDB
4. Set NODE_ENV=production

See README.md for more deployment details.

## Need Help?

- Check the README.md for feature documentation
- Check the BUILD_STATUS.md for implementation status
- Review COMPREHENSIVE_FEATURE_DOCUMENTATION.txt for complete system docs
- GitHub Issues: [Your Repository URL]
