import { state } from "./state.js";
import { utils } from "./utils.js";
import { nsKey } from "./workspace.js";

// ─── Helper: prefix semua key dengan workspace aktif ──────────────────────────

/**
 * Buat namespaced localStorage key untuk workspace aktif.
 * Contoh: key("accountingApp_2025-05") → "pacific-ac::accountingApp_2025-05"
 */
function key(rawKey) {
  return nsKey(state.currentWorkspace, rawKey);
}

/**
 * Prefix filter untuk localStorage.keys() — hanya ambil key milik workspace ini.
 */
function wsPrefix() {
  return `${state.currentWorkspace}::accountingApp_`;
}

// ─────────────────────────────────────────────────────────────────────────────

export const storage = {
  getDefaultSettings() {
    return {
      akuns: [
        { name: "Kas", type: "Aset" },
        { name: "Kas Proyek", type: "Aset" },
        { name: "Tabungan", type: "Aset"},
        { name: "Kas Kecil", type: "Aset" },
        { name: "Bank", type: "Aset" },
        { name: "hutang Karyawan", type: "Liabilitas" },
        { name: "Piutang Lainnya", type: "Aset" },
        { name: "Piutang Usaha", type: "Aset" },
        { name: "Persediaan Sparepart", type: "Aset" },
        { name: "Perlengkapan Kantor", type: "Aset" },
        { name: "Peralatan Usaha", type: "Aset" },
        { name: "Utang Usaha", type: "Liabilitas" },
        { name: "Utang Bank", type: "Liabilitas" },
        { name: "Modal", type: "Ekuitas" },
        { name: "Pendapatan Jasa", type: "Pendapatan" },
        { name: "Pendapatan Penjualan", type: "Pendapatan" },
        { name: "Beban Gaji", type: "Beban" },
        { name: "Beban Transportasi", type: "Beban" },
        { name: "Beban Lancar", type: "Beban" },
        { name: "Beban Operasional", type: "Beban" },
        { name: "Beban Sewa", type: "Beban" },
        { name: "Beban Lainnya", type: "Beban" },
      ],
      kelompoks: [
        "Tim Aziz",
        "Tim Sukma",
        "Tim Rafid",
        "Tim Rizal",
        "Tim Arya",
        "Tim Dafa",
        "Tim Farel",
        "Tim P.Deni",
        "Tim Akmal",
        "Tim Bagas",
        "Proyek A",
        "Operasional Kantor",
      ],
    };
  },

  findLatestSettings() {
    const prefix = wsPrefix();
    const currentKey = key(`accountingApp_${state.currentMonth}`);
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith(prefix) && k !== currentKey,
    );
    if (keys.length === 0) return null;
    keys.sort().reverse();
    const latestData = localStorage.getItem(keys[0]);
    try {
      return latestData ? JSON.parse(latestData).settings : null;
    } catch (err) {
      console.error("Failed to parse latest settings:", err);
      return null;
    }
  },

  findPreviousPeriodData(targetMonth) {
    const prefix = wsPrefix();
    const boundary = key(`accountingApp_${targetMonth}`);
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith(prefix) && k < boundary,
    );

    if (keys.length === 0) return null;

    keys.sort().reverse();
    const latestData = localStorage.getItem(keys[0]);
    try {
      return latestData ? JSON.parse(latestData) : null;
    } catch (err) {
      console.error("Failed to parse previous period data:", err);
      return null;
    }
  },

  calculateStockLevels(items, transactions = []) {
    // Helper local logic for stock calc, often needed during load
    const stockData = {};
    items.forEach((item) => {
      stockData[item.kode] = {
        nama: item.nama,
        stokAwal: item.stokAwal || 0,
        masuk: 0,
        keluar: 0,
        stokAkhir: 0,
      };
    });

    const safeTransactions = transactions || [];
    safeTransactions.forEach((trx) => {
      if (stockData[trx.kode]) {
        if (trx.tipe === "masuk") stockData[trx.kode].masuk += trx.jumlah;
        else if (trx.tipe === "keluar")
          stockData[trx.kode].keluar += trx.jumlah;
      }
    });

    Object.keys(stockData).forEach((kode) => {
      const item = stockData[kode];
      item.stokAkhir = item.stokAwal + item.masuk - item.keluar;
    });

    return stockData;
  },

  getPreviousMonthString(monthStr) {
    const [year, month] = monthStr.split("-").map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  },

  calculateEndingCashForPeriod(parsedData, month) {
    const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
    const endingBalances = {};

    cashAccounts.forEach((accName) => {
      const account = parsedData?.settings?.akuns?.find((a) => a.name === accName);
      const accKey = (account && account.code) ? account.code : accName;
      const opening = parsedData?.settings?.openingBalances?.[accKey];
      endingBalances[accName] = (opening && opening.period === month) ? opening.amount : 0;
    });

    const journals = parsedData?.jurnals || [];
    journals.forEach((j) => {
      if (cashAccounts.includes(j.akun)) {
        endingBalances[j.akun] = (endingBalances[j.akun] || 0) + (j.debit - j.kredit);
      }
    });

    return endingBalances;
  },

  propagateCashBalances(startMonth) {
    const prefix = wsPrefix();
    const allKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix) && !k.endsWith("global"))
      .sort();

    const startKey = key(`accountingApp_${startMonth}`);
    const startIndex = allKeys.indexOf(startKey);
    if (startIndex === -1) return;

    let startData;
    try {
      startData = JSON.parse(localStorage.getItem(startKey));
    } catch (err) {
      console.error("Failed to parse startData:", err);
      return;
    }
    if (!startData || typeof startData !== "object") return;

    let currentEndingBalances = this.calculateEndingCashForPeriod(startData, startMonth);

    for (let i = startIndex + 1; i < allKeys.length; i++) {
      const nextKey = allKeys[i];
      const nextMonth = nextKey.replace(prefix, "");
      let nextData;
      try {
        nextData = JSON.parse(localStorage.getItem(nextKey));
      } catch (err) {
        console.error(`Failed to parse data for key ${nextKey}:`, err);
        continue;
      }
      if (!nextData || typeof nextData !== "object") continue;

      if (!nextData.settings) nextData.settings = {};
      if (!nextData.settings.openingBalances) nextData.settings.openingBalances = {};

      const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
      cashAccounts.forEach((accName) => {
        const account = nextData.settings.akuns?.find((a) => a.name === accName);
        const accKey = (account && account.code) ? account.code : accName;
        nextData.settings.openingBalances[accKey] = {
          amount: currentEndingBalances[accName] || 0,
          period: nextMonth,
        };
      });

      currentEndingBalances = this.calculateEndingCashForPeriod(nextData, nextMonth);
      localStorage.setItem(nextKey, JSON.stringify(nextData));
    }
  },

  loadData(month) {
    const dataKey = key(`accountingApp_${month}`);
    const data = localStorage.getItem(dataKey);

    state.currentMonth = month;

    if (data) {
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (err) {
        console.error("Failed to parse active period data:", err);
      }
      if (parsedData && typeof parsedData === "object") {
        state.jurnals = parsedData.jurnals || [];
        state.settings = parsedData.settings || this.getDefaultSettings();

        if (!state.settings.brands || state.settings.brands.length === 0) {
          delete state.settings.brands;
        }

        state.stock = parsedData.stock || { items: [], transactions: [] };
        if (!state.stock.items) state.stock = { items: [], transactions: [] };

        state.piutangs = (parsedData.piutangs || []).map((p) => ({
          ...p,
          payments: p.payments || [],
        }));
      } else {
        state.jurnals = [];
        state.settings = this.getDefaultSettings();
        state.stock = { items: [], transactions: [] };
        state.piutangs = [];
      }
    } else {
      state.jurnals = [];

      // 1. Ambil setting terakhir
      const anySettings = this.findLatestSettings();
      state.settings = anySettings || this.getDefaultSettings();
      if (state.settings.brands) delete state.settings.brands;

      // 2. CARI DATA PERIODE SEBELUMNYA
      const prevData = this.findPreviousPeriodData(month);
      let notifMessage = "";

      // A. LOGIKA CARRY OVER PIUTANG
      state.piutangs = [];
      if (prevData && prevData.piutangs) {
        const unpaidPiutangs = prevData.piutangs.filter((p) => {
          const totalPaid = (p.payments || []).reduce(
            (sum, pay) => sum + pay.amount,
            0,
          );
          return p.jumlah - totalPaid > 1;
        });

        if (unpaidPiutangs.length > 0) {
          state.piutangs = unpaidPiutangs.map((p) => ({ ...p }));
          notifMessage += `<li>${unpaidPiutangs.length} piutang belum lunas disalin dari periode sebelumnya.</li>`;
        }
      }

      // B. LOGIKA CARRY OVER STOCK
      if (prevData && prevData.stock && prevData.stock.items) {
        const prevStockLevels = this.calculateStockLevels(
          prevData.stock.items,
          prevData.stock.transactions,
        );

        state.stock = {
          items: prevData.stock.items.map((item) => {
            const prevLevel = prevStockLevels[item.kode];
            const stokAkhirLalu = prevLevel
              ? prevLevel.stokAwal + prevLevel.masuk - prevLevel.keluar
              : item.stokAwal;

            return { ...item, stokAwal: stokAkhirLalu };
          }),
          transactions: [],
        };
        notifMessage += `<li>Stok awal disesuaikan dari akhir periode sebelumnya.</li>`;
      } else {
        state.stock = { items: [], transactions: [] };
      }

      // C. LOGIKA CARRY OVER SALDO KAS
      if (prevData) {
        const prevMonth = this.getPreviousMonthString(month);
        const prevEndingCash = this.calculateEndingCashForPeriod(prevData, prevMonth);
        
        if (!state.settings.openingBalances) {
          state.settings.openingBalances = {};
        }

        const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
        let cashCarriedOver = false;
        cashAccounts.forEach((accName) => {
          const account = state.settings.akuns?.find((a) => a.name === accName);
          const accKey = (account && account.code) ? account.code : accName;
          
          state.settings.openingBalances[accKey] = {
            amount: prevEndingCash[accName] || 0,
            period: month,
          };
          if (prevEndingCash[accName] > 0) {
            cashCarriedOver = true;
          }
        });
        if (cashCarriedOver) {
          notifMessage += `<li>Saldo kas awal disalin dari saldo akhir periode sebelumnya.</li>`;
        }
      }

      if (notifMessage) {
        setTimeout(() => {
          utils.showModal(
            "Info Periode Baru",
            `<ul class="list-disc pl-5 space-y-1">${notifMessage}</ul>`,
          );
        }, 500);
      }
    }
    this.saveData();
  },

  saveData() {
    const dataKey = key(`accountingApp_${state.currentMonth}`);
    const dataToSave = {
      jurnals: state.jurnals,
      settings: state.settings,
      stock: state.stock,
      piutangs: state.piutangs,
    };
    localStorage.setItem(dataKey, JSON.stringify(dataToSave));

    this.propagateCashBalances(state.currentMonth);

    localStorage.setItem(
      key("accountingApp_global"),
      JSON.stringify({ activeTab: state.activeTab }),
    );
  },

  resetData() {
    const dataKey = key(`accountingApp_${state.currentMonth}`);
    localStorage.removeItem(dataKey);
  },

  saveDataForCurrentMonth() {
    this.saveData();
    utils.showModal(
      "Sukses",
      `Data untuk periode ${utils.formatMonth(
        state.currentMonth,
      )} telah berhasil disimpan.`,
    );
  },

  exportData() {
    const prefix = wsPrefix();
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(prefix)) {
        allData[k] = localStorage.getItem(k);
      }
    }
    if (Object.keys(allData).length === 0) {
      utils.showModal("Info", "Tidak ada data untuk diekspor.");
      return;
    }
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `data_${state.currentWorkspace}_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    utils.showModal("Sukses", "Semua data telah berhasil diekspor.");
  },

  importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const importedData = JSON.parse(content);
          const prefix = wsPrefix();
          utils.showModal(
            "Konfirmasi Impor",
            `Anda akan mengimpor data dari file ke workspace <strong>${state.currentWorkspace}</strong>. Ini akan <strong>MENGGANTI</strong> semua data workspace ini. Apakah Anda yakin?`,
            [
              {
                text: "Ya, Impor Sekarang",
                class: "bg-green-600 hover:bg-green-700",
                callback: () => {
                  // Hapus data workspace aktif saja
                  Object.keys(localStorage).forEach((k) => {
                    if (k.startsWith(prefix)) {
                      localStorage.removeItem(k);
                    }
                  });
                  // Impor — terima key lama (tanpa prefix) maupun key baru (dengan prefix)
                  if (importedData && (importedData.jurnals || importedData.settings)) {
                    // Backup satu bulan langsung
                    const stringValue = typeof importedData === "object" ? JSON.stringify(importedData) : importedData;
                    localStorage.setItem(key(`accountingApp_${state.currentMonth}`), stringValue);
                  } else if (importedData) {
                    // Backup multi-key (localStorage dump)
                    Object.entries(importedData).forEach(([k, value]) => {
                      const stringValue = typeof value === "object" ? JSON.stringify(value) : value;
                      const match = k.match(/accountingApp_+([a-zA-Z0-9-]+)/);
                      if (match) {
                        const suffix = match[1];
                        localStorage.setItem(key(`accountingApp_${suffix}`), stringValue);
                      }
                    });
                  }
                  utils.closeModal();
                  window.location.reload();
                },
              },
              {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => utils.closeModal(),
              },
            ],
          );
        } catch (error) {
          utils.showModal(
            "Error",
            "Gagal membaca file. Pastikan file dalam format JSON yang benar.",
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
};
