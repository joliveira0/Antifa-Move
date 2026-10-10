import "dotenv/config";
import { createHmac, createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
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
const sessionCookie = "antifa_editor";
const sessionLifetimeSeconds = 8 * 60 * 60;
const uploadTypes = {
    "image/jpeg": { extension: ".jpg", maxBytes: 5 * 1024 * 1024 },
    "image/png": { extension: ".png", maxBytes: 5 * 1024 * 1024 },
    "image/webp": { extension: ".webp", maxBytes: 5 * 1024 * 1024 },
    "application/pdf": { extension: ".pdf", maxBytes: 20 * 1024 * 1024 }
};
const newsCategories = new Set(["Trabalho", "Economia", "Direitos", "Política", "História", "Cidade"]);
const documentCategories = new Set(["Trabalho", "Economia", "Direitos", "Cidade", "História"]);

function normalizeRow(tableName, row) {
    if (tableName === "news") {
        return {
            id: row.id,
            slug: row.slug,
            category: row.category,
            date: row.date,
            isoDate: row.iso_date,
            title: row.title,
            author: row.author,
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

function hasEditorSession(request, secret) {
    if (!secret) return false;
    const cookie = request.headers.cookie?.split(";").map((part) => part.trim())
        .find((part) => part.startsWith(`${sessionCookie}=`));
    if (!cookie) return false;

    const [expiresAt, signature] = cookie.slice(sessionCookie.length + 1).split(".");
    if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

    const expected = createHmac("sha256", secret).update(expiresAt).digest();
    const received = Buffer.from(signature, "base64url");
    return received.length === expected.length && timingSafeEqual(received, expected);
}

function slugify(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "noticia";
}

function isValidImage(buffer, contentType) {
    if (contentType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (contentType === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    return false;
}

function isValidPdf(buffer) {
    return buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-";
}

function requiredText(value, maximumLength) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximumLength;
}

function consumeRateLimit(limits, key, maximum, windowMs) {
    const now = Date.now();
    const current = limits.get(key);
    if (current && now - current.startedAt < windowMs && current.count >= maximum) return false;
    if (!current || now - current.startedAt >= windowMs) limits.set(key, { startedAt: now, count: 1 });
    else current.count += 1;
    return true;
}

async function hasPendingUpload(url, directory, extensionPattern) {
    const filename = typeof url === "string" ? url.match(extensionPattern)?.[1] : null;
    if (!filename) return false;
    try {
        return (await stat(resolve(directory, filename))).isFile();
    } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
    }
}

async function cleanupExpiredPendingUploads(directory) {
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });
    const expiration = Date.now() - 24 * 60 * 60 * 1000;
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const path = resolve(directory, entry.name);
        if ((await stat(path)).mtimeMs < expiration) await unlink(path);
    }
}

export function createApp(database, {
    moderationKey = process.env.CHAVE_MODERACAO,
    sessionSecret = process.env.SESSION_SECRET,
    uploadsDirectory = resolve(projectRoot, ".data/uploads"),
    pendingUploadsDirectory = resolve(projectRoot, ".data/pending-uploads")
} = {}) {
    const app = express();
    const publicAttempts = new Map();

    app.get("/api/health", async (_request, response) => {
        await database.query("SELECT 1");
        response.json({ status: "ok", database: "ok" });
    });

    app.get("/api/editor/session", (request, response) => {
        response.json({ authenticated: hasEditorSession(request, sessionSecret) });
    });

    app.get("/moderar/:token", (request, response) => {
        const expected = createHash("sha256").update(moderationKey || "").digest();
        const received = createHash("sha256").update(request.params.token).digest();
        if (!moderationKey || !sessionSecret || !timingSafeEqual(received, expected)) {
            response.status(404).send("Página não encontrada.");
            return;
        }

        const expiresAt = String(Math.floor(Date.now() / 1000) + sessionLifetimeSeconds);
        const signature = createHmac("sha256", sessionSecret).update(expiresAt).digest("base64url");
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        response.setHeader("Set-Cookie", `${sessionCookie}=${expiresAt}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionLifetimeSeconds}${secure}`);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.redirect(303, "/publicar?moderar=1");
    });

    app.post("/api/editor/logout", (_request, response) => {
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
        response.status(204).end();
    });

    app.get("/api/news/:slug", async (request, response) => {
        const { rows } = await database.query(
            "SELECT * FROM news WHERE slug = $1 AND status = 'published' LIMIT 1",
            [request.params.slug]
        );
        if (!rows.length) {
            response.status(404).json({ error: "Notícia não encontrada." });
            return;
        }
        response.json(normalizeRow("news", rows[0]));
    });

    app.post("/api/uploads", express.raw({ type: "*/*", limit: "20mb" }), async (request, response) => {
        const address = request.ip || request.socket.remoteAddress || "unknown";
        if (!consumeRateLimit(publicAttempts, `upload:${address}`, 5, 60 * 60 * 1000)) {
            response.status(429).json({ error: "Limite de envios atingido. Tente novamente em uma hora." });
            return;
        }

        const contentType = request.headers["content-type"]?.split(";")[0];
        const type = uploadTypes[contentType];
        const buffer = request.body;
        if (!type || !Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > type.maxBytes) {
            response.status(400).json({ error: "Arquivo inválido ou acima do limite permitido." });
            return;
        }
        if (contentType === "application/pdf" ? !isValidPdf(buffer) : !isValidImage(buffer, contentType)) {
            response.status(400).json({ error: "O conteúdo do arquivo não corresponde ao formato enviado." });
            return;
        }

        await mkdir(pendingUploadsDirectory, { recursive: true });
        const filename = `${randomUUID()}${type.extension}`;
        await writeFile(resolve(pendingUploadsDirectory, filename), buffer, { flag: "wx" });
        response.status(201).json({ url: `/pending-uploads/${filename}` });
    });

    app.post("/api/submissions/news", express.json({ limit: "100kb" }), async (request, response) => {
        const address = request.ip || request.socket.remoteAddress || "unknown";
        if (!consumeRateLimit(publicAttempts, `submission:${address}`, 5, 60 * 60 * 1000)) {
            response.status(429).json({ error: "Limite de envios atingido. Tente novamente em uma hora." });
            return;
        }

        const { title, author, category, summary, body, image } = request.body || {};
        if (!requiredText(title, 180) || !newsCategories.has(category)
            || !requiredText(summary, 300) || !requiredText(body, 30000)
            || (author !== undefined && author !== "" && !requiredText(author, 100))
            || typeof image !== "string" || !/^\/pending-uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(image)) {
            response.status(400).json({ error: "Revise o título, categoria, resumo, texto e imagem da notícia." });
            return;
        }
        if (!await hasPendingUpload(image, pendingUploadsDirectory, /^\/pending-uploads\/([a-f0-9-]+\.(?:jpg|png|webp))$/)) {
            response.status(400).json({ error: "A imagem enviada não foi encontrada. Envie o arquivo novamente." });
            return;
        }

        const isoDate = new Date().toISOString().slice(0, 10);
        const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
        const id = randomUUID();
        const slug = `${slugify(title)}-${id.slice(0, 8)}`;
        const { rows } = await database.query(`
            INSERT INTO news (id, slug, category, title, author, summary, body, image, date, iso_date, status, position)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending',
                COALESCE((SELECT MAX(position) + 1 FROM news), 0))
            RETURNING *
        `, [id, slug, category, title.trim(), author?.trim() || null, summary.trim(), body.trim(), image, date, isoDate]);
        response.status(201).json({ status: rows[0].status, message: "Envio recebido e aguardando aprovação editorial." });
    });

    app.post("/api/submissions/documents", express.json({ limit: "20kb" }), async (request, response) => {
        const address = request.ip || request.socket.remoteAddress || "unknown";
        if (!consumeRateLimit(publicAttempts, `submission:${address}`, 5, 60 * 60 * 1000)) {
            response.status(429).json({ error: "Limite de envios atingido. Tente novamente em uma hora." });
            return;
        }

        const { title, category, pages, url } = request.body || {};
        if (!requiredText(title, 180) || !documentCategories.has(category)
            || !Number.isInteger(pages) || pages < 1 || pages > 10000
            || typeof url !== "string" || !/^\/pending-uploads\/[a-f0-9-]+\.pdf$/.test(url)) {
            response.status(400).json({ error: "Revise o título, categoria, páginas e arquivo PDF." });
            return;
        }
        if (!await hasPendingUpload(url, pendingUploadsDirectory, /^\/pending-uploads\/([a-f0-9-]+\.pdf)$/)) {
            response.status(400).json({ error: "O PDF enviado não foi encontrado. Envie o arquivo novamente." });
            return;
        }

        const id = randomUUID();
        const date = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date());
        const { rows } = await database.query(`
            INSERT INTO documents (id, title, category, format, pages, date, url, status, position)
            VALUES ($1, $2, $3, 'PDF', $4, $5, $6, 'pending',
                COALESCE((SELECT MAX(position) + 1 FROM documents), 0))
            RETURNING *
        `, [id, title.trim(), category, pages, date, url]);
        response.status(201).json({ status: rows[0].status, message: "Envio recebido e aguardando aprovação editorial." });
    });

    app.get("/api/moderation/pending", (request, response, next) => {
        if (!hasEditorSession(request, sessionSecret)) {
            response.status(401).json({ error: "Acesso restrito à moderação." });
            return;
        }
        next();
    }, async (_request, response) => {
        const [newsResult, documentsResult] = await Promise.all([
            database.query("SELECT * FROM news WHERE status = 'pending' ORDER BY created_at, id"),
            database.query("SELECT * FROM documents WHERE status = 'pending' ORDER BY created_at, id")
        ]);
        response.json({
            news: newsResult.rows.map((row) => normalizeRow("news", row)),
            documents: documentsResult.rows.map((row) => normalizeRow("documents", row))
        });
    });

    app.get("/api/moderation/uploads/:filename", (request, response) => {
        if (!hasEditorSession(request, sessionSecret)) {
            response.status(401).json({ error: "Acesso restrito à moderação." });
            return;
        }
        if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(request.params.filename)) {
            response.status(404).json({ error: "Arquivo não encontrado." });
            return;
        }
        response.sendFile(resolve(pendingUploadsDirectory, request.params.filename), {
            headers: { "X-Content-Type-Options": "nosniff" }
        });
    });

    app.post("/api/moderation/:collection/:id/:action", async (request, response) => {
        if (!hasEditorSession(request, sessionSecret)) {
            response.status(401).json({ error: "Acesso restrito à moderação." });
            return;
        }

        const { collection, id, action } = request.params;
        const tableName = collection === "news" || collection === "documents" ? collection : null;
        if (!tableName || !/^[a-f0-9-]{36}$/.test(id) || !["approve", "reject"].includes(action)) {
            response.status(404).json({ error: "Ação de moderação não encontrada." });
            return;
        }

        const { rows } = await database.query(
            `SELECT * FROM ${tableName} WHERE id = $1 AND status = 'pending' LIMIT 1`,
            [id]
        );
        if (!rows.length) {
            response.status(404).json({ error: "Envio pendente não encontrado." });
            return;
        }

        const fileColumn = tableName === "news" ? "image" : "url";
        const submittedUrl = rows[0][fileColumn];
        const filename = typeof submittedUrl === "string"
            && /^\/pending-uploads\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(submittedUrl)
            ? basename(submittedUrl)
            : null;
        if (!filename) {
            response.status(500).json({ error: "O arquivo do envio está inválido." });
            return;
        }

        if (action === "approve") {
            const publicUrl = `/uploads/${filename}`;
            await mkdir(uploadsDirectory, { recursive: true });
            await rename(resolve(pendingUploadsDirectory, filename), resolve(uploadsDirectory, filename));
            let result;
            try {
                result = await database.query(
                    `UPDATE ${tableName} SET status = 'published', ${fileColumn} = $1, updated_at = NOW() WHERE id = $2 AND status = 'pending' RETURNING *`,
                    [publicUrl, id]
                );
            } catch (error) {
                await rename(resolve(uploadsDirectory, filename), resolve(pendingUploadsDirectory, filename));
                throw error;
            }
            if (!result.rows.length) {
                await rename(resolve(uploadsDirectory, filename), resolve(pendingUploadsDirectory, filename));
                response.status(409).json({ error: "Este envio já foi moderado." });
                return;
            }
            response.json({ status: "published", item: normalizeRow(tableName, result.rows[0]) });
            return;
        }

        await unlink(resolve(pendingUploadsDirectory, filename));
        await database.query(
            `UPDATE ${tableName} SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
            [id]
        );
        response.json({ status: "rejected" });
    });

    app.get("/api/:collection", async (request, response) => {
        const tableName = collections[request.params.collection];
        if (!tableName) {
            response.status(404).json({ error: "Coleção não encontrada." });
            return;
        }

        const order = tableName === "news" ? "created_at DESC, position, id" : "position, id";
        const { rows } = await database.query(`SELECT * FROM ${tableName} WHERE status = 'published' ORDER BY ${order}`);
        response.json(rows.map((row) => normalizeRow(tableName, row)));
    });

    app.use("/uploads", express.static(uploadsDirectory, {
        dotfiles: "deny",
        fallthrough: true,
        index: false,
        setHeaders(response, path) {
            if (path.endsWith(".pdf")) response.setHeader("Content-Disposition", "attachment");
            response.setHeader("X-Content-Type-Options", "nosniff");
        }
    }));
    app.use("/css", express.static(resolve(projectRoot, "css")));
    app.use("/js", express.static(resolve(projectRoot, "js")));
    app.use("/imgs", express.static(resolve(projectRoot, "imgs")));
    app.get(["/", "/index.html"], (_request, response) => {
        response.sendFile(resolve(projectRoot, "index.html"));
    });
    app.get("/noticias/noticias.html", (_request, response) => {
        response.sendFile(resolve(projectRoot, "noticias/noticias.html"));
    });
    app.get(["/noticias", "/noticias/:slug"], (_request, response) => {
        response.sendFile(resolve(projectRoot, "noticias/noticias.html"));
    });
    app.get(["/docs", "/historia", "/lambes", "/publicar"], (request, response) => {
        const page = request.path.slice(1);
        const target = page === "publicar"
            ? "publicar/publicar.html"
            : `${page}/${page === "docs" ? "docs.html" : `${page}.html`}`;
        response.sendFile(resolve(projectRoot, target));
    });

    app.use((error, request, response, _next) => {
        console.error("Erro na API:", error);
        if (request.path.startsWith("/api/")) {
            if (error.type === "entity.too.large") {
                response.status(413).json({ error: "Arquivo acima do limite permitido." });
                return;
            }
            if (error.code === "23505") {
                response.status(409).json({ error: "Este conteúdo já foi cadastrado." });
                return;
            }
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
        await cleanupExpiredPendingUploads(resolve(projectRoot, ".data/pending-uploads"));
        createApp(database).listen(port, () => {
            console.log(`Antifa Move disponível em http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Não foi possível iniciar o backend:", error.message);
        if (database) await database.end();
        process.exitCode = 1;
    }
}
