import type { ApiClient, CurrencyCode, FlavorProfile, MealSlot, PoolDish, PriceUnit, RoomContext, UserPreferences } from '../../../data/api/contracts';
import type { ApiTransport } from '../../../data/api/client/transport';

export type RoomSetupRepository = Pick<ApiClient, 'getDiscoveryContext' | 'getRoomSnapshot' | 'previewFoodPool' | 'updateContext' | 'updatePreferences'>;
export type AnchorSuggestion = { status: 'suggested'; anchorId: string } | { status: 'denied' | 'unavailable' | 'outside' };
export type SuggestAnchor = () => Promise<AnchorSuggestion>;
export type PreferenceOption = { id: string; label: string };
export type PreferenceCatalogue = { cuisines: readonly PreferenceOption[]; categories: readonly PreferenceOption[] };
export type RequestIdFactory = () => string;

export const mealLabels: Record<MealSlot, string> = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Ăn nhẹ' };
export const temperatureLabels = { hot: 'Nóng', warm: 'Ấm', cold: 'Lạnh', ambient: 'Nhiệt độ phòng', unknown: 'Chưa rõ nhiệt độ' } as const;
export const originLabels = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam', unknown: 'Chưa rõ nguồn gốc', not_applicable: 'Không áp dụng vùng miền' } as const;

export type GM24Scenario =
  | 'exact_20_lunch'
  | 'shortage_15_lunch'
  | 'shortage_7_dinner'
  | 'server_offline'
  | 'slow_response'
  | 'desired_time_passed';

export interface DishCatalogueItem {
  dishId: string;
  name: string;
  description?: string | null;
  mealSlots: MealSlot[];
  cuisineIds: string[];
  cuisineLabels?: string[];
  categoryIds: string[];
  categoryLabels?: string[];
  temperature?: 'hot' | 'warm' | 'cold' | 'ambient' | 'unknown' | null;
  flavor?: FlavorProfile | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: CurrencyCode | null;
  unit?: PriceUnit | null;
  servingSize?: string | null;
  priceReference?: {
    amount: number;
    currency: string;
    unit: PriceUnit;
    servingSize?: string | null;
    sourceRef?: string;
    checkedAt?: string;
  } | null;
  priceObservation?: {
    amount: number | null;
    currency?: string | null;
    unit?: string | null;
    observedAt?: string | null;
  } | null;
}

export type DishPoolPreviewResult =
  | {
      ok: true;
      contractVersion: string;
      available: number;
      requested: number;
      dishes: PoolDish[];
      mealSlot: MealSlot;
    }
  | {
      ok: false;
      code: 'SHORTAGE';
      available: number;
      requested: number;
      messageKey: 'INSUFFICIENT_DISHES';
    }
  | {
      ok: false;
      code: 'DESIRED_TIME_PASSED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'AUTH_REQUIRED' | 'INVALID_INPUT' | 'ERROR' | 'INVALID_PAYLOAD';
      messageKey: string;
      message: string;
    };

export const MOCK_GM24_LUNCH_DISHES: PoolDish[] = [
  { roundDishId: 'rd_01', choiceId: 'ch_01', dishId: 'dish_pho_bo', name: 'Phở bò tái nạm', description: 'Nước dùng ninh xương 12 tiếng thơm quế hồi, thịt bò tái mềm', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'north', temperature: 'hot', priceMin: 55000, priceMax: 75000, currency: 'VND', unit: 'menu_item_unspecified', servingSize: '1 tô' },
  { roundDishId: 'rd_02', choiceId: 'ch_02', dishId: 'dish_bun_bo_hue', name: 'Bún bò Huế đặc biệt', description: 'Nước dùng cay nồng hương sả ruốc, chả cua và nạm bò giòn sần sật', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'central', temperature: 'hot', priceMin: 60000, priceMax: 80000, currency: 'VND', unit: 'menu_item_unspecified', servingSize: '1 tô' },
  { roundDishId: 'rd_03', choiceId: 'ch_03', dishId: 'dish_com_tam', name: 'Cơm tấm sườn bì chả', description: 'Sườn nướng mật ong than hoa, chả trứng béo ngậy, hạt tấm dẻo', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_com'], origin: 'south', temperature: 'hot', priceMin: 50000, priceMax: 70000, currency: 'VND', unit: 'person', servingSize: '1 dĩa' },
  { roundDishId: 'rd_04', choiceId: 'ch_04', dishId: 'dish_banh_mi', name: 'Bánh mì pate thịt nguội', description: 'Vỏ giòn rụm, pate béo gan heo, thịt nguội xá xíu và đồ chua giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_banh_mi'], origin: 'south', temperature: 'ambient', priceMin: 25000, priceMax: 35000, currency: 'VND', unit: 'item', servingSize: '1 ổ' },
  { roundDishId: 'rd_05', choiceId: 'ch_05', dishId: 'dish_goi_cuon', name: 'Gỏi cuốn tôm thịt', description: 'Tôm sông luộc ngọt, thịt ba chỉ chấm tương đen bùi mè đậu phộng', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_khai_vi'], origin: 'south', temperature: 'cold', priceMin: 35000, priceMax: 50000, currency: 'VND', unit: 'portion', servingSize: '4 cuốn' },
  { roundDishId: 'rd_06', choiceId: 'ch_06', dishId: 'dish_hu_tieu', name: 'Hủ tiếu Nam Vang khô', description: 'Sợi hủ tiếu dai trộn sốt đậm đà, tôm tươi, gan heo và tóp mỡ giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'south', temperature: 'hot', priceMin: 55000, priceMax: 75000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_07', choiceId: 'ch_07', dishId: 'dish_mi_quang', name: 'Mì Quảng tôm thịt', description: 'Sợi mì vàng óng, nước nhưn sánh vàng nghệ, bánh tráng mè nướng giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'central', temperature: 'warm', priceMin: 50000, priceMax: 65000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_08', choiceId: 'ch_08', dishId: 'dish_bun_cha', name: 'Bún chả Hà Nội nướng than', description: 'Chả viên nướng xém cạnh, nước mắm dấm ớt đu đủ chua giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'north', temperature: 'hot', priceMin: 55000, priceMax: 75000, currency: 'VND', unit: 'person', servingSize: '1 suất' },
  { roundDishId: 'rd_09', choiceId: 'ch_09', dishId: 'dish_banh_xeo', name: 'Bánh xèo miền Tây giòn rụm', description: 'Vỏ bột gạo cốt dừa vàng giòn, nhân tôm tép thịt giá cuốn rau rừng', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_banh'], origin: 'south', temperature: 'hot', priceMin: 60000, priceMax: 90000, currency: 'VND', unit: 'item', servingSize: '1 cái lớn' },
  { roundDishId: 'rd_10', choiceId: 'ch_10', dishId: 'dish_cao_lau', name: 'Cao lầu Hội An truyền thống', description: 'Sợi cao lầu tro tràm dẻo bùi, thịt xá xíu thơm và da heo chiên giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'central', temperature: 'warm', priceMin: 50000, priceMax: 65000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_11', choiceId: 'ch_11', dishId: 'dish_com_ga', name: 'Cơm gà Hội An xé phay', description: 'Cơm nấu nước luộc gà vàng ươm, gỏi gà bóp rau răm hành tây chua ngọt', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_com'], origin: 'central', temperature: 'warm', priceMin: 60000, priceMax: 80000, currency: 'VND', unit: 'person', servingSize: '1 dĩa' },
  { roundDishId: 'rd_12', choiceId: 'ch_12', dishId: 'dish_bun_rieu', name: 'Bún riêu cua đồng tóp mỡ', description: 'Riêu cua đồng thơm béo, đậu hũ chiên phồng và cà chua nước dùng thanh mát', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'north', temperature: 'hot', priceMin: 45000, priceMax: 60000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_13', choiceId: 'ch_13', dishId: 'dish_banh_cuon', name: 'Bánh cuốn nóng tráng tay', description: 'Bánh mỏng mịn nhân thịt mộc nhĩ, chả lụa thơm ngậy và hành phi giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_banh'], origin: 'north', temperature: 'hot', priceMin: 40000, priceMax: 55000, currency: 'VND', unit: 'portion', servingSize: '1 dĩa' },
  { roundDishId: 'rd_14', choiceId: 'ch_14', dishId: 'dish_cha_ca', name: 'Chả cá Lã Vọng thơm nức', description: 'Cá lăng nướng vàng thơm thì là hành hoa, chấm mắm tôm chanh sủi bọt', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_xao'], origin: 'north', temperature: 'hot', priceMin: 120000, priceMax: 150000, currency: 'VND', unit: 'person', servingSize: '1 chảo nhỏ' },
  { roundDishId: 'rd_15', choiceId: 'ch_15', dishId: 'dish_nem_nuong', name: 'Nem nướng Nha Trang cuốn bánh tráng', description: 'Nem nướng than hồng thơm ngọt, sốt tương nếp bùi và ram giòn rụm', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_khai_vi'], origin: 'central', temperature: 'warm', priceMin: 65000, priceMax: 85000, currency: 'VND', unit: 'portion', servingSize: '1 mẹt' },
  { roundDishId: 'rd_16', choiceId: 'ch_16', dishId: 'dish_com_nieu', name: 'Cơm niêu cá bống kho tộ', description: 'Cơm cháy đáy giòn tan, cá kho tiêu sánh nước màu dừa thơm đậm đà', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_com'], origin: 'south', temperature: 'hot', priceMin: 80000, priceMax: 120000, currency: 'VND', unit: 'person', servingSize: '1 thố niêu' },
  { roundDishId: 'rd_17', choiceId: 'ch_17', dishId: 'dish_canh_chua', name: 'Canh chua cá lóc bông điên điển', description: 'Nước canh me thanh dịu, cá lóc đồng tươi ngọt, bạc hà giá đậu bắp', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_canh'], origin: 'south', temperature: 'hot', priceMin: 65000, priceMax: 90000, currency: 'VND', unit: 'group', servingSize: '1 tô canh' },
  { roundDishId: 'rd_18', choiceId: 'ch_18', dishId: 'dish_thit_kho', name: 'Thịt kho tàu hột vịt nước dừa', description: 'Thịt ba chỉ mềm rục trong nước dừa tươi, trứng vịt thấm đẫm màu hổ phách', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_man'], origin: 'south', temperature: 'hot', priceMin: 60000, priceMax: 80000, currency: 'VND', unit: 'portion', servingSize: '1 dĩa' },
  { roundDishId: 'rd_19', choiceId: 'ch_19', dishId: 'dish_bo_kho', name: 'Bò kho bánh mì sốt vang', description: 'Bắp bò hầm mềm đậm hương quế hồi cà rốt, chấm bánh mì giòn tan', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_ham'], origin: 'south', temperature: 'hot', priceMin: 55000, priceMax: 75000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_20', choiceId: 'ch_20', dishId: 'dish_chao_long', name: 'Cháo lòng má heo truyền thống', description: 'Cháo hạt nở bung thơm gừng tiêu, dồi chiên giòn và lòng non tươi giòn', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_chao'], origin: 'south', temperature: 'hot', priceMin: 40000, priceMax: 60000, currency: 'VND', unit: 'person', servingSize: '1 tô' },
  { roundDishId: 'rd_21', choiceId: 'ch_21', dishId: 'dish_bun_dau', name: 'Bún đậu mắm tôm thập cẩm', description: 'Đậu mơ rán lướt ván giòn vỏ mềm ruột, chả cốm nóng và thịt bắp giò luộc', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_nuoc'], origin: 'north', temperature: 'ambient', priceMin: 65000, priceMax: 90000, currency: 'VND', unit: 'portion', servingSize: '1 mẹt' },
  { roundDishId: 'rd_22', choiceId: 'ch_22', dishId: 'dish_com_rang', name: 'Cơm rang dưa bò giòn hạt', description: 'Cơm rang vàng giòn rụm, dưa chua xào thịt bò mềm ngọt vừa miệng', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_com'], origin: 'north', temperature: 'hot', priceMin: 50000, priceMax: 70000, currency: 'VND', unit: 'person', servingSize: '1 dĩa' },
  { roundDishId: 'rd_23', choiceId: 'ch_23', dishId: 'dish_mien_xao', name: 'Miến xào cua bể tươi ngọt', description: 'Sợi miến dai mềm không nát thấm thịt cua bể và nấm hương mộc nhĩ', cuisineIds: ['cui_vietnam'], categoryIds: ['cat_mon_xao'], origin: 'north', temperature: 'hot', priceMin: 85000, priceMax: 120000, currency: 'VND', unit: 'person', servingSize: '1 dĩa' },
];

export async function previewDishPoolLive(
  transport: ApiTransport,
  payload: {
    mealSlot: MealSlot;
    dishCount: number;
    token?: string;
    signal?: AbortSignal;
    preferences?: UserPreferences;
  }
): Promise<DishPoolPreviewResult> {
  try {
    const raw = await transport.invoke<{
      ok?: boolean;
      data?: {
        contractVersion?: string;
        available?: number;
        requested?: number;
        dishes?: any[];
      };
      error?: {
        messageKey?: string;
        details?: { available?: number; requested?: number };
      };
    }>(
      'preview_dish_pool',
      {
        payload: {
          contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2',
          mealSlot: payload.mealSlot,
          dishCount: payload.dishCount,
          ...(payload.preferences ? { preferences: payload.preferences } : {}),
        },
      },
      { token: payload.token, signal: payload.signal }
    );

    if (raw?.ok && raw.data) {
      if (raw.data.contractVersion !== 'dish-catalogue/roadmap-v2/GM-18.2') {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          messageKey: 'INVALID_PAYLOAD',
          message: 'Phiên bản hợp đồng không hợp lệ từ máy chủ.',
        };
      }

      if (!Array.isArray(raw.data.dishes) || raw.data.dishes.length !== payload.dishCount) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          messageKey: 'INVALID_PAYLOAD',
          message: `Số lượng món trả về (${raw.data.dishes?.length ?? 0}) không khớp với số món yêu cầu (${payload.dishCount}).`,
        };
      }

      if (raw.data.requested != null && raw.data.requested !== payload.dishCount) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          messageKey: 'INVALID_PAYLOAD',
          message: `Số món yêu cầu được xác nhận (${raw.data.requested}) không khớp với yêu cầu (${payload.dishCount}).`,
        };
      }

      if (raw.data.available != null && raw.data.available < payload.dishCount) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          messageKey: 'INVALID_PAYLOAD',
          message: `Số món khả dụng (${raw.data.available}) nhỏ hơn số món yêu cầu (${payload.dishCount}).`,
        };
      }

      const seenDishIds = new Set<string>();
      const dishes: PoolDish[] = [];

      for (const d of raw.data.dishes) {
        if (!d || typeof d !== 'object') {
          return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            messageKey: 'INVALID_PAYLOAD',
            message: 'Phần tử món ăn trong danh sách không hợp lệ.',
          };
        }

        const dishId = typeof d.dishId === 'string' ? d.dishId.trim() : '';
        const name = typeof d.name === 'string' ? d.name.trim() : '';

        if (!dishId) {
          return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            messageKey: 'INVALID_PAYLOAD',
            message: 'Món ăn thiếu mã định danh (dishId) bắt buộc.',
          };
        }

        if (!name) {
          return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            messageKey: 'INVALID_PAYLOAD',
            message: 'Món ăn thiếu tên (name) bắt buộc.',
          };
        }

        if (seenDishIds.has(dishId)) {
          return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            messageKey: 'INVALID_PAYLOAD',
            message: `Phát hiện mã món ăn trùng lặp: ${dishId}.`,
          };
        }
        seenDishIds.add(dishId);

        const roundDishId =
          typeof d.roundDishId === 'string' && d.roundDishId.trim()
            ? d.roundDishId.trim()
            : dishId;
        const choiceId =
          typeof d.choiceId === 'string' && d.choiceId.trim()
            ? d.choiceId.trim()
            : dishId;

        // Artwork: keep null if missing, preserve usageRights faithfully
        let artwork: PoolDish['artwork'] = null;
        if (d.artwork && typeof d.artwork === 'object') {
          const url =
            typeof d.artwork.url === 'string'
              ? d.artwork.url
              : typeof d.artwork.uri === 'string'
              ? d.artwork.uri
              : '';
          if (url) {
            artwork = {
              url,
              usageRights:
                typeof d.artwork.usageRights === 'string'
                  ? d.artwork.usageRights
                  : 'unknown',
              license: typeof d.artwork.license === 'string' ? d.artwork.license : null,
              attribution:
                typeof d.artwork.attribution === 'string'
                  ? d.artwork.attribution
                  : null,
            };
          }
        }

        const priceMin =
          typeof d.priceMin === 'number'
            ? d.priceMin
            : typeof d.priceReference?.amount === 'number'
            ? d.priceReference.amount
            : typeof d.priceObservation?.amount === 'number'
            ? d.priceObservation.amount
            : null;

        const priceMax =
          typeof d.priceMax === 'number'
            ? d.priceMax
            : typeof d.priceReference?.amount === 'number'
            ? d.priceReference.amount
            : typeof d.priceObservation?.amount === 'number'
            ? d.priceObservation.amount
            : null;

        const currency =
          typeof d.currency === 'string'
            ? d.currency
            : typeof d.priceReference?.currency === 'string'
            ? d.priceReference.currency
            : typeof d.priceObservation?.currency === 'string'
            ? d.priceObservation.currency
            : null;

        const unit =
          typeof d.unit === 'string'
            ? d.unit
            : typeof d.priceReference?.unit === 'string'
            ? d.priceReference.unit
            : typeof d.priceObservation?.unit === 'string'
            ? d.priceObservation.unit
            : null;

        const servingSize =
          typeof d.servingSize === 'string'
            ? d.servingSize
            : typeof d.priceReference?.servingSize === 'string'
            ? d.priceReference.servingSize
            : null;

        dishes.push({
          roundDishId,
          choiceId,
          dishId,
          name,
          description: typeof d.description === 'string' ? d.description : null,
          cuisineIds: Array.isArray(d.cuisineIds) ? d.cuisineIds : [],
          categoryIds: Array.isArray(d.categoryIds) ? d.categoryIds : [],
          origin: d.origin ?? 'unknown',
          temperature: d.temperature ?? null,
          flavor: d.flavor ?? null,
          artwork,
          priceMin,
          priceMax,
          currency,
          unit,
          servingSize,
        });
      }

      return {
        ok: true,
        contractVersion: raw.data.contractVersion,
        available: raw.data.available ?? dishes.length,
        requested: raw.data.requested ?? payload.dishCount,
        dishes,
        mealSlot: payload.mealSlot,
      };
    }

    if (raw?.error?.messageKey === 'INSUFFICIENT_DISHES' || (raw as any)?.status === 409) {
      const details = raw?.error?.details ?? (raw as any)?.body?.error?.details;
      return {
        ok: false,
        code: 'SHORTAGE',
        available: details?.available ?? 0,
        requested: details?.requested ?? payload.dishCount,
        messageKey: 'INSUFFICIENT_DISHES',
      };
    }

    const messageKey = raw?.error?.messageKey ?? 'ERROR';
    return {
      ok: false,
      code: 'ERROR',
      messageKey,
      message: setupError(messageKey),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.message === 'TIMEOUT') {
      return { ok: false, code: 'TIMEOUT', messageKey: 'TIMEOUT', message: setupError('TIMEOUT') };
    }
    if (err?.status === 409 || err?.body?.error?.messageKey === 'INSUFFICIENT_DISHES') {
      const details = err?.body?.error?.details;
      return {
        ok: false,
        code: 'SHORTAGE',
        available: details?.available ?? 0,
        requested: details?.requested ?? payload.dishCount,
        messageKey: 'INSUFFICIENT_DISHES',
      };
    }
    if (err?.status === 401) {
      return { ok: false, code: 'AUTH_REQUIRED', messageKey: 'AUTH_REQUIRED', message: setupError('AUTH_REQUIRED') };
    }
    return { ok: false, code: 'NETWORK_ERROR', messageKey: 'NETWORK_ERROR', message: setupError('NETWORK_ERROR') };
  }
}

export async function previewDishPoolMock(
  scenario: GM24Scenario,
  params: {
    mealSlot: MealSlot;
    dishCount: number;
    desiredAt?: string | null;
    timeMode: 'now' | 'scheduled';
    serverTimeMs: number;
  }
): Promise<DishPoolPreviewResult> {
  if (
    scenario === 'desired_time_passed' ||
    (params.timeMode === 'scheduled' &&
      params.desiredAt &&
      Number.isFinite(Date.parse(params.desiredAt)) &&
      Date.parse(params.desiredAt) <= params.serverTimeMs)
  ) {
    return {
      ok: false,
      code: 'DESIRED_TIME_PASSED',
      messageKey: 'DESIRED_TIME_PASSED',
      message: setupError('DESIRED_TIME_PASSED'),
    };
  }

  if (scenario === 'server_offline') {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      messageKey: 'NETWORK_ERROR',
      message: setupError('NETWORK_ERROR'),
    };
  }

  if (scenario === 'slow_response') {
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  if (scenario === 'shortage_15_lunch') {
    if (params.dishCount > 15) {
      return {
        ok: false,
        code: 'SHORTAGE',
        available: 15,
        requested: params.dishCount,
        messageKey: 'INSUFFICIENT_DISHES',
      };
    }
  }

  if (scenario === 'shortage_7_dinner' || params.mealSlot === 'dinner' || (params.mealSlot === 'snack' && params.dishCount > 7)) {
    if (params.dishCount > 7) {
      return {
        ok: false,
        code: 'SHORTAGE',
        available: 7,
        requested: params.dishCount,
        messageKey: 'INSUFFICIENT_DISHES',
      };
    }
  }

  const pool = MOCK_GM24_LUNCH_DISHES.slice(0, Math.min(params.dishCount, MOCK_GM24_LUNCH_DISHES.length));
  return {
    ok: true,
    contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2',
    available: 23,
    requested: params.dishCount,
    dishes: pool,
    mealSlot: params.mealSlot,
  };
}

// Read only from event handlers; renders use the last fetched server timestamp.
export function currentServerTime(serverTime: string, loadedAt: number, now: number = Date.now()): number {
  return Date.parse(serverTime) + Math.max(0, now - loadedAt);
}

export function localTime(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ') : '';
}

export function parseLocalTime(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(value.replace(' ', 'T') + ':00+07:00');
  if (!Number.isFinite(date.getTime())) return undefined;
  const iso = date.toISOString();
  return localTime(iso) === value ? iso : undefined;
}

export function shiftLocalDate(value: string, days: number): string | undefined {
  const iso = parseLocalTime(`${value} 00:00`);
  if (!iso || !Number.isInteger(days)) return undefined;
  const target = new Date(Date.parse(iso) + days * 86400000 + 7 * 3600000);
  if (!Number.isFinite(target.getTime())) return undefined;
  const shifted = target.toISOString().slice(0, 10);
  return parseLocalTime(`${shifted} 00:00`) ? shifted : undefined;
}

export function mealDateLabel(value: string): string {
  if (!parseLocalTime(`${value} 00:00`)) return value || 'Chưa chọn ngày';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function suggestedMeal(iso: string): Pick<RoomContext, 'mealSlot' | 'timeHint'> {
  const hour = new Date(Date.parse(iso) + 7 * 3600000).getUTCHours();
  if (hour >= 5 && hour < 11) return { mealSlot: 'breakfast' };
  if (hour < 15 && hour >= 11) return { mealSlot: 'lunch' };
  if (hour < 18 && hour >= 15) return { mealSlot: 'snack' };
  return hour >= 22 || hour < 5 ? { mealSlot: 'dinner', timeHint: 'late_night' } : { mealSlot: 'dinner' };
}

// A meal chip suggests the next occurrence in UTC+7; snack leaves custom time alone.
// The caller supplies server time. This never runs as an eligibility fallback.
export function nextMealTime(meal: MealSlot, serverNow: number): string | undefined {
  if (meal === 'snack') return undefined;
  const hour = { breakfast: 7, lunch: 12, dinner: 19 }[meal];
  const local = new Date(serverNow + 7 * 3600000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  let next = midnight + (hour - 7) * 3600000;
  if (next <= serverNow) next += 24 * 3600000;
  return new Date(next).toISOString();
}

export function parseBudget(value: string): number | null | undefined {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const amount = Number(value.trim());
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}

export function dishPrice(dish: PoolDish): string {
  const price = dish.price ?? dish;
  const low = price.priceMin;
  const high = price.priceMax;
  if ((low == null && high == null) || !price.currency) return 'Chưa có giá';
  const number = (v: number) => new Intl.NumberFormat('vi-VN').format(v);
  const range = low != null && high != null ? low === high ? number(low) : `${number(low)}–${number(high)}` : low != null ? `Từ ${number(low)}` : `Đến ${number(high!)}`;
  const units = { person: 'người', portion: 'suất', item: 'món', group: 'nhóm', kg: 'kg', menu_item_unspecified: 'giá menu, chưa rõ khẩu phần' };
  return `${range} ${price.currency === 'VND' ? 'đ' : price.currency}${price.unit ? ` / ${units[price.unit]}` : ' · chưa rõ đơn vị'}`;
}

export function dishDistance(distanceM?: number | null): string {
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM < 0) return 'Chưa có khoảng cách đường chim bay từ điểm ăn chung';
  const km = distanceM >= 1000;
  const value = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(km ? distanceM / 1000 : distanceM);
  return `${value} ${km ? 'km' : 'm'} đường chim bay từ điểm ăn chung`;
}

export function setupError(code: string): string {
  switch (code) {
    case 'OUT_OF_COVERAGE': return 'Khu vực này chưa có dữ liệu. Hãy chọn một điểm công cộng trong vùng hỗ trợ.';
    case 'NO_ELIGIBLE_FOOD': return 'Chưa có món phù hợp với buổi và giờ này. Hãy sửa bối cảnh; không tự mở rộng giờ hay khu vực.';
    case 'INSUFFICIENT_DISHES': return 'Chưa đủ số món phù hợp với yêu cầu thiết lập. Hãy sửa buổi ăn hoặc giảm số món.';
    case 'AVAILABILITY_UNKNOWN': return 'Chưa đủ dữ liệu để xác nhận giờ bán. Hãy sửa bối cảnh hoặc thử lại sau.';
    case 'VERSION_CONFLICT': case 'CONTEXT_CHANGED': return 'Bối cảnh đã thay đổi. Tải lại và xác nhận trước khi lưu.';
    case 'DESIRED_TIME_PASSED': return 'Giờ ăn đã qua. Hãy chọn và xác nhận giờ mới.';
    case 'NOT_HOST': return 'Chỉ chủ phòng được sửa bối cảnh chung.';
    case 'NOT_MEMBER': case 'AUTH_REQUIRED': return 'Phiên tham gia không còn hợp lệ. Hãy quay lại và mở lại phòng.';
    case 'ROOM_EXPIRED': case 'ROOM_TERMINAL': case 'ROOM_LOCKED': case 'INVALID_ROOM_STATE': return 'Phòng không còn cho phép thay đổi. Hãy quay lại để kiểm tra trạng thái.';
    case 'TIMEOUT': case 'NETWORK_ERROR': return 'Chưa biết yêu cầu đã được nhận hay chưa. Thử lại cùng yêu cầu để kiểm tra.';
    case 'INVALID_PAYLOAD': return 'Dữ liệu danh sách món từ máy chủ không hợp lệ. Hãy thử lại.';
    default: return 'Chưa tải hoặc lưu được dữ liệu. Hãy thử tải lại.';
  }
}
