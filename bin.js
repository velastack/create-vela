#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Asks vela's manifest where its bin lives rather than hardcoding the path, so
 * the shim follows the CLI if its entry point ever moves.
 */
function findVelaBin() {
	const manifestPath = require.resolve('vela/package.json');
	const { bin } = require('vela/package.json');
	const entry = typeof bin === 'string' ? bin : bin?.vela;
	if (!entry) throw new Error('the installed vela does not declare a `vela` bin');
	return path.resolve(path.dirname(manifestPath), entry);
}

let velaBin;
try {
	velaBin = findVelaBin();
} catch (e) {
	console.error(`create-vela could not load the vela CLI: ${e.message}`);
	process.exit(1);
}

// `npm create vela my-app --template static` runs this bin with the user's
// arguments alone, so the subcommand is spliced in and vela's own CLI parses the
// rest. Loading its bin in-process rather than spawning keeps `npm create vela`
// as quick as `vela create`, and lets prompts, colors, and the exit code pass
// straight through.
process.argv.splice(2, 0, 'create');
await import(pathToFileURL(velaBin).href);
