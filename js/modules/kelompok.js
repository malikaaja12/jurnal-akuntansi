import { state } from "../state.js";
import { utils } from "../utils.js";
import { storage } from "../storage.js";

export function renderKelompokTab() {
  const container = document.getElementById("kelompok-tab");
  container.innerHTML = `
    <section class="grid grid-cols-1 gap-6">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-xl text-center font-bold mb-4">Manajemen Kelompok</h3>
        <div class="space-y-6">

          <div class="border rounded-md p-4 bg-gray-50">
            <h4 class="font-medium mb-2">Daftar Kelompok / Tim</h4>
            <form id="add-kelompok-form" class="flex gap-2 mb-4">
              <input
                type="text"
                id="new-kelompok-name"
                placeholder="Nama Kelompok Baru"
                class="grow block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
              <button
                type="submit"
                class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <i class="fas fa-plus"></i>
              </button>
            </form>
            <ul id="kelompok-list" class="space-y-1.5 max-h-[600px] overflow-y-auto pr-1"></ul>
          </div>

        </div>
      </div>
    </section>`;

  renderKelompokList();
  attachKelompokListeners();
}

function renderKelompokList() {
  const kelompokList = document.getElementById("kelompok-list");
  if (!kelompokList) return;
  kelompokList.innerHTML = "";

  if (state.settings.kelompoks.length === 0) {
    kelompokList.innerHTML = `<li class="text-center text-sm text-gray-400 py-4">Belum ada kelompok. Tambahkan di atas.</li>`;
    return;
  }

  [...state.settings.kelompoks].sort().forEach((k, i) => {
    kelompokList.innerHTML += `
      <li class="flex justify-between items-center bg-white border border-gray-100 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400 w-5 text-right">${i + 1}.</span>
          <span class="text-sm text-gray-800">${k}</span>
        </div>
        <button
          data-action="deleteKelompok"
          data-name="${k}"
          class="text-gray-300 hover:text-red-500 transition-colors text-sm"
          title="Hapus kelompok"
        >
          <i class="fas fa-times-circle"></i>
        </button>
      </li>`;
  });
}

function attachKelompokListeners() {
  document
    .getElementById("add-kelompok-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      addKelompok();
    });

  document.getElementById("kelompok-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn && btn.dataset.action === "deleteKelompok") {
      deleteKelompok(btn.dataset.name);
    }
  });
}

function addKelompok() {
  const nameInput = document.getElementById("new-kelompok-name");
  const name = nameInput.value.trim();
  if (!name) return;

  if (
    state.settings.kelompoks.some((k) => k.toLowerCase() === name.toLowerCase())
  ) {
    utils.showModal("Peringatan", "Nama kelompok sudah ada.");
    return;
  }

  state.settings.kelompoks.push(name);
  storage.saveData();
  renderKelompokList();
  nameInput.value = "";
  utils.showModal("Sukses", "Kelompok baru berhasil ditambahkan.");
}

function deleteKelompok(name) {
  utils.showModal("Konfirmasi Hapus", `Hapus kelompok "${name}"?`, [
    {
      text: "Ya, Hapus",
      class: "bg-red-600 hover:bg-red-700",
      callback: () => {
        state.settings.kelompoks = state.settings.kelompoks.filter(
          (k) => k !== name
        );
        storage.saveData();
        renderKelompokList();
        utils.closeModal();
      },
    },
    {
      text: "Batal",
      class: "bg-gray-600 hover:bg-gray-700",
      callback: () => utils.closeModal(),
    },
  ]);
}
