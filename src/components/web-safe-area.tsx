import { useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The screen's safe areas (status bar, notch, home indicator) as the browser reports them. */
function measure(): EdgeInsets {
  if (typeof document === 'undefined' || !document.body) return ZERO;
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(el);
  const cs = window.getComputedStyle(el);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  el.remove();

  // An iPhone home-screen app draws under the status bar. If Safari still reports no room for
  // it, leave room anyway, so the clock and battery never sit on top of the app.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const iphone = /iPhone|iPod/.test(nav.userAgent);
  if (iphone && nav.standalone === true && insets.top < 20) {
    const portrait = window.innerHeight > window.innerWidth;
    // Phones without a home button (taller screens) have a taller status bar.
    const tall = Math.max(window.screen.height, window.screen.width) >= 812;
    if (portrait) insets.top = tall ? 50 : 20;
  }
  return insets;
}

const same = (a: EdgeInsets, b: EdgeInsets) =>
  a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

/**
 * Web only: gives the app safe-area insets measured straight from the browser, and measured
 * again after start-up and on every resize. (The standard measurement can come back as 0 in an
 * iPhone home-screen app, which put the status bar on top of the app's header.)
 */
export function WebSafeArea({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <Measured>{children}</Measured>;
}

function Measured({ children }: { children: ReactNode }) {
  const [insets, setInsets] = useState(measure);

  useEffect(() => {
    const update = () => {
      const next = measure();
      setInsets((prev) => (same(prev, next) ? prev : next));
    };
    // iOS can report the real values a moment after the app opens.
    const timers = [50, 300, 1000, 2500].map((ms) => setTimeout(update, ms));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}
