import { spawn } from "node:child_process";
const base = "http://127.0.0.1:3108";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3108", "--hostname", "127.0.0.1"], {
  stdio: "inherit", env: { ...process.env,
    APP_BASE_URL: base, DATABASE_URL: "postgresql://postgres@127.0.0.1:5433/seomos_scheduling_context_040",
    BETTER_AUTH_SECRET: "context040-local-fictitious-secret", ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    META_WEBHOOK_VERIFY_TOKEN: "context040-verify-token", META_APP_SECRET: "",
    WA_MOCK_ENABLED: "true", META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "test-model",
    GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_OAUTH_BASE_URL: `${base}/api/dev/google-mock`, GOOGLE_API_BASE_URL: `${base}/api/dev/google-mock`,
    AGENT_SWEEP_SECRET: "context040-test-sweep", AGENT_COALESCE_MS: "100",
    RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_WEBHOOK_SECRET: "",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 0; });
