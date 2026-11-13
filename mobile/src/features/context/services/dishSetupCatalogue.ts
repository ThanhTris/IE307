import type { SetupCatalogue } from './dishSetup';

/**
 * Preference choices shown on the "Khẩu vị" screen.
 *
 * Each choice groups the dish families of taxonomy_registry_v1 it covers (`id` + `linkedIds`). Groups the catalogue does
 * not have yet (Lẩu & Nướng, Cháo/Súp, most snack groups, the four regions, Béo/Ngậy) use stable placeholder UUIDs
 * (uuid5 of `gicungduoc:ui:<code>`): the server accepts them as soft preferences that match no dish until the data and
 * backend phase gives them real taxonomy entries. Synthetic UI fixture, not production admission.
 */
export const PLACEHOLDER_IDS = {
  hotpotGrill: 'abd817da-4bee-58c2-936d-8f60aa7a5e80',
  porridgeSoup: '28fdc48b-f3cb-5ea3-a33b-17a32a3277b7',
  friedSkewer: '0164ed89-738b-572f-b499-1b2da5320a64',
  seafoodSnail: 'f77a6791-45e4-51cd-8792-452aa197ca2f',
  sweetCake: 'd2316212-3436-5178-8f44-5990a4ffda8f',
  cheIcecream: '97c011b2-3d0b-5d4c-92fb-7d05eb6a6538',
  fruitPickle: '841b5fe8-df62-5f93-bf75-34a79de55195',
  drySnack: 'b933e553-651e-5daa-bf13-489d7743a850',
  regionNorth: 'f3e57f22-1cc1-51c8-ad0d-5448436e2f85',
  regionCentral: '4591467d-959b-5115-b259-1af70b3f3e4b',
  regionSouth: '1b39960d-75f8-593d-bf40-7eb541d2f313',
  regionMekong: 'a739129b-1f51-5ba8-a53f-4c5d66455f68',
  /** Béo / Ngậy: the flavour contract only has spicy/salty/sweet/sour, so it rides in categoryIds for now. */
  flavorFatty: '86089932-3503-5934-a401-60374d76a61d',
} as const;

const FAMILY = {
  rice: 'e69b5f45-580d-5ee3-9e43-360650b4c650',
  bun: '14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc',
  pho: '1f89baf1-52f8-5f1e-98d8-7a36cae7a596',
  noodles: 'ac9e12a4-0416-53fc-af30-5b8b11ee0b49',
  mien: 'a7033166-916f-5748-b9c3-6670424dbfcf',
  huTieu: '1af6a10b-2820-5c18-909f-40acfa83ec84',
  nui: '5cc8224c-f7da-5c2e-9dcc-274504b977c4',
  banhMi: '811f6aa0-6b7f-5645-aeb9-c2f96cf50630',
  stickyRice: '87e3727e-5022-50a2-9a60-0b3dea21ca5d',
  banhBao: '542c7681-b911-5a11-ae24-7010ae19a0a1',
  banhCuon: '5dcf86dc-9369-59ca-a0cd-59836909b177',
  banhUot: '6bcd10c4-acc9-53cd-be72-43a4e7061b9a',
  banhCuonWrap: 'e78e10c2-a90f-57b6-bc28-421fd7bd6b0a',
  salad: 'bab170d6-9d47-57c9-8ca5-767954cbd111',
} as const;

export const dishSetupCatalogue: SetupCatalogue = {
  categories: [
    { id: FAMILY.rice, label: 'Cơm', code: 'family:rice' },
    { id: FAMILY.bun, linkedIds: [FAMILY.pho], label: 'Bún / Phở', code: 'family:bun' },
    { id: FAMILY.noodles, linkedIds: [FAMILY.mien, FAMILY.huTieu, FAMILY.nui], label: 'Mì / Miến / Hủ tiếu', code: 'family:noodles' },
    { id: PLACEHOLDER_IDS.hotpotGrill, label: 'Lẩu & Nướng', code: 'family:hotpot' },
    { id: FAMILY.banhMi, linkedIds: [FAMILY.stickyRice], label: 'Bánh mì / Xôi', code: 'family:banh_mi' },
    { id: PLACEHOLDER_IDS.porridgeSoup, label: 'Cháo / Súp', code: 'family:porridge' },
  ],
  snackCategories: [
    { id: PLACEHOLDER_IDS.friedSkewer, label: 'Đồ chiên & Xiên que', code: 'snack:fried' },
    { id: FAMILY.banhBao, linkedIds: [FAMILY.banhCuon, FAMILY.banhUot, FAMILY.banhCuonWrap], label: 'Các loại bánh mặn', code: 'snack:savory_cake' },
    { id: FAMILY.salad, label: 'Món trộn & Cuốn', code: 'snack:mixed' },
    { id: PLACEHOLDER_IDS.seafoodSnail, label: 'Ốc & Hải sản', code: 'snack:seafood' },
    { id: PLACEHOLDER_IDS.sweetCake, label: 'Bánh ngọt', code: 'snack:sweet_cake' },
    { id: PLACEHOLDER_IDS.cheIcecream, label: 'Chè & Kem', code: 'snack:che' },
    { id: PLACEHOLDER_IDS.fruitPickle, label: 'Trái cây & Đồ chua', code: 'snack:fruit' },
    { id: PLACEHOLDER_IDS.drySnack, label: 'Đồ ăn vặt khô', code: 'snack:dry' },
  ],
  cuisines: [
    { id: PLACEHOLDER_IDS.regionNorth, label: 'Miền Bắc', code: 'region:north' },
    { id: PLACEHOLDER_IDS.regionCentral, label: 'Miền Trung', code: 'region:central' },
    { id: PLACEHOLDER_IDS.regionSouth, label: 'Miền Nam', code: 'region:south' },
    { id: PLACEHOLDER_IDS.regionMekong, label: 'Miền Tây', code: 'region:mekong' },
  ],
};

/** Category choices for a meal: "Ăn vặt" has its own groups. */
export function categoriesForMeal(catalogue: SetupCatalogue, mealSlot: string | undefined) {
  return mealSlot === 'snack' && catalogue.snackCategories?.length ? catalogue.snackCategories : catalogue.categories;
}
