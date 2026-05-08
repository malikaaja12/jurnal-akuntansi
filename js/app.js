import { state } from "./state.js";
import { storage } from "./storage.js";
import { renderDashboardTab } from "./modules/dashboard.js";
import { renderJurnalTab } from "./modules/jurnal.js";
import { renderBukuBesarTab } from "./modules/bukuBesar.js";
import { renderTrialBalanceTab } from "./modules/trialBalance.js";
import { renderLabaRugiTab } from "./modules/labaRugi.js";
import { renderNeracaTab } from "./modules/neraca.js";
import { renderArusKasTab } from "./modules/arusKas.js";
import { renderDataPiutangTab } from "./modules/dataPiutang.js";
import { renderStockBarangTab } from "./modules/stockBarang.js";
import { renderPengaturanTab } from "./modules/copy.js";
import { renderAkunTab } from "./modules/akun.js";
import { renderKelompokTab } from "./modules/kelompok.js";
import { utils } from "./utils.js";
import {
  WORKSPACES,
  DEFAULT_WORKSPACE,
  ACTIVE_WORKSPACE_KEY,
  getActiveWorkspace,
  setActiveWorkspace,
} from "./workspace.js";

const app = {
  init() {
    // ── 1. Inisialisasi workspace ──────────────────────────────────────────
    const wsId = getActiveWorkspace();
    state.currentWorkspace = wsId;
    this.applyWorkspaceUI(wsId);

    // ── 2. Muat data bulan ini ─────────────────────────────────────────────
    storage.loadData(state.currentMonth);
    this.updatePeriodDisplay();
    this.addEventListeners();
    state.activeTab = "dashboard";
    this.changeTab(state.activeTab, true);
  },

  /** Terapkan nama workspace ke navbar indicator */
  applyWorkspaceUI(wsId) {
    const ws = WORKSPACES[wsId];
    if (!ws) return;

    // Update kedua selector (desktop + mobile)
    ["workspace-selector", "workspace-selector-mobile"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = wsId;
    });

    // Update indikator nama di navbar
    const indicator = document.getElementById("workspace-name-indicator");
    if (indicator) {
      indicator.textContent = ws.name;
      indicator.style.color = ws.color;
    }
  },

  /** Ganti workspace aktif → reload semua data */
  switchWorkspace(wsId) {
    if (wsId === state.currentWorkspace) return;

    setActiveWorkspace(wsId);
    state.currentWorkspace = wsId;
    this.applyWorkspaceUI(wsId);

    // Reset ke bulan ini dan reload data workspace baru
    state.currentMonth = new Date().toISOString().slice(0, 7);
    storage.loadData(state.currentMonth);
    this.updatePeriodDisplay();

    // Re-render tab aktif
    this.changeTab("dashboard", true);
  },

  changeTab(tabName, forceRender = false) {
    if (state.activeTab === tabName && !forceRender) return;
    state.activeTab = tabName;

    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.add("hidden"));
    document.getElementById(`${tabName}-tab`).classList.remove("hidden");

    document
      .querySelectorAll(".tab-button, .mobile-tab-button")
      .forEach((button) => {
        button.classList.remove("active");
        if (button.dataset.tab === tabName) button.classList.add("active");
      });

    // Close mobile menu
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) mobileMenu.classList.add("hidden");

    this.renderAll();
    storage.saveData();
  },

  renderAll() {
    const tab = state.activeTab;
    if (tab === "dashboard") renderDashboardTab();
    else if (tab === "jurnal") renderJurnalTab();
    else if (tab === "bukuBesar") renderBukuBesarTab();
    else if (tab === "trialBalance") renderTrialBalanceTab();
    else if (tab === "labaRugi") renderLabaRugiTab();
    else if (tab === "pengaturan") renderPengaturanTab();
    else if (tab === "akun") renderAkunTab();
    else if (tab === "neraca") renderNeracaTab();
    else if (tab === "arusKas") renderArusKasTab();
    else if (tab === "dataPiutang") renderDataPiutangTab();
    else if (tab === "stockBarang") renderStockBarangTab();
    else if (tab === "kelompok") renderKelompokTab();
  },

  addEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        const mobileMenu = document.getElementById("mobile-menu");
        if (mobileMenu) {
          mobileMenu.classList.toggle("hidden");
        }
      });
    }

    // Workspace switcher
    const selector = document.getElementById("workspace-selector");
    if (selector) {
      selector.addEventListener("change", (e) => {
        this.switchWorkspace(e.target.value);
      });
    }
  },

  updatePeriodDisplay() {
    const periodDisplay = document.getElementById("current-period-display");
    if (periodDisplay) {
      periodDisplay.textContent = utils.formatMonth(state.currentMonth);
    }
  },
};

// Expose app for inline onclick handlers in HTML (legacy support)
window.app = app;
window.onload = () => app.init();

export function renderAll() {
  app.renderAll();
}

export default app;
