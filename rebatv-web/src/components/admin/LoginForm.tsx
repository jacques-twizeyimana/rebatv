"use client";

import { useActionState } from "react";
import { login } from "@/app/sandberg/actions";
import type { FormState } from "@/lib/validation";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import a from "./admin.module.css";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className={a.stack} noValidate>
      {state.message && (
        <p className={a.alert} role="alert">
          {state.message}
        </p>
      )}
      <Field id="email" label="Email" error={state.errors?.email}>
        {(p) => (
          <input {...p} name="email" type="email" className={a.input} autoComplete="username" required defaultValue={state.values?.email} autoFocus />
        )}
      </Field>
      <Field id="password" label="Password" error={state.errors?.password}>
        {(p) => <input {...p} name="password" type="password" className={a.input} autoComplete="current-password" required />}
      </Field>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
