import { toast } from "sonner";

export function toastSuccess(message: string) {
  toast.success(message, {
    style: {
      background: "var(--color-secondary, #006c49)",
      color: "#ffffff",
      border: "1px solid var(--color-secondary, #006c49)",
    },
  });
}

export function toastError(message: string) {
  toast.error(message, {
    style: {
      background: "var(--color-error, #ba1a1a)",
      color: "#ffffff",
      border: "1px solid var(--color-error, #ba1a1a)",
    },
  });
}

export function toastInfo(message: string) {
  toast(message, {
    style: {
      background: "var(--color-primary, #00236f)",
      color: "#ffffff",
      border: "1px solid var(--color-primary, #00236f)",
    },
  });
}

export function toastLoading(message: string): string | number {
  return toast.loading(message);
}

export function toastDismiss(id?: string | number) {
  toast.dismiss(id);
}
