jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/upClient');

describe('UP Bhulekh parsing', () => {
  it('extracts district, tehsil, village, and year sections from official page text', () => {
    const pageText = [
      'जनपद चुनें',
      'Agra (आगरा)',
      'Lucknow (लखनऊ)',
      'तहसील चुनें',
      'Agra (आगरा)',
      'Etmadpur (एत्मादपुर)',
      'ग्राम का नाम / कोड चुनें',
      'Akbarpur (अकवरपुर)-124649 (आगरा)',
      'Akola (अकोला)-124618 (आगरा)',
      'वर्तमान खतौनी/पुरानी फसली वर्ष',
      'वर्तमान खतौनी',
      '1423-1428',
      'Back',
    ].join('\n');

    expect(__testing.sectionLines(pageText, 'जनपद चुनें', ['तहसील चुनें'])).toEqual(['Agra (आगरा)', 'Lucknow (लखनऊ)']);
    expect(__testing.sectionLines(pageText, 'तहसील चुनें', ['ग्राम का नाम'])).toEqual(['Agra (आगरा)', 'Etmadpur (एत्मादपुर)']);
    expect(__testing.sectionLines(pageText, 'ग्राम का नाम / कोड चुनें', ['वर्तमान खतौनी'])).toEqual([
      'Akbarpur (अकवरपुर)-124649 (आगरा)',
      'Akola (अकोला)-124618 (आगरा)',
    ]);
  });
});
