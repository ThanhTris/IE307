import type { SetupCatalogue } from '../features/context/services/dishSetup';

/** Synthetic UI fixture using IDs received from taxonomy_registry_v1, not production admission. */
export const dishSetupCatalogue: SetupCatalogue = {
  categories: [
    { id: 'e69b5f45-580d-5ee3-9e43-360650b4c650', label: 'Cơm', code: 'family:rice' },
    { id: '14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc', linkedIds: ['1f89baf1-52f8-5f1e-98d8-7a36cae7a596'], label: 'Bún / Phở', code: 'family:bun' },
    { id: 'ac9e12a4-0416-53fc-af30-5b8b11ee0b49', label: 'Mì', code: 'family:noodles' },
    { id: '7d4b93cd-665d-5ef3-bde6-9d2f1a721f40', label: 'Lẩu', code: 'family:hotpot' },
    { id: '26e61cf0-7a35-56aa-a855-a11c6cd3599b', label: 'Món cuốn', code: 'family:rolls' },
    { id: '5dcf86dc-9369-59ca-a0cd-59836909b177', label: 'Bánh cuốn', code: 'family:banh_cuon' },
  ],
  cuisines: [
    { id: 'd7bf6ad7-596c-5ee0-bf45-ccedfcf6460b', label: 'Việt', code: 'vi' },
    { id: '9397254e-ad5f-5f85-9674-96933b6c0db2', label: 'Hàn', code: 'ko' },
    { id: '73e625b4-4d2f-50f8-8051-111b703f6f11', label: 'Nhật', code: 'ja' },
    { id: '76754d62-96e1-5d54-bf87-048a0df60e3f', label: 'Hoa', code: 'zh' },
    { id: 'a62999b1-8c5b-58dd-9739-9856a1f534f0', label: 'Thái', code: 'th' },
    { id: 'b251e842-814b-5184-b25b-2636e3fcd6cd', label: 'Ý', code: 'it' },
  ],
};
