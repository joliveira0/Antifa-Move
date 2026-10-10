import "dotenv/config";
import { createApp } from "../server.js";
import { createDatabase, initializeDatabase } from "../database.js";

let appPromise;

async function getApp() {
    if (!appPromise) {
        appPromise = (async () => {
            const database = createDatabase();
            try {
                await initializeDatabase(database);
                return createApp(database);
            } catch (error) {
                await database.end();
                throw error;
            }
        })().catch((error) => {
            appPromise = undefined;
            throw error;
        });
    }
    return appPromise;
}

export default async function dispatch(request, response) {
    try {
        const originalPath = new URL(request.url, "https://vercel.invalid").searchParams.get("__path");
        if (!originalPath || !originalPath.startsWith("/")
            || originalPath.includes("..") || originalPath.includes("\\")
            || !/^\/(?:api\/[a-z0-9/_-]+|moderar\/[a-zA-Z0-9_-]+|uploads\/[a-f0-9-]+\.(?:jpg|png|webp|pdf))$/i.test(originalPath)) {
            response.statusCode = 404;
            response.end("Not found");
            return;
        }

        request.url = originalPath;
        const app = await getApp();
        app(request, response);
    } catch (error) {
        console.error("Falha ao iniciar a função Vercel:", error);
        response.statusCode = 500;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ error: "Erro interno ao acessar o serviço." }));
    }
}

export const config = {
    api: {
        bodyParser: false
    }
};
