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

The `vela` dependency range is what `npm create vela` actually installs. CI
smoke-tests a real scaffold against it, and a release is blocked if the range no
longer reaches the current `vela` — otherwise new projects would quietly be
built from stale templates.
