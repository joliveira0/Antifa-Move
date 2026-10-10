import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./server.js";
import { createLocalStorage } from "./storage.js";
import dispatch from "./api/dispatch.js";
import { documents, histories, news, posters } from "./js/data.js";
import { initializeDatabase } from "./database.js";

let server;
let database;
let baseUrl;
let testDirectory;
const moderationKey = "test-moderation-key-long-enough-to-be-secret";
let pendingNews = [];
let pendingDocuments = [];
let moderationCookie;

before(async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "antifa-move-test-"));
    const pendingUploadsDirectory = join(testDirectory, "pending");
    const uploadsDirectory = join(testDirectory, "public");
    await mkdir(pendingUploadsDirectory);
    await writeFile(join(pendingUploadsDirectory, "123e4567-e89b-12d3-a456-426614174000.jpg"), "test upload");
    database = {
        async query(sql, values = []) {
            if (sql.includes("SELECT 1")) return { rows: [{ "?column?": 1 }] };
            if (sql.includes("INSERT INTO api_rate_limits")) return { rows: [{ request_count: 1 }] };
            if (sql.includes("INSERT INTO news")) {
                const [id, slug, category, title, author, summary, body, image, date, isoDate] = values;
                const item = { id, slug, category, title, author, summary, body, image, date, iso_date: isoDate, status: "pending" };
                pendingNews.push(item);
                return { rows: [item] };
            }
            if (sql.includes("INSERT INTO documents")) {
                const [id, title, category, pages, date, url] = values;
                const item = { id, title, category, pages, date, url, format: "PDF", status: "pending" };
                pendingDocuments.push(item);
                return { rows: [item] };
            }
            if (sql.includes("FROM news") && sql.includes("status = 'pending'")) return { rows: pendingNews };
            if (sql.includes("FROM documents") && sql.includes("status = 'pending'")) return { rows: pendingDocuments };
            if (sql.startsWith("UPDATE documents SET status = 'published'")) {
                const [url, id] = values;
                const item = pendingDocuments.find((document) => document.id === id);
                if (!item) return { rows: [] };
                item.url = url;
                item.status = "published";
                return { rows: [item] };
            }
            if (sql.includes("FROM news") && sql.includes("WHERE id = $1 AND status = 'pending'")) return { rows: pendingNews.filter((item) => item.id === values[0] && item.status === "pending") };
            if (sql.includes("FROM documents") && sql.includes("WHERE id = $1 AND status = 'pending'")) return { rows: pendingDocuments.filter((item) => item.id === values[0] && item.status === "pending") };
            if (sql.includes("FROM news")) return { rows: news.map((item, index) => ({ ...item, iso_date: item.isoDate, slug: item.id || `news-${index + 1}`, body: item.summary, position: index })) };
            if (sql.includes("FROM documents")) return { rows: documents.map((item, index) => ({ ...item, pages: item.pages || 0, position: index })) };
            if (sql.includes("FROM histories")) return { rows: histories.map((item, index) => ({ ...item, position: index })) };
            if (sql.includes("FROM lambes")) return { rows: posters.map((item, index) => ({ id: `lambe-${index + 1}`, title: item.title, lines: item.lines, background: item.background, foreground: item.foreground, border: item.border, rotation: item.rotation, preview_url: null, download_url: null, format: "A3", position: index })) };
            throw new Error(`Unexpected query: ${sql}`);
        }
    };
    server = createApp(database, {
        moderationKey,
        sessionSecret: "test-session-secret",
        storage: createLocalStorage({ pendingDirectory: pendingUploadsDirectory, publicDirectory: uploadsDirectory })
    }).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(testDirectory, { recursive: true, force: true });
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

test("Vercel configuration routes API and user-facing paths to the right handlers", async () => {
    const config = JSON.parse(await readFile(new URL("./vercel.json", import.meta.url), "utf8"));
    const rewrites = new Map(config.rewrites.map((rewrite) => [rewrite.source, rewrite.destination]));

    assert.equal(rewrites.get("/api/:path*"), "/api/dispatch?__path=/api/:path*");
    assert.equal(rewrites.get("/moderar/:token"), "/api/dispatch?__path=/moderar/:token");
    assert.equal(rewrites.get("/noticias/:slug"), "/noticias/noticias.html");
    assert.equal(rewrites.get("/publicar"), "/publicar/publicar.html");
});

test("Vercel dispatcher rejects paths outside the application routes", async () => {
    const response = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
            this.headers[name] = value;
        },
        end(body) {
            this.body = body;
        }
    };

    await dispatch({ url: "/api/dispatch?__path=/etc/passwd" }, response);
    assert.equal(response.statusCode, 404);
    assert.equal(response.body, "Not found");
});

test("concurrent file promotions use distinct published paths", async () => {
    const pendingDirectory = join(testDirectory, "concurrent-pending");
    const publicDirectory = join(testDirectory, "concurrent-public");
    await mkdir(pendingDirectory);
    const filename = "123e4567-e89b-12d3-a456-426614174000.pdf";
    await writeFile(join(pendingDirectory, filename), "%PDF-1.4 concurrent");
    const storage = createLocalStorage({ pendingDirectory, publicDirectory });

    const [first, second] = await Promise.all([
        storage.promotePending(filename),
        storage.promotePending(filename)
    ]);
    assert.notEqual(first.filename, second.filename);
    await first.rollback();
    assert.ok(await storage.readPublic(second.filename));
    await second.commit();
});

test("public news submissions enter the moderation queue", async () => {
    pendingNews = [];
    const response = await fetch(`${baseUrl}/api/submissions/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Notícia enviada pela comunidade",
            author: "Leitora",
            category: "Cidade",
            summary: "Resumo para revisão editorial.",
            body: "Texto completo enviado pela comunidade.",
            image: "/pending-uploads/123e4567-e89b-12d3-a456-426614174000.jpg"
        })
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
        status: "pending",
        message: "Envio recebido e aguardando aprovação editorial."
    });
    assert.equal(pendingNews[0].status, "pending");
});

test("secret moderation link opens a temporary session and redirects without its token", async () => {
    const invalid = await fetch(`${baseUrl}/moderar/wrong-key`, { redirect: "manual" });
    assert.equal(invalid.status, 404);

    const response = await fetch(`${baseUrl}/moderar/${moderationKey}`, { redirect: "manual" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/publicar?moderar=1");

    const cookie = response.headers.get("set-cookie").split(";")[0];
    moderationCookie = cookie;
    const sessionResponse = await fetch(`${baseUrl}/api/editor/session`, {
        headers: { Cookie: cookie }
    });
    assert.deepEqual(await sessionResponse.json(), { authenticated: true });
});

test("moderation queue is not accessible without the session cookie", async () => {
    const response = await fetch(`${baseUrl}/api/moderation/pending`);
    assert.equal(response.status, 401);
});

test("approved document upload moves from private storage to public downloads", async () => {
    const uploadResponse = await fetch(`${baseUrl}/api/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: Buffer.from("%PDF-1.4 sample document")
    });
    const upload = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201);

    const submissionResponse = await fetch(`${baseUrl}/api/submissions/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Guia enviado pela comunidade",
            category: "Direitos",
            pages: 3,
            url: upload.url
        })
    });
    assert.equal(submissionResponse.status, 201);
    const submitted = pendingDocuments.at(-1);

    const approvalResponse = await fetch(`${baseUrl}/api/moderation/documents/${submitted.id}/approve`, {
        method: "POST",
        headers: { Cookie: moderationCookie }
    });
    const approval = await approvalResponse.json();
    assert.equal(approvalResponse.status, 200);
    assert.equal(approval.status, "published");
    assert.match(approval.item.url, /^\/uploads\//);

    const downloadResponse = await fetch(`${baseUrl}${approval.item.url}`);
    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get("content-disposition"), /attachment/);
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