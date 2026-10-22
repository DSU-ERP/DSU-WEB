import { readFile, writeFile, access } from "node:fs/promises";
try { await access(".env.local"); console.log(".env.local exists; preserved."); }
catch { await writeFile(".env.local", await readFile(".env.example"), { flag: "wx", mode: 0o600 }); console.log(".env.local created. Fill required values locally."); }
