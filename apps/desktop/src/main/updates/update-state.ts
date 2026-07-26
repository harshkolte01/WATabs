import type { UpdateLifecycleState } from "@multi-whatsapp/shared-types";

/** Pure transitions for unit tests (D1 / §30.1 update state machine). */
export function canCheck(state: UpdateLifecycleState): boolean {
  return (
    state === "idle" ||
    state === "error" ||
    state === "available" ||
    state === "unavailable"
  );
}

export function canStartDownload(state: UpdateLifecycleState): boolean {
  return state === "available";
}

export function canInstall(state: UpdateLifecycleState): boolean {
  return state === "ready";
}

export function reduceUpdateState(
  state: UpdateLifecycleState,
  event:
    | "check_start"
    | "check_none"
    | "check_available"
    | "check_fail"
    | "download_start"
    | "download_progress"
    | "download_done"
    | "download_fail"
    | "reset",
): UpdateLifecycleState {
  switch (event) {
    case "reset":
      return "idle";
    case "check_start":
      return canCheck(state) || state === "checking" ? "checking" : state;
    case "check_none":
      return state === "checking" ? "idle" : state;
    case "check_available":
      return state === "checking" ? "available" : state;
    case "check_fail":
      return state === "checking" ? "error" : state;
    case "download_start":
      return canStartDownload(state) ? "downloading" : state;
    case "download_progress":
      return state === "downloading" ? "downloading" : state;
    case "download_done":
      return state === "downloading" ? "ready" : state;
    case "download_fail":
      return state === "downloading" ? "error" : state;
    default:
      return state;
  }
}
