# Duplicate & Overlap Investigation Report

## Summary Table

| Pair | Real Path | Dummy/Overlap Path | Verdict |
|------|-----------|-------------------|---------|
| 1 | `app/dashboard/page.tsx` | `app/student/dashboard/page.tsx` | Dummy has UNIQUE UI elements |
| 2 | `app/booking/[kosId]/page.tsx` | `app/student/booking/page.tsx` | Dummy has UNIQUE UI elements |
| 3 | `app/favorites/page.tsx` | `app/student/favorites/page.tsx` | Dummy adds nothing — DELETE |
| 4 | `app/profile/page.tsx` | `app/student/profile/page.tsx` | Real fully functional — DELETE dummy |
| 5 | `app/kos/[id]/page.tsx` | `app/student/properties/[id]/page.tsx` | Dummy has UNIQUE UI elements |
| 6 | `app/kos/page.tsx` | `app/student/search/page.tsx` | Dummy has UNIQUE UI (map toggle) |
| 7 | `app/admin/page.tsx` | `app/admin/dashboard/page.tsx` | Real → replace dummy, redirect |
| 8 | `app/owner/page.tsx` | `app/owner/dashboard/page.tsx` | **Different functions**, keep both |
| 9 | `app/owner/kos/[id]/page.tsx` | `app/owner/properties/[id]/page.tsx` | **True duplicate** — DELETE dummy |

---

## Pair 1: Student Dashboard
### `app/dashboard/page.tsx` (REAL) vs `app/student/dashboard/page.tsx` (DUMMY)

| Aspect | REAL (`dashboard/page.tsx`) | DUMMY (`student/dashboard/page.tsx`) |
|--------|---------------------------|--------------------------------------|
| **Type** | Server Component (`async`) | Client Component (`"use client"`) |
| **Data Source** | `createClient()` → `getFeaturedKos()`, `getActiveBookings()`, `getBookingCount()` from Supabase | `useState` hardcoded arrays with `// TODO` |
| **Auth Guard** | ✅ Checks role, redirects `/owner` or `/admin` | ❌ None |
| **Header** | Custom inline header: logo, nav links, user initial avatar | `TopNav` component + `Sidebar` + `BottomNav` |
| **Hero** | "STUDENT PORTAL" heading, search form `action="/kos"` | "Cari tempat kos di sekitar sekolahmu" + inline search bar |
| **Kos Cards** | `KosCard` component (4 items, `showFavorite={true}`) | Custom card divs with **gender badge**, facility pills, favorite button |
| **Booking List** | `BookingCard` component, empty state ✅ | Custom booking items, owner avatar, no empty state |
| **Extra** | "Butuh bantuan?" + "Chat Advisor" link | **Quick Suggestions card** (blue gradient) |
| **Layout** | No sidebar, no BottomNav | `Sidebar` + `BottomNav` |

> [!WARNING] **DUMMY has UNIQUE UI not in REAL**
> - Gender badge (Putra/Putri) on property cards
> - Facility pills inline on cards
> - Quick Suggestions / "Chat Advisor" card (blue gradient container)
> - Right sidebar layout with booking list + suggestions
> - `Sidebar` + `TopNav` + `BottomNav` layout pattern

**Recommendation**: Delete `student/dashboard/`. Inject unique elements into real:
- Add gender badge to `KosCard` (or handle at page level)
- Add Quick Suggestions card after booking section
- Decide on layout: keep lean (current real) or add Sidebar/BottomNav

---

## Pair 2: Booking Submission
### `app/booking/[kosId]/page.tsx` (REAL) vs `app/student/booking/page.tsx` (DUMMY)

| Aspect | REAL | DUMMY |
|--------|------|-------|
| **Type** | Server Component | Client Component |
| **Data Source** | `getKosById()` + `getRoomsByKosId()` from Supabase | `useState` hardcoded property |
| **Room Selection** | ✅ Radio buttons with prices | ❌ Hardcoded "Kamar Tipe Deluxe" |
| **Form Fields** | `move_in_date`, `notes`, `room_id` | `move_in_date`, **`duration`** (1/3/6/12 bln), `notes` |
| **Payment Breakdown** | ❌ Absent | ✅ **Service fee (25k) + admin fee (5k) + total** |
| **Trust Indicator** | ❌ Absent | ✅ **"Keamanan Terjamin" card** |
| **Terverifikasi Badge** | ✅ From DB | ✅ Hardcoded |
| **Facility Icons** | Dynamic `FACILITY_ICONS` map | Hardcoded if/else |
| **Submit** | `SubmitBookingButton` (server action, redirects to `/bookings`) | Fake setTimeout + success state on button |
| **Auth Guard** | ✅ `redirect("/login")` if no user | ❌ None |
| **Header/Footer** | Inline header + inline footer | `TopNav` + `Footer` + **`BottomNav`** |

> [!WARNING] **DUMMY has UNIQUE UI not in REAL**
> - Payment breakdown sidebar (service fee, admin fee, total)
> - Trust indicator card ("Keamanan Terjamin" with security icon)
> - Duration selector (1/3/6/12 months)
> - Loading spinner + "Pengajuan Terkirim!" success button state

**Recommendation**: Delete `student/booking/`. Inject unique elements into real:
- Add payment breakdown to right sidebar (needs server-side fee values)
- Add trust indicator card below payment
- Add duration selector field to booking form
- The success button state is handled by `SubmitBookingButton` already

---

## Pair 3: Favorites
### `app/favorites/page.tsx` (REAL) vs `app/student/favorites/page.tsx` (DUMMY)

| Aspect | REAL | DUMMY |
|--------|------|-------|
| **Type** | Server Component | Client Component |
| **Data Source** | Supabase favorites → kos query | `useState` hardcoded |
| **Cards** | `KosCard` component | Custom divs (image, price, distance, "Hapus" button) |
| **Layout** | Logo header + footer | `Sidebar` + `TopNav` + `Footer` + `BottomNav` |
| **Empty State** | ✅ Yes | ❌ |
| **Unique Value** | — | Nothing useful |

**Recommendation**: Delete `student/favorites/`. Real is superior. Dummy adds zero unique elements.

---

## Pair 4: Profile
### `app/profile/page.tsx` (REAL) vs `app/student/profile/page.tsx` (DUMMY)

| Aspect | REAL | DUMMY |
|--------|------|-------|
| **Data** | `createClient` + `updateProfile`/`changePassword`/`logout` | `useState` hardcoded with `// TODO` |
| **Fields** | fullName, phone, schoolName, role, avatar (upload+preview) | username, email, phone (simpler) |
| **Password** | ✅ Change password form | ❌ |
| **Avatar** | ✅ File upload with preview | ❌ |
| **Save** | ✅ Real Supabase mutation | ❌ Fake |
| **Loading** | ✅ Saving spinner | ❌ |
| **Error/Success** | ✅ Toast notifications | ❌ |
| **Layout** | Inline header + footer | `TopNav` + `Sidebar` + `Footer` + `BottomNav` |
| **Unique** | — | Toggle edit mode (`isEditing`) |

**Recommendation**: Delete `student/profile/`. Real is fully functional. Dummy's `isEditing` toggle is minor polish, not critical.

---

## Pair 5: Kos Detail
### `app/kos/[id]/page.tsx` (REAL) vs `app/student/properties/[id]/page.tsx` (DUMMY)

| Aspect | REAL | DUMMY |
|--------|------|-------|
| **Type** | Server Component | Client Component |
| **Data** | `getKosById()` from Supabase | `useState` hardcoded |
| **Gallery** | ✅ Scrollable images (horizontal) | 1 main image |
| **Facilities** | ✅ From DB with icons | Hardcoded list |
| **Rooms/Price** | ✅ Room table with prices | ❌ |
| **Owner Info** | ❌ | ✅ Avatar + name |
| **Location/Map** | ❌ | ✅ Full address + map |
| **Description** | ❌ | ✅ Paragraph |
| **Reviews** | ❌ | ✅ Star ratings with comments |

> [!WARNING] **DUMMY has UNIQUE UI not in REAL**
> - Owner info (avatar + name)
> - Full address + map link
> - Description section
> - Reviews/ratings section

**Recommendation**: Delete `student/properties/`. Inject owner info, address, description, and reviews into real page.

---

## Pair 6: Kos Search/List
### `app/kos/page.tsx` (REAL) vs `app/student/search/page.tsx` (DUMMY)

| Aspect | REAL | DUMMY |
|--------|------|-------|
| **Type** | Server Component | Client Component |
| **Data** | `getKosList()` + `getFacilities()` from Supabase | `useState` hardcoded |
| **Filters** | ✅ Price range, tipe, facilities, sort, pagination | Filter tabs (hardcoded) |
| **Map View** | ❌ | ✅ Toggle map/list buttons |
| **Layout** | Inline header + footer | `TopNav` + `Sidebar` + `Footer` + `BottomNav` |

**Recommendation**: Delete `student/search/`. Real has full filter/search. Map toggle is the only unique feature.

---

## Pair 7: Admin Route Overlap
### `app/admin/page.tsx` (REAL) vs `app/admin/dashboard/page.tsx` (DUMMY)

| Aspect | `/admin/page` (REAL) | `/admin/dashboard/page` (DUMMY) |
|--------|----------------------|----------------------------------|
| **Type** | Server Component | Client Component |
| **Data** | Real Supabase (kos stats, booking stats, user counts, weekly chart) | `useState` hardcoded verifications + properties |
| **Stats** | 10+ real counts (pending/verified/rejected kos, bookings, users by role) | 3 hardcoded stats |
| **Charts** | ✅ Weekly booking bar chart | ❌ |
| **Tables** | Recent properties + recent bookings | Verification list (hardcoded) |
| **Route** | Served at `/admin` | Served at **`/admin/dashboard`** — separate route |

> [!IMPORTANT]
> These are on **different routes** (`/admin` vs `/admin/dashboard`). The real dashboard lives at `/admin`. The `/admin/dashboard` route is an orphan with fake data. If sidebar menu links to `/admin/dashboard`, users see fake data.

**Recommendation**: Either (A) delete `app/admin/dashboard/` and redirect `/admin/dashboard` → `/admin`, or (B) move real server component from `app/admin/page.tsx` to `app/admin/dashboard/page.tsx` and make `app/admin/page.tsx` a redirect.

---

## Pair 8: Owner Route Overlap
### `app/owner/page.tsx` (REAL) vs `app/owner/dashboard/page.tsx` (DUMMY)

| Aspect | `/owner/page` (REAL) | `/owner/dashboard/page` (DUMMY) |
|--------|---------------------|---------------------------------|
| **Purpose** | **Booking Inbox** — manage incoming booking requests | **Property Overview** — stats + property list |
| **Data** | `getOwnerBookings()`, `getOwnerStats()`, `getAvailableRoomsCount()` | `useState` hardcoded |
| **Type** | Server Component | Client Component |
| **Key UI** | Filter bar, booking table with approve/reject, pagination, stat cards | Property table, income chart |
| **Sidebar link** | Owner menu: **`page: "dashboard"` → href: `/owner/dashboard`** | — |

> [!NOTE]
> **Not duplicates**. Different functions: `/owner` = bookings inbox, `/owner/dashboard` = property overview.
> 
> ⚠️ **But**: Owner sidebar's "Dashboard" item links to `/owner/dashboard`, which is the DUMMY page. The REAL booking management is at `/owner` which has no sidebar link.

**Recommendation**: Keep both. Rename for clarity:
- `/owner` → `/owner/bookings` (booking inbox)
- `/owner/dashboard` → `/owner` (property overview, wire up real data)
- Update sidebar menu to link to correct routes

---

## Pair 9: Owner Kos vs Properties Detail
### `app/owner/kos/[id]/page.tsx` (REAL) vs `app/owner/properties/[id]/page.tsx` (DUMMY)

| Aspect | `/owner/kos/[id]` (REAL) | `/owner/properties/[id]` (DUMMY) |
|--------|--------------------------|----------------------------------|
| **Type** | Client Component | Client Component |
| **Data** | `getKosById()`, `getRoomsByKosId()`, full CRUD (`createRoom`, `updateRoom`, `deleteRoom`) | `useState` hardcoded with `// TODO: fetch property data from Supabase` |
| **Purpose** | **Manage Kos** — edit info, manage rooms (CRUD) | **Showcase property** — facilities, description, location, reviews |
| **Photos** | Gallery (scrollable) + edit form | Single main image (w-full h-80) |
| **Rooms** | ✅ Full CRUD table | ❌ Static |
| **Facilities** | Edit form | ✅ Grid with 10 icons |
| **Map** | ❌ | ✅ Leaflet map |
| **Reviews** | ❌ | ✅ 3 reviews with avatars |
| **Sidebar** | No layout wrappers | `Sidebar` + `TopNav` + `Footer` + `BottomNav` |
| **Route** | `/owner/kos/123` | **`/owner/properties/123`** |

> [!CAUTION] **TRUE DUPLICATE — same logical page**
> Both show detail for one property. Owner sidebar menu links to `/owner/properties` which leads to the dummy list page, and clicking a property there shows the DUMMY detail page. Meanwhile, the REAL management page at `/owner/kos/123` has no sidebar link.

**Recommendation**: Delete `app/owner/properties/` (both `page.tsx` and `[id]`). Update sidebar menu `page: "properties"` href from `/owner/properties` → `/owner/kos`. Optionally merge the showcase visuals (map, reviews, facilities grid) from dummy into the real page.
