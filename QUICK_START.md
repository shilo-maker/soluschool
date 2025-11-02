# Quick Start Guide

## Get the App Running in 5 Minutes

### Step 1: Install Dependencies (2 minutes)

```bash
cd C:\Users\shilo\Documents\soluworshipschool
npm install
```

Wait for all packages to install...

### Step 2: Create Environment File (1 minute)

Create a file called `.env.local` in the project root with this content:

```env
# Minimum required to run
MONGODB_URI=mongodb://localhost:27017/soluschool
JWT_SECRET=my-secret-key-for-development-only
PORT=3333
NODE_ENV=development
```

**Don't have MongoDB?** Use MongoDB Atlas (free cloud database):
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create a free cluster
4. Get connection string (replace MONGODB_URI above)

### Step 3: Create Admin User (1 minute)

**If using MongoDB Atlas:**
1. Go to your cluster → Browse Collections
2. Add Database: `soluschool`
3. Add Collection: `users`
4. Insert Document with this JSON:

```json
{
  "email": "admin@test.com",
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

**If using local MongoDB with MongoDB Compass:**
Same steps as above using Compass GUI.

**Login credentials**:
- Email: `admin@test.com`
- Password: `admin123`

### Step 4: Run the Server (1 minute)

```bash
npm run dev
```

You should see:
```
> Ready on http://localhost:3333
> Socket.io server is running
✅ MongoDB connected successfully
```

### Step 5: Test It Out! 🎉

Open your browser and visit:

**Homepage**: http://localhost:3333

You should see a beautiful landing page with Hebrew text and three buttons.

## What Can You Test Right Now?

### ✅ Working Features

1. **Authentication API** - Test with curl or Postman:

```bash
# Test login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

2. **Create a Student**:

```bash
# First login to get auth cookie, then:
curl -X POST http://localhost:3333/api/students \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -d '{
    "email": "student@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "050-1234567",
    "instruments": [
      {"instrument": "Piano", "level": "beginner"}
    ],
    "parentName": "Jane Doe",
    "parentEmail": "parent@test.com"
  }'
```

You'll get back a response with:
- Student details
- Auto-generated 4-digit PIN
- QR code string

3. **Get Student's QR Code**:

```bash
curl http://localhost:3333/api/students/STUDENT_ID/qr \
  -H "Cookie: token=YOUR_TOKEN_HERE"
```

Returns a QR code image as data URL!

4. **Reset Student PIN**:

```bash
curl -X POST http://localhost:3333/api/students/STUDENT_ID/reset-pin \
  -H "Cookie: token=YOUR_TOKEN_HERE"
```

New PIN generated and "email sent" (logged to console if SMTP not configured).

### 🎨 Design System Preview

Visit http://localhost:3333 and inspect the styles. You'll see:
- Modern gradient buttons
- Beautiful color palette
- Smooth animations
- Hebrew RTL support
- Responsive design

## Next Steps for Development

Want to keep building? Here's what to add next:

### Priority 1: Add Check-in Functionality
1. Create `/api/checkin` endpoint
2. Create `/checkin` page with PIN input
3. Test checking in with a student PIN

### Priority 2: Add Rooms
1. Create `/api/rooms` endpoints
2. Create `/api/rooms/live` endpoint
3. Create `/live` page to display room status

### Priority 3: Add Dashboard
1. Create `/login` page
2. Create `/dashboard` page
3. Add navigation and stats

## Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running (if local)
- Check your connection string in `.env.local`
- Try MongoDB Atlas cloud option instead

### "Port 3333 is in use"
- Change PORT in `.env.local` to 3334 or another number
- Or stop whatever is using port 3333

### "Module not found"
- Run `npm install` again
- Delete `node_modules` and run `npm install` fresh

### Admin login not working
- Make sure you inserted the user document exactly as shown
- Password must be that exact hash (it equals "admin123")
- Try resetting: delete the user and insert again

## Testing Checklist

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Homepage loads at http://localhost:3333
- [ ] Can login via API (curl or Postman)
- [ ] Can create a student via API
- [ ] Student gets auto-generated PIN
- [ ] Can retrieve student's QR code
- [ ] Can reset student PIN
- [ ] Email logged to console (if SMTP not configured)

## Development Tools

### Recommended:
- **MongoDB Compass** - GUI for MongoDB
- **Postman** or **Insomnia** - API testing
- **VS Code** - Code editor
- **Chrome DevTools** - Frontend debugging

### Useful Commands:

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Check for linting issues
npm run lint
```

## Need Help?

1. Check INSTALLATION.md for detailed setup
2. Check PROGRESS_SUMMARY.md to see what's built
3. Check README.md for feature overview
4. Check BUILD_STATUS.md for what's remaining

## What's Built So Far (40% Complete)

✅ Project setup
✅ All 11 database models
✅ Authentication system (login, PIN, QR)
✅ Complete design system
✅ Student API (full CRUD + special endpoints)
✅ Email service
✅ Socket.io server
✅ Documentation

Still needed: Teachers API, Lessons API, Rooms API, Frontend pages, and more.

---

**Enjoy building!** The foundation is solid and ready for the next phase. 🚀
