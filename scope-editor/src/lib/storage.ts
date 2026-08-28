import type { TemplateModel, RevisionEntry } from "./types";
import { initialTemplateModel } from "./templateData";

const TEMPLATE_STORAGE_KEY = "scope_template_model_v1";
const HISTORY_STORAGE_KEY = "scope_revision_history_v1";

// In-memory fallback map for environments where window.localStorage is not present
const inMemoryStorage = new Map<string, string>();

function getItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fall through to in-memory store
  }
  return inMemoryStorage.get(key) ?? null;
}

function setItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Fall through to in-memory store
  }
  inMemoryStorage.set(key, value);
}

function removeItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // Fall through to in-memory store
  }
  inMemoryStorage.delete(key);
}

export interface StoredState {
  model: TemplateModel;
  history: RevisionEntry[];
}

/**
 * Loads the stored template state from storage.
 * Falls back to initialTemplateModel if empty or corrupted.
 */
export function loadStoredState(): StoredState {
  try {
    const rawModel = getItem(TEMPLATE_STORAGE_KEY);
    const rawHistory = getItem(HISTORY_STORAGE_KEY);

    let model: TemplateModel = initialTemplateModel;
    let history: RevisionEntry[] = [];

    if (rawModel) {
      const parsed = JSON.parse(rawModel);
      if (parsed && parsed.schemaVersion === "1.0.0" && Array.isArray(parsed.elements)) {
        model = parsed;
      }
    }

    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        history = parsed;
      }
    }

    return { model, history };
  } catch {
    return {
      model: initialTemplateModel,
      history: [],
    };
  }
}

/**
 * Persists the template model and revision history to storage.
 */
export function saveStoredState(model: TemplateModel, history: RevisionEntry[]): void {
  setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(model));
  setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

/**
 * Clears stored state from storage (Reset action).
 */
export function clearStoredState(): void {
  removeItem(TEMPLATE_STORAGE_KEY);
  removeItem(HISTORY_STORAGE_KEY);
}
