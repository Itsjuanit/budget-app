/**
 * Copia shared/categories.json dentro de functions/.
 *
 * Firebase sólo empaqueta el contenido de la carpeta `functions/` al desplegar,
 * así que el bot no puede leer `shared/` en runtime. Este script mantiene la copia
 * sincronizada y corre automáticamente antes de cada `firebase deploy`
 * (ver el hook `predeploy` en firebase.json).
 *
 * Fuente de verdad: shared/categories.json — functions/categories.json es generado.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "shared", "categories.json");
const TARGET = path.join(ROOT, "functions", "categories.json");

const data = fs.readFileSync(SOURCE, "utf8");

// Se valida el JSON antes de escribir para no romper el deploy con un archivo inválido.
JSON.parse(data);

fs.writeFileSync(TARGET, data, "utf8");

console.log("✓ categorías sincronizadas: shared/categories.json → functions/categories.json");
