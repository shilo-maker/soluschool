# MongoDB Installation Guide for Windows

## Option 1: Quick Install with Installer (Recommended)

### Step 1: Download MongoDB

1. **Open your browser** and go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: 8.0.4 (latest)
   - **Platform**: Windows
   - **Package**: MSI
3. Click **Download**

### Step 2: Run the Installer

1. **Run the downloaded .msi file** (mongodb-windows-x86_64-8.0.4-signed.msi)
2. Click **Next** on the welcome screen
3. Accept the **License Agreement**
4. Choose **Complete** installation type
5. **IMPORTANT**: On "Service Configuration" page:
   - ✅ Check "Install MongoDB as a Service"
   - ✅ Check "Run service as Network Service user"
   - ✅ Set Data Directory: `C:\Program Files\MongoDB\Server\8.0\data`
   - ✅ Set Log Directory: `C:\Program Files\MongoDB\Server\8.0\log`
6. **IMPORTANT**: UNCHECK "Install MongoDB Compass" (we don't need the GUI for now)
7. Click **Install**
8. Wait for installation to complete
9. Click **Finish**

### Step 3: Verify Installation

Open **Command Prompt** (cmd) or **PowerShell** and run:

```bash
mongod --version
```

You should see something like:
```
db version v8.0.4
```

### Step 4: Start MongoDB Service

MongoDB should start automatically as a Windows Service. To check:

**Option A: Using Services (GUI)**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Look for "MongoDB" in the list
4. Status should be "Running"
5. If not running, right-click → Start

**Option B: Using Command Line**

```bash
# Check service status
net start | findstr MongoDB

# Start the service if not running
net start MongoDB
```

### Step 5: Test Connection

In Command Prompt or PowerShell:

```bash
# Connect to MongoDB
mongosh
```

You should see:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/
```

Type `exit` to quit.

**Success!** MongoDB is installed and running! ✅

---

## Option 2: MongoDB Atlas (Cloud - Easier Alternative)

If local installation is too complex, use **MongoDB Atlas** (free cloud database):

### Step 1: Create Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Verify your email

### Step 2: Create Cluster
1. Click **"Build a Database"**
2. Choose **"FREE"** (M0 Sandbox)
3. Select **Cloud Provider**: AWS, Azure, or Google Cloud
4. Select **Region**: Choose closest to you
5. Cluster Name: `SoluSchool` (or keep default)
6. Click **"Create Cluster"**

### Step 3: Create Database User
1. Choose **"Username and Password"** authentication
2. Create a username: `soluadmin`
3. Create a password: **Save this!** (e.g., `MySecurePassword123`)
4. Click **"Create User"**

### Step 4: Allow Network Access
1. Click **"Add My Current IP Address"**
2. Or choose **"Allow Access from Anywhere"** (0.0.0.0/0) for testing
3. Click **"Finish and Close"**

### Step 5: Get Connection String
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 6.8 or later
5. Copy the connection string (looks like):
   ```
   mongodb+srv://soluadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update .env.local

Replace `<password>` with your actual password:

```env
MONGODB_URI=mongodb+srv://soluadmin:MySecurePassword123@cluster0.xxxxx.mongodb.net/soluschool?retryWrites=true&w=majority
```

**Done!** Your app will now use MongoDB Atlas (cloud). ✅

---

## Which Option Should I Choose?

### Choose **Local MongoDB** if:
- ✅ You want full control
- ✅ You're comfortable with Windows services
- ✅ You want faster local development
- ✅ You don't need internet to develop

### Choose **MongoDB Atlas** if:
- ✅ You want the easiest setup (5 minutes)
- ✅ You want automatic backups
- ✅ You don't want to manage services
- ✅ You want to access your database from anywhere
- ✅ You want a production-ready solution

**Recommendation**: **MongoDB Atlas** is easier and production-ready!

---

## Troubleshooting

### MongoDB Service Won't Start (Local)

**Error**: "The MongoDB service failed to start"

**Solution 1**: Check if port 27017 is in use
```bash
netstat -ano | findstr :27017
```

If something is using it, either stop that process or change MongoDB's port.

**Solution 2**: Check data directory permissions
1. Go to `C:\Program Files\MongoDB\Server\8.0\data`
2. Right-click → Properties → Security
3. Make sure "NETWORK SERVICE" has Full Control

**Solution 3**: Reinstall
1. Uninstall MongoDB from Control Panel
2. Delete `C:\Program Files\MongoDB`
3. Delete `C:\ProgramData\MongoDB`
4. Reinstall following steps above

### Can't Connect to MongoDB

**Error**: "MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017"

**Check if service is running**:
```bash
net start MongoDB
```

**Check if mongod is listening**:
```bash
netstat -ano | findstr :27017
```

### MongoDB Compass (Optional GUI)

If you want a visual interface:
1. Download from: https://www.mongodb.com/try/download/compass
2. Install and run
3. Connect to: `mongodb://localhost:27017`

---

## Next Steps

After MongoDB is installed and running:

1. **Restart your app server**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then start it again
   npm run dev
   ```

2. **Check the server logs** - you should see:
   ```
   ✅ MongoDB connected successfully
   ```

3. **Create an admin user** - see `INSTALLATION.md` for instructions

4. **Test the API** - try creating a student via API

---

## Need Help?

- MongoDB Documentation: https://www.mongodb.com/docs/manual/
- MongoDB University (Free Courses): https://university.mongodb.com/
- Community Forums: https://www.mongodb.com/community/forums/
