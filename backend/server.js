import { fileURLToPath } from "url";
import { dirname, join } from "path";
import app, { initDB } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

app.use(express.static(join(__dirname, "..")));

import express from "express";

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
