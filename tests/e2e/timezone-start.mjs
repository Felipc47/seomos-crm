import { spawn } from "node:child_process";
const base = "http://127.0.0.1:3109";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3109", "--hostname", "127.0.0.1"], {
  stdio: "inherit", env: { ...process.env,
    APP_BASE_URL: base, DATABASE_URL: "postgresql://postgres@127.0.0.1:5433/seomos_timezone_039",
    BETTER_AUTH_SECRET: "timezone039-local-fictitious-secret-32", ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    META_WEBHOOK_VERIFY_TOKEN: "timezone039-verify-token", META_APP_SECRET: "",
    WA_MOCK_ENABLED: "true", META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "test-model",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_WEBHOOK_SECRET: "",
    AGENT_SWEEP_SECRET: "timezone039-test-sweep", AGENT_COALESCE_MS: "100",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 0; });
