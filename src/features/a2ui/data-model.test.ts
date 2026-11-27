import { describe, expect, it } from "vite-plus/test";
import { buildSurfaceState } from "./data-model";
import type { A2UIMessage } from "./types";

const create = {
  version: "1.0",
  createSurface: {
    surfaceId: "current",
    components: [{ id: "root", component: "Text", text: "Initial" }],
    dataModel: { count: 1 },
  },
} satisfies A2UIMessage;

const updateComponents = (surfaceId: string): A2UIMessage => ({
  version: "1.0",
  updateComponents: {
    surfaceId,
    components: [{ id: "root", component: "Text", text: "Updated" }],
  },
});

const updateDataModel = (surfaceId: string): A2UIMessage => ({
  version: "1.0",
  updateDataModel: { surfaceId, path: "/count", value: 2 },
});

describe("buildSurfaceState", () => {
  it("ignores component updates for another surface", () => {
    expect(buildSurfaceState([create, updateComponents("other")])).toEqual(
      buildSurfaceState([create]),
    );
  });

  it("ignores data model updates for another surface", () => {
    expect(buildSurfaceState([create, updateDataModel("other")])).toEqual(
      buildSurfaceState([create]),
    );
  });

  it("ignores updates before creating their target surface", () => {
    expect(
      buildSurfaceState([updateComponents("current"), updateDataModel("current"), create]),
    ).toEqual(buildSurfaceState([create]));
  });

  it.each(["current", "other"])("rejects creating %s while a surface exists", (surfaceId) => {
    expect(
      buildSurfaceState([
        create,
        { ...create, createSurface: { ...create.createSurface, surfaceId } },
      ]),
    ).toBeNull();
  });

  it("allows creating a surface again after deleting it", () => {
    expect(
      buildSurfaceState([
        create,
        { version: "1.0", deleteSurface: { surfaceId: "current" } },
        create,
      ]),
    ).toEqual(buildSurfaceState([create]));
  });
});
