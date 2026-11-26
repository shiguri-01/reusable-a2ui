import { cors } from "hono/cors";
import { defineHandler } from "void";
import { handleMcpMethodNotAllowed, handleMcpPost } from "@/features/mcp/server";

const mcpCors = cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["content-type", "accept", "mcp-protocol-version"],
});

export const POST = defineHandler(mcpCors, (c) => handleMcpPost(c.req.raw));
export const GET = defineHandler(mcpCors, () => handleMcpMethodNotAllowed());
export const DELETE = defineHandler(mcpCors, () => handleMcpMethodNotAllowed());
export const OPTIONS = defineHandler(mcpCors, (c) => c.body(null, 204));
