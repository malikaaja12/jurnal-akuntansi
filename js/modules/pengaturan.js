import { state } from "../state.js";
import { utils } from "../utils.js";
import { storage } from "../storage.js";
import { pdfService } from "../services/pdf.js";
import { renderAll } from "../app.js"; // Need to import this to redraw on reset

export function renderPengaturanTab() {
  const container = document.getElementById("pengaturan-tab");
  container.innerHTML = `
          <section class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="bg-white p-6 rounded-lg shadow-sm">
                      <h3 class="text-lg font-bold gap-6 mb-2 text-center">Manajemen Data</h3>
                      <div class="mb-4 bg-gray-100 p-3 rounded-md text-center">
                      <p class="text-sm text-gray-600">Periode Data Aktif:</p> <p class="font-bold text-gray-800">${utils.formatMonth(state.currentMonth)}</p>
                      </div>
                      <div class="space-y-4 position-relative text-center grid grid-cols-1">
                          <button id="btn-save-current" class="w-fullflex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-save mr-3 text-lg text-blue-500"></i> <div> <span>Simpan Data Bulan Ini</span> <span class="block text-xs text-gray-500">Simpan progres untuk periode aktif saat ini.</span> </div> </button>
                          <button id="btn-load-month" class="w-fullflex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-folder-open mr-3 text-lg text-yellow-500"></i> <div> <span>Muat Data Bulan Lain</span> <span class="block text-xs text-gray-500">Buka dan kelola data dari periode lain.</span> </div> </button>

                      <div class="grid grid-cols-2 gap-2 pt-2 border-t mt-2 text-center">
                          <button id="btn-import" class="w-fullflex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-upload mr-3 text-lg text-green-500"></i> <div> <span>Impor Data</span> <span class="block text-xs text-gray-500">Muat data darifile.</span> </div> </button>
                          <button id="btn-export" class="w-fullflex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-download mr-3 text-lg text-indigo-500"></i> <div> <span>Ekspor Data</span> <span class="block text-xs text-gray-500">Simpan semua data ke file.</span> </div> </button>
                      </div>
                      <button id="btn-reset" class="w-fullflex text-center items-center py-3 px-4 border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"> <i class="fas fa-trash-alt mr-3 text-lg"></i> <div> <span>Reset Data Bulan Ini</span> <span class="block text-xs text-gray-500">Hapus semua transaksi untuk periode aktif.</span> </div> </button>
                      </div>
              </div>
          </section>`;

  attachSettingsListeners();
}

function attachSettingsListeners() {
  document
    .getElementById("btn-save-current")
    .addEventListener("click", () => storage.saveDataForCurrentMonth());
  document
    .getElementById("btn-load-month")
    .addEventListener("click", () => showLoadModal());



  document
    .getElementById("btn-import")
    .addEventListener("click", () => storage.importData());
  document
    .getElementById("btn-export")
    .addEventListener("click", () => storage.exportData());
  document
    .getElementById("btn-reset")
    .addEventListener("click", () => resetData());
}

function showLoadModal() {
  const today = new Date().toISOString().slice(0, 7);
  const body = `<p class="text-sm text-gray-600 mb-4">Pilih tahun dan bulan data yang ingin Anda muat. Perubahan yang belum disimpan pada periode saat ini akan hilang.</p> <input type="month" id="month-selector" class="w-full p-2 border rounded-md" value="${today}">`;
  const actions = [
    {
      text: "Muat Data",
      class: "bg-blue-600 hover:bg-blue-700",
      callback: () => {
        const selectedMonth = document.getElementById("month-selector").value;
        if (selectedMonth) {
          storage.loadData(selectedMonth);
          renderAll();
          utils.closeModal();
          utils.showModal(
            "Sukses",
            `Berhasil memuat data untuk periode ${utils.formatMonth(selectedMonth)}.`,
          );
        }
      },
    },
    {
      text: "Batal",
      class: "bg-gray-600 hover:bg-gray-700",
      callback: () => utils.closeModal(),
    },
  ];
  utils.showModal("Muat Data Periode", body, actions);
}

function resetData() {
  utils.showModal(
    "Konfirmasi Reset",
    `Apakah Anda yakin ingin mereset semua data untuk periode <strong>${utils.formatMonth(state.currentMonth)}</strong>? Tindakan ini tidak dapat dibatalkan.`,
    [
      {
        text: "Ya, Reset",
        class: "bg-red-600 hover:bg-red-700",
        callback: () => {
          storage.resetData();
          storage.loadData(state.currentMonth);
          renderAll();
          utils.showModal(
            "Sukses",
            `Data untuk periode ${utils.formatMonth(state.currentMonth)} telah direset.`,
          );
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
