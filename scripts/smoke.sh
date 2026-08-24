#!/usr/bin/env bash
# Packs the shim, installs it the way `npm create vela` would, and scaffolds a
# real project. This is the only meaningful test the package has: everything it
# does is delegation, so the thing worth checking is that delegation still lands.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "→ packing"
tarball=$(cd "$root" && npm pack --pack-destination "$work" --silent | tail -1)

echo "→ installing (pulls vela from the registry)"
cd "$work"
npm init -y >/dev/null
npm install "$work/$tarball" --no-audit --no-fund --silent

echo "→ forwarding --help to vela"
./node_modules/.bin/create-vela --help | grep -q 'vela create' \
	|| { echo "✗ --help did not reach vela create"; exit 1; }

echo "→ forwarding a bad flag"
if ./node_modules/.bin/create-vela x --template nope >/dev/null 2>&1; then
	echo "✗ invalid --template should exit non-zero"
	exit 1
fi

echo "→ scaffolding"
./node_modules/.bin/create-vela smoke-app --template static --no-install --name 'Smoke App' >/dev/null
grep -q "name: 'Smoke App'" smoke-app/src/lib/site.ts \
	|| { echo "✗ --name did not reach the template"; exit 1; }

echo "✓ smoke test passed"
