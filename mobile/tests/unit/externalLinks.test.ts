import { Linking } from 'react-native';
import {
  buildExternalUrl,
  buildGoogleMapsGeoUri,
  buildGoogleMapsUrl,
  buildTikTokUrl,
  buildYouTubeUrl,
  isValidExternalUrl,
  openExternalAction,
} from '../../src/features/result/services/externalLinks';

describe('GM-30 externalLinks — Results Maps & External Action Integration', () => {
  describe('isValidExternalUrl & Security Allowlist', () => {
    test('allows official Google Maps, TikTok, and YouTube URLs', () => {
      expect(isValidExternalUrl('https://www.google.com/maps/search/?api=1&query=Ph%E1%BB%9F')).toBe(true);
      expect(isValidExternalUrl('https://maps.google.com/?q=10.7,106.7')).toBe(true);
      expect(isValidExternalUrl('https://www.tiktok.com/search?q=Ph%E1%BB%9F')).toBe(true);
      expect(isValidExternalUrl('https://www.youtube.com/results?search_query=m%C3%B3n+Ph%E1%BB%9F')).toBe(true);
    });

    test('allows Android geo URIs', () => {
      expect(isValidExternalUrl('geo:10.7769,106.7009')).toBe(true);
      expect(isValidExternalUrl('geo:10.7769,106.7009?q=Qu%C3%A1n%20Ph%E1%BB%9F')).toBe(true);
      expect(isValidExternalUrl('geo:0,0?q=C%C6%A1m%20T%E1%BA%A5m')).toBe(true);
    });

    test('rejects disallowed schemes and domains', () => {
      expect(isValidExternalUrl('http://www.google.com/maps')).toBe(false); // only https
      expect(isValidExternalUrl('javascript:alert(1)')).toBe(false);
      expect(isValidExternalUrl('data:text/html,test')).toBe(false);
      expect(isValidExternalUrl('https://evil-maps.com/search')).toBe(false);
      expect(isValidExternalUrl('https://facebook.com')).toBe(false);
    });

    test('rejects URLs containing embedded credentials or suspicious token params', () => {
      expect(isValidExternalUrl('https://user:pass@www.google.com/maps')).toBe(false);
      expect(isValidExternalUrl('https://www.google.com/maps?token=secret_123')).toBe(false);
      expect(isValidExternalUrl('https://www.youtube.com/results?search_query=test&access_token=bad')).toBe(false);
      expect(isValidExternalUrl('https://www.tiktok.com/search?password=123')).toBe(false);
    });

    test('rejects malformed and empty URLs', () => {
      expect(isValidExternalUrl('')).toBe(false);
      expect(isValidExternalUrl('not_a_url')).toBe(false);
      expect(isValidExternalUrl('https://')).toBe(false);
    });
  });

  describe('URL Builders', () => {
    test('buildGoogleMapsUrl with place coordinates and id', () => {
      const url = buildGoogleMapsUrl({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Phở Bò',
        place: {
          id: 'place_g123',
          name: 'Phở Thìn 13 Lò Đúc',
          address: '13 Lò Đúc, Hai Bà Trưng, Hà Nội',
          distanceM: 350,
          latitude: 21.0185,
          longitude: 105.8562,
          attribution: 'Google',
        },
      });

      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=21.0185,105.8562&query_place_id=place_g123');
    });

    test('buildGoogleMapsUrl with place name and address without coordinates', () => {
      const url = buildGoogleMapsUrl({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Bún Chả',
        place: {
          id: 'place_no_coords',
          name: 'Bún Chả Hương Liên',
          address: '24 Lê Văn Hưu, Hà Nội',
          distanceM: null,
          latitude: null,
          longitude: null,
          attribution: null,
        },
      });

      expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
      expect(url).toContain(encodeURIComponent('Bún Chả Hương Liên, 24 Lê Văn Hưu, Hà Nội'));
    });

    test('buildGoogleMapsUrl fallback without place searches for quán + dishName', () => {
      const url = buildGoogleMapsUrl({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Cơm Tấm Sườn Bì Chả',
      });

      expect(url).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('quán Cơm Tấm Sườn Bì Chả')}`);
    });

    test('buildGoogleMapsGeoUri returns valid geo URI if coordinates exist', () => {
      const uri = buildGoogleMapsGeoUri({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Bánh Mì',
        place: {
          id: 'p1',
          name: 'Bánh Mì Huỳnh Hoa',
          address: null,
          distanceM: 500,
          latitude: 10.7712,
          longitude: 106.6923,
          attribution: null,
        },
      });

      expect(uri).toBe(`geo:10.7712,106.6923?q=${encodeURIComponent('Bánh Mì Huỳnh Hoa')}`);
    });

    test('buildGoogleMapsGeoUri returns null if place has no valid coordinates', () => {
      const uri = buildGoogleMapsGeoUri({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Bánh Mì',
      });
      expect(uri).toBeNull();
    });

    test('buildTikTokUrl formats search query correctly', () => {
      const url = buildTikTokUrl({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Bún Đậu Mắm Tôm',
      });
      expect(url).toBe(`https://www.tiktok.com/search?q=${encodeURIComponent('Bún Đậu Mắm Tôm')}`);
    });

    test('buildYouTubeUrl formats món search query correctly', () => {
      const url = buildYouTubeUrl({
        resultId: 'res_01',
        dishId: 'dish_01',
        dishName: 'Lẩu Thái',
      });
      expect(url).toBe(`https://www.youtube.com/results?search_query=${encodeURIComponent('món Lẩu Thái')}`);
    });

    test('buildExternalUrl delegates to the correct builder', () => {
      const target = { resultId: 'res_01', dishId: 'dish_01', dishName: 'Gỏi Cuốn' };
      expect(buildExternalUrl('maps', target)).toBe(buildGoogleMapsUrl(target));
      expect(buildExternalUrl('tiktok', target)).toBe(buildTikTokUrl(target));
      expect(buildExternalUrl('youtube', target)).toBe(buildYouTubeUrl(target));
    });
  });

  describe('openExternalAction', () => {
    test('opens allowed URL via opener callback', async () => {
      const opener = jest.fn().mockResolvedValue(true);
      const res = await openExternalAction(
        'maps',
        { resultId: 'r1', dishId: 'd1', dishName: 'Phở' },
        opener
      );

      expect(res).toEqual({
        ok: true,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('quán Phở')}`,
      });
      expect(opener).toHaveBeenCalledTimes(1);
    });

    test('returns error when opener returns false', async () => {
      const opener = jest.fn().mockResolvedValue(false);
      const res = await openExternalAction(
        'tiktok',
        { resultId: 'r1', dishId: 'd1', dishName: 'Bún Bò' },
        opener
      );

      expect(res).toEqual({ ok: false, error: 'CANNOT_OPEN_URL' });
    });

    test('returns error when opener throws', async () => {
      const opener = jest.fn().mockRejectedValue(new Error('ActivityNotFoundException'));
      const res = await openExternalAction(
        'youtube',
        { resultId: 'r1', dishId: 'd1', dishName: 'Cà Phê Trứng' },
        opener
      );

      expect(res).toEqual({ ok: false, error: 'ActivityNotFoundException' });
    });

    test('default opener delegates to Linking.openURL', async () => {
      const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);

      const res = await openExternalAction('maps', { resultId: 'r1', dishId: 'd1', dishName: 'Chả Giò' });
      expect(res.ok).toBe(true);
      expect(canOpenSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalled();

      canOpenSpy.mockRestore();
      openSpy.mockRestore();
    });
  });
});
