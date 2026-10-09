import { defineConfig } from '@trigger.dev/sdk';
import { playwright } from '@trigger.dev/build/extensions/playwright';
export default defineConfig({
  project:
    process.env.TRIGGER_PROJECT_ID || 'configure-project-in-trigger-dashboard',
  dirs: ['./trigger'],
  runtime: 'node',
  maxDuration: 120,
  logLevel: 'error',
  build: { extensions: [playwright({ browsers: ['chromium'] })] },
});
