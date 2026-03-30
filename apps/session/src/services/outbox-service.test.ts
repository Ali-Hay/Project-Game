import { describe, expect, it, vi } from "vitest";

import { OutboxService } from "./outbox-service";

describe("OutboxService", () => {
  it("continues processing queued jobs after a handler error", async () => {
    const seen: string[] = [];
    const onError = vi.fn();
    const outbox = new OutboxService(
      async (job) => {
        seen.push(job.roomId);
        if (job.roomId === "first") {
          throw new Error("boom");
        }
      },
      onError
    );

    outbox.enqueue({ roomId: "first", sourceEvents: [] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    outbox.enqueue({ roomId: "second", sourceEvents: [] });
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(["first", "second"]);
  });
});
