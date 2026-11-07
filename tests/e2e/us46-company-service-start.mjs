import { spawn } from "node:child_process";
const base = process.env.SERVICE_TEST_BASE_URL ?? "http://127.0.0.1:3108";

const dbURL = process.env.SERVICE_TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/seomos_company_service_037";
const testDB = new URL(dbURL);
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname) || !["127.0.0.1", "localhost"].includes(testDB.hostname) || !/^\/seomos_company_service_037(_release)?$/.test(testDB.pathname)) throw new Error("Solo self-test local con base dedicada 037");

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", new URL(base).port, "--hostname", "127.0.0.1"], {
  stdio: "inherit", env: { ...process.env,
    APP_BASE_URL: base, DATABASE_URL: dbURL,
    BETTER_AUTH_SECRET: "service037-local-fictitious-secret-32-characters", ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    META_WEBHOOK_VERIFY_TOKEN: "service037-verify", META_APP_SECRET: "",
    WA_MOCK_ENABLED: "true", META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "test-model",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_WEBHOOK_SECRET: "",
    AGENT_SWEEP_SECRET: "service037-test-sweep", AGENT_COALESCE_MS: "100",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 0; });
