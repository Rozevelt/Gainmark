import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

// One name per icon, mapped to SF Symbols (iOS) and Material Symbols (Android/web).
const ICONS = {
  add: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  calculator: { ios: 'function', android: 'calculate' },
  trophy: { ios: 'trophy.fill', android: 'emoji_events' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart' },
  drag: { ios: 'line.3.horizontal', android: 'drag_indicator' },
  stop: { ios: 'stop.fill', android: 'stop' },
  timer: { ios: 'timer', android: 'timer' },
  reset: { ios: 'arrow.counterclockwise', android: 'restart_alt' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  more: { ios: 'ellipsis', android: 'more_vert' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  left: { ios: 'chevron.left', android: 'chevron_left' },
  right: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  delete: { ios: 'trash', android: 'delete' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  check: { ios: 'checkmark', android: 'check' },
  search: { ios: 'magnifyingglass', android: 'search' },
  dumbbell: { ios: 'dumbbell', android: 'fitness_center' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  up: { ios: 'arrow.up', android: 'arrow_upward' },
  link: { ios: 'link', android: 'link' },
  brush: { ios: 'paintbrush', android: 'brush' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  cards: { ios: 'rectangle.stack', android: 'view_agenda' },
  palette: { ios: 'paintpalette', android: 'palette' },
  drop: { ios: 'arrow.down.right', android: 'south_east' },
  flame: { ios: 'flame.fill', android: 'local_fire_department' },
  scale: { ios: 'scalemass', android: 'monitor_weight' },
  unlink: { ios: 'xmark.circle', android: 'link_off' },
  download: { ios: 'square.and.arrow.down', android: 'download' },
  upload: { ios: 'square.and.arrow.up.on.square', android: 'upload_file' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  backup: { ios: 'externaldrive.badge.timemachine', android: 'backup' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={size}
      tintColor={color}
    />
  );
}
