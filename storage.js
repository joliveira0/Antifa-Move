import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";

const contentTypes = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf"
};

function blobPath(area, filename) {
    return `${area}/${filename}`;
}

async function readPrivateBlob(pathname) {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
        buffer: Buffer.from(await new Response(result.stream).arrayBuffer()),
        contentType: result.blob.contentType
    };
}

export function createLocalStorage({ pendingDirectory, publicDirectory }) {
    async function read(directory, filename) {
        const path = resolve(directory, filename);
        try {
            const info = await stat(path);
            if (!info.isFile()) return null;
            return { buffer: await readFile(path), contentType: contentTypes[filename.slice(filename.lastIndexOf("."))] };
        } catch (error) {
            if (error.code === "ENOENT") return null;
            throw error;
        }
    }

    return {
        async savePending(filename, buffer, contentType) {
            await mkdir(pendingDirectory, { recursive: true });
            await writeFile(resolve(pendingDirectory, filename), buffer, { flag: "wx" });
            return contentType;
        },
        readPending: (filename) => read(pendingDirectory, filename),
        hasPending: async (filename) => Boolean(await read(pendingDirectory, filename)),
        async promotePending(filename) {
            const source = resolve(pendingDirectory, filename);
            const publishedFilename = `${randomUUID()}${filename.slice(filename.lastIndexOf("."))}`;
            const destination = resolve(publicDirectory, publishedFilename);
            await mkdir(dirname(destination), { recursive: true });
            await copyFile(source, destination);
            return {
                filename: publishedFilename,
                commit: () => rm(source),
                rollback: () => rm(destination, { force: true })
            };
        },
        async rejectPending(filename) {
            await rm(resolve(pendingDirectory, filename), { force: true });
        },
        readPublic: (filename) => read(publicDirectory, filename),
        async cleanupPending(maxAgeMs) {
            await mkdir(pendingDirectory, { recursive: true });
            const entries = await readdir(pendingDirectory, { withFileTypes: true });
            const expiration = Date.now() - maxAgeMs;
            for (const entry of entries) {
                if (!entry.isFile()) continue;
                const path = resolve(pendingDirectory, entry.name);
                if ((await stat(path)).mtimeMs < expiration) await rm(path);
            }
        }
    };
}

export function createVercelBlobStorage() {
    return {
        async savePending(filename, buffer, contentType) {
            await put(blobPath("pending", filename), buffer, {
                access: "private",
                addRandomSuffix: false,
                contentType
            });
        },
        readPending: (filename) => readPrivateBlob(blobPath("pending", filename)),
        async hasPending(filename) {
            return Boolean(await readPrivateBlob(blobPath("pending", filename)));
        },
        async promotePending(filename) {
            const sourcePath = blobPath("pending", filename);
            const publishedFilename = `${randomUUID()}${filename.slice(filename.lastIndexOf("."))}`;
            const destinationPath = blobPath("uploads", publishedFilename);
            const pending = await readPrivateBlob(sourcePath);
            if (!pending) throw new Error("Arquivo pendente não encontrado no armazenamento.");
            const uploaded = await put(destinationPath, pending.buffer, {
                access: "private",
                addRandomSuffix: false,
                contentType: pending.contentType
            });
            return {
                filename: publishedFilename,
                commit: () => del(sourcePath),
                rollback: () => del(uploaded.url)
            };
        },
        rejectPending: (filename) => del(blobPath("pending", filename)),
        readPublic: (filename) => readPrivateBlob(blobPath("uploads", filename)),
        async cleanupPending() {}
    };
}

export function createStorage({
    vercel = process.env.VERCEL === "1",
    pendingDirectory = resolve(process.cwd(), ".data/pending-uploads"),
    publicDirectory = resolve(process.cwd(), ".data/uploads")
} = {}) {
    return vercel
        ? createVercelBlobStorage()
        : createLocalStorage({ pendingDirectory, publicDirectory });
}
