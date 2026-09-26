jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/odishaClient');

describe('odishaClient parser', () => {
  it('extracts owner, khatiyan, plot, and area from Bhulekh RoR rows', () => {
    const rows = [
      ['ମୌଜା : ଅଇନି', 'ତହସିଲ : କଟକ'],
      ['ଥାନା ନମ୍ବର : 77', 'ଜିଲ୍ଲା : କଟକ'],
      ['1) ଖତିୟାନର କ୍ରମିକ ନମ୍ବର', '1', '1'],
      ['2) ପ୍ରଜାର ନାମ, ପିତାର ନାମ, ଜାତି ଓ ବାସସ୍ଥାନ', 'ଶଶି ଦେଇ ସ୍ଵା:ଶତୃଘନ ମହାନ୍ତି ଜା: ମହାଲାୟକ ବା: ନିଜଗାଁ'],
      ['ପ୍ଲଟ ନମ୍ବର ଓ ଚକର ନାମ', 'କିସମ ଓ ପ୍ଲଟର ଖଜଣା', 'ରକବା'],
      ['7', '8', '9', '1', '0', '11', '12'],
      ['829 ତାଳୁଆଚକ', 'ବିଆଳି ଦୋଫସଲ', 'ଉ: ପରକ୍ଷିତ ମହାନ୍ତି ଦ: ସତୃଘନ ମହାନ୍ତି', '0', '3400', '0.1376'],
    ];

    const record = __testing.parseRecord(
      rows,
      {
        district: 'କଟକ',
        tehsil: 'କଟକ',
        village: 'ଅଇନି',
        searchType: 'Khatiyan',
        searchValue: '1',
        ownerName: 'ଶଶି ଦେଇ',
      },
      'https://bhulekh.ori.nic.in/SRoRFront_Uni.aspx',
      '2) ପ୍ରଜାର ନାମ, ପିତାର ନାମ, ଜାତି ଓ ବାସସ୍ଥାନ\nଶଶି ଦେଇ ସ୍ଵା:ଶତୃଘନ ମହାନ୍ତି ଜା: ମହାଲାୟକ ବା: ନିଜଗାଁ',
    );

    expect(record.state).toBe('Odisha');
    expect(record.ownerName).toContain('ଶଶି ଦେଇ');
    expect(record.surveyNo).toBe('829');
    expect(record.khewatNo).toBe('1');
    expect(record.area).toBe('0 / 3400 / 0.1376');
    expect(record.officialRows).toHaveLength(rows.length);
  });
});
