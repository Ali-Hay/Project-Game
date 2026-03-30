import type { LedgerEvent } from "@project-game/domain";

export interface OutboxJob {
  roomId: string;
  sourceEvents: LedgerEvent[];
}

type Handler = (job: OutboxJob) => Promise<void>;

export class OutboxService {
  private readonly queue: OutboxJob[] = [];
  private draining = false;

  constructor(private readonly handler: Handler) {}

  enqueue(job: OutboxJob) {
    this.queue.push(job);
    void this.drain();
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) continue;
      await this.handler(next);
    }

    this.draining = false;
  }
}
