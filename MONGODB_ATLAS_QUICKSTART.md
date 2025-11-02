# MongoDB Atlas Quick Start Guide

## What You Need

After setting up MongoDB Atlas, you'll get a connection string like this:

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/soluschool?retryWrites=true&w=majority
```

## Update .env.local

Replace the MONGODB_URI line in your `.env.local` file:

**Before:**
```env
MONGODB_URI=mongodb://localhost:27017/soluschool
```

**After:**
```env
MONGODB_URI=mongodb+srv://soluadmin:YourPassword@cluster0.xxxxx.mongodb.net/soluschool?retryWrites=true&w=majority
```

⚠️ **IMPORTANT**: Replace these parts:
- `soluadmin` - your username
- `YourPassword` - your actual password (no < > brackets)
- `cluster0.xxxxx` - your actual cluster address
- `soluschool` - database name (keep this)

## Example

If your username is `admin123` and password is `MySecret456` and cluster is `cluster0.abc12.mongodb.net`:

```env
MONGODB_URI=mongodb+srv://admin123:MySecret456@cluster0.abc12.mongodb.net/soluschool?retryWrites=true&w=majority
```

## Test Connection

1. Save `.env.local`
2. Stop your app (Ctrl+C in terminal)
3. Restart: `npm run dev`
4. Look for: `✅ MongoDB connected successfully`

## Troubleshooting

**Error: "bad auth"**
- Check username and password are correct
- Make sure you replaced `<password>` with actual password

**Error: "unable to connect"**
- Check your IP is whitelisted in Atlas
- Try "Allow Access from Anywhere" (0.0.0.0/0)

**Error: "connection timeout"**
- Check your internet connection
- Try a different region for your cluster

## Next Steps

Once connected:
1. Your app will automatically create the database
2. Collections will be created when you add data
3. You can view data in Atlas dashboard → Browse Collections
