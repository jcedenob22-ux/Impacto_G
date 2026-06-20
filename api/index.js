import app, { initDB } from "../backend/app.js";

let ready = false;
initDB().then(() => { ready = true; });

export default async function handler(req, res) {
  if (!ready) {
    try { await initDB(); ready = true; } catch { /* retry next time */ }
  }
  return app(req, res);
}
