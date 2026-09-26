jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/maharashtraClient');

describe('Maharashtra Mahavillages helpers', () => {
  it('formats official table rows into exact selectable labels', () => {
    expect(
      __testing.formatMasterLabel({
        code: '4193',
        englishName: 'Haveli',
        localName: 'हवेली',
      }),
    ).toBe('Haveli | हवेली (4193)');
  });

  it('maps district/taluka/village rows into unique labels', () => {
    expect(
      __testing.masterRowsToLabels([
        ['1', '556203', 'Malinagar', 'माळीनगर'],
        ['1', '556203', 'Malinagar', 'माळीनगर'],
        ['2', '556204', 'Vitthal Nagar', 'विठ्ठल नगर'],
      ]),
    ).toEqual(['Malinagar | माळीनगर (556203)', 'Vitthal Nagar | विठ्ठल नगर (556204)']);
  });
});
