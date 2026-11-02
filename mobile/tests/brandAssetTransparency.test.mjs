import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// Decode actual PNG pixels: React Native's Jest Image mock hides baked mattes.
function rgbaPng(path) {
  const png = readFileSync(new URL('../assets/brand/' + path, import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.deepEqual([png[24], png[25], png[28]], [8, 6, 0]); // RGBA8, noninterlaced
  const parts = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') parts.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(parts)), stride = width * 4;
  assert.equal(filtered.length, height * (stride + 1));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= 4 ? pixels[index - 4] : 0;
      const up = y > 0 ? pixels[index - stride] : 0;
      const diagonal = x >= 4 && y > 0 ? pixels[index - stride - 4] : 0;
      const p = left + up - diagonal;
      const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - diagonal);
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? pa <= pb && pa <= pc ? left : pb <= pc ? up : diagonal : undefined;
      assert.notEqual(predictor, undefined, `Unsupported PNG filter ${filter}`);
      pixels[index] = (filtered[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  const alpha = Array.from({ length: width * height }, (_, index) => pixels[index * 4 + 3]);
  return { width, height, alpha };
}

for (const [path, size] of [
  ['icons/bell.png', 24], ['icons/home.png', 24], ['icons/friends.png', 24],
  ['icons/history.png', 24], ['icons/profile.png', 24], ['icons/plus.png', 24],
  ['icons/enter.png', 24], ['icons/lightning.png', 16], ['home/back.png', 24],
  ['home/create.png', 32], ['home/join.png', 32],
]) {
  test(`${path}: Android tint colors the glyph, not an opaque background`, () => {
    const image = rgbaPng(path);
    assert.deepEqual([image.width, image.height], [size, size]);
    assert.equal(image.alpha[0], 0);
    assert.ok(image.alpha.filter(value => value === 0).length > image.alpha.length * 0.3);
    assert.ok(image.alpha.some(value => value > 0));
    assert.ok(image.alpha.some(value => value > 0 && value < 255));
  });
}

for (const [path, width, height] of [
  ['entry/welcome-ring-large.png', 334, 390],
  ['entry/welcome-ring-small.png', 207, 240],
]) {
  test(`${path}: faint ring instead of an opaque cream rectangle`, () => {
    const image = rgbaPng(path);
    assert.deepEqual([image.width, image.height], [width, height]);
    assert.ok(image.alpha.filter(value => value === 0).length > image.alpha.length * 0.9);
    assert.ok(image.alpha.some(value => value > 0));
    assert.ok(image.alpha.every(value => value < 255));
  });
}

test('Home join artwork differs from the create plus glyph', () => {
  assert.notDeepEqual(rgbaPng('home/join.png').alpha, rgbaPng('home/create.png').alpha);
});

for (const glyph of ['bun', 'noodles', 'hotpot', 'rolls', 'cake', 'vietnam', 'japan', 'china', 'thailand', 'europe', 'leaf', 'rich', 'sour', 'spicy']) {
  test(`preferences/${glyph}: non-empty glyph has real alpha and safe padding`, () => {
    const image = rgbaPng(`preferences/${glyph}.png`);
    assert.equal(image.width, image.height);
    assert.ok(image.width >= 32 && image.width <= 72);
    assert.equal(image.alpha[0], 0);
    assert.ok(image.alpha.filter(value => value === 0).length > image.alpha.length * 0.3);
    assert.ok(image.alpha.some(value => value > 0));
    assert.ok(image.alpha.some(value => value > 0 && value < 255));
  });
}
