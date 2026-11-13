import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { getSettings, updateSetting, getSettingByKey } from 'src/services/settingsService';

beforeEach(clearFakeRows);

describe('getSettings', () => {
  test('returns all settings as key-value map', async () => {
    setFakeRows('key, value from settings', [{ key: 'photo_price', value: '50000' }, { key: 'default_bundle_price', value: '100000' }]);
    const settings = await getSettings();
    expect(settings).toEqual({ photo_price: '50000', default_bundle_price: '100000' });
  });

  test('returns empty object when no settings', async () => {
    setFakeRows('key, value from settings', []);
    expect(await getSettings()).toEqual({});
  });
});

describe('updateSetting', () => {
  test('upserts a setting', async () => {
    setFakeRows('insert into settings', [{ key: 'photo_price', value: '75000' }]);
    await updateSetting('photo_price', '75000');
  });
});

describe('getSettingByKey', () => {
  test('returns value for existing key', async () => {
    setFakeRows('value from settings where key', [{ value: '50000' }]);
    expect(await getSettingByKey('photo_price')).toBe('50000');
  });

  test('returns null for missing key', async () => {
    setFakeRows('value from settings where key', []);
    expect(await getSettingByKey('nonexist')).toBeNull();
  });
});
