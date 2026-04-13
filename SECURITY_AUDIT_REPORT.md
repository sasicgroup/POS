# Security Audit Report

**Date**: April 12, 2026  
**Scope**: Store Management Software - Node.js/Next.js Application  
**Focus Areas**: API folder, Auth functions, Environment variables, CORS, SQL Injection, Input Validation

---

## Executive Summary

**Critical Issues Found**: 5  
**High Issues Found**: 4  
**Medium Issues Found**: 3  
**Low Issues Found**: 2

⚠️ **IMMEDIATE ACTION REQUIRED** - Multiple critical security vulnerabilities identified that could lead to data breach and unauthorized access.

---

## CRITICAL Issues

### 1. Hardcoded Supabase Credentials in Source Code

**Severity**: 🔴 CRITICAL  
**Type**: Exposed Secrets / Hardcoded Credentials

**Locations**:
- [src/lib/supabase.ts](src/lib/supabase.ts#L4-L5)
  ```typescript
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cwieywlveahchulsswnq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Uwy8CIGirDu1JYVZ0gwmsw_VH5OMJ8z';
  ```

**Risk**: 
- Supabase service URL is exposed
- Public anon key is hardcoded as fallback
- Anyone with repository access can compromise the database

**Recommended Fix**:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}
```

---

### 2. SMS Provider Credentials Exposed in API URLs

**Severity**: 🔴 CRITICAL  
**Type**: Sensitive Data Exposure / Credentials in URLs

**Location**: [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L78)

**Code**:
```typescript
const url = `https://smsc.hubtel.com/v1/messages/send?clientsecret=${config.hubtel.clientSecret}&clientid=${config.hubtel.clientId}&from=${encodeURIComponent(senderId)}&to=${simplePhone}&content=${encodeURIComponent(message)}`;
```

**Risk**:
- API credentials (clientSecret, clientId) embedded in URLs
- URLs may be logged in server logs, browser history, or intercepted
- Third-party services may log these credentials
- If Hubtel servers are compromised, attacker gains credentials

**Recommended Fix**:
```typescript
const res = await fetch('https://smsc.hubtel.com/v1/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${config.hubtel.clientId}:${config.hubtel.clientSecret}`).toString('base64')}`
  },
  body: JSON.stringify({
    from: senderId,
    to: simplePhone,
    content: message
  })
});
```

---

### 3. Hardcoded Supabase Credentials in API Route

**Severity**: 🔴 CRITICAL  
**Type**: Exposed Secrets / Credentials in Code

**Location**: [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L6-L7)

**Code**:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Risk**:
- Supabase URL hardcoded as fallback
- Creates hardcoded duplicates across codebase
- Difficult to manage and update credentials

**Recommended Fix**:
Centralize credential management. Create a single config file:
```typescript
// lib/config.ts
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return { url, key };
}
```

---

### 4. .env.local File Tracked in Git with Sensitive Keys

**Severity**: 🔴 CRITICAL  
**Type**: Exposed Environment Variables / Git Credential Leakage

**Location**: [.env.local](/.env.local)

**Contents** (Exposed):
```
NEXT_PUBLIC_SUPABASE_URL=https://cwieywlveahchulsswnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Risk**:
- Service Role Key (extremely sensitive) is committed to version control
- Anyone who has cloned this repository has access to production database
- Git history permanently contains these secrets
- Keys can't be rotated without removing from Git history

**Recommended Fix**:
1. Add to [.gitignore](.gitignore):
   ```
   .env.local
   .env.*.local
   ```

2. Remove from Git history (requires force push - coordinate with team):
   ```bash
   git rm --cached .env.local
   git filter-branch --tree-filter 'rm -f .env.local' HEAD
   git push -f origin main
   ```

3. Create `.env.local.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPER_ADMIN_SESSION_SECRET=your_session_secret_here
   ```

4. **Immediately rotate all keys** in Supabase dashboard

---

### 5. SMS Provider Credentials in mNotify API URL

**Severity**: 🔴 CRITICAL  
**Type**: Sensitive Data Exposure

**Location**: [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L105)

**Code**:
```typescript
const url = `https://api.mnotify.com/api/sms/quick?key=${config.mnotify.apiKey}`;
```

**Risk**:
- API key exposed in URL query parameter
- Will appear in server logs, CDN logs, browser history
- Third-party logging services will capture this
- Can't be rotated without downtime

**Recommended Fix**:
Use request headers instead:
```typescript
const res = await fetch('https://api.mnotify.com/api/sms/quick', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.mnotify.apiKey}`
  },
  body: JSON.stringify({
    recipient: [formattedPhone],
    sender: sender,
    message: message
  })
});
```

---

## HIGH Issues

### 1. No Rate Limiting on OTP Endpoint

**Severity**: 🟠 HIGH  
**Type**: Denial of Service / Brute Force  

**Location**: [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L10)

**Risk**:
- Endpoint can be called unlimited times
- Attackers can spam phone numbers with OTP attempts
- Could incur massive SMS costs from providers
- Enables brute force attacks on OTP validation

**Recommended Fix**:
Implement rate limiting:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
});

export async function POST(request: Request) {
  const { phone } = await request.json();
  
  const { success } = await ratelimit.limit(`otp_${phone}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... rest of handler
}
```

---

### 2. Insecure Cookie Configuration in Development

**Severity**: 🟠 HIGH  
**Type**: Session Hijacking / Man-in-the-Middle

**Location**: [src/app/api/super-admin/login/route.ts](src/app/api/super-admin/login/route.ts#L50-L53)

**Code**:
```typescript
store.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // ⚠️ Not secure in dev
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
});
```

**Risk**:
- In development, `secure` flag is not set
- Session cookies can be transmitted over HTTP
- Even if testing locally, becomes a bad practice
- If accidentally deployed to non-HTTPS environment, sessions are vulnerable

**Recommended Fix**:
```typescript
store.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: true,  // Always secure
    sameSite: 'strict',  // Stricter same-site policy
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
});
```

---

### 3. Plaintext Passwords in Old Records

**Severity**: 🟠 HIGH  
**Type**: Weak Cryptography / Password Storage

**Location**: [src/app/api/super-admin/login/route.ts](src/app/api/super-admin/login/route.ts#L34-L36)

**Code**:
```typescript
if (!String(row.password_hash || '').startsWith('$2')) {
    const newHash = await hashPassword(password);
    await supabase.from('super_admins').update({ password_hash: newHash }).eq('id', row.id);
}
```

**Risk**:
- Indicates some passwords are stored in plaintext or with weak hashing
- While migration is in place, old unhashed records could exist
- If database is compromised, all old plaintext passwords are exposed
- Takes time to migrate all users

**Recommended Fix**:
1. Run migration script to hash all unhashed passwords:
   ```typescript
   // scripts/migrate_passwords.ts
   const { data: admins } = await supabase.from('super_admins').select('*');
   for (const admin of admins) {
     if (!admin.password_hash?.startsWith('$2')) {
       // Required: must prompt admin for password reset
       console.log(`Admin ${admin.email} needs password reset`);
     }
   }
   ```

2. Force password reset for all admins with plaintext passwords

3. Audit when this issue was introduced (may indicate other security lapses)

---

### 4. Missing Authorization on Public Business Endpoint

**Severity**: 🟠 HIGH  
**Type**: Information Disclosure / Information Exposure

**Location**: [src/app/api/public/business/route.ts](src/app/api/public/business/route.ts#L5-L8)

**Code**:
```typescript
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    
    // No authentication check!
```

**Risk**:
- Business data is publicly accessible without authentication
- Attacker can enumerate all businesses by trying different IDs/slugs
- Can extract sensitive data like URLs, colors, plan information
- May reveal business structure and subscription details

**Note**: This might be intentional for login page display, but should be documented and restricted to non-sensitive fields only.

**Recommended Fix** (if this should be restricted):
```typescript
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    // Only allow by slug for login page, not by ID
    if (!slug) {
        return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }
    
    // Only return public fields
    const { data } = await supabase
        .from('businesses')
        .select('id, slug, app_name, logo_url, primary_color')
        .eq('slug', slug)
        .single();
    // ...
}
```

---

## MEDIUM Issues

### 1. Missing CORS Configuration

**Severity**: 🟡 MEDIUM  
**Type**: Cross-Origin Request Handling  

**Finding**: No explicit CORS headers or middleware configuration found. Next.js has default CORS behavior, but should be explicitly configured.

**Risk**:
- Unclear which origins can access API
- Default permissive behavior may allow unintended cross-origin requests
- No explicit security policy

**Recommended Fix** - [Create middleware.ts](src/middleware.ts):
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    
    // Set CORS headers
    const origin = request.headers.get('origin');
    const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
    
    if (allowedOrigins.includes(origin || '')) {
        response.headers.set('Access-Control-Allow-Origin', origin || '');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    return response;
}

export const config = {
    matcher: '/api/:path*',
};
```

---

### 2. Insufficient Input Validation

**Severity**: 🟡 MEDIUM  
**Type**: Input Validation / Data Integrity

**Examples**:
- [src/app/api/super-admin/businesses/route.ts](src/app/api/super-admin/businesses/route.ts#L33-L35) - Minimal slug validation
- [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L14-L19) - Phone format not validated

**Risk**:
- Malicious data could be inserted into database
- Phone number validation missing - could cause SMS failures
- No validation on email format, field length limits
- Could bypass business logic

**Recommended Fix**:
```typescript
// lib/validators.ts
import { z } from 'zod';

export const PhoneSchema = z.string().regex(/^\+?[\d\s\-()]{7,}$/, 'Invalid phone format');
export const EmailSchema = z.string().email();
export const SlugSchema = z.string().regex(/^[a-z0-9\-]+$/, 'Invalid slug format');

// In route handler
const { phone, message, storeId } = z.object({
    phone: PhoneSchema,
    message: z.string().min(1).max(1000),
    storeId: z.string().uuid().optional()
}).parse(body);
```

---

### 3. Sensitive Data Logged to Console

**Severity**: 🟡 MEDIUM  
**Type**: Sensitive Data Exposure / Information Disclosure

**Locations**:
- [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L80) - Logs Hubtel request details
- [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L85) - Logs SMS provider responses
- [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts#L125) - Logs mNotify payload

**Code**:
```typescript
console.log('[API] Hubtel request:', { to: simplePhone, from: senderId, messageLength: message.length });
console.log('[API] mNotify response:', providerResponse);
```

**Risk**:
- Console logs are captured by server monitoring tools
- Phone numbers and SMS content could be exposed
- If logs are compromised, sensitive customer data is exposed
- Same for error logs that show full responses

**Recommended Fix**:
```typescript
// Sanitize logs
const sanitized = {
    to: simplePhone.slice(0, -4) + '****',  // Last 4 digits only
    from: senderId,
    status: response.status
};
console.log('[API] SMS sent:', sanitized);

// Or use structured logging with log levels
logger.debug('SMS request', { to: maskPhone(simplePhone), provider: 'hubtel' });
```

---

## LOW Issues

### 1. Missing Security Headers in next.config.js

**Severity**: 🟢 LOW  
**Type**: Missing Security Best Practices

**Current**: [next.config.js](next.config.js) is minimal with no security configuration

**Recommended Addition**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

### 2. Missing CSRF Protection on State-Changing Operations

**Severity**: 🟢 LOW  
**Type**: Cross-Site Request Forgery  

**Risk**: 
- POST/PATCH/DELETE operations lack explicit CSRF tokens
- Next.js handles some protection automatically, but explicit implementation recommended

**Recommended Fix**:
Use Next.js built-in security or add explicit tokens for sensitive operations.

---

## Summary Table

| Issue | Severity | Type | Status |
|-------|----------|------|--------|
| Hardcoded Supabase URL in supabase.ts | 🔴 CRITICAL | Secrets | Fix Required |
| SMS credentials in URL parameters | 🔴 CRITICAL | Secrets | Fix Required |
| Hardcoded Supabase keys in send-otp | 🔴 CRITICAL | Secrets | Fix Required |
| .env.local in Git with Service Role Key | 🔴 CRITICAL | Secrets | Remediate + Rotate Keys |
| mNotify API key in URL | 🔴 CRITICAL | Secrets | Fix Required |
| No rate limiting on OTP endpoint | 🟠 HIGH | DoS | Implement Rate Limit |
| Cookie secure flag in dev | 🟠 HIGH | Session | Make Always Secure |
| Plaintext passwords in old records | 🟠 HIGH | Crypto | Migrate + Force Reset |
| Unauthenticated public endpoint | 🟠 HIGH | AuthZ | Review & Restrict |
| No CORS configuration | 🟡 MEDIUM | Config | Add Middleware |
| Insufficient input validation | 🟡 MEDIUM | Validation | Add Schemas |
| Sensitive data in console logs | 🟡 MEDIUM | Exposure | Sanitize Logs |
| Missing security headers | 🟢 LOW | Config | Add Headers |
| Missing CSRF protection | 🟢 LOW | CSRF | Implement Tokens |

---

## Remediation Priority

### Phase 1: Immediate (Within 24 hours)
1. ✅ Remove .env.local from Git history
2. ✅ Rotate all Supabase keys
3. ✅ Fix hardcoded credentials in code
4. ✅ Implement rate limiting on OTP endpoint

### Phase 2: Short-term (Within 1 week)
1. ✅ Fix SMS provider credential handling
2. ✅ Fix cookie security settings
3. ✅ Migrate/reset plaintext passwords
4. ✅ Implement CORS middleware

### Phase 3: Medium-term (Within 1 month)
1. ✅ Add comprehensive input validation
2. ✅ Sanitize all logging
3. ✅ Add security headers
4. ✅ Implement CSRF protection

---

## Conclusion

The application has **5 critical security vulnerabilities** that require immediate remediation, particularly around credential management and exposure. The most urgent action is removing and rotating the Supabase Service Role Key that has been committed to Git history.

**Recommendation**: Do not deploy to production until CRITICAL issues are resolved.

