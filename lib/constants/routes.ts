/** Centralized route paths by role */
export const ROUTES = {
  LOGIN: "/login",
  LOGOUT: "/logout",

  // Student routes
  STUDENT: {
    HOME: "/dashboard",
    BOOKINGS: "/bookings",
    FAVORITES: "/favorites",
    PROFILE: "/profile",
  },

  // Owner routes
  OWNER: {
    HOME: "/owner",
    BOOKINGS: "/owner/bookings",
    KOS: "/owner/kos",
    KOS_NEW: "/owner/kos/new",
    PROFILE: "/owner/profile",
    SETTINGS: "/owner/settings",
  },

  // Admin routes
  ADMIN: {
    HOME: "/admin",
    KOS: "/admin/kos",
    BOOKINGS: "/admin/bookings",
  },

  /** Map role string → landing/home path */
  ROLE_HOME: {
    siswa: "/dashboard",
    pemilik: "/owner",
    admin: "/admin",
  } as Record<string, string>,
} as const;

/** Get home path for a role, fallback to /dashboard */
export function getRoleHome(role?: string | null): string {
  return ROUTES.ROLE_HOME[role ?? ""] || ROUTES.STUDENT.HOME;
}
