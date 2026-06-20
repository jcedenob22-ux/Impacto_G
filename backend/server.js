import app, { initDB } from "./app.js";

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
