import { assert } from "chai";
import { colourForId } from "./userColour";

describe("colourForId", function () {
  const EXPECTED_COLORS = [
    "#f87171",
    "#fb923c",
    "#facc15",
    "#4ade80",
    "#22d3ee",
    "#818cf8",
    "#e879f9"
  ];

  it("returns a color from the defined palette", function () {
    const result = colourForId("file-abc-123");
    assert.include(EXPECTED_COLORS, result);
  });

  it("is deterministic (returns the same color for the same ID)", function () {
    const id = "annotation-xyz-99";
    const firstCall = colourForId(id);
    const secondCall = colourForId(id);

    assert.equal(firstCall, secondCall);
  });

  it("handles empty strings gracefully", function () {
    // Hash evaluates to 0, which yields the first color in the array
    const result = colourForId("");
    assert.equal(result, "#f87171");
  });

  it("handles standard Mongo IDs and UUID strings", function () {
    const mongoId = "60c72b2f9b1d8b2b88dc1234";
    const result = colourForId(mongoId);
    assert.include(EXPECTED_COLORS, result);
  });

  it("distributes distinct colors across different IDs", function () {
    const ids = ["id-a", "id-b", "id-c", "id-d", "id-e"];
    const results = new Set(ids.map((id) => colourForId(id)));

    // Verifies that hashing produces variety instead of a static single color
    assert.isAbove(results.size, 1);
  });
});
