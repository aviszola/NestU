# RBAC (Role-Based Access Control) Documentation

## Overview
Sistem RBAC menggunakan Next.js Proxy (di `proxy.ts`) untuk mengatur akses berdasarkan role user.

## Role Definition

### 1. **siswa** (Student)
**Allowed Paths:**
- `/` - Homepage public
- `/kos` - Browse & search kos (public + authenticated)
- `/kos/[id]` - Detail kos
- `/booking/*` - Booking pages
- `/dashboard` - Student dashboard
- `/bookings` - My bookings
- `/profile` - Profile settings
- `/favorites` - Favorite kos list
- `/logout` - Logout

**Default Redirect:** `/dashboard`

### 2. **pemilik** (Owner)
**Allowed Paths:**
- `/owner/*` - All owner pages
  - `/owner` - Owner dashboard
  - `/owner/kos` - Manage properties
  - `/owner/kos/new` - Add new property
  - `/owner/kos/[id]` - Property detail
  - `/owner/kos/[id]/edit` - Edit property
  - `/owner/bookings` - Incoming bookings
  - `/owner/profile` - Owner profile
- `/logout` - Logout

**Default Redirect:** `/owner`

### 3. **admin** (Admin)
**Allowed Paths:**
- `/admin/*` - All admin pages
  - `/admin` - Admin dashboard
  - `/admin/kos` - Verify properties
  - `/admin/kos/[id]` - Property verification detail
  - `/admin/bookings` - All bookings
- `/logout` - Logout

**Default Redirect:** `/admin`

## Public Paths (No Auth Required)
- `/` - Homepage
- `/login` - Login page
- `/register` - Registration page
- `/kos` - Public browse kos
- `/kos/[id]` - Public kos detail
- `/_next/*` - Next.js internals
- `/api/*` - API routes
- `/images/*` - Public images
- `/favicon.ico` - Favicon

## Access Control Flow

```
Request → Proxy Middleware
  ↓
Is path public?
  Yes → Allow access
  No  → Check authentication
    ↓
Is user logged in?
  No  → Redirect to /login?redirect={path}
  Yes → Get user role from profiles table
    ↓
Does role allow access to path?
  No  → Redirect to role's default path + ?error=forbidden&attempted={path}
  Yes → Allow access
```

## Error Handling

### Unauthorized Access (No Login)
- **Response:** Redirect to `/login?redirect={attempted_path}`
- **User sees:** Login page with redirect back after login

### Forbidden Access (Wrong Role)
- **Response:** Redirect to role's default page + `?error=forbidden&attempted={attempted_path}`
- **User sees:** Their dashboard with error message
- **Console log:** `[RBAC] Access denied: User "{email}" (role: {role}) tried to access "{path}"`

## Testing Checklist

### As Student (siswa)
- ✅ Can access: `/`, `/kos`, `/dashboard`, `/bookings`, `/booking/*`, `/profile`, `/favorites`
- ❌ Cannot access: `/owner/*`, `/admin/*`
- ✅ Redirected to `/dashboard` if tries to access forbidden path

### As Owner (pemilik)
- ✅ Can access: `/owner/*`
- ❌ Cannot access: `/dashboard`, `/bookings`, `/booking/*`, `/admin/*`
- ✅ Redirected to `/owner` if tries to access forbidden path

### As Admin
- ✅ Can access: `/admin/*`
- ❌ Cannot access: `/owner/*`, `/dashboard`, `/bookings`
- ✅ Redirected to `/admin` if tries to access forbidden path

### Unauthenticated User
- ✅ Can access: `/`, `/login`, `/register`, `/kos/*`
- ❌ Cannot access: any authenticated route
- ✅ Redirected to `/login?redirect={path}` if tries to access authenticated route

## Implementation Details

### File: `proxy.ts`
```typescript
// Role to allowed paths mapping
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  siswa: ['/dashboard', '/bookings', '/booking', '/profile', '/favorites', '/kos', '/logout'],
  pemilik: ['/owner', '/logout'],
  admin: ['/admin', '/logout'],
};
```

### Middleware Matcher
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|api/).*)",
  ],
};
```

## Security Notes

1. **Role stored in `profiles` table** - Role diambil dari database Supabase (tabel `profiles`, kolom `role`)
2. **Session-based** - Menggunakan Supabase Auth session cookies
3. **Server-side validation** - Validation dilakukan di server (proxy middleware), tidak bisa di-bypass dari client
4. **Logging** - Semua akses yang ditolak di-log ke console dengan `console.warn`

## Known Limitations

1. **No RLS verification** - RBAC di proxy tidak menjamin RLS (Row Level Security) di Supabase sudah benar
2. **No fine-grained permissions** - Hanya role-based, belum ada permission-based (e.g., "can_edit_own_booking")
3. **No role hierarchy** - Admin tidak otomatis punya akses owner/student

## Future Improvements

1. Add permission-based access control
2. Add role hierarchy (admin inherits owner & student permissions)
3. Add audit logging to database
4. Add rate limiting per role
5. Add IP whitelist for admin routes
