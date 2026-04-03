import { Session } from './types';

const TTL_SECONDS = parseInt(process.env.TTL_SECONDS || '3600', 10);
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '200', 10);

interface StorageEntry {
  data: Session;
  expiresAt: number;
}

export class SessionStorage {
  private store = new Map<string, StorageEntry>();

  get(id: string): Session | undefined {
    const entry = this.store.get(id);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(id);
      return undefined;
    }
    return entry.data;
  }

  set(id: string, session: Session): void {
    const expiresAt = Date.now() + TTL_SECONDS * 1000;
    this.store.set(id, { data: session, expiresAt });
    this.evictOldest();
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  size(): number {
    return this.store.size;
  }

  prune(): void {
    const now = Date.now();
    for (const [id, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(id);
      }
    }
  }

  evictOldest(): void {
    if (this.store.size <= MAX_SESSIONS) return;
    const overflow = this.store.size - MAX_SESSIONS;
    let removed = 0;
    for (const key of this.store.keys()) {
      this.store.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
}
