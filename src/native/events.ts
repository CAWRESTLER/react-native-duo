export interface NativePayloadEvent {
  payload: string;
}

export function parseNativePayload<T>(payload: string, fallback: T): T {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return fallback;
  }
}
