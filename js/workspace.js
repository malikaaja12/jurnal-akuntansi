/**
 * workspace.js — Konfigurasi multi-workspace
 *
 * Untuk menambah workspace baru, cukup tambahkan entry baru di WORKSPACES.
 * TIDAK perlu mengubah file lain.
 */

export const WORKSPACES = {
  "pacific-ac": {
    id: "pacific-ac",
    name: "Pacific AC",
    shortName: "PACIFIC AC",
    color: "#2563eb", // biru
    bgClass: "bg-blue-600",
  },
  "pacific-ac-solo": {
    id: "pacific-ac-solo",
    name: "Pacific AC Solo",
    shortName: "PACIFIC AC SOLO",
    color: "#ea580c", // oranye
    bgClass: "bg-orange-600",
  },
  "king-gasause": {
    id: "king-gasause",
    name: "CV King Gasause",
    shortName: "KING GASAUSE",
    color: "#16a34a", // hijau
    bgClass: "bg-green-600",
  },
  "pacific-ac-solo": {
    id: "pacific-ac-solo",
    name: "Pacific AC SOLO",
    shortName: "PACIFIC SOLO",
    color: "#90a316ff",      // kuning
    bgClass: "bg-yellow-600",
  },
};

export const DEFAULT_WORKSPACE = "pacific-ac";

/** Key di localStorage untuk menyimpan workspace aktif */
export const ACTIVE_WORKSPACE_KEY = "__activeWorkspace__";

/**
 * Kembalikan workspace aktif dari localStorage.
 * Jika belum ada, gunakan DEFAULT_WORKSPACE.
 */
export function getActiveWorkspace() {
  const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  return WORKSPACES[saved] ? saved : DEFAULT_WORKSPACE;
}

/**
 * Simpan workspace aktif ke localStorage.
 */
export function setActiveWorkspace(workspaceId) {
  if (!WORKSPACES[workspaceId]) {
    console.warn(`[workspace] Unknown workspace: ${workspaceId}`);
    return;
  }
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}

/**
 * Buat namespaced key untuk localStorage.
 * Contoh: key("accountingApp_2025-05") → "pacific-ac::accountingApp_2025-05"
 */
export function nsKey(workspaceId, key) {
  return `${workspaceId}::${key}`;
}
