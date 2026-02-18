const chokidar = require('chokidar');
const { exec } = require('child_process');

const DEBOUNCE_MS = 6000; // commit 6 seconds after last save

let timer = null;
let running = false;

function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      if (err) return reject(err);
      resolve();
    });
  });
}

async function commitAndPush() {
  if (running) return;
  running = true;

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const message = `auto commit ${timestamp}`;

  try {
    await run("git add .");

    try {
      await run("git diff --cached --quiet");
      console.log("[auto-push] Nothing to commit.");
      running = false;
      return;
    } catch (_) {}

    console.log(`[auto-push] Committing: ${message}`);
    await run(`git commit -m "${message}"`);

    console.log("[auto-push] Pushing...");
    await run("git push origin main");

    console.log("[auto-push] ✔ Auto commit + push done.");
  } catch (err) {
    console.error("[auto-push] ❌ Error:", err.message);
  } finally {
    running = false;
  }
}

function onChange(path) {
  console.log(`[auto-push] File updated: ${path}`);
  clearTimeout(timer);
  timer = setTimeout(commitAndPush, DEBOUNCE_MS);
}

console.log("[auto-push] Watching project. Press CTRL + C to stop.");

chokidar
  .watch(["app", "src", "pages", "package.json"], {
    ignored: ["**/node_modules/**", "**/.git/**"],
    ignoreInitial: true,
  })
  .on("add", onChange)
  .on("change", onChange)
  .on("unlink", onChange);
