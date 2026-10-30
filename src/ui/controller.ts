import { SessionLensSnapshotSchema, type SessionLensSnapshot } from '../demo';

export class DemoController {
  current: SessionLensSnapshot | null = null;
  constructor(private readonly callTool: (name: string, sessionId: string) => Promise<unknown>) {}

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
    if (this.current?.mode !== 'synthetic-fixture') throw new Error('No fixture session is open');
    await this.request('read_demo');
  }
  async advance(): Promise<void> {
    if (this.current?.mode !== 'synthetic-fixture') throw new Error('No fixture session is open');
    await this.request('advance_demo');
  }

  private async request(name: string): Promise<void> {
    if (!this.current) throw new Error('Open an explicit fixture session first');
    if (this.current?.mode !== 'synthetic-fixture') throw new Error('No fixture session is open');
    this.receive(await this.callTool(name, this.current.sessionId));
  }
}
