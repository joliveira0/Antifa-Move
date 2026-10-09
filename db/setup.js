import "dotenv/config";
import { createDatabase, initializeDatabase } from "../database.js";

let database;
try {
    database = createDatabase();
    await initializeDatabase(database);
    console.log("Schema PostgreSQL criado e conteúdo de demonstração carregado.");
} catch (error) {
    console.error("Falha ao preparar o PostgreSQL:", error.message);
    process.exitCode = 1;
} finally {
    if (database) await database.end();
}