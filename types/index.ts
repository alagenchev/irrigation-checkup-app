export type { Client, NewClient } from '@/lib/schema'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
