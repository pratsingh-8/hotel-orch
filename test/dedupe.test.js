const test = require('node:test');
const assert = require('node:assert/strict');
const { selectBestOffers } = require('../src/dedupe');

const o = (name, price, supplier, commissionPct = 10) => ({ name, price, supplier, commissionPct });

test('picks cheaper offer when hotel is in both suppliers', () => {
  const r = selectBestOffers([o('Holtin', 6000, 'Supplier A'), o('Holtin', 5340, 'Supplier B', 20)]);
  assert.deepEqual(r, [o('Holtin', 5340, 'Supplier B', 20)]);
});

test('keeps single-supplier hotels', () => {
  const r = selectBestOffers([o('Leela Inn', 8200, 'Supplier A'), o('Lemon Tree', 4800, 'Supplier B')]);
  assert.equal(r.length, 2);
});

test('name matching ignores case and whitespace', () => {
  const r = selectBestOffers([o('Taj Palace', 12000, 'Supplier A'), o('  taj   palace ', 11500, 'Supplier B')]);
  assert.equal(r.length, 1);
  assert.equal(r[0].supplier, 'Supplier B');
});

test('price tie -> higher commission wins', () => {
  const r = selectBestOffers([o('Ibis', 4500, 'Supplier A', 11), o('Ibis', 4500, 'Supplier B', 16)]);
  assert.equal(r[0].supplier, 'Supplier B');
});

test('result sorted by price ascending', () => {
  const r = selectBestOffers([o('B', 200, 'Supplier A'), o('A', 100, 'Supplier B')]);
  assert.deepEqual(r.map((h) => h.name), ['A', 'B']);
});
