import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { documents, histories, news, posters } from "./js/data.js";

const { Pool } = pg;
const databaseDirectory = join(dirname(fileURLToPath(import.meta.url)), "db");
const collections = {
    news,
    documents,
    histories,
    lambes: posters
};

export function createDatabase(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) {
        throw new Error("DATABASE_URL não configurada. Copie .env.example para .env e adicione a URL do PostgreSQL do Neon.");
    }

    return new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
}

function itemToRow(tableName, item, position) {
    const id = item.id || `${tableName}-${position + 1}`;

    if (tableName === "news") {
        return {
            id,
            slug: item.id || `${tableName}-${position + 1}`,
            category: item.category,
            title: item.title,
            summary: item.summary,
            body: item.body || item.summary,
            image: item.image || null,
            date: item.date,
            iso_date: item.isoDate,
            status: "published",
            position
        };
    }

    if (tableName === "documents") {
        return {
            id,
            title: item.title,
            category: item.category,
            format: item.format,
            pages: Number(item.pages || 0),
            date: item.date,
            url: item.url || null,
            status: "published",
            position
        };
    }

    if (tableName === "histories") {
        return {
            id,
            year: item.year,
            category: item.category,
            title: item.title,
            summary: item.summary,
            image: item.image || null,
            status: "published",
            position
        };
    }

    return {
        id,
        title: item.title,
        lines: JSON.stringify(item.lines || []),
        background: item.background,
        foreground: item.foreground,
        border: item.border,
        rotation: Number(item.rotation || 0),
        preview_url: item.previewUrl || item.preview_url || null,
        download_url: item.downloadUrl || item.download_url || null,
        format: item.format || "A3",
        status: "published",
        position
    };
}

export async function initializeDatabase(database) {
    const schema = await readFile(join(databaseDirectory, "schema.sql"), "utf8");
    await database.query(schema);

    const client = await database.connect();
    try {
        await client.query("BEGIN");
        for (const [tableName, items] of Object.entries(collections)) {
            for (const [position, item] of items.entries()) {
                const row = itemToRow(tableName, item, position);
                const columns = Object.keys(row);
                const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
                const values = Object.values(row);

                await client.query(`
                    INSERT INTO ${tableName} (${columns.join(", ")})
                    VALUES (${placeholders})
                    ON CONFLICT (id) DO NOTHING
                `, values);
            }
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}