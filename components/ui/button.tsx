import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  primary:
    "bg-primary text-on-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-secondary text-on-secondary hover:brightness-110 disabled:opacity-50",
  ghost:
    "text-on-surface-variant hover:bg-surface-container disabled:opacity-50",
  danger:
    "bg-error text-on-error hover:brightness-110 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, variants as buttonVariants };
