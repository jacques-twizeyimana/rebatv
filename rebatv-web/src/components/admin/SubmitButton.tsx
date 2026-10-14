"use client";

import { useFormStatus } from "react-dom";
import a from "./admin.module.css";

type SubmitProps = { children: React.ReactNode; pendingText?: string; className?: string; pending?: boolean };

export function SubmitButton({ children, pendingText = "Saving…", className = a.btn, pending: pendingProp }: SubmitProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmButton({ children, message, className = a.btnDanger }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
