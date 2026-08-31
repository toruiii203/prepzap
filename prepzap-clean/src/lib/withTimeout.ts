// src/lib/withTimeout.ts
//
// supabase-js attaches the auth token to every request by internally awaiting
// `auth.getSession()`. If that call ever stalls (a slow/hanging token refresh,
// a backgrounded tab, a flaky network right after resume, etc.), the
// underlying fetch never fires — and the query promise you're `await`-ing
// never resolves AND never rejects. There's nothing to catch, so `finally`
// never runs, `setLoading(false)` never fires, and the UI spins forever.
//
// Wrap any Supabase (or other) call that feeds a loading spinner with this so
// a stall surfaces as a normal, catchable error instead of an infinite spinner.
//
// Usage:
//   const { data } = await withTimeout(
//     supabase.from("table").select("*"),
//     8000,
//     "my query"
//   );

export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 8000,
  label = "request"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
