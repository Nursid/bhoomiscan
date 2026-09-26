jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/biharClient');

describe('Bihar Bhumi helpers', () => {
  it('solves the visible arithmetic captcha', () => {
    expect(__testing.solveCaptcha('6 + 7')).toBe('13');
    expect(__testing.solveCaptcha('12 - 5')).toBe('7');
    expect(__testing.solveCaptcha('4 x 3')).toBe('12');
  });

  it('parses returned Jamabandi rows into an official record', () => {
    const record = __testing.parseRecord(
      [
        ['रैयत का नाम', 'Suraj Gayan'],
        ['खाता', '44', 'प्लाट', '307'],
      ],
      {
        district: 'Sheikhpura',
        tehsil: 'Ariari',
        village: 'अंजान पोखर - 307',
        searchType: 'Plot',
        searchValue: '307',
        ownerName: 'Suraj Gayan',
      },
      'https://emutation.bihar.gov.in/BiharBhumiReport/ViewJamabandi',
    );

    expect(record.state).toBe('Bihar');
    expect(record.source).toBe('Bihar Bhumi Jamabandi');
    expect(record.surveyNo).toBe('307');
    expect(record.officialRows).toHaveLength(2);
  });
});
