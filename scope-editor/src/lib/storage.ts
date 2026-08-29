import type { RevisionEntry, TemplateModel } from "./types";
import { initialTemplateModel } from "./templateData";
import { validateTemplateModel } from "./validation";

export const STORAGE_KEY = "scope-editor-state-v2";
interface StoredState { schemaVersion: string; model: TemplateModel; history: RevisionEntry[]; }
let memoryStore: string | null = null;

function browserStorage(): Storage | null { return typeof localStorage === "undefined" ? null : localStorage; }

export function saveStoredState(model: TemplateModel, history: RevisionEntry[]): void {
  const payload: StoredState = { schemaVersion: model.schemaVersion, model, history };
  const serialized = JSON.stringify(payload);
  try { const storage = browserStorage(); if (storage) storage.setItem(STORAGE_KEY, serialized); else memoryStore = serialized; } catch { memoryStore = serialized; }
}

export function loadStoredState(): { model: TemplateModel; history: RevisionEntry[] } {
  try {
    const storage = browserStorage(); const raw = storage ? storage.getItem(STORAGE_KEY) : memoryStore;
    if (!raw) return { model: structuredClone(initialTemplateModel), history: [] };
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || parsed.schemaVersion !== initialTemplateModel.schemaVersion || !Array.isArray(parsed.history)) throw new Error("invalid persisted state");
    const error = validateTemplateModel(parsed.model); if (error) throw new Error(error.message);
    for (const entry of parsed.history) if (!entry || typeof entry.revisionId !== "string" || typeof entry.elementId !== "string" || typeof entry.globalRevision !== "number") throw new Error("invalid persisted history");
    return { model: parsed.model, history: parsed.history };
  } catch { return { model: structuredClone(initialTemplateModel), history: [] }; }
}

export function clearStoredState(): void { try { browserStorage()?.removeItem(STORAGE_KEY); } catch { /* keep memory fallback */ } memoryStore = null; }
