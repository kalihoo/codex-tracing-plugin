import { DemoSnapshotSchema, type DemoSnapshot } from '../demo';

export class DemoController {
  current: DemoSnapshot | null = null;
  constructor(private readonly callTool: (name: string, sessionId: string) => Promise<unknown>) {}

  receive(result: unknown): void {
    if (typeof result !== 'object' || result === null || !('structuredContent' in result)) throw new Error('Missing fixture snapshot');
    const next = DemoSnapshotSchema.parse(result.structuredContent);
    if (this.current && next.sessionId !== this.current.sessionId) throw new Error('Fixture session mismatch');
    // Ignore an older response if it races a more recent revision.
    if (this.current && next.revision < this.current.revision) return;
    this.current = next;
  }

  async refresh(): Promise<void> { await this.request('read_demo'); }
  async advance(): Promise<void> { await this.request('advance_demo'); }

  private async request(name: string): Promise<void> {
    if (!this.current) throw new Error('Open an explicit fixture session first');
    this.receive(await this.callTool(name, this.current.sessionId));
  }
}
