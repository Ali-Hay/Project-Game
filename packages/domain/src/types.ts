export type EntityId = string;
export type ParticipantRole = "gm" | "player" | "observer" | "agent";
export type ServiceHealth = "healthy" | "degraded" | "offline";
export type TokenKind = "pc" | "npc" | "creature";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AIIntentType =
  | "suggestion.publish"
  | "recap.publish"
  | "surface.banner"
  | "canon.change"
  | "npc.attitude.change"
  | "world.tick.apply";

export interface Campaign {
  id: EntityId;
  name: string;
  summary: string;
  sessionId: EntityId;
}

export interface Scene {
  id: EntityId;
  name: string;
  mapId: EntityId;
  activeLayerIds: EntityId[];
  description: string;
}

export interface MapLayer {
  id: EntityId;
  name: string;
  kind: "terrain" | "fog" | "lighting" | "markup";
}

export interface MapAsset {
  id: EntityId;
  name: string;
  gridSize: number;
  layers: MapLayer[];
}

export interface CharacterSheet {
  level: number;
  className: string;
  ancestry: string;
  armorClass: number;
  hitPoints: {
    current: number;
    max: number;
  };
  spellSlots: Record<string, number>;
  inventory: string[];
}

export interface Actor {
  id: EntityId;
  name: string;
  role: ParticipantRole;
  kind: TokenKind;
  sheet?: CharacterSheet;
}

export interface Token {
  id: EntityId;
  actorId: EntityId;
  label: string;
  x: number;
  y: number;
  initiative?: number;
  inEncounter: boolean;
}

export interface Encounter {
  id: EntityId;
  round: number;
  turnIndex: number;
  initiativeOrder: EntityId[];
}

export interface TranscriptTurn {
  id: EntityId;
  speaker: string;
  speakerRole: ParticipantRole;
  text: string;
  occurredAt: string;
}

export interface MemoryFact {
  id: EntityId;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  sourceEventId: EntityId;
}

export interface WorldClock {
  tick: number;
  phase: "session" | "downtime";
  currentDay: number;
}

export interface Faction {
  id: EntityId;
  name: string;
  pressure: number;
}

export interface Front {
  id: EntityId;
  name: string;
  progress: number;
  stakes: string;
}

export interface DowntimeAction {
  id: EntityId;
  actorId: EntityId;
  type: "craft" | "research" | "shop" | "rest" | "side-scene";
  description: string;
  status: "queued" | "resolved";
}

export interface WorldEvent {
  id: EntityId;
  title: string;
  summary: string;
  createdAt: string;
}

export interface InboxMessage {
  id: EntityId;
  title: string;
  body: string;
  createdAt: string;
}

export interface AIIntent {
  id: EntityId;
  type: AIIntentType;
  title: string;
  detail: string;
  suggestedBy: "copilot" | "world-tick" | "autonomous-dm";
}

export interface CanonChangeProposal {
  id: EntityId;
  title: string;
  detail: string;
  sourceIntentId: EntityId;
  requestedAt: string;
}

export interface ApprovalGate {
  id: EntityId;
  type: "canon-change" | "ai-intent";
  title: string;
  detail: string;
  status: ApprovalStatus;
  linkedId: EntityId;
  requestedAt: string;
}

export interface CopilotContextPack {
  recap: string;
  recentEvents: string[];
  memoryFacts: MemoryFact[];
  graph: Record<string, string[]>;
  budgets: MemoryBudget;
}

export interface MemoryBudget {
  recencyEvents: number;
  factLimit: number;
  summaryCharacters: number;
}

export interface CampaignMemoryArtifacts {
  facts: MemoryFact[];
  graph: Record<string, string[]>;
  summary: string;
}

export interface SessionDiagnostics {
  voice: ServiceHealth;
  transcript: ServiceHealth;
  ai: ServiceHealth;
  memory: ServiceHealth;
}

export interface Participant {
  actorId: EntityId;
  role: ParticipantRole;
  connectedAt: string;
}

export interface SessionRoomState {
  roomId: EntityId;
  campaign: Campaign;
  scene: Scene;
  map: MapAsset;
  actors: Record<EntityId, Actor>;
  tokens: Record<EntityId, Token>;
  participants: Record<EntityId, Participant>;
  transcript: TranscriptTurn[];
  memoryFacts: MemoryFact[];
  worldClock: WorldClock;
  factions: Faction[];
  fronts: Front[];
  inbox: InboxMessage[];
  approvals: ApprovalGate[];
  encounter: Encounter | null;
  lastRecap: string;
  diagnostics: SessionDiagnostics;
  processedCommandIds: string[];
}

export interface CampaignSummary {
  roomId: EntityId;
  campaign: Campaign;
  activeScene: Scene;
  diagnostics: SessionDiagnostics;
}
