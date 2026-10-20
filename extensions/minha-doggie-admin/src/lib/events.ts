/** Leitura segura do valor de um campo Polaris a partir do evento. */
export function readValue(event: Event): string {
  const target = event.currentTarget as {value?: unknown} | null;
  return typeof target?.value === 'string' ? target.value : '';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'erro desconhecido';
}
