import { spawn } from "node:child_process";
const base = "http://127.0.0.1:3110";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3110", "--hostname", "127.0.0.1"], {
  stdio: "inherit", env: { ...process.env,
    APP_BASE_URL: base, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5433/seomos_sms_034",
    BETTER_AUTH_SECRET: "sms034-local-fictitious-secret-long-for-tests", ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    META_WEBHOOK_VERIFY_TOKEN: "sms034-verify-token", META_APP_SECRET: "",
    WA_MOCK_ENABLED: "true", META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: "test-token", OPENROUTER_MODEL: "gpt-6-luna", OPENROUTER_REASONING_EFFORT: "xhigh", OPENROUTER_JUDGE_MODEL: "gpt-5.6-luna", OPENROUTER_VISION_MODEL: "",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", AGENT_COALESCE_MS: "100",
    RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_WEBHOOK_SECRET: "",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 0; });
