export const QUEUES = {
  roadmap: "roadmap-generation",
  reminders: "revision-reminders",
} as const;

export interface RoadmapJob {
  roadmapId: string;
}
