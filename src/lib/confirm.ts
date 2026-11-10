import { create } from 'zustand';

export type DialogOption = { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void };
export type Dialog = { title: string; message: string; options: DialogOption[] };

/** The dialog on screen (drawn by <DialogHost /> in the root layout), or null. */
export const useDialog = create<{ dialog: Dialog | null; close: () => void }>()((set) => ({
  dialog: null,
  close: () => set({ dialog: null }),
}));

/** Show an in-app dialog with buttons, styled like the rest of Gainmark. */
export function choose(title: string, message: string, options: DialogOption[]) {
  useDialog.setState({ dialog: { title, message, options } });
}

export function confirmAction(title: string, message: string, actionText: string, onConfirm: () => void) {
  choose(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionText, style: 'destructive', onPress: onConfirm },
  ]);
}

export function notify(title: string, message: string) {
  choose(title, message, [{ text: 'OK' }]);
}
