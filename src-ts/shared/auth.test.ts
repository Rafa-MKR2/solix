import { describe, it, expect, beforeEach } from 'vitest';
import { getPasswordVerified, setPasswordVerified } from '@/shared/auth';

describe('Auth State', () => {
  beforeEach(() => {
    setPasswordVerified(false);
  });

  it('should return false by default', () => {
    expect(getPasswordVerified()).toBe(false);
  });

  it('should return true after setting password verified', () => {
    setPasswordVerified(true);
    expect(getPasswordVerified()).toBe(true);
  });

  it('should return false after setting password verified to false', () => {
    setPasswordVerified(true);
    setPasswordVerified(false);
    expect(getPasswordVerified()).toBe(false);
  });
});