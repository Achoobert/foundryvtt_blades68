import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config, CONTAINER_NAME } from './lib/fvtt-config.mjs';

const execFileAsync = promisify(execFile);
const CONTAINER_DIR = config.containerDir;
const SERVICE = CONTAINER_NAME;


try {
  const { stdout } = await execFileAsync('docker', [
    'compose', 'ps', '-q', SERVICE,
  ], { cwd: CONTAINER_DIR });
  if (!stdout.trim()) {
    console.log(`Foundry container (${SERVICE}) not running, skipping restart.`);
    process.exit(0);
  }
  console.log(`Restarting Foundry container (${SERVICE}) to pick up rebuilt packs...`);
  
  
  await execFileAsync('docker', ['compose', 'restart', '-t', '30', SERVICE], { cwd: CONTAINER_DIR });
  console.log('Foundry container restarted.');
} catch (err) {
  console.warn(`Could not restart Foundry container: ${err.message}`);
}
