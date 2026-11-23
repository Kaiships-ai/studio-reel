// Hot Money ep01 (Kai 23/11): splitting the money stack with both hands, `you`'s left elbow runs into the right upper arm
// for 9 frames (1885-1893) and the shot gate let it through. Rows cut from the film's __dbg rows (720x1280) to frames
// 1876-1902, actors `you` and `t`, and the fields shotfaults.mjs reads: old = the faulty take, new = the re-keyed one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { shotFaults, blocks } from '../../styles/stick-man/tools/gates/shotfaults.mjs';

const KIND = 'arm through arm';
const rows = n => zlib.gunzipSync(fs.readFileSync(new URL(`../fixtures/hm-ep01/split-v-${n}.jsonl.gz`, import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const armFaults = (rs, W = 720, H = 1280) => shotFaults(rs, { W, H }).filter(x => x.kind === KIND);

test('the left arm through the right one for 9 frames blocks on the old split; the re-keyed split has none', () => {
  const old = armFaults(rows('old'));
  assert.equal(old.length, 1, old.map(x => x.what).join('\n'));
  assert.ok(blocks(old[0]), `${old[0].what}: ${old[0].px.toFixed(1)} px x ${old[0].frames} f x seen ${old[0].seen}`);
  assert.deepEqual([old[0].who, old[0].F, old[0].frames], ['you', 1885, 9]);
  assert.deepEqual(armFaults(rows('new')).map(x => x.what), []);
});

const W = 404, H = 720;
const side = (sh, el, ha) => ({ kneeFlex: 0, elbowFlex: 0, footPitch: 0, hip: [sh[0], 0, 0.85], knee: [sh[0], 0, 0.45], ankle: [sh[0], 0, 0.02], toe: [sh[0], -0.1, 0.02], shoulder: sh, elbow: el, hand: ha });
const row = (f, L, R) => ({ f, act: 'a', mix: null, set: 's', camera: { pos: [0, -1.5, 1.2], target: [0, 0, 1], fov: 60, lens: 24 }, track: {},
  actors: { you: { inFrame: true, head: [180, 200, 220, 240], headW: [0, 0, 1.45], pos: [0, 0, 0], figH: 0.5, feet: { L: [-0.17, 0, 0], R: [0.17, 0, 0] },
    limbs: { torsoLean: 0, torsoRoll: 0, L: side(...L), R: side(...R), skel: { pelvis: [0, 0, 0.8], neck: [0, 0, 1.3], head: [0, 0, 1.45] } } } } });
const pose = (n, at, from = 3) => Array.from({ length: 10 }, (_, i) => row(i, ...(i >= from && i < from + n ? at : REST)));
const arms = (hl, hr, y = [0, 0]) => [[[-0.17, 0, 1.2], [-0.2, -0.15 + y[0], 1.0], hl], [[0.17, 0, 1.2], [0.2, -0.15 + y[1], 1.0], hr]];
const REST = arms([-0.22, -0.1, 0.75], [0.22, -0.1, 0.75]);
const CROSS = arms([0.15, -0.35, 1.05], [-0.15, -0.35, 1.05]);
const kinds = rs => shotFaults(rs, { W, H }).filter(x => x.kind === KIND).map(x => (blocks(x) ? 'blocks' : 'watch'));

test('forearms crossing through each other block from 3 frames and are watched for 2', () => {
  assert.deepEqual(kinds(pose(5, CROSS)), ['blocks']);
  assert.deepEqual(kinds(pose(2, CROSS)), ['watch']);
});

test('arms folded one in front of the other, or both hands meeting on one object, are no fault', () => {
  const folded = arms([0.15, -0.3, 1.05], [-0.15, -0.38, 1.05], [-0.15, -0.23]);
  assert.deepEqual(kinds(pose(5, folded)), [], 'the right forearm 8 cm in front of the left');
  const clasp = arms([-0.01, -0.35, 1.05], [0.01, -0.35, 1.05]);
  assert.deepEqual(kinds(pose(5, clasp)), [], 'hands 2 cm apart on one object');
});
