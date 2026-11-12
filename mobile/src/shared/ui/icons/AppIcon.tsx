import { Bell, CheckCheck, CircleHelp, Heart, Undo2, Cake, CameraOff, Ellipsis, CalendarDays, Check, Citrus, CookingPot, Copy, Flame, Globe, Hand, Leaf, LogOut, Pencil, Trash2, UserPlus, Wheat, CircleCheck, CircleX, Info, TriangleAlert, ChevronDown, ChevronLeft, ChevronRight, Clock, Coins, Cookie, Hourglass, House, Infinity as InfinityIcon, LogIn, Minus, Moon, Package, Plus, QrCode, Search, Share2, Soup, Sunrise, User, Users, Utensils, UtensilsCrossed, Wallet, X, Zap, type LucideIcon } from 'lucide-react-native';

/** One vector icon set (Lucide, SVG) for the whole app: sharp at any size or zoom. */
const icons = {
  home: House,
  friends: Users,
  history: Clock,
  profile: User,
  bell: Bell,
  back: ChevronLeft,
  next: ChevronRight,
  plus: Plus,
  minus: Minus,
  check: Check,
  join: LogIn,
  lightning: Zap,
  hourglass: Hourglass,
  search: Search,
  bowl: Soup,
  noodles: Utensils,
  sunrise: Sunrise,
  meal: UtensilsCrossed,
  moon: Moon,
  snack: Cookie,
  wallet: Wallet,
  coins: Coins,
  box: Package,
  infinity: InfinityIcon,
  qr: QrCode,
  share: Share2,
  down: ChevronDown,
  close: X,
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  rice: Wheat,
  pot: CookingPot,
  cake: Cake,
  globe: Globe,
  leaf: Leaf,
  citrus: Citrus,
  flame: Flame,
  hand: Hand,
  edit: Pencil,
  inviteUser: UserPlus,
  logout: LogOut,
  calendar: CalendarDays,
  trash: Trash2,
  copy: Copy,
  cameraOff: CameraOff,
  more: Ellipsis,
  undo: Undo2,
  readAll: CheckCheck,
  help: CircleHelp,
  heart: Heart,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof icons;

export function AppIcon({ name, size = 24, color, strokeWidth = 2, testID }: { name: AppIconName; size?: number; color?: string; strokeWidth?: number; testID?: string }) {
  const Icon = icons[name];
  return <Icon testID={testID} size={size} color={color} strokeWidth={strokeWidth} accessible={false} importantForAccessibility="no-hide-descendants" />;
}
