import { cors } from "hono/cors";
import { defineHandler } from "void";
import { handleMcpDelete, handleMcpGet, handleMcpPost } from "@/features/mcp/server";

const mcpCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["content-type", "accept", "mcp-session-id", "mcp-protocol-version"],
});

export const POST = defineHandler(mcpCors, (c) => handleMcpPost(c.req.raw));
export const GET = defineHandler(mcpCors, () => handleMcpGet());
export const DELETE = defineHandler(mcpCors, () => handleMcpDelete());
export const OPTIONS = defineHandler(mcpCors, (c) => c.body(null, 204));
