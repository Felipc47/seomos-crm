import { z } from "zod";
import { agentProfileDraftSchema } from "@/lib/agent-profile-input";

export const MAX_DEMO_TURNS = 12;
export const demoRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4096),
  }).strict()).max((MAX_DEMO_TURNS - 1) * 2)
    .refine((messages) => messages.filter((message) => message.role === "user").length < MAX_DEMO_TURNS, "Reinicia el demo antes de continuar")
    .optional(),
  configuration: agentProfileDraftSchema.optional(),
}).strict();
export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type DemoReply = {
  message: string | null;
  actionLabel: string | null;
  ended: boolean;
};
