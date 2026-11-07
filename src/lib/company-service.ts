import { z } from "zod";

export const SERVICE_NOTICES = {
  maintenance: {
    label: "Mantenimiento",
    title: "Estamos mejorando tu experiencia",
    message: "Estamos realizando algunas mejoras. Estaremos disponibles de nuevo en breve. Gracias por tu paciencia.",
  },
  payment: {
    label: "Pago pendiente",
    title: "Tu servicio está en pausa",
    message: "Tu servicio está en pausa por un pago pendiente. Para reactivarlo, ponte al día o comunícate con nuestro equipo. Estamos para ayudarte.",
  },
  custom: {
    label: "Aviso personalizado",
    title: "Servicio temporalmente en pausa",
    message: "Tu servicio está temporalmente en pausa. Comunícate con nuestro equipo si necesitas ayuda. Gracias por tu comprensión.",
  },
} as const;

export type SuspensionReason = keyof typeof SERVICE_NOTICES;

export const serviceChangeSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(true) }).strict(),
  z.object({
    enabled: z.literal(false),
    reason: z.enum(["maintenance", "payment", "custom"]),
    message: z.string().trim().min(1, "Escribe el aviso para la empresa").max(500).optional(),
  }).strict(),
]);
