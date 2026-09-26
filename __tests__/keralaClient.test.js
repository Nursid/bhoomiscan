jest.mock('playwright', () => ({ chromium: {} }));

const { __testing } = require('../server/keralaClient');

describe('Kerala Revenue helpers', () => {
  it('keeps official district codes in dropdown labels', () => {
    expect(__testing.districtLabels()).toContain('ERNAKULAM (1608)');
    expect(__testing.districtCodeFromLabel('ernakulam')).toBe('1608');
    expect(__testing.districtCodeFromLabel('ERNAKULAM (1608)')).toBe('1608');
  });

  it('extracts selected village-office code from labels', () => {
    expect(__testing.villageCodeFromLabel('Pattimattom village office [66Pattimattomvillageoffice]')).toBe(
      '66Pattimattomvillageoffice',
    );
  });
});
