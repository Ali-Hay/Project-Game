import type { RoomStore } from "../state/room-store";

export class WorldTickWorker {
  constructor(private readonly roomStore: RoomStore) {}

  tick(campaignId: string) {
    return this.roomStore.advanceWorldTick(campaignId);
  }
}
