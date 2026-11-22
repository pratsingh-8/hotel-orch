// Deliberate overlaps between A and B (Holtin, Radison, Taj Palace, Ibis Central)
// so the cheaper-offer selection is observable.
const supplierAData = [
  { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
  { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
  { hotelId: 'a3', name: 'Taj Palace', price: 12000, city: 'delhi', commissionPct: 12 },
  { hotelId: 'a4', name: 'Leela Inn', price: 8200, city: 'delhi', commissionPct: 15 },
  { hotelId: 'a5', name: 'Ibis Central', price: 4500, city: 'delhi', commissionPct: 11 },
  { hotelId: 'a6', name: 'Marine Drive Hotel', price: 7000, city: 'mumbai', commissionPct: 12 },
  { hotelId: 'a7', name: 'Gateway Suites', price: 9500, city: 'mumbai', commissionPct: 14 },
];

const supplierBData = [
  { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
  { hotelId: 'b2', name: 'Radison', price: 6100, city: 'delhi', commissionPct: 9 },
  { hotelId: 'b3', name: 'Taj Palace', price: 11500, city: 'delhi', commissionPct: 14 },
  { hotelId: 'b4', name: 'Oberoi Grand', price: 14000, city: 'delhi', commissionPct: 8 },
  { hotelId: 'b5', name: 'Ibis Central', price: 4500, city: 'delhi', commissionPct: 16 }, // price tie -> higher commission wins
  { hotelId: 'b6', name: 'Lemon Tree', price: 4800, city: 'delhi', commissionPct: 16 },
  { hotelId: 'b7', name: 'Marine Drive Hotel', price: 6800, city: 'mumbai', commissionPct: 10 },
  { hotelId: 'b8', name: 'Juhu Beach Resort', price: 10500, city: 'mumbai', commissionPct: 18 },
];

module.exports = { supplierAData, supplierBData };
