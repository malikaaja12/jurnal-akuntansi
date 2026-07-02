import { state } from "../state.js";
import { utils } from "../utils.js";
import { storage } from "../storage.js";

// ─────────────────────────────────────────────────────────────────────────────
// Tab Akun  →  hanya mengelola Daftar Akun (Chart of Accounts)
// Daftar Kelompok tetap ada di tab Pengaturan (copy.js)
// ─────────────────────────────────────────────────────────────────────────────

export function renderAkunTab() {
  const container = document.getElementById("akun-tab");
  container.innerHTML = `
    <section class="grid grid-cols-1 gap-6">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-xl text-center font-bold mb-4">Manajemen Akun</h3>
        <div class="space-y-6">

          <!-- Form tambah akun -->
          <div class="border rounded-md p-4 bg-gray-50">
            <h4 class="font-medium mb-2">Daftar Akun</h4>
            <form id="add-akun-form" class="flex gap-2 mb-4">
              <input
                type="text"
                id="new-akun-name"
                placeholder="Nama Akun Baru"
                class="grow block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
              <select id="new-akun-tipe" class="rounded-md border-gray-300 shadow-sm">
                <option value="Aset">Aset</option>
                <option value="Liabilitas">Liabilitas</option>
                <option value="Ekuitas">Ekuitas</option>
                <option value="Pendapatan">Pendapatan</option>
                <option value="Beban">Beban</option>
              </select>
              <button
                type="submit"
                class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <i class="fas fa-plus"></i>
              </button>
            </form>
            <ul id="akun-list" class="space-y-1 max-h-[600px] overflow-y-auto pr-1"></ul>
          </div>
        </div>
      </div>
    </section>`;

  renderAkunList();
  attachAkunListeners();
}

const TIPE_CONFIG = {
  Aset: {
    label: "Aset",
    icon: "fa-landmark",
    header: "bg-blue-50 border-blue-200 text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  Liabilitas: {
    label: "Liabilitas",
    icon: "fa-hand-holding-usd",
    header: "bg-red-50 border-red-400 text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  Ekuitas: {
    label: "Ekuitas",
    icon: "fa-user-tie",
    header: "bg-purple-50 border-purple-200 text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  Pendapatan: {
    label: "Pendapatan",
    icon: "fa-arrow-up",
    header: "bg-green-50 border-green-200 text-green-700",
    badge: "bg-green-100 text-green-700",
  },
  Beban: {
    label: "Beban",
    icon: "fa-arrow-down",
    header: "bg-orange-50 border-orange-200 text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
};
const TIPE_ORDER = ["Aset", "Liabilitas", "Ekuitas", "Pendapatan", "Beban"];

function renderAkunList() {
  const akunList = document.getElementById("akun-list");
  if (!akunList) return;

  const grouped = {};
  TIPE_ORDER.forEach((t) => (grouped[t] = []));
  state.settings.akuns.forEach((akun) => {
    if (grouped[akun.type]) grouped[akun.type].push(akun);
    else grouped[akun.type] = [akun];
  });

  let html = "";
  TIPE_ORDER.forEach((tipe) => {
    const items = grouped[tipe] || [];
    if (items.length === 0) return; // skip tipe yang kosong

    const cfg = TIPE_CONFIG[tipe];
    items.sort((a, b) => a.name.localeCompare(b.name));

    // Header kelompok
    html += `
      <li class="mt-3 first:mt-0">
        <div class="flex items-center gap-2 px-2 py-1.5 rounded-md border ${cfg.header} mb-1">
          <i class="fas ${cfg.icon} text-xs w-4 text-center"></i>
          <span class="text-xs font-semibold uppercase tracking-wide">${cfg.label}</span>
          <span class="ml-auto text-xs font-normal opacity-70">${items.length} akun</span>
        </div>
        <ul class="space-y-1 pl-2">
          ${items
            .map(
              (akun) => `
            <li class="flex justify-between items-center bg-white border border-gray-100 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
              <span class="text-sm text-gray-800">${akun.name}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded-full ${cfg.badge}">${akun.type}</span>
                <button
                  data-action="deleteAkun"
                  data-name="${akun.name}"
                  class="text-gray-300 hover:text-red-500 transition-colors text-sm"
                  title="Hapus akun"
                >
                  <i class="fas fa-times-circle"></i>
                </button>
              </div>
            </li>`,
            )
            .join("")}
        </ul>
      </li>`;
  });

  akunList.innerHTML =
    html ||
    `<li class="text-center text-sm text-gray-400 py-4">Belum ada akun. Tambahkan akun di atas.</li>`;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function attachAkunListeners() {
  document.getElementById("add-akun-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addAkun();
  });

  document.getElementById("akun-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn && btn.dataset.action === "deleteAkun") {
      deleteAkun(btn.dataset.name);
    }
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function addAkun() {
  const nameInput = document.getElementById("new-akun-name");
  const typeInput = document.getElementById("new-akun-tipe");
  const name = nameInput.value.trim();
  if (!name) return;

  if (
    state.settings.akuns.some(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    utils.showModal("Peringatan", "Nama akun sudah ada.");
    return;
  }

  state.settings.akuns.push({ name, type: typeInput.value });
  storage.saveData();
  renderAkunList();
  nameInput.value = "";
  utils.showModal("Sukses", "Akun baru berhasil ditambahkan.");
}

function deleteAkun(name) {
  utils.showModal(
    "Konfirmasi Hapus",
    `Hapus akun "${name}"? Ini tidak akan menghapus transaksi yang sudah ada yang menggunakan akun ini.`,
    [
      {
        text: "Ya, Hapus",
        class: "bg-red-600 hover:bg-red-700",
        callback: () => {
          state.settings.akuns = state.settings.akuns.filter(
            (a) => a.name !== name,
          );
          storage.saveData();
          renderAkunList();
          utils.closeModal();
        },
      },
      {
        text: "Batal",
        class: "bg-gray-600 hover:bg-gray-700",
        callback: () => utils.closeModal(),
      },
    ],
  );
}
