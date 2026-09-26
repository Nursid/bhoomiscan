jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

const { __testing } = require('../server/plrsClient');

describe('PLRS land record parsing', () => {
  const params = {
    district: 'Amritsar',
    tehsil: 'Amritsar-1',
    village: 'Amritsar Urban 107 Abadi Harnami Shah',
    year: '2020 - 2021',
    searchType: 'Owner',
    searchValue: '',
    ownerName: 'Sarika Sharma',
  };

  it('rejects PLRS virtual keyboard rows as non-record data', () => {
    const keyboardRows = [
      ['ਮੌਜੂਦਾ/Current', 'ਪਿਛਲਾ/Previous'],
      ['` ~ੱ', '1 ਆ੧', '2 ਇ੨', '3 ਈ੩', 'BackSp'],
      ['Caps Lock', 'a ੳਅ', 's ਸ਼ਸ', 'd ਧਦ', 'Enter'],
      ['Ctrl', 'Alt', 'Space', 'Alt', 'Ctrl'],
    ];

    expect(() =>
      __testing.parseRecord(
        keyboardRows,
        params,
        'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Owner-Name-Wise&itemID=7&itemPID=3',
      ),
    ).toThrow('No official PLRS land record was found');
  });

  it('parses a real-looking owner row into a land record', () => {
    const rows = [
      ['Owner Name', 'Khewat', 'Khasra', 'Area'],
      ['Sarika Sharma', 'Khewat No. 12', '14//25/2', '1 Kanal 4 Marla'],
    ];

    const record = __testing.parseRecord(
      rows,
      params,
      'https://jamabandi.punjab.gov.in/Jamabandi.aspx?section=Owner-Name-Wise&itemID=7&itemPID=3',
    );

    expect(record.ownerName).toBe('Sarika Sharma');
    expect(record.surveyNo).toBe('14//25/2');
    expect(record.area).toBe('1 Kanal 4 Marla');
    expect(record.district).toBe('Amritsar');
  });
});
