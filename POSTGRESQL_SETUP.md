# PostgreSQL Setup Guide

## Overview

You have **3 options** for PostgreSQL:

1. **Cloud PostgreSQL (Easiest)** - Recommended for beginners
2. **Local PostgreSQL** - For full control and offline development
3. **Docker PostgreSQL** - For containerized development

---

## Option 1: Cloud PostgreSQL (Recommended)

### A. Render.com (Free Tier)

1. **Sign up**: https://render.com/
2. **Create Database**:
   - Click "New +" → "PostgreSQL"
   - Name: `soluschool-db`
   - Choose **Free** tier
   - Click "Create Database"
3. **Get Connection String**:
   - Go to your database dashboard
   - Find **"External Database URL"**
   - Copy it (looks like):
     ```
     postgresql://soluschool_user:abc123...@dpg-xyz.oregon-postgres.render.com/soluschool_db
     ```
4. **Update .env.local**:
   ```env
   DATABASE_URL=your-copied-connection-string-here
   ```
5. **Done!** Skip to "Initialize Database" section below

### B. Railway.app (Free $5 Credit)

1. **Sign up**: https://railway.app/
2. **Create Project**:
   - Click "New Project"
   - Select "Provision PostgreSQL"
3. **Get Connection String**:
   - Click on PostgreSQL service
   - Go to "Connect" tab
   - Copy **"Postgres Connection URL"**
4. **Update .env.local**:
   ```env
   DATABASE_URL=your-railway-connection-string
   ```
5. **Done!** Skip to "Initialize Database" section below

### C. Supabase (Free Tier)

1. **Sign up**: https://supabase.com/
2. **Create Project**:
   - Click "New Project"
   - Name: `soluschool`
   - Set database password (save it!)
   - Choose region closest to you
3. **Get Connection String**:
   - Go to Project Settings → Database
   - Find "Connection string" → "URI"
   - Copy it and replace `[YOUR-PASSWORD]` with your actual password
4. **Update .env.local**:
   ```env
   DATABASE_URL=your-supabase-connection-string
   ```
5. **Done!** Skip to "Initialize Database" section below

---

## Option 2: Local PostgreSQL

### Windows Installation

1. **Download PostgreSQL**:
   - Go to: https://www.postgresql.org/download/windows/
   - Download the installer (latest version)

2. **Run Installer**:
   - Run the downloaded .exe file
   - Click "Next" through the wizard
   - Choose installation directory (default is fine)
   - Select components: PostgreSQL Server, pgAdmin 4, Command Line Tools
   - Set data directory (default is fine)
   - **IMPORTANT**: Set a password for the `postgres` user (remember this!)
   - Port: 5432 (default)
   - Locale: Default
   - Click "Next" and "Finish"

3. **Verify Installation**:
   - Open Command Prompt
   - Run:
     ```bash
     psql --version
     ```
   - You should see: `psql (PostgreSQL) 16.x`

4. **Create Database**:
   - Open Command Prompt
   - Connect to PostgreSQL:
     ```bash
     psql -U postgres
     ```
   - Enter your password
   - Create database:
     ```sql
     CREATE DATABASE soluschool;
     \q
     ```

5. **Update .env.local**:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/soluschool
   ```
   Replace `YOUR_PASSWORD` with your actual postgres password

6. **Done!** Continue to "Initialize Database" section below

### macOS Installation

```bash
# Install via Homebrew
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb soluschool

# Update .env.local
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/soluschool
```

### Linux Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb soluschool

# Update .env.local
DATABASE_URL=postgresql://postgres@localhost:5432/soluschool
```

---

## Option 3: Docker PostgreSQL

If you have Docker installed:

```bash
# Run PostgreSQL container
docker run --name soluschool-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=soluschool \
  -p 5432:5432 \
  -d postgres:16

# Update .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/soluschool
```

---

## Initialize Database

After setting up PostgreSQL (any option above), run:

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push
```

You should see:
```
🚀  Your database is now in sync with your Prisma schema.
```

---

## Verify Setup

```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

This opens http://localhost:5555 where you can view/edit your database.

---

## Common Issues

### Error: "Can't reach database server"

**Cause**: PostgreSQL is not running or wrong connection string

**Fix**:
- For cloud: Double-check your DATABASE_URL is correct
- For local: Make sure PostgreSQL service is running
  - Windows: Check Services → PostgreSQL
  - macOS: `brew services list`
  - Linux: `sudo systemctl status postgresql`

### Error: "Authentication failed"

**Cause**: Wrong password in DATABASE_URL

**Fix**:
- Check your password in .env.local
- Make sure special characters are URL-encoded (e.g., `@` becomes `%40`)

### Error: "database does not exist"

**Fix**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE soluschool;
```

---

## Next Steps

After database is set up:

1. **Create admin user**: See INSTALLATION.md
2. **Start dev server**: `npm run dev`
3. **Test API**: Try logging in at http://localhost:3334

---

## Prisma Commands Reference

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create migration (production-ready)
npx prisma migrate dev --name init

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
```

---

## Recommended: Cloud PostgreSQL

For this project, I recommend using **Render.com** because:
- ✅ Free tier (no credit card required)
- ✅ Always online (no need to start/stop)
- ✅ Automatic backups
- ✅ No local installation needed
- ✅ Works from anywhere
- ✅ Easy to deploy to production later

---

## Need Help?

- Prisma Docs: https://www.prisma.io/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Render Docs: https://render.com/docs/databases
