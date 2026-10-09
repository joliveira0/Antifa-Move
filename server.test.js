import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "./server.js";
import { documents, histories, news, posters } from "./js/data.js";
import { initializeDatabase } from "./database.js";

let server;
let database;
let baseUrl;

before(async () => {
    database = {
        async query(sql) {
            if (sql.includes("SELECT 1")) return { rows: [{ "?column?": 1 }] };
            if (sql.includes("FROM news")) return { rows: news.map((item, index) => ({ ...item, iso_date: item.isoDate, slug: item.id || `news-${index + 1}`, body: item.summary, position: index })) };
            if (sql.includes("FROM documents")) return { rows: documents.map((item, index) => ({ ...item, pages: item.pages || 0, position: index })) };
            if (sql.includes("FROM histories")) return { rows: histories.map((item, index) => ({ ...item, position: index })) };
            if (sql.includes("FROM lambes")) return { rows: posters.map((item, index) => ({ id: `lambe-${index + 1}`, title: item.title, lines: item.lines, background: item.background, foreground: item.foreground, border: item.border, rotation: item.rotation, preview_url: null, download_url: null, format: "A3", position: index })) };
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    server = createApp(database).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint reports the API as available", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", database: "ok" });
});

test("news endpoint returns seeded content in its original shape", async () => {
    const response = await fetch(`${baseUrl}/api/news`);
    const items = await response.json();

    assert.equal(response.status, 200);
    assert.equal(items.length, 8);
    assert.equal(items[0].id, "jornada-de-trabalho");
    assert.equal(items[0].title, "O que muda na jornada de trabalho e por que isso importa");
});

test("lambe endpoint returns poster data in the expected shape", async () => {
    const response = await fetch(`${baseUrl}/api/lambes`);
    const items = await response.json();

    assert.equal(response.status, 200);
    assert.equal(items.length, 6);
    assert.equal(items[0].title, "A cidade é nossa");
    assert.ok(Array.isArray(items[0].lines));
});

test("unknown collections return a JSON 404", async () => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Coleção não encontrada." });
});

test("database setup applies the schema and seeds all collections", async () => {
    const statements = [];
    const client = {
        async query(sql, values) {
            statements.push({ sql, values });
            return { rows: [] };
        },
        release() {}
    };
    const setupDatabase = {
        async query(sql) {
            statements.push({ sql });
            return { rows: [] };
        },
        async connect() {
            return client;
        }
    };

    await initializeDatabase(setupDatabase);

    const inserts = statements.filter(({ sql }) => sql.includes("INSERT INTO news") || sql.includes("INSERT INTO documents") || sql.includes("INSERT INTO histories") || sql.includes("INSERT INTO lambes"));
    assert.equal(inserts.length, news.length + documents.length + histories.length + posters.length);
    assert.ok(statements.some(({ sql }) => sql.includes("CREATE TABLE IF NOT EXISTS news")));
    assert.ok(statements.some(({ sql }) => sql === "COMMIT"));
});