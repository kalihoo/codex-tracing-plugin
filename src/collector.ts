import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { HookEventNameSchema, LocalCaptureEventSchema } from './contracts';
const SessionKeySchema = z.string().regex(/^[a-f0-9]{64}$/);
const MAX_HOOK_PAYLOAD_BYTES = 1024 * 1024;
const HookPayloadSchema = z.object({
  session_id: z.string().min(1).max(512),
  hook_event_name: HookEventNameSchema,
});
const CaptureStateSchema = z.strictObject({
  schemaVersion: z.literal(1), sessionKey: SessionKeySchema,
  enabled: z.boolean(), updatedAt: z.iso.datetime(),
});
const StoredEventSchema = z.strictObject({
  schemaVersion: z.literal(1), id: z.uuid(), sessionKey: SessionKeySchema,
  hookEventName: HookEventNameSchema, occurredAt: z.iso.datetime(),
});
export const LocalCaptureSnapshotSchema = z.strictObject({
  collectionEnabled: z.boolean(), events: z.array(LocalCaptureEventSchema).max(10_000),
});
export type LocalCaptureSnapshot = z.infer<typeof LocalCaptureSnapshotSchema>;
export type LocalCaptureEvent = z.infer<typeof LocalCaptureEventSchema>;

export function sessionKeyFor(sessionId: string): string {
  return createHash('sha256').update(sessionId, 'utf8').digest('hex');
}

/** Stores only event names and observation times, never hook content or raw session IDs. */
export class LocalEventStore {
  constructor(private readonly dataRoot: string) {}

  async setEnabled(sessionId: string, enabled: boolean): Promise<void> {
    const sessionKey = sessionKeyFor(sessionId);
    const sessionPath = this.sessionPath(sessionKey);
    await mkdir(sessionPath, { recursive: true, mode: 0o700 });
    const state = CaptureStateSchema.parse({
      schemaVersion: 1, sessionKey, enabled, updatedAt: new Date().toISOString(),
    });
    await this.writeAtomically(join(sessionPath, 'capture.json'), state);
  }

  async captureHookEvent(input: unknown): Promise<boolean> {
    const parsed = HookPayloadSchema.safeParse(input);
    if (!parsed.success) return false;
    const sessionKey = sessionKeyFor(parsed.data.session_id);
    const sessionPath = this.sessionPath(sessionKey);
    let state: z.infer<typeof CaptureStateSchema>;
    try { state = CaptureStateSchema.parse(JSON.parse(await readFile(join(sessionPath, 'capture.json'), 'utf8'))); }
    catch { return false; }
    if (!state.enabled || state.sessionKey !== sessionKey) return false;

    const event = StoredEventSchema.parse({
      schemaVersion: 1, id: randomUUID(), sessionKey,
      hookEventName: parsed.data.hook_event_name, occurredAt: new Date().toISOString(),
    });
    const eventsPath = join(sessionPath, 'events');
    await mkdir(eventsPath, { recursive: true, mode: 0o700 });
    const orderPrefix = Date.now().toString().padStart(16, '0');
    await this.writeAtomically(join(eventsPath, `${orderPrefix}-${event.id}.json`), event);
    return true;
  }

  async read(sessionId: string): Promise<LocalCaptureSnapshot> {
    const sessionKey = sessionKeyFor(sessionId);
    const sessionPath = this.sessionPath(sessionKey);
    let enabled = false;
    try {
      const state = CaptureStateSchema.parse(JSON.parse(await readFile(join(sessionPath, 'capture.json'), 'utf8')));
      enabled = state.sessionKey === sessionKey && state.enabled;
    } catch { /* Missing or malformed state remains disabled. */ }

    let files: string[];
    try { files = await readdir(join(sessionPath, 'events')); }
    catch { files = []; }
    const orderedFiles = files.filter((file) => /^\d{16}-[\da-f-]{36}\.json$/.test(file)).sort().slice(-10_000);
    const events: LocalCaptureEvent[] = [];
    for (const file of orderedFiles) {
      if (!file.endsWith('.json')) continue;
      try {
        const stored = StoredEventSchema.parse(JSON.parse(await readFile(join(sessionPath, 'events', file), 'utf8')));
        if (stored.sessionKey !== sessionKey) continue;
        events.push(LocalCaptureEventSchema.parse({ id: stored.id, hookEventName: stored.hookEventName, occurredAt: stored.occurredAt }));
      } catch { /* Ignore incomplete and unknown event files; retain other records. */ }
    }
    events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
    return LocalCaptureSnapshotSchema.parse({ collectionEnabled: enabled, events: events.slice(-10_000) });
  }

  private sessionPath(sessionKey: string): string {
    return join(this.dataRoot, 'sessions', sessionKey);
  }

  private async writeAtomically(path: string, value: unknown): Promise<void> {
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await rename(temporary, path);
    } finally { await unlink(temporary).catch(() => undefined); }
  }
}

export async function collectHookEventFromStdin(dataRoot: string | undefined, stdin: AsyncIterable<Uint8Array | string>): Promise<boolean> {
  if (!dataRoot) return false;
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  try {
    for await (const chunk of stdin) {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      bytesRead += buffer.byteLength;
      if (bytesRead > MAX_HOOK_PAYLOAD_BYTES) return false;
      chunks.push(buffer);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return await new LocalEventStore(dataRoot).captureHookEvent(input);
  } catch { return false; }
}
