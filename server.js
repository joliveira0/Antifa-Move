import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createDatabase, initializeDatabase } from "./database.js";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const collections = {
    news: "news",
    noticias: "news",
    documents: "documents",
    histories: "histories",
    historia: "histories",
    historias: "histories",
    lambes: "lambes",
    posters: "lambes",
    lambe: "lambes"
};

function normalizeRow(tableName, row) {
    if (tableName === "news") {
        return {
            id: row.id,
            slug: row.slug,
            category: row.category,
            date: row.date,
            isoDate: row.iso_date,
            title: row.title,
            summary: row.summary,
            image: row.image,
            body: row.body
        };
    }

    if (tableName === "documents") {
        return {
            id: row.id,
            title: row.title,
            category: row.category,
            format: row.format,
            pages: Number(row.pages),
            date: row.date,
            url: row.url
        };
    }

    if (tableName === "histories") {
        return {
            id: row.id,
            year: row.year,
            category: row.category,
            title: row.title,
            summary: row.summary,
            image: row.image
        };
    }

    return {
        id: row.id,
        title: row.title,
        lines: Array.isArray(row.lines) ? row.lines : JSON.parse(row.lines || "[]"),
        background: row.background,
        foreground: row.foreground,
        border: row.border,
        rotation: Number(row.rotation || 0),
        previewUrl: row.preview_url,
        downloadUrl: row.download_url,
        format: row.format
    };
}

export function createApp(database) {
    const app = express();

    app.get("/api/health", async (_request, response) => {
        await database.query("SELECT 1");
        response.json({ status: "ok", database: "ok" });
    });

    app.get("/api/:collection", async (request, response) => {
        const tableName = collections[request.params.collection];
        if (!tableName) {
            response.status(404).json({ error: "Coleção não encontrada." });
            return;
        }

        const { rows } = await database.query(`SELECT * FROM ${tableName} ORDER BY position, id`);
        response.json(rows.map((row) => normalizeRow(tableName, row)));
    });

    app.use(express.static(projectRoot, { dotfiles: "ignore" }));

    app.use((error, request, response, _next) => {
        console.error("Erro na API:", error);
        if (request.path.startsWith("/api/")) {
            response.status(500).json({ error: "Erro interno ao acessar o serviço." });
            return;
        }
        response.status(500).send("Erro interno do servidor.");
    });

    return app;
}

const isMainModule = process.argv[1]
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    const port = Number(process.env.PORT) || 3000;
    let database;

    try {
        database = createDatabase();
        await initializeDatabase(database);
        createApp(database).listen(port, () => {
            console.log(`Antifa Move disponível em http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Não foi possível iniciar o backend:", error.message);
        if (database) await database.end();
        process.exitCode = 1;
    }
}