import { PillStepper, Row, Section, SettingsPage } from '@/components/settings-ui';
import { Toggle } from '@/components/toggle';
import { requestReminderPermission } from '@/lib/reminders';
import { liveTimerAvailable } from '../../modules/live-timer';
import { DEFAULT_REST, DEFAULT_TIMER, formatClock, useStore } from '@/store/store';

/** The workout timer and the rest timer. */
export default function TimerSettings() {
  const timer = useStore((s) => s.settings.timer) ?? DEFAULT_TIMER;
  const rest = useStore((s) => s.settings.rest) ?? DEFAULT_REST;
  const setTimerSettings = useStore((s) => s.setTimerSettings);
  const setRestSettings = useStore((s) => s.setRestSettings);
  const liveTimer = useStore((s) => s.settings.liveTimer ?? true);
  const setSettingsFlags = useStore((s) => s.setSettingsFlags);

  return (
    <SettingsPage title="Timers">
      <Section title="WORKOUT TIMER">
        <Row label="Show workout timer">
          <Toggle value={timer.enabled} onValueChange={(enabled) => setTimerSettings({ enabled })} />
        </Row>
        <Row label="Start on first checked set" last>
          <Toggle
            value={timer.autoStart}
            disabled={!timer.enabled}
            onValueChange={(autoStart) => setTimerSettings({ autoStart })}
          />
        </Row>
      </Section>

      <Section title="LOCK SCREEN">
        <Row
          label="Timer on lock screen"
          sub={
            liveTimerAvailable
              ? 'Rest countdown, or the workout timer, in your notifications'
              : 'Works in the installed app, not in Expo Go'
          }
          last>
          <Toggle value={liveTimer} onValueChange={(on) => setSettingsFlags({ liveTimer: on })} />
        </Row>
      </Section>

      <Section title="REST TIMER">
        <Row label="Start when a set is checked">
          <Toggle value={rest.autoStart} onValueChange={(autoStart) => setRestSettings({ autoStart })} />
        </Row>
        <Row label="Default rest" sub="Moves can have their own">
          <PillStepper
            value={formatClock(rest.seconds)}
            onLess={() => setRestSettings({ seconds: Math.max(15, rest.seconds - 15) })}
            onMore={() => setRestSettings({ seconds: Math.min(600, rest.seconds + 15) })}
            lessLabel="Shorter default rest"
            moreLabel="Longer default rest"
          />
        </Row>
        <Row label="Notify when app is closed" last>
          <Toggle
            value={rest.notify}
            onValueChange={async (notify) => {
              if (notify && !(await requestReminderPermission())) return;
              setRestSettings({ notify });
            }}
          />
        </Row>
      </Section>
    </SettingsPage>
  );
}
