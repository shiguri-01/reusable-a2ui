import { expect, it } from "vite-plus/test";
import { z } from "zod";
import { buildA2UIDeveloperInstructions } from "./prompt";
import { a2uiComponentSchema } from "./types";

it("publishes the component input schema in the developer instructions", () => {
  const instructions = buildA2UIDeveloperInstructions();
  const catalogJson = instructions.match(/```json\n([^\n]+)\n```/)?.[1];

  expect(catalogJson).toBeDefined();
  expect(JSON.parse(catalogJson!)).toEqual(z.toJSONSchema(a2uiComponentSchema, { io: "input" }));
});
