/**
 * Container runtime abstraction for NanoClaw.
 * All runtime-specific logic lives here so swapping runtimes means changing one file.
 */
import { execSync } from 'child_process';

import { logger } from './logger.js';

/** The container runtime binary name. */
export const CONTAINER_RUNTIME_BIN = 'docker';

const MAX_ERROR_SNIPPET = 500;

type RuntimeErrorDetails = {
  message: string;
  stderr: string;
  code: string | undefined;
};

/** Returns CLI args for a readonly bind mount. */
export function readonlyMountArgs(hostPath: string, containerPath: string): string[] {
  return ['-v', `${hostPath}:${containerPath}:ro`];
}

/** Returns the shell command to stop a container by name. */
export function stopContainer(name: string): string {
  return `${CONTAINER_RUNTIME_BIN} stop ${name}`;
}

function truncateSnippet(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_ERROR_SNIPPET) return trimmed;
  return `${trimmed.slice(0, MAX_ERROR_SNIPPET)}...`;
}

function getRuntimeErrorDetails(err: unknown): RuntimeErrorDetails {
  if (err instanceof Error) {
    const runtimeErr = err as Error & {
      stderr?: string | Buffer;
      output?: unknown[];
      code?: string | number;
      status?: number;
    };

    let stderr = '';
    if (typeof runtimeErr.stderr === 'string') {
      stderr = runtimeErr.stderr;
    } else if (runtimeErr.stderr instanceof Buffer) {
      stderr = runtimeErr.stderr.toString('utf-8');
    } else if (Array.isArray(runtimeErr.output)) {
      const possibleStderr = runtimeErr.output[2];
      if (typeof possibleStderr === 'string') {
        stderr = possibleStderr;
      } else if (possibleStderr instanceof Buffer) {
        stderr = possibleStderr.toString('utf-8');
      }
    }

    const code =
      typeof runtimeErr.code === 'string'
        ? runtimeErr.code
        : typeof runtimeErr.code === 'number'
          ? String(runtimeErr.code)
          : typeof runtimeErr.status === 'number'
            ? String(runtimeErr.status)
            : undefined;

    return {
      message: runtimeErr.message,
      stderr: truncateSnippet(stderr),
      code,
    };
  }

  return {
    message: String(err),
    stderr: '',
    code: undefined,
  };
}

function runtimePermissionHint(details: RuntimeErrorDetails): string | null {
  const combined = `${details.message}\n${details.stderr}`.toLowerCase();
  if (combined.includes('docker.sock') && combined.includes('permission denied')) {
    return 'Docker is running, but this user cannot access /var/run/docker.sock (group/permission issue).';
  }
  return null;
}

/** Ensure the container runtime is running, starting it if needed. */
export function ensureContainerRuntimeRunning(): void {
  try {
    execSync(`${CONTAINER_RUNTIME_BIN} info`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 10000,
    });
    logger.debug('Container runtime already running');
  } catch (err) {
    const details = getRuntimeErrorDetails(err);
    const permissionHint = runtimePermissionHint(details);

    logger.error(
      {
        runtime: CONTAINER_RUNTIME_BIN,
        code: details.code,
        message: details.message,
        stderr: details.stderr,
      },
      'Failed to reach container runtime',
    );

    console.error(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    console.error(
      '║  FATAL: Container runtime failed to start                      ║',
    );
    console.error(
      '║                                                                ║',
    );
    console.error(
      '║  Agents cannot run without a container runtime. To fix:        ║',
    );
    console.error(
      '║  1. Ensure Docker is installed and running                     ║',
    );
    console.error(
      '║  2. Run: docker info                                           ║',
    );
    if (permissionHint) {
      console.error(
        '║  3. Fix Docker socket permissions for this user                ║',
      );
    } else {
      console.error(
        '║  3. Restart NanoClaw                                           ║',
      );
    }
    console.error(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );

    if (permissionHint) {
      console.error(`Hint: ${permissionHint}`);
    }

    throw new Error('Container runtime is required but failed to start');
  }
}

/** Kill orphaned NanoClaw containers from previous runs. */
export function cleanupOrphans(): void {
  try {
    const output = execSync(
      `${CONTAINER_RUNTIME_BIN} ps --filter name=nanoclaw- --format '{{.Names}}'`,
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' },
    );
    const orphans = output.trim().split('\n').filter(Boolean);
    for (const name of orphans) {
      try {
        execSync(stopContainer(name), { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch {
        /* already stopped */
      }
    }
    if (orphans.length > 0) {
      logger.info({ count: orphans.length, names: orphans }, 'Stopped orphaned containers');
    }
  } catch (err) {
    logger.warn({ err: getRuntimeErrorDetails(err) }, 'Failed to clean up orphaned containers');
  }
}
