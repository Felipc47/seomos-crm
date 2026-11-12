import { spawn } from "node:child_process";
const base = "http://127.0.0.1:3113";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3113", "--hostname", "127.0.0.1"], {
  stdio: "inherit", env: { ...process.env,
    APP_BASE_URL: base, DATABASE_URL: "postgresql://postgres@127.0.0.1:5433/seomos_sheets_043",
    BETTER_AUTH_SECRET: "sheets043-local-fictitious-secret-32", ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    META_WEBHOOK_VERIFY_TOKEN: "sheets043-verify", META_APP_SECRET: "",
    WA_MOCK_ENABLED: "true", META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "test-model",
    GOOGLE_CLIENT_ID: "test-google", GOOGLE_CLIENT_SECRET: "test-secret", GOOGLE_OAUTH_BASE_URL: `${base}/api/dev/google-mock`, GOOGLE_API_BASE_URL: `${base}/api/dev/google-mock`,
    RESEND_API_KEY: "test-resend", RESEND_FROM_EMAIL: "notify@example.test", RESEND_BASE_URL: `${base}/api/dev/resend-mock`, RESEND_WEBHOOK_SECRET: "",
    AGENT_SWEEP_SECRET: "sheets043-sweep", AGENT_COALESCE_MS: "100",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 0; });
