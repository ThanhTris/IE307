import type { ComponentProps } from 'react';
import { defaultScheduledTime, emptyPreferences, type SetupDraft, type SetupStage } from '../features/context/services/dishSetup';
import { DishSetupFlow } from '../features/context/screens/DishSetupFlow';
import { flavorChoices, toggleFlavor } from '../features/preferences/services/dishPreferences';
import { dishSetupCatalogue } from './dishSetupCatalogue';
import { createDishSetupPreview, type DishSetupScenario } from './dishSetupPreview';

type Case = { id: string; label: string; scenario?: DishSetupScenario; settings?: Partial<SetupDraft>; panel?: 'schedule' | 'calendar' | 'friends' | 'discard' };
export const dishSetupCases: Case[] = [
  { id: 'R01', label: 'Thiết lập ban đầu' }, { id: 'R02', label: 'Ăn sáng', settings: { mealSlot: 'breakfast', budget: 'under50' } },
  { id: 'R03', label: 'Ăn tối/hẹn giờ', settings: { mealSlot: 'dinner', timeMode: 'scheduled' } },
  { id: 'R04', label: 'Ăn vặt', settings: { mealSlot: 'snack' } }, { id: 'R05', label: 'Không giới hạn ngân sách', settings: { budget: null } },
  { id: 'R06', label: 'Hẹn giờ', panel: 'schedule' }, { id: 'R07', label: 'Chọn ngày', panel: 'calendar' },
  { id: 'R08', label: 'Giờ đã qua', settings: { timeMode: 'scheduled' } },
  { id: 'R09', label: 'Chọn bạn', panel: 'friends' }, { id: 'R10', label: 'Không tìm thấy bạn', panel: 'friends' },
  { id: 'R11', label: 'Đang tạo (nhấn Tiếp tục)', scenario: 'loading' }, { id: 'R12', label: 'Tạo lỗi (nhấn Tiếp tục)', scenario: 'create-error' },
  { id: 'R13', label: 'Ngoại tuyến', scenario: 'offline' }, { id: 'R14', label: 'Bỏ thiết lập', panel: 'discard' }, { id: 'R15', label: 'Chưa có lịch sử' },
  { id: 'P01', label: 'Anything' }, { id: 'P02', label: 'Một khẩu vị' }, { id: 'P03', label: 'Nhiều khẩu vị' },
  { id: 'P04', label: 'Sửa từ phòng chờ' }, { id: 'P05', label: 'Đang lưu (nhấn Lưu)', scenario: 'loading' },
  { id: 'P06', label: 'Lưu lỗi (nhấn Lưu)', scenario: 'save-error' }, { id: 'P07', label: 'Offline/nháp', scenario: 'offline' },
  { id: 'P08', label: 'Tải chậm', scenario: 'loading' }, { id: 'P09', label: 'Tải lỗi', scenario: 'load-error' },
  { id: 'P10', label: 'Bỏ khẩu vị', panel: 'discard' }, { id: 'P11', label: 'Phòng đóng', scenario: 'closed' },
  { id: 'min10', label: 'Biên 10 món', settings: { dishCount: 10 } }, { id: 'max20', label: 'Biên 20 món', settings: { dishCount: 20 } },
  { id: 'shortage15', label: 'Chỉ có15/chọn20', scenario: 'shortage15' }, { id: 'shortage7', label: 'Thiếu dưới10', scenario: 'shortage7' },
  { id: 'timeout', label: 'Mất ACK', scenario: 'timeout' }, { id: 'ack-read-error', label: 'ACK/đọc lỗi', scenario: 'ack-read-error' },
  { id: 'stale', label: 'Phiên bản cũ', scenario: 'stale' }, { id: 'taxonomy-empty', label: 'Taxonomy rỗng', scenario: 'taxonomy-empty' },
  { id: 'member', label: 'Thành viên chỉ sửa khẩu vị', scenario: 'member' },
];
export function casesForSetupStage(stage: SetupStage) {
  if (stage === 'complete' || stage === 'closed') return [];
  const shared = new Set(['timeout', 'ack-read-error', 'stale']);
  return dishSetupCases.filter(item => stage === 'preferences' ? item.id.startsWith('P') || item.id === 'taxonomy-empty' || shared.has(item.id) : !item.id.startsWith('P') && item.id !== 'taxonomy-empty');
}
export function createDishSetupCase(id: string, now = Date.now(), context: 'setup' | 'preferences' = 'setup'): Omit<ComponentProps<typeof DishSetupFlow>, 'onExit' | 'controls'> {
  const entry = dishSetupCases.find(item => item.id === id) ?? dishSetupCases[0]!;
  const future = defaultScheduledTime(now), past = new Date(now - 60000).toISOString();
  const isPreferences = entry.id.startsWith('P') || (!entry.id.startsWith('R') && context === 'preferences');
  const chosen = { ...emptyPreferences(), categoryIds: dishSetupCatalogue.categories.slice(0, 2).flatMap(option => [option.id, ...(option.linkedIds ?? [])]), cuisineIds: dishSetupCatalogue.cuisines.slice(0, 1).map(option => option.id) };
  const preferences = entry.id === 'P02' ? toggleFlavor(emptyPreferences(), flavorChoices[3]) : entry.id === 'P01' || entry.id === 'P08' || entry.id === 'P09' ? emptyPreferences() : chosen;
  return { initialStage: isPreferences ? 'preferences' : 'setup', initialPanel: entry.panel, initialSchedule: future, initialSearch: entry.id === 'R10' ? 'Ngọc Anh' : undefined,
    gateway: createDishSetupPreview(entry.scenario, { settings: { ...entry.settings, ...(entry.settings?.timeMode === 'scheduled' ? { desiredAt: entry.id === 'R08' ? past : future } : {}) },
      room: isPreferences ? { id: 'ui-room', code: 'MCK234', version: 1, state: 'LOBBY' } : undefined,
      accountDefaults: isPreferences ? preferences : emptyPreferences(), preferences: entry.id === 'P04' ? preferences : undefined }, now) };
}
