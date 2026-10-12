import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Entorno de revisión exclusivamente local. Todas las credenciales son ficticias.
// La BD seomos_visual_030 debe existir y tener las migraciones del repositorio.
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const port = process.env.QA_PORT ?? '3100';
if (!['3100', '3101'].includes(port)) throw new Error('Use the isolated local QA ports 3100/3101 only');
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', port, '--hostname', '127.0.0.1'], {
  cwd, stdio: 'inherit', env: {
    ...process.env,
    APP_BASE_URL: base,
    DATABASE_URL: 'postgresql://postgres@127.0.0.1:5433/seomos_visual_030',
    BETTER_AUTH_SECRET: 'visual030-local-test-secret-only',
    ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    META_WEBHOOK_VERIFY_TOKEN: 'visual030-verify-token', META_APP_SECRET: '',
    WA_MOCK_ENABLED: 'true', META_GRAPH_BASE_URL: `${base}/api/dev/wa-mock/graph`,
    OPENROUTER_BASE_URL: `${base}/api/dev/ai-mock`, OPENROUTER_API_TOKEN: 'test-token',
    OPENROUTER_MODEL: 'test-model', OPENROUTER_TRANSCRIBE_MODEL: 'test-model', OPENROUTER_VISION_MODEL: 'test-model',
    GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_OAUTH_BASE_URL: `${base}/api/dev/google-mock`, GOOGLE_API_BASE_URL: `${base}/api/dev/google-mock`,
    RESEND_API_KEY: 're_test', RESEND_FROM_EMAIL: 'notificaciones@example.test',
    RESEND_FROM_NAME: 'SEOMOS Local', RESEND_BASE_URL: `${base}/api/dev/resend-mock`,
    RESEND_WEBHOOK_SECRET: 'whsec_dGVzdC1tYWlsaW5nLXNpZ25pbmcta2V5LTAyOA==',
    AGENT_SWEEP_SECRET: 'visual030-test-sweep',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => { process.exitCode = code ?? 0; });
