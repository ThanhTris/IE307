import { maskContact, maskEmail, maskPhone } from '../../src/features/account/services/maskContact';

describe('maskContact', () => {
  it('hides the start of an email and keeps the end', () => {
    expect(maskEmail('tuan@example.test')).toBe('••••n@example.test');
    expect(maskEmail('  Nguyen.Van.A@Gmail.com ')).toBe('••••A@Gmail.com');
  });

  it('does not reveal a short name or its length', () => {
    expect(maskEmail('ab@example.test')).toBe('••••@example.test');
    expect(maskEmail('a@example.test')).toBe('••••@example.test');
    expect(maskEmail('zq@example.test').startsWith('••••@')).toBe(true);
  });

  it('falls back to dots for malformed input', () => {
    expect(maskEmail('')).toBe('••••');
    expect(maskEmail('no-at-sign')).toBe('••••');
    expect(maskEmail('@example.test')).toBe('••••');
    expect(maskEmail('name@')).toBe('••••');
  });

  it('keeps only the last three digits of a phone number', () => {
    expect(maskPhone('+84 912 345 678')).toBe('•••••••678');
    expect(maskPhone('12345')).toBe('••••');
  });

  it('picks email or phone masking from the value', () => {
    expect(maskContact('tuan@example.test')).toBe('••••n@example.test');
    expect(maskContact('0912345678')).toBe('•••••••678');
  });
});
