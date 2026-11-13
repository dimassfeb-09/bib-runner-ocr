import { describe, expect, test } from 'bun:test';
import { hashPassword, verifyPassword } from 'src/lib/auth';

describe('hashPassword', () => {
  test('returns salt:hash format', () => {
    const result = hashPassword('admin123');
    expect(result).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  });

  test('produces different hashes for same password (random salt)', () => {
    const a = hashPassword('hello');
    const b = hashPassword('hello');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  test('correct password returns true', () => {
    const hash = hashPassword('admin123');
    expect(verifyPassword('admin123', hash)).toBe(true);
  });

  test('wrong password returns false', () => {
    const hash = hashPassword('admin123');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  test('empty password against valid hash returns false', () => {
    const hash = hashPassword('admin123');
    expect(verifyPassword('', hash)).toBe(false);
  });

  test('malformed stored hash (no colon) returns false', () => {
    expect(verifyPassword('admin123', 'invalidhash')).toBe(false);
  });

  test('malformed stored hash (empty salt) returns false', () => {
    expect(verifyPassword('admin123', ':hashpart')).toBe(false);
  });
});
