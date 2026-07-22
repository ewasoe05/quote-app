import assert from 'node:assert/strict';

import {
  isSignatureEmpty,
  signatureDrawingToSvg,
  signatureSvgToDataUri,
} from '../lib/signature';

assert.equal(
  isSignatureEmpty({ width: 100, height: 40, strokes: [] }),
  true
);
assert.equal(
  isSignatureEmpty({
    width: 100,
    height: 40,
    strokes: [{ points: [{ x: 1, y: 1 }] }],
  }),
  true
);

const drawing = {
  width: 200,
  height: 80,
  strokes: [
    {
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 25 },
      ],
    },
  ],
};
assert.equal(isSignatureEmpty(drawing), false);

const svg = signatureDrawingToSvg(drawing);
assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
assert.match(svg, /M 10 20/);
assert.match(svg, /L 30 40/);
assert.match(svg, /stroke="#111111"/);

const dataUri = signatureSvgToDataUri(svg);
assert.match(dataUri, /^data:image\/svg\+xml;charset=utf-8,/);
assert.match(dataUri, /%3Csvg/);

console.log('signature checks passed');
