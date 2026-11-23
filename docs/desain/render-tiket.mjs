// Render tiket-promo.html → PNG transparan (skala 2x)
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [HTML, OUT, PROFILE, SKALA = "2"] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--remote-debugging-port=9339", `--user-data-dir=${PROFILE}`, "about:blank"], { stdio: "ignore" });
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  for (let i = 0; i < 40; i++) { try { await fetch("http://127.0.0.1:9339/json/version"); break; } catch { await wait(250); } }
  const t = await (await fetch("http://127.0.0.1:9339/json/new?about:blank", { method: "PUT" })).json();
  ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 420, height: 800, deviceScaleFactor: Number(SKALA), mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send("Page.navigate", { url: pathToFileURL(HTML).href });
  await wait(1500);
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  await wait(300);
  const kotak = (await send("Runtime.evaluate", { expression: "JSON.stringify(document.getElementById('tiket').getBoundingClientRect())", returnByValue: true })).result.result.value;
  const b = JSON.parse(kotak);
  const r = await send("Page.captureScreenshot", { format: "png", clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(OUT, Buffer.from(r.result.data, "base64"));
  console.log("ok", OUT, Math.round(b.width), "x", Math.round(b.height));
} catch (e) { console.log("ERR", e.stack); }
finally { try { ws.close(); } catch {} chrome.kill(); process.exit(0); }
