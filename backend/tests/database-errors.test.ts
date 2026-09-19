import test from "node:test";
import assert from "node:assert/strict";
import { isTransientDatabaseError } from "../lib/database-errors";

test("database availability errors are safe to classify for read retry", () => {
  assert.equal(isTransientDatabaseError({ code: "P1001" }), true);
  assert.equal(isTransientDatabaseError(new Error("Can't reach database server at example.neon.tech:5432")), true);
  assert.equal(isTransientDatabaseError(new Error("Engine is not yet connected.")), true);
});

test("validation and query errors are not classified as transient", () => {
  assert.equal(isTransientDatabaseError({ code: "P2002", message: "Unique constraint failed" }), false);
  assert.equal(isTransientDatabaseError(new Error("Column does not exist")), false);
});
