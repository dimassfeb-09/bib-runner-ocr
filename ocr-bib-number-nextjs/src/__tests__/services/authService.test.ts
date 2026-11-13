import { describe, expect, test, beforeEach } from 'bun:test';
import { setFakeRows, clearFakeRows } from 'src/__tests__/setup';
import { makeAdmin } from 'src/__tests__/helpers';
import { getAdminByUsername } from 'src/services/authService';

beforeEach(clearFakeRows);

describe('getAdminByUsername', () => {
  test('returns admin when found', async () => {
    setFakeRows('from admins where username', [makeAdmin()]);
    const admin = await getAdminByUsername('admin');
    expect(admin).not.toBeNull();
    expect(admin!.username).toBe('admin');
  });

  test('returns null when not found', async () => {
    setFakeRows('from admins where username', []);
    expect(await getAdminByUsername('nonexist')).toBeNull();
  });
});
