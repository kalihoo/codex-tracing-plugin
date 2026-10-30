import { SessionLensSnapshotSchema, type SessionLensSnapshot } from '../demo';

type ToolArguments = Record<string, unknown>;

export class DemoController {
  current: SessionLensSnapshot | null = null;
  constructor(private readonly callTool: (name: string, args: ToolArguments) => Promise<unknown>) {}

  receive(result: unknown): void {
    if (typeof result !== 'object' || result === null || !('structuredContent' in result)) throw new Error('Missing fixture snapshot');
    const next = SessionLensSnapshotSchema.parse(result.structuredContent);
    if (this.current?.mode === 'synthetic-fixture' && next.mode === 'synthetic-fixture'
      && next.sessionId !== this.current.sessionId) throw new Error('Fixture session mismatch');
    // Ignore an older response if it races a more recent revision.
    if (this.current?.mode === 'synthetic-fixture' && next.mode === 'synthetic-fixture'
      && next.revision < this.current.revision) return;
    this.current = next;
  }

  async refresh(): Promise<void> {
    if (this.current?.mode === 'synthetic-fixture') return this.request('read_demo', { sessionId: this.current.sessionId });
    if (this.current?.mode === 'host-bound') return this.request('read_session', {});
    throw new Error('No bound session is open');
  }
  async advance(): Promise<void> {
    if (this.current?.mode !== 'synthetic-fixture') throw new Error('No fixture session is open');
    await this.request('advance_demo', { sessionId: this.current.sessionId });
  }

  async setCollection(enabled: boolean): Promise<void> {
    if (this.current?.mode !== 'host-bound') throw new Error('No host-bound Codex session is open');
    if (!this.current.captureAvailable) throw new Error('Local capture storage is unavailable');
    await this.request('set_collection', { enabled });
  }

  private async request(name: string, args: ToolArguments): Promise<void> {
    this.receive(await this.callTool(name, args));
  }
}
