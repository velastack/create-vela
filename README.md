# create-vela

A thin wrapper around [`vela create`](https://www.npmjs.com/package/vela), so a
new VelaStack project can be scaffolded without installing anything first.

```sh
npm create vela my-app
```

Equivalent to `npx vela create my-app`. Every flag `vela create` takes works
here — note that npm needs `--` before them:

```sh
npm create vela my-app -- --template static
```

Other package managers follow the same convention:

```sh
pnpm create vela my-app
yarn create vela my-app
bun create vela my-app
```

Everything past the scaffolding step lives in the `vela` CLI itself; see
[velastack/vela](https://github.com/velastack/vela#readme) for the rest.

## How it works

`bin.js` splices `create` into `process.argv` and loads the `vela` bin
in-process, so prompts, colors, and the exit code pass straight through without
the cost of a second Node process. It finds that bin by reading the path `vela`
declares in its own manifest, rather than hardcoding one.

It always runs the newest `vela`. npx caches `create-vela` by its own version
and never re-resolves its dependencies, so the `vela` installed beside it is
whatever was newest the first time `npm create vela` ran on that machine. Before
loading it, `bin.js` asks the registry for `vela`'s `latest` (honouring
`npm_config_registry`, with a three-second timeout). When that is newer, it runs
`npx vela@<latest> create` instead, through npm's own npx and this Node, and
passes the exit code back. When the registry can't be reached, the installed
`vela` runs. So `create-vela` only needs a release when `bin.js` changes, not
for every `vela` release.

The `vela` dependency is an open range (`>=`), so a first install gets the newest
release and skips the second step. CI smoke-tests a real scaffold down both
paths (`CREATE_VELA_LATEST=1` forces the registry one), and a release is blocked
if the range no longer reaches the current `vela`.
