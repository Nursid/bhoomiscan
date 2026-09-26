jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/mpClient');

describe('MP Bhulekh helpers', () => {
  it('cleans placeholder labels and matches bilingual options', () => {
    expect(__testing.optionLabel('जिला चुनें')).toBe('');
    expect(__testing.optionLabel('Agar-Malwa | आगर-मालवा')).toBe('Agar-Malwa | आगर-मालवा');
    expect(__testing.optionMatch(['Agar-Malwa | आगर-मालवा', 'Bhopal | भोपाल'], 'Bhopal')).toBe('Bhopal | भोपाल');
    expect(__testing.optionMatch(['Agar-Malwa | आगर-मालवा', 'Bhopal | भोपाल'], 'भोपाल')).toBe('Bhopal | भोपाल');
  });
});
