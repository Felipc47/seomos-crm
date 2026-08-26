import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import {
  onUserCreated,
  resolveActiveOrganizationId,
} from "@/server/auth/on-signup";
import { isPublicSignupAllowed } from "@/server/auth/registration";
import { deliverPasswordResetEmail } from "@/server/email/password-reset";
import type { PasswordResetDeliveryResult } from "@/server/email/password-reset";

type InternalPasswordResetState = {
  delivery?: Promise<PasswordResetDeliveryResult>;
};

/**
 * Contexto interno del proceso: permite que el alta de cuentas de equipo
 * (owner → API) atraviese el gate de registro cerrado. No es alcanzable
 * desde fuera: solo envuelve llamadas server-side.
 */
const globalForSignup = globalThis as unknown as {
  __seomosInternalSignup?: AsyncLocalStorage<boolean>;
  __seomosInternalPasswordReset?: AsyncLocalStorage<InternalPasswordResetState>;
};

// En globalThis: los módulos pueden evaluarse más de una vez (una por ruta en
// dev) y todas las copias deben compartir el mismo contexto.
function internalSignupContext(): AsyncLocalStorage<boolean> {
  if (!globalForSignup.__seomosInternalSignup) {
    globalForSignup.__seomosInternalSignup = new AsyncLocalStorage<boolean>();
  }
  return globalForSignup.__seomosInternalSignup;
}

export function runInternalSignup<T>(fn: () => Promise<T>): Promise<T> {
  return internalSignupContext().run(true, fn);
}

function isInternalSignup(): boolean {
  return internalSignupContext().getStore() === true;
}

function internalPasswordResetContext(): AsyncLocalStorage<InternalPasswordResetState> {
  if (!globalForSignup.__seomosInternalPasswordReset) {
    globalForSignup.__seomosInternalPasswordReset =
      new AsyncLocalStorage<InternalPasswordResetState>();
  }
  return globalForSignup.__seomosInternalPasswordReset;
}

export function runInternalPasswordReset<T>(
  fn: () => Promise<T>
): Promise<T> {
  const state: InternalPasswordResetState = {};
  return internalPasswordResetContext().run(state, async () => {
    const result = await fn();
    if (!state.delivery || (await state.delivery).status !== "sent") {
      throw new PasswordResetDeliveryError();
    }
    return result;
  });
}

function isInternalPasswordReset(): boolean {
  return internalPasswordResetContext().getStore() !== undefined;
}

export class PasswordResetDeliveryError extends Error {
  constructor() {
    super("No se pudo entregar el enlace de restablecimiento");
    this.name = "PasswordResetDeliveryError";
  }
}

const RATE_LIMITED_PATHS = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/request-password-reset",
  "/reset-password",
]);

function createAuth() {
  const env = getEnv();
  return betterAuth({
    baseURL: env.APP_BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }) => {
        const delivery = deliverPasswordResetEmail({
          to: user.email,
          userName: user.name,
          url,
          token,
        });
        const state = internalPasswordResetContext().getStore();
        if (state) {
          state.delivery = delivery;
        }
        await delivery;
      },
    },
    plugins: [organization({ creatorRole: "owner" })],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Rate limit por IP en login/registro (FR-062): 10 / 10 min → 429.
        if (
          RATE_LIMITED_PATHS.has(ctx.path) &&
          !isInternalPasswordReset()
        ) {
          const ip =
            ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            ctx.headers?.get("x-real-ip") ||
            "local";
          const result = checkRateLimit(`${ctx.path}:${ip}`, AUTH_RATE_LIMIT);
          if (!result.allowed) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Demasiados intentos; espera unos minutos",
            });
          }
        }
        // Registro público cerrado tras la primera organización (FR-060).
        if (ctx.path === "/sign-up/email") {
          if (!isInternalSignup() && !(await isPublicSignupAllowed())) {
            throw new APIError("FORBIDDEN", {
              message:
                "El registro está cerrado: esta instancia ya tiene su organización",
            });
          }
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await onUserCreated(user.id, user.name);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const organizationId = await resolveActiveOrganizationId(
              session.userId
            );
            return {
              data: { ...session, activeOrganizationId: organizationId },
            };
          },
        },
      },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __seomosAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.__seomosAuth) globalForAuth.__seomosAuth = createAuth();
  return globalForAuth.__seomosAuth;
}
