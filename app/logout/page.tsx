"use client";

import { logout } from "@/lib/supabase/actions";
import { useEffect, useRef } from "react";

export default function LogoutPage() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={logout} className="flex items-center justify-center min-h-screen bg-surface">
      <button
        type="submit"
        className="px-6 py-3 bg-primary text-on-primary rounded-xl font-semibold hover:opacity-90 transition-opacity"
      >
        Logout...
      </button>
    </form>
  );
}
