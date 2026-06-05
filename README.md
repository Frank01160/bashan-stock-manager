# Bashan Stock Manager

POS and Inventory Management System for Bashan Animal Feeds

## Setup Instructions

### 1. Database Setup (Supabase)
1. Create account at https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Run the contents of `database/schema.sql`

### 2. Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your Supabase URL and Key
3. Set a JWT secret key
4. Configure email settings (optional)

### 3. Installation
```bash
npm install