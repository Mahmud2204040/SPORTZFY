import { test } from "node:test";
import { strict as assert } from "node:assert";
import { venueImageUrls } from "../lib/venue-images";

test("venue gallery accepts a bounded set of unique web images", () => {
  assert.deepEqual(venueImageUrls([" https://example.com/one.jpg ", "http://example.com/two.jpg"]), ["https://example.com/one.jpg", "http://example.com/two.jpg"]);
  assert.deepEqual(venueImageUrls([]), []);
  assert.throws(() => venueImageUrls(["javascript:alert(1)"]), /INVALID_VENUE_IMAGES/);
  assert.throws(() => venueImageUrls(["https://example.com/a", "https://example.com/a"]), /INVALID_VENUE_IMAGES/);
  assert.throws(() => venueImageUrls(Array(11).fill("https://example.com/a")), /INVALID_VENUE_IMAGES/);
});
