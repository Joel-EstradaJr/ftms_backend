# 🔐 JWT Authentication in Swagger UI - Quick Guide

## ❌ What You Did Wrong

You used the **JWT_SECRET** instead of an actual **JWT token**:
- ❌ Wrong: `8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i` (This is the secret key, not a token!)
- ✅ Right: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (This is an actual token)

Think of it like:
- **JWT_SECRET** = Password used to CREATE tokens
- **JWT Token** = The actual authentication ticket

---

## ✅ Quick Solutions

### Option 1: Test Without Authentication (Easiest)

Already done! I've set `ENABLE_AUTH=false` in your `.env` file.

Just **refresh Swagger UI** and test endpoints without needing any token!

### Option 2: Use Real JWT Tokens (For Authentication Testing)

Use these tokens I just generated for you:

#### 🔑 ADMIN TOKEN (Full Access):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0wMDEiLCJyb2xlIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGZ0bXMuY29tIiwiaWF0IjoxNzY4MTIwNDk2LCJleHAiOjE3NjgxNDkyOTZ9.m9ELV9PWzd_8-RlCmsCMEMHBaIwMhSyxVQuSx-ebN8o
```

#### 🔑 STAFF TOKEN (Limited Access):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzdGFmZi0wMDEiLCJyb2xlIjoic3RhZmYiLCJlbWFpbCI6InN0YWZmQGZ0bXMuY29tIiwiaWF0IjoxNzY4MTIwNDk2LCJleHAiOjE3NjgxNDkyOTZ9.fq40VH5KWZgTMRZf06yHV-zG6ziTPPRcgxbNfowcbZc
```

---

## 📝 How to Use in Swagger UI

### Step 1: Click the Authorize Button
Look for the green **"Authorize"** button (🔓 lock icon) at the top right of Swagger UI.

### Step 2: Paste the Token
In the popup dialog, paste ONE of the tokens above (choose admin or staff).

**IMPORTANT:** Just paste the token directly, DON'T add "Bearer" prefix!
- ❌ Wrong: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ✅ Right: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Swagger UI automatically adds "Bearer" for you!

### Step 3: Click "Authorize"
Click the "Authorize" button in the dialog.

### Step 4: Test Endpoints
Now you can test any endpoint and the token will be automatically included!

---

## 🔄 Generate New Tokens Anytime

To generate fresh tokens, run:

```bash
node -e "const jwt = require('jsonwebtoken'); const secret = '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i'; const adminToken = jwt.sign({userId: 'admin-001', role: 'admin', email: 'admin@ftms.com'}, secret, {expiresIn: '8h'}); console.log('ADMIN TOKEN:'); console.log(adminToken);"
```

Or use the utility I created:
```bash
npx tsx src/utils/generateToken.ts
```

---

## 🎯 Token Details

| Token Type | User ID | Role | Access Level | Expires |
|------------|---------|------|--------------|---------|
| Admin | admin-001 | admin | Full access to all Admin endpoints | 8 hours |
| Staff | staff-001 | staff | Read-only access to Staff endpoints | 8 hours |

---

## 🔧 Current Settings

- `ENABLE_AUTH=false` - Authentication is **DISABLED** for easy testing
- When you want to test authentication, change to `ENABLE_AUTH=true`

---

## ✅ Summary

**What you should do NOW:**

1. **Refresh Swagger UI** (http://localhost:4000/docs)
2. Since `ENABLE_AUTH=false`, you can test WITHOUT any token!
3. When you want to test WITH authentication:
   - Set `ENABLE_AUTH=true` in `.env`
   - Restart server
   - Use one of the tokens above in Swagger UI

That's it! 🎉
