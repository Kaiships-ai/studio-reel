// tier: heavy
// A posed stick-man figure changed in place poses as a fresh build with that change: a new girth (S.setGirth) on an
// undressed figure puts the torso and its ink shell back to rest so the next pose bends them again, the body's volumes
// with them (a dressed one refuses it); new hair
// (S.bakeHair) on a figure wearing a hat goes in under the hat as a fresh build's does, and on the child and elder bodies
// keeps their crown shell.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { hashFigure, recordingDocument, stickBuilder } from './look-fingerprint.mjs';
import { shellHash } from './hair-swap.mjs';

globalThis.document ??= recordingDocument();
const { rigStick } = await import('../../styles/stick-man/tools/gates/motionlib.mjs');
const makeFigure = await stickBuilder();
const { toonHair } = await import('../../styles/stick-man/kit/cast/hair.js');
await import('../../styles/stick-man/kit/cast/wardrobe.js');
const { HOOKS } = await import('../../styles/stick-man/engine/play.js');
const POSE = { spine: { bend: 14, side: 6, twist: 10 }, neck: { nod: 8, turn: 20 }, armR: { raise: 40 } };
const look = (S, group) => { S.pose2(POSE); return { hash: hashFigure(S, group).hash, shell: shellHash(S.wornShell), vols: JSON.stringify(S.vols) }; };
const dressed = (spec, wear) => { const S = makeFigure(spec), group = new THREE.Group(); if (wear.length) HOOKS.costume(S, wear, { group }); return { S, group }; };
const swapped = (spec, from, to, wear = []) => { const { S, group } = dressed({ ...spec, hair: [toonHair(from)] }, wear); S.pose2(POSE); S.bakeHair([toonHair(to)]); return look(S, group); };
const fresh = (spec, to, wear = []) => { const { S, group } = dressed({ ...spec, hair: [toonHair(to)] }, wear); return look(S, group); };
const adult = (await rigStick('adult')).S.spec;

test('girth changed on a posed figure, then posed, equals a fresh build at that girth', () => {
  const spec = g => ({ name: 'g', shirt: [0.6, 0.6, 0.66], girth: g });
  for (const [from, to] of [[1, 1.3], [1.3, 0.86], [0.86, 1]]) {
    const S = makeFigure(spec(from)); S.pose2(POSE); S.setGirth(to);
    assert.deepEqual(look(S), look(makeFigure(spec(to))), `${from} -> ${to}`);
    assert.equal(S.spec.girth, to);
  }
});

// a costume is sized to the girth it was put on at and never taken off (solution.md #1), so a dressed figure refuses a new
// girth instead of keeping garments sized to the old one (review C2 M1: these three outfits differed from a fresh build)
test('a dressed figure refuses setGirth and is left as it was', () => {
  for (const wear of [['sweater:coral'], ['coat:lab', 'shirt:office'], ['skirt', 'sweater'], ['cap:police']]) {
    const { S, group } = dressed({ ...adult, girth: 1 }, wear), before = look(S, group);
    assert.throws(() => S.setGirth(1.3), /dressed/, wear.join(','));
    assert.deepEqual(look(S, group), before, wear.join(','));
    assert.equal(S.spec.girth, 1);
  }
});

test('a figure under a police cap swapped from pompadour to afro tucks the afro under the cap as a fresh build does', () => {
  assert.deepEqual(swapped(adult, 'pompadour', 'afro', ['cap:police']), fresh(adult, 'afro', ['cap:police']));
});

test('hair swapped on the child and the elder bodies keeps the crown shell and fingerprint of a fresh build', async () => {
  for (const body of ['child', 'elder']) {
    const spec = (await rigStick(body)).S.spec;
    assert.deepEqual(swapped(spec, 'side', 'afro'), fresh(spec, 'afro'), body);
  }
});
