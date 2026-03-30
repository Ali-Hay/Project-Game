import type { LedgerEvent } from "@project-game/domain";

export interface OutboxJob {
  roomId: string;
  sourceEvents: LedgerEvent[];
}

type Handler = (job: OutboxJob) => Promise<void>;
type ErrorHandler = (error: unknown, job: OutboxJob) => void;

export class OutboxService {
  private readonly queue: OutboxJob[] = [];
  private draining = false;

  constructor(
    private readonly handler: Handler,
    private readonly onError: ErrorHandler = (error, job) => {
      console.error(`Outbox job failed for room ${job.roomId}`, error);
    }
  ) {}

  enqueue(job: OutboxJob) {
    this.queue.push(job);
    void this.drain();
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;

    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (!next) continue;

        try {
          await this.handler(next);
        } catch (error) {
          this.onError(error, next);
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
