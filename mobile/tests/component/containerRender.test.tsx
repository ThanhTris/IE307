import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBottomNavigation, AppHeader, ApiFeatureFrame } from '../../src/shared/ui';
import { HomeFlowFrame } from '../../src/features/home/components/HomeFlowFrame';
import { DishSetupFrame } from '../../src/features/context/components/DishSetupFrame';
import { CONTAINER_GUTTER, CONTAINER_MAX_WIDTH, ICON_BUTTON_INSET } from '../../src/shared/ui/layout/ScreenContainer';

const colors = { surface: '#fff', line: '#ddd', text: '#000', muted: '#666', soft: '#eee' } as never;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>);
const contentStyle = () => StyleSheet.flatten(screen.getByTestId('screen-content').props.contentContainerStyle);

test('the header content sits in the shared centred container, its back icon on the content gutter', async () => {
  await wrap(<AppHeader variant="back" title="Tạo phòng" colors={colors} />);
  const header = StyleSheet.flatten(screen.getByTestId('app-header-content').props.style);
  expect(header).toMatchObject({ width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: CONTAINER_GUTTER - ICON_BUTTON_INSET });
});

test('the tab bar keeps its tabs inside the container instead of spreading over the whole screen', async () => {
  const items = [{ id: 'a', label: 'A', icon: 'home' as const, onPress: jest.fn() }, { id: 'b', label: 'B', icon: 'history' as const, onPress: jest.fn() }];
  await wrap(<AppBottomNavigation items={items} activeId="a" colors={colors} />);
  expect(screen.getByTestId('app-nav-tabs')).toHaveStyle({ width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' });
});

test.each([
  ['the list frame', <ApiFeatureFrame key="a" active="history" title="Lịch sử" onNavigate={jest.fn()} onHome={jest.fn()}>{null}</ApiFeatureFrame>],
  ['the create/join frame', <HomeFlowFrame key="b" title="Tham gia" onHome={jest.fn()}>{null}</HomeFlowFrame>],
  ['the setup frame', <DishSetupFrame key="c" title="Khẩu vị" onBack={jest.fn()} footer={null}>{null}</DishSetupFrame>],
])('%s puts its content in the container with the shared gutter', async (_name, node) => {
  await wrap(node);
  expect(contentStyle()).toMatchObject({ width: '100%', maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center' });
  const style = contentStyle();
  expect(style.paddingHorizontal ?? style.padding).toBe(CONTAINER_GUTTER);
});
