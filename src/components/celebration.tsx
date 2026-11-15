import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useCelebration, type CelebrationId } from '@/lib/celebrations';

/**
 * Holiday versions of the logo at the top left (512px squares; replace a file with the same name to change it).
 */
const HOLIDAY_LOGOS: Record<CelebrationId, number> = {
  christmas: require('@/assets/images/holidays/christmas.png'),
  newyear: require('@/assets/images/holidays/newyear.png'),
  valentines: require('@/assets/images/holidays/valentines.png'),
  easter: require('@/assets/images/holidays/easter.png'),
  midsummer: require('@/assets/images/holidays/midsummer.png'),
  halloween: require('@/assets/images/holidays/halloween.png'),
};

/** The logo at the top left: the holiday version on a holiday, otherwise the normal icon. */
export function BrandLogo({ style }: { style: StyleProp<ImageStyle> }) {
  const holiday = useCelebration();
  return <Image source={holiday ? HOLIDAY_LOGOS[holiday.id] : require('@/assets/images/icon.png')} style={style} />;
}
