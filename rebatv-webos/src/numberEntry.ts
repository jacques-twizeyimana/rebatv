/**
 * Direct channel entry with the remote's number keys: digits collect for `delayMs` after the last
 * press (or until `maxDigits`), then the number is committed.
 */
export type NumberEntry = {
  push(digit: number): void;
  cancel(): void;
  /** Digits typed so far ("" when idle). */
  value(): string;
};

export function createNumberEntry(
  onChange: (value: string) => void,
  onCommit: (num: number) => void,
  delayMs = 1500,
  maxDigits = 3,
): NumberEntry {
  let digits = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(timer);
    timer = undefined;
    digits = "";
    onChange("");
  };

  const commit = () => {
    const n = Number(digits);
    reset();
    if (n > 0) onCommit(n);
  };

  return {
    push(digit) {
      clearTimeout(timer);
      digits = (digits + String(digit)).slice(-maxDigits);
      onChange(digits);
      if (digits.length >= maxDigits) commit();
      else timer = setTimeout(commit, delayMs);
    },
    cancel: reset,
    value: () => digits,
  };
}
