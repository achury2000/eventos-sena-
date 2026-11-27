export type ActionState =
  | {
      error?: string;
      errors?: Record<string, string>;
      /** Mensaje de éxito (cambio de contraseña propio). */
      ok?: string;
      /** Contraseña temporal generada por un restablecimiento: visible UNA sola vez. */
      temporal?: string;
    }
  | undefined;

export function fieldErrors(issues: { path: (string | number | symbol)[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}