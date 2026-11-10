import { LEGACY_MUSCLE_TO_GROUP } from '@/data/groups';

export type BarType = 'olympic' | 'ez' | 'trap';

/**
 * How a move is logged:
 * - weight: weight × reps
 * - bodyweight: reps, with optional added weight (negative = assisted)
 * - time: a hold, in seconds (plank)
 * - cardio: time and distance (running, rowing)
 */
export type MoveKind = 'weight' | 'bodyweight' | 'time' | 'cardio';

export const MOVE_KINDS: { id: MoveKind; label: string; hint: string }[] = [
  { id: 'weight', label: 'Weight', hint: 'Weight × reps' },
  { id: 'bodyweight', label: 'Bodyweight', hint: 'Reps, plus added or assisted weight' },
  { id: 'time', label: 'Timed', hint: 'A hold, like a plank' },
  { id: 'cardio', label: 'Cardio', hint: 'Time and distance' },
];

export type Exercise = {
  id: string;
  name: string;
  /** Muscle group id (see data/groups.ts). */
  group: string;
  custom?: boolean;
  /** Default bar for plate math; the user can change or turn it off per move. */
  bar?: BarType;
  /** How it's logged (weight × reps when not set). */
  kind?: MoveKind;
};

/** Default bar weights by unit. */
export const BAR_WEIGHT: Record<BarType, { kg: number; lb: number }> = {
  olympic: { kg: 20, lb: 45 },
  ez: { kg: 7, lb: 15 },
  trap: { kg: 25, lb: 55 },
};

const BARBELL_MOVES: Record<string, BarType> = {
  'Barbell Bench Press': 'olympic', 'Incline Barbell Bench Press': 'olympic',
  'Decline Barbell Bench Press': 'olympic', 'Floor Press': 'olympic', 'Close-Grip Bench Press': 'olympic',
  'JM Press': 'olympic', Deadlift: 'olympic', 'Barbell Row': 'olympic', 'Pendlay Row': 'olympic',
  'Rack Pull': 'olympic', 'Barbell Shrug': 'olympic', 'Overhead Press': 'olympic', 'Push Press': 'olympic',
  'Upright Row': 'olympic', 'Barbell Curl': 'olympic', 'Drag Curl': 'olympic', 'Reverse Curl': 'olympic',
  'Back Squat': 'olympic', 'Front Squat': 'olympic', 'Box Squat': 'olympic',
  'Romanian Deadlift': 'olympic', 'Stiff-Leg Deadlift': 'olympic', 'Good Morning': 'olympic',
  'Hip Thrust': 'olympic', 'Barbell Glute Bridge': 'olympic', 'Sumo Deadlift': 'olympic',
  'Power Clean': 'olympic', 'Hang Clean': 'olympic', 'Clean and Jerk': 'olympic', Snatch: 'olympic',
  Thruster: 'olympic',
  'EZ-Bar Curl': 'ez', 'Skull Crusher': 'ez', 'Preacher Curl': 'ez',
  'Trap Bar Deadlift': 'trap',
};

/** Built-in moves that aren't weight × reps. */
const MOVE_KIND: Record<string, MoveKind> = {
  'Push-Up': 'bodyweight', 'Weighted Push-Up': 'bodyweight', 'Chest Dip': 'bodyweight',
  'Diamond Push-Up': 'bodyweight', 'Pull-Up': 'bodyweight', 'Chin-Up': 'bodyweight',
  'Weighted Pull-Up': 'bodyweight', 'Assisted Pull-Up': 'bodyweight', 'Inverted Row': 'bodyweight',
  'Back Extension': 'bodyweight', 'Tricep Dip': 'bodyweight', 'Bench Dip': 'bodyweight',
  'Hanging Leg Raise': 'bodyweight', 'Hanging Knee Raise': 'bodyweight', 'Lying Leg Raise': 'bodyweight',
  Crunch: 'bodyweight', 'Decline Sit-Up': 'bodyweight', 'Bicycle Crunch': 'bodyweight', 'V-Up': 'bodyweight',
  'Dead Bug': 'bodyweight', 'Mountain Climber': 'bodyweight', 'Ab Wheel Rollout': 'bodyweight',
  'Sissy Squat': 'bodyweight', 'Nordic Curl': 'bodyweight', 'Glute-Ham Raise': 'bodyweight',
  'Glute Bridge': 'bodyweight', 'Frog Pump': 'bodyweight', Burpee: 'bodyweight', 'Muscle-Up': 'bodyweight',
  'Pistol Squat': 'bodyweight', 'Jump Squat': 'bodyweight',
  Plank: 'time', 'Side Plank': 'time', 'Dead Hang': 'time', 'Wall Sit': 'time', 'L-Sit': 'time',
  'Hollow Hold': 'time',
  Running: 'cardio', Treadmill: 'cardio', Walking: 'cardio', 'Incline Walk': 'cardio', Cycling: 'cardio',
  'Stationary Bike': 'cardio', 'Assault Bike': 'cardio', 'Rowing Machine': 'cardio', Elliptical: 'cardio',
  'Stair Climber': 'cardio', Swimming: 'cardio', 'Jump Rope': 'cardio', 'Ski Erg': 'cardio',
};

// Grouped by muscle; each list is filed under a group via LEGACY_MUSCLE_TO_GROUP.
const LIBRARY: Record<string, string[]> = {
  chest: [
    'Barbell Bench Press', 'Incline Barbell Bench Press', 'Decline Barbell Bench Press',
    'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press', 'Floor Press',
    'Smith Machine Bench Press', 'Machine Chest Press', 'Incline Machine Press', 'Dumbbell Fly',
    'Incline Dumbbell Fly', 'Pec Deck', 'Cable Crossover', 'Low-to-High Cable Fly',
    'High-to-Low Cable Fly', 'Push-Up', 'Weighted Push-Up', 'Chest Dip', 'Dumbbell Pullover',
    'Svend Press',
  ],
  back: [
    'Deadlift', 'Pull-Up', 'Chin-Up', 'Weighted Pull-Up', 'Assisted Pull-Up', 'Lat Pulldown',
    'Muscle-Up', 'Close-Grip Lat Pulldown', 'Single-Arm Lat Pulldown', 'Straight-Arm Pulldown', 'Barbell Row',
    'Pendlay Row', 'Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Chest-Supported Row',
    'Machine Row', 'Meadows Row', 'Inverted Row', 'Rack Pull', 'Barbell Shrug', 'Dumbbell Shrug',
    'Back Extension',
  ],
  shoulders: [
    'Overhead Press', 'Seated Dumbbell Shoulder Press', 'Arnold Press', 'Machine Shoulder Press',
    'Push Press', 'Landmine Press', 'Dumbbell Lateral Raise', 'Cable Lateral Raise',
    'Machine Lateral Raise', 'Front Raise', 'Plate Front Raise', 'Rear Delt Fly',
    'Reverse Pec Deck', 'Face Pull', 'Upright Row', 'Y-Raise',
  ],
  biceps: [
    'Barbell Curl', 'EZ-Bar Curl', 'Dumbbell Curl', 'Hammer Curl', 'Cross-Body Hammer Curl',
    'Incline Dumbbell Curl', 'Preacher Curl', 'Concentration Curl', 'Cable Curl',
    'Bayesian Cable Curl', 'Spider Curl', 'Drag Curl', 'Machine Curl',
  ],
  triceps: [
    'Close-Grip Bench Press', 'Skull Crusher', 'Tricep Pushdown', 'Rope Pushdown',
    'Single-Arm Cable Pushdown', 'Overhead Cable Extension', 'Overhead Dumbbell Extension',
    'Dumbbell Kickback', 'Tricep Dip', 'Bench Dip', 'Diamond Push-Up', 'JM Press',
    'Machine Tricep Extension',
  ],
  forearms: [
    'Wrist Curl', 'Reverse Wrist Curl', 'Reverse Curl', "Farmer's Carry", 'Dead Hang',
    'Plate Pinch', 'Wrist Roller',
  ],
  abs: [
    'Crunch', 'Cable Crunch', 'Machine Crunch', 'Decline Sit-Up', 'Hanging Leg Raise',
    'Hanging Knee Raise', 'Lying Leg Raise', 'Plank', 'Side Plank', 'Ab Wheel Rollout',
    'Russian Twist', 'Bicycle Crunch', 'V-Up', 'Dead Bug', 'Pallof Press', 'Cable Woodchopper',
    'Mountain Climber', 'Hollow Hold', 'L-Sit',
  ],
  quads: [
    'Back Squat', 'Front Squat', 'Goblet Squat', 'Box Squat', 'Smith Machine Squat', 'Hack Squat',
    'Pendulum Squat', 'Belt Squat', 'Leg Press', 'Leg Extension', 'Bulgarian Split Squat',
    'Walking Lunge', 'Reverse Lunge', 'Step-Up', 'Sissy Squat', 'Pistol Squat', 'Jump Squat', 'Wall Sit',
  ],
  hamstrings: [
    'Romanian Deadlift', 'Stiff-Leg Deadlift', 'Single-Leg Romanian Deadlift', 'Good Morning',
    'Lying Leg Curl', 'Seated Leg Curl', 'Standing Leg Curl', 'Nordic Curl', 'Glute-Ham Raise',
  ],
  glutes: [
    'Hip Thrust', 'Single-Leg Hip Thrust', 'Barbell Glute Bridge', 'Glute Bridge',
    'Sumo Deadlift', 'Trap Bar Deadlift', 'Cable Kickback', 'Cable Pull-Through',
    'Hip Abduction Machine', 'Hip Adduction Machine', 'Curtsy Lunge', 'Frog Pump',
    'Banded Lateral Walk',
  ],
  calves: [
    'Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise', 'Smith Machine Calf Raise',
    'Single-Leg Calf Raise', 'Donkey Calf Raise', 'Tibialis Raise',
  ],
  fullbody: [
    'Power Clean', 'Hang Clean', 'Clean and Jerk', 'Snatch', 'Thruster', 'Kettlebell Swing',
    'Turkish Get-Up', 'Burpee', 'Sled Push', 'Man Maker',
  ],
  cardio: [
    'Running', 'Treadmill', 'Walking', 'Incline Walk', 'Cycling', 'Stationary Bike', 'Assault Bike',
    'Rowing Machine', 'Elliptical', 'Stair Climber', 'Swimming', 'Jump Rope', 'Ski Erg',
  ],
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Old "full body" moves, filed under the group they hit most. */
const FULL_BODY_GROUP: Record<string, string> = {
  'Power Clean': 'legs', 'Hang Clean': 'legs', 'Clean and Jerk': 'legs', Snatch: 'legs',
  Thruster: 'legs', 'Kettlebell Swing': 'legs', 'Sled Push': 'legs',
  'Turkish Get-Up': 'core', Burpee: 'core', 'Man Maker': 'shoulders',
};

export const BUILTIN_EXERCISES: Exercise[] = Object.entries(LIBRARY).flatMap(([muscle, names]) =>
  names.map((name) => ({
    id: slug(name),
    name,
    group: FULL_BODY_GROUP[name] ?? LEGACY_MUSCLE_TO_GROUP[muscle],
    bar: BARBELL_MOVES[name],
    kind: MOVE_KIND[name],
  })),
);
