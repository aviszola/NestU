import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

/**
 * Button shared — state interaktif konsisten di seluruh app.
 * Todo tombol interaktif wajib punya: hover (bg berubah + shadow-md +
 * cursor-pointer), active (scale-[0.98] + bg lebih gelap), focus-visible
 * (ring-primary, bukan saat klik mouse), disabled (opacity + cursor) dan
 * loading (spinner + teks kontekst, disabled selama proses).
 */
const variants = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container hover:shadow-md active:bg-primary-container active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-none",
  secondary:
    "bg-secondary text-on-secondary hover:bg-secondary-container hover:shadow-md active:bg-secondary-container active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
  ghost:
    "text-on-surface-variant hover:bg-surface-container hover:shadow-md active:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-error text-on-error hover:bg-error-container hover:shadow-md active:bg-error-container active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  /** loading state — spinner + disabled selama proses (submit/aksi async). */
  loading?: boolean;
  /** teks alternatip saat loading (mis. "Memuat...", "Simpan..."). */
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, loadingText, children, disabled, ...props }, ref) => {
    const isBusy = loading === true;
    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
          "transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "active:scale-[0.98]",
          variants[variant],
          className
        )}
        aria-busy={isBusy || undefined}
        {...props}
      >
        {isBusy ? (
          <>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
              aria-hidden="true"
            />
            <span>{loadingText || "Memuat..."}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, variants as buttonVariants };
