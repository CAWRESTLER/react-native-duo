export interface NativePayloadEvent {
  payload: string;
}

export function parseNativePayload<T>(payload: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}
