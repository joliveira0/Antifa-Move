import "dotenv/config";
import { createDatabase } from "../database.js";

let database;
try {
    database = createDatabase();
    const { rows } = await database.query("SELECT current_database() AS database");
    console.log(`Conexão PostgreSQL OK: ${rows[0].database}`);
} catch (error) {
    console.error("Falha ao conectar ao PostgreSQL:", error.message);
    process.exitCode = 1;
} finally {
    if (database) await database.end();
}