import a from "./admin.module.css";

type Props = {
  id: string;
  label: string;
  help?: React.ReactNode;
  error?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
};

/** Label + control + help/error text, wired up with aria-describedby / aria-invalid. */
export function Field({ id, label, help, error, children }: Props) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={a.field}>
      <label htmlFor={id} className={a.label}>
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {help && (
        <span id={`${id}-help`} className={a.help}>
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={a.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
