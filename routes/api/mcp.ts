import { defineHandler } from "void";
import {
  handleMcpDelete,
  handleMcpGet,
  handleMcpOptions,
  handleMcpPost,
} from "@/features/mcp/server";

export const POST = defineHandler((c) => handleMcpPost(c.req.raw));
export const GET = defineHandler(() => handleMcpGet());
export const DELETE = defineHandler(() => handleMcpDelete());
export const OPTIONS = defineHandler(() => handleMcpOptions());
