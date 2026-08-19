import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * RBAC Proxy â€” Role-Based Access Control
 *
 * - No auth + protected path â†’ redirect /login
 * - Wrong role â†’ redirect to role-appropriate home
 * - Missing profile â†’ redirect /login (no default role)
 *
 * Role-path mapping:
 *   siswa â†’ /dashboard, /bookings, /booking/*, /profile, /favorites, /kos/*
 *   pemilik â†’ /owner/*
 *   admin â†’ /admin/*
 */

// Paths accessible without auth
const PUBLIC_PATHS: string[] = [
  "/",
  "/kos",
  "/about",
  "/terms",
  "/privacy",
  "/contact",
  "/partner",
];

// Auth paths (accessible without auth, for auth flow)
const AUTH_PATHS: string[] = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth", // Auth callback routes
];

// Allowed paths per role
const ROLE_ALLOWED: Record<string, RegExp[]> = {
  siswa: [/^\/dashboard(?:\/|$)/, /^\/bookings(?:\/|$)/, /^\/booking(?:\/|$)/, /^\/rental(?:\/|$)/, /^\/profile(?:\/|$)/, /^\/settings(?:\/|$)/, /^\/favorites(?:\/|$)/, /^\/kos(?:\/|$)/, /^\/logout(?:\/|$)/, /^\/$/],
  pemilik: [/^\/owner(?:\/|$)/, /^\/logout(?:\/|$)/],
  admin: [/^\/admin(?:\/|$)/, /^\/logout(?:\/|$)/],
};

const ROLE_HOME: Record<string, string> = {
  siswa: "/dashboard",
  pemilik: "/owner",
  admin: "/admin",
};

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  return false;
}

function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  );
}

function canAccess(role: string, pathname: string): boolean {
  const patterns = ROLE_ALLOWED[role];
  if (!patterns) return false;
  return patterns.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal and API routes
  if (isStaticOrApi(pathname)) return NextResponse.next();

  // Public/auth paths â€” allow all
  if (isPublicPath(pathname)) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected path + no user â†’ redirect login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Get role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  // No profile or no role â†' redirect login (never default to a role)
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Check access
  if (!canAccess(role, pathname)) {
    const home = ROLE_HOME[role] || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|api/).*)"],
};
