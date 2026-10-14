#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Asks vela's manifest where its bin lives rather than hardcoding the path, so
 * the shim follows the CLI if its entry point ever moves.
 */
function findVela() {
	const manifestPath = require.resolve('vela/package.json');
	const { bin, version } = require('vela/package.json');
	const entry = typeof bin === 'string' ? bin : bin?.vela;
	if (!entry) throw new Error('the installed vela does not declare a `vela` bin');
	return { bin: path.resolve(path.dirname(manifestPath), entry), version };
}

/**
 * The version the registry calls `latest`, or undefined when it cannot say
 * within a few seconds: offline, a registry without the package, a proxy in
 * the way. Any of those falls back to the vela installed alongside.
 */
async function latestVela() {
	const registry = (process.env.npm_config_registry || 'https://registry.npmjs.org/').replace(
		/\/?$/,
		'/'
	);
	try {
		const res = await fetch(`${registry}vela/latest`, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return undefined;
		const { version } = await res.json();
		return typeof version === 'string' ? version : undefined;
	} catch {
		return undefined;
	}
}

/** Whether release `a` is newer than `b`, by major.minor.patch. */
function isNewer(a, b) {
	const parse = (v) => (/^(\d+)\.(\d+)\.(\d+)/.exec(v) ?? []).slice(1).map(Number);
	const [x, y] = [parse(a), parse(b)];
	for (let i = 0; i < 3; i++) {
		if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
	}
	return false;
}

/**
 * npm's own npx, run with this Node so no shell is involved on any platform;
 * plain `npx` from PATH when Node was installed without npm beside it.
 */
function npxCommand() {
	const dir = path.dirname(process.execPath);
	for (const cli of [
		path.join(dir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
		path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js')
	]) {
		if (fs.existsSync(cli)) return { command: process.execPath, prefix: [cli] };
	}
	return process.platform === 'win32' ? undefined : { command: 'npx', prefix: [] };
}

let vela;
try {
	vela = findVela();
} catch (e) {
	console.error(`create-vela could not load the vela CLI: ${e.message}`);
	process.exit(1);
}

// npx caches create-vela by its own version and never looks at its
// dependencies again, so the vela installed beside it is whatever was newest
// the first time `npm create vela` ran on this machine. A newer release on the
// registry runs instead, at that exact version, so a project is never
// scaffolded from stale templates. CREATE_VELA_LATEST=1 takes this path even
// when the installed vela is current (the smoke test uses it).
const latest = await latestVela();
const forced = process.env.CREATE_VELA_LATEST === '1';
const npx = latest && (forced || isNewer(latest, vela.version)) ? npxCommand() : undefined;
if (npx) {
	const result = spawnSync(
		npx.command,
		[...npx.prefix, '--yes', `vela@${latest}`, 'create', ...process.argv.slice(2)],
		{ stdio: 'inherit' }
	);
	if (result.error) {
		console.error(`create-vela could not run vela@${latest}: ${result.error.message}`);
		process.exit(1);
	}
	if (result.signal) process.kill(process.pid, result.signal);
	process.exit(result.status ?? 1);
}

// `npm create vela my-app --template static` runs this bin with the user's
// arguments alone, so the subcommand is spliced in and vela's own CLI parses the
// rest. Loading its bin in-process rather than spawning keeps `npm create vela`
// as quick as `vela create`, and lets prompts, colors, and the exit code pass
// straight through.
process.argv.splice(2, 0, 'create');
await import(pathToFileURL(vela.bin).href);
