export const ID_LOGS = 1511;
export const MULTIOBJ3_CLOSE_SHAFT = 2800;
export const MULTIOBJ3_CLOSE_SHORT = 2801;
export const MULTIOBJ3_CLOSE_LONG = 2802;
export const MULTIOBJ2_SHORT = 144;
export const MULTIOBJ2_LONG = 145;

export function pickFletchKnifeDialogCom(
  logId: number,
  cutShafts: boolean,
  cutShortbow: boolean,
  cutLongbow: boolean
): number | null {
  if (logId === ID_LOGS) {
    if (cutShafts) {
      return MULTIOBJ3_CLOSE_SHAFT;
    }
    if (cutShortbow) {
      return MULTIOBJ3_CLOSE_SHORT;
    }
    if (cutLongbow) {
      return MULTIOBJ3_CLOSE_LONG;
    }
    return null;
  }
  if (cutShortbow) {
    return MULTIOBJ2_SHORT;
  }
  if (cutLongbow) {
    return MULTIOBJ2_LONG;
  }
  return null;
}
