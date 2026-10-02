type CachedValue<T> = { result: T; expiresAt: number };

export function createIdempotencyGate<T>(
  isSuccessful: (result: T) => boolean,
  ttlMs = 10 * 60 * 1000,
) {
  const completed = new Map<string, CachedValue<T>>();
  const pending = new Map<string, Promise<T>>();

  return function runOnce(key: string, operation: () => Promise<T>): Promise<T> {
    const cached = completed.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.result);
    }
    if (cached) completed.delete(key);

    const active = pending.get(key);
    if (active) return active;

    const result = operation()
      .then((value) => {
        if (isSuccessful(value)) {
          completed.set(key, { result: value, expiresAt: Date.now() + ttlMs });
          while (completed.size > 200) {
            const oldest = completed.keys().next().value;
            if (oldest) completed.delete(oldest);
            else break;
          }
        }
        return value;
      })
      .finally(() => pending.delete(key));

    pending.set(key, result);
    return result;
  };
}
