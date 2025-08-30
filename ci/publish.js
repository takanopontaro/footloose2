import { execSync } from "node:child_process";
import * as fs from "node:fs";

const baseManifest = JSON.parse(
  fs.readFileSync("server/package.json", "utf-8")
);

fs.readdirSync("dist").forEach((name) => {
  const cwd = `dist/${name}`;
  const [os, arch] = name.split("-");

  const manifest = {
    name: `@footloose2/server-${name}`,
    ...baseManifest,
    os: [os],
    cpu: [arch],
    libc:
      os === "linux"
        ? name.endsWith("musl")
          ? ["musl"]
          : ["glibc"]
        : undefined,
  };

  fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(manifest));
  fs.chmodSync(`${cwd}/footloose2-server`, 0o755);

  try {
    console.log(`Publishing ${name} ...`);
    execSync("npm publish --access public --provenance", {
      cwd,
      stdio: "inherit",
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});
