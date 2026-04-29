// SourcePicker is now superseded by GlobalContextBar.
// This shim re-exports GlobalContextBar as SourcePicker for backward compatibility.
export { GlobalContextBar as SourcePicker } from "@/components/GlobalContextBar"
export type { SourceFile } from "@/lib/sourceContext"
export { loadLibrary as loadSources, getActiveSource } from "@/lib/sourceContext"
