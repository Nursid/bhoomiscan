jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

const { __testing } = require('../server/rajasthanClient');

describe('Rajasthan Apna Khata parsing', () => {
  const params = {
    district: 'डीडवाना कुचामन',
    tehsil: 'कुचामन',
    village: 'सिन्धपुरा - हिराणी - पांचवा',
    searchType: 'Khasra',
    searchValue: '697',
    ownerName: 'केसराराम पुत्र शिवकरण',
  };

  it('parses Apna Khata khasra result rows into a land record', () => {
    const rows = [
      ['जिला :- डीडवाना कुचामन', 'तहसील :- कुचामन', 'गाँव:- सिन्धपुरा - हिराणी - पांचवा'],
      ['खाता संख्या', 'खसरा', 'रकबा', 'सिंचाई के साधन', 'खेत का नाम', 'शामिल नंबर', 'रिमार्क', 'भूमि वर्गीकरण (भूमि-रकबा-दर-लगान)'],
      ['30', '697', '1.6000', 'चाही 2 - 1.6000 - 0.00 - 41.60'],
      ['काश्तकार की सूचना'],
      ['नाम'],
      ['केसराराम पुत्र शिवकरण'],
    ];

    const record = __testing.parseRecord(
      rows,
      params,
      'https://apnakhata.rajasthan.gov.in/Owner_wise/NakalOptionEsign.aspx?villcode=829F47D916457EF4',
      ['काश्तकार की सूचना', 'नाम', 'केसराराम पुत्र शिवकरण'].join('\n'),
    );

    expect(record.state).toBe('Rajasthan');
    expect(record.ownerName).toBe('केसराराम पुत्र शिवकरण');
    expect(record.surveyNo).toBe('697');
    expect(record.area).toBe('1.6000');
    expect(record.officialRows).toEqual(expect.arrayContaining([['30', '697', '1.6000', 'चाही 2 - 1.6000 - 0.00 - 41.60']]));
  });

  it('extracts the owner from Apna Khata body text around the cultivator section', () => {
    expect(
      __testing.findOwnerInText(
        ['जमाबंदी की सूचना', 'काश्तकार की सूचना', 'नाम', 'केसराराम पुत्र शिवकरण', 'आवेदन करें'].join('\n'),
      ),
    ).toBe('केसराराम पुत्र शिवकरण');
  });

  it('rejects pages without an official khasra row', () => {
    expect(() =>
      __testing.parseRecord(
        [['जमाबंदी / नामांतरण प्रतिलिपि'], ['खसरा चुने']],
        params,
        'https://apnakhata.rajasthan.gov.in/Owner_wise/NakalOptionEsign.aspx',
      ),
    ).toThrow('No official Rajasthan Apna Khata land record was found');
  });
});
