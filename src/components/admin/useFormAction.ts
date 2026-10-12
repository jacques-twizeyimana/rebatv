"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/lib/validation";

/**
 * Like useActionState, but submits via onSubmit so React doesn't run its automatic
 * post-action form.reset(), which wipes <select> values when validation fails.
 */
export function useFormAction(action: (prev: FormState, fd: FormData) => Promise<FormState>, initial: FormState) {
  const [state, dispatch, actionPending] = useActionState(action, initial);
  const [transitionPending, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending: actionPending || transitionPending };
}
