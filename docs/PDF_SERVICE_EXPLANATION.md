# Understanding `pdf.js` - Complete Code Explanation

The `pdf.js` file is a **PDF generation service** for your accounting application. It uses the **jsPDF** library to create professional financial reports in PDF format.

---

## **Table of Contents**

1. [Overview](#overview)
2. [Imports](#1-imports-lines-1-3)
3. [Main Export Object](#2-main-export-object-line-5)
4. [Method 1: generatePDF()](#3-method-1-generatepdf-lines-6-290)
5. [Method 2: generateInvoicePDF()](#4-method-2-generateinvoicepdf-lines-292-408)
6. [Method 3: generateCategoryPDF()](#5-method-3-generatecategorypdf-lines-410-696)
7. [Summary](#summary)

---

## **Overview**

The `pdf.js` service provides **three main PDF generation functions**:

1. **`generatePDF()`**: Comprehensive financial report with charts, profit/loss summary, and all journal entries
2. **`generateInvoicePDF(piutangId)`**: Professional invoice for receivables with payment tracking
3. **`generateCategoryPDF()`**: Financial report separated by business categories (Residential/Project)

**Key Technologies Used:**

- **jsPDF**: PDF generation library
- **Chart.js**: Chart creation (converted to images for PDF)
- **autoTable**: Table formatting plugin for jsPDF

---

## **1. Imports (Lines 1-3)**

```javascript
import { state } from "../state.js";
import { utils } from "../utils.js";
import { calculateFinancials } from "../modules/labaRugi.js";
```

### **Purpose**: Import necessary dependencies

- **`state`**: Application state containing journals, accounts, settings, and other data
- **`utils`**: Utility functions for formatting currency, dates, and showing modals
- **`calculateFinancials`**: Function to calculate profit/loss metrics from journal entries

---

## **2. Main Export Object (Line 5)**

```javascript
export const pdfService = {
```

### **Purpose**: Creates a service object with three main PDF generation methods

This object is exported so other modules can import and use these PDF generation functions.

---

## **3. Method 1: `generatePDF()` (Lines 6-290)**

### **Overview**

Generates a comprehensive financial report PDF with charts, profit/loss summary, and journal details.

---

### **A. Loading Modal (Lines 7-11)**

```javascript
utils.showModal(
  "Info",
  '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Mempersiapkan PDF canggih Anda...</p></div>',
);
await new Promise((resolve) => setTimeout(resolve, 100));
```

**What it does:**

- Shows a loading spinner modal to inform the user that PDF generation is in progress
- Waits 100ms for the modal to render properly before proceeding

---

### **B. Initialize PDF & Calculate Data (Lines 13-22)**

```javascript
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
const { jurnals } = state;
const {
  pendapatanDetails,
  bebanDetails,
  totalPendapatan,
  totalBeban,
  labaBersih,
} = calculateFinancials();
```

**What it does:**

- **`window.jspdf`**: Accesses the jsPDF library loaded from CDN
- **`new jsPDF()`**: Creates a new PDF document instance
- **`state.jurnals`**: Gets all journal entries from application state
- **`calculateFinancials()`**: Calculates:
  - `pendapatanDetails`: Breakdown of income by account
  - `bebanDetails`: Breakdown of expenses by account
  - `totalPendapatan`: Total income
  - `totalBeban`: Total expenses
  - `labaBersih`: Net profit (income - expenses)

---

### **C. Monthly Data Aggregation (Lines 24-55)**

```javascript
const monthlyData = jurnals.reduce((acc, j) => {
  const month = j.tanggal.substring(0, 7); // Extract "YYYY-MM"
  if (!acc[month]) {
    acc[month] = { pendapatan: 0, beban: 0 };
  }
  if (
    state.settings.akuns.find(
      (a) => a.name === j.akun && a.type === "Pendapatan",
    )
  ) {
    acc[month].pendapatan += j.kredit - j.debit;
  }
  if (
    state.settings.akuns.find((a) => a.name === j.akun && a.type === "Beban")
  ) {
    acc[month].beban += j.debit - j.kredit;
  }
  return acc;
}, {});

const sortedMonths = Object.keys(monthlyData).sort();
const chartLabels = sortedMonths.map((m) =>
  new Date(m + "-02").toLocaleString("id-ID", {
    month: "short",
    year: "2-digit",
  }),
);
const chartData = sortedMonths.map(
  (m) => monthlyData[m].pendapatan - monthlyData[m].beban,
);
```

**What it does:**

1. **Groups transactions by month** using `reduce()`
2. **Extracts month** from date string (e.g., "2026-01-18" → "2026-01")
3. **Accumulates income and expenses** for each month:
   - Income accounts: `kredit - debit`
   - Expense accounts: `debit - kredit`
4. **Sorts months** chronologically
5. **Creates chart labels** in Indonesian format (e.g., "Jan '26")
6. **Calculates net profit per month** for the chart

**Example Output:**

```javascript
monthlyData = {
  "2026-01": { pendapatan: 50000000, beban: 30000000 },
  "2026-02": { pendapatan: 60000000, beban: 35000000 },
};
chartData = [20000000, 25000000]; // Net profit per month
```

---

### **D. Line Chart Generation (Lines 57-86)**

```javascript
let lineChartImage = null;
if (chartData.length > 0) {
  const ctx = document.getElementById("pdf-chart").getContext("2d");
  const pdfChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Laba (Rugi) Bersih",
          data: chartData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (value) => utils.formatCurrency(value) } },
      },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  lineChartImage = pdfChart.toBase64Image();
  pdfChart.destroy();
}
```

**What it does:**

1. **Checks if there's data** to display
2. **Gets canvas context** from a hidden canvas element with id "pdf-chart"
3. **Creates a Chart.js line chart** with:
   - Monthly labels on X-axis
   - Net profit values on Y-axis
   - Blue line with light blue fill
   - No animation (for faster rendering)
   - Currency-formatted Y-axis labels
4. **Waits 50ms** for chart to render
5. **Converts chart to base64 image** for embedding in PDF
6. **Destroys the chart** to free up memory

**Why base64?** PDF libraries need images in base64 format to embed them.

---

### **E. Pie Chart Generation (Lines 88-126)**

```javascript
let pieChartImage = null;
const filteredBeban = Object.entries(bebanDetails).filter(([, val]) => val > 0);
const pieChartColors = [
  "#3b82f6",
  "#ef4444",
  "#f97316",
  "#84cc16",
  "#14b8a6",
  "#a855f7",
  "#ec4899",
];
if (filteredBeban.length > 0) {
  const pieCtx = document.getElementById("pdf-pie-chart").getContext("2d");
  const pdfPieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: filteredBeban.map(([key]) => key),
      datasets: [
        {
          data: filteredBeban.map(([, val]) => val),
          backgroundColor: pieChartColors,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  pieChartImage = pdfPieChart.toBase64Image();
  pdfPieChart.destroy();
}
```

**What it does:**

1. **Filters expenses** to only include those greater than 0
2. **Defines color palette** for pie slices (7 colors)
3. **Creates a Chart.js pie chart** showing:
   - Expense categories as labels
   - Expense amounts as data
   - Different colors for each category
   - White borders between slices
4. **Converts to base64 image** and destroys chart

**Example:**
If you have expenses like:

- Gaji: Rp 10,000,000
- Sewa: Rp 5,000,000
- Listrik: Rp 1,000,000

The pie chart will show these proportionally with different colors.

---

### **F. PDF Header (Lines 128-135)**

```javascript
doc.setFontSize(18);
doc.setFont("helvetica", "bold");
doc.text("Laporan Keuangan Komprehensif", 105, 22, { align: "center" });
doc.setFontSize(11);
doc.setFont("helvetica", "normal");
doc.text(`Periode: ${utils.formatMonth(state.currentMonth)}`, 105, 30, {
  align: "center",
});
```

**What it does:**

1. **Sets font size to 18** for the title
2. **Sets font to bold Helvetica**
3. **Adds centered title** "Laporan Keuangan Komprehensif" (Comprehensive Financial Report)
   - Position: X=105 (center of 210mm page), Y=22
4. **Changes font to 11pt normal**
5. **Adds period subtitle** (e.g., "Periode: Januari 2026")

**Coordinate System:**

- jsPDF uses millimeters by default
- A4 page is 210mm wide × 297mm tall
- X=105 is the horizontal center

---

### **G. Profit/Loss Summary Table (Lines 137-162)**

```javascript
let lastY = 40;
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Ringkasan Laba Rugi", 14, lastY);

const labaRugiBody = [
  ["Total Pendapatan", utils.formatCurrency(totalPendapatan)],
  ["Total Beban", utils.formatCurrency(totalBeban)],
  [
    { content: "Laba (Rugi) Bersih", styles: { fontStyle: "bold" } },
    {
      content: utils.formatCurrency(labaBersih),
      styles: { fontStyle: "bold" },
    },
  ],
];

doc.autoTable({
  startY: lastY + 5,
  body: labaRugiBody,
  theme: "plain",
  styles: { fontSize: 10 },
  columnStyles: { 1: { halign: "right" } },
});

lastY = doc.autoTable.previous.finalY + 15;
```

**What it does:**

1. **Tracks vertical position** with `lastY` variable (starts at 40mm)
2. **Adds section header** "Ringkasan Laba Rugi" (Profit/Loss Summary)
3. **Creates table data** with three rows:
   - Total Income (formatted currency)
   - Total Expenses (formatted currency)
   - Net Profit (bold, formatted currency)
4. **Uses autoTable plugin** to create formatted table:
   - `startY`: Where to start the table
   - `body`: Table data (no header row)
   - `theme: "plain"`: Simple styling
   - `columnStyles`: Right-align the second column (amounts)
5. **Updates lastY** to the end of the table + 15mm spacing

**Example Output:**

```
Ringkasan Laba Rugi
─────────────────────────────────
Total Pendapatan      Rp 50,000,000
Total Beban          Rp 30,000,000
Laba (Rugi) Bersih   Rp 20,000,000
```

---

### **H. Add Line Chart to PDF (Lines 164-174)**

```javascript
if (lineChartImage) {
  if (lastY + 105 > 280) {
    doc.addPage();
    lastY = 22;
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Diagram Tren Laba (Rugi) Bersih Bulanan", 14, lastY);
  doc.addImage(lineChartImage, "PNG", 14, lastY + 5, 180, 90);
  lastY += 105;
}
```

**What it does:**

1. **Checks if chart exists** (only if there's data)
2. **Checks if there's enough space** on current page:
   - Chart needs 105mm (title + image + spacing)
   - If `lastY + 105 > 280`, it would overflow the page
3. **Adds new page if needed** and resets `lastY` to 22
4. **Adds chart title** "Diagram Tren Laba (Rugi) Bersih Bulanan"
5. **Embeds the chart image**:
   - Format: PNG
   - Position: X=14, Y=lastY+5
   - Size: 180mm wide × 90mm tall
6. **Updates lastY** by 105mm

**Page Management:**
This ensures content doesn't overflow off the page bottom.

---

### **I. Add Pie Chart & Legend (Lines 176-224)**

```javascript
if (pieChartImage) {
  if (lastY + 115 > 280) {
    doc.addPage();
    lastY = 22;
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Visualisasi Komposisi Beban", 14, lastY);
  lastY += 5;
  doc.addImage(pieChartImage, "PNG", 14, lastY, 100, 100);

  // Add legend
  let legendY = lastY + 105;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  filteredBeban.forEach(([key], index) => {
    if (legendY > 280) {
      doc.addPage();
      legendY = 22;
    }
    const color = pieChartColors[index % pieChartColors.length];
    doc.setFillColor(color);
    doc.rect(14, legendY, 3, 3, "F"); // Color box
    doc.text(`${key}`, 20, legendY + 2.5); // Label
    legendY += 6;
  });

  lastY = legendY + 5;
  if (lastY > 250) {
    doc.addPage();
    lastY = 22;
  }

  // Add expense breakdown table
  const bebanBody = filteredBeban.map(([key, value]) => [
    key,
    utils.formatCurrency(value),
  ]);
  bebanBody.push([
    { content: "Total Beban", styles: { fontStyle: "bold" } },
    {
      content: utils.formatCurrency(totalBeban),
      styles: { fontStyle: "bold" },
    },
  ]);
  doc.autoTable({
    startY: lastY,
    head: [["Rincian Kategori Beban", "Jumlah"]],
    body: bebanBody,
    theme: "striped",
    headStyles: { fillColor: "#374151" },
  });
  lastY = doc.autoTable.previous.finalY + 15;
}
```

**What it does:**

**Part 1: Pie Chart**

1. Checks page space (needs 115mm)
2. Adds title "Visualisasi Komposisi Beban" (Expense Composition Visualization)
3. Embeds pie chart image (100mm × 100mm)

**Part 2: Legend**

1. Creates a color-coded legend below the chart
2. For each expense category:
   - Draws a small colored rectangle (3mm × 3mm)
   - Adds the category name next to it
   - Checks for page overflow and adds new page if needed
3. Uses modulo operator (`%`) to cycle through colors if there are more than 7 categories

**Part 3: Detailed Table**

1. Creates a table with all expense categories and amounts
2. Adds a "Total Beban" row at the bottom (bold)
3. Uses "striped" theme (alternating row colors)
4. Dark gray header (#374151)

**Example Legend:**

```
🟦 Gaji
🔴 Sewa
🟧 Listrik
🟩 Internet
```

---

### **J. Journal Entries Section (Lines 226-286)**

```javascript
doc.addPage();
let journalY = 22;
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Rincian Jurnal Umum", 14, journalY);

const journalBody = [];
const groupedJurnals = jurnals.reduce((acc, j) => {
  (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
  return acc;
}, {});

Object.values(groupedJurnals)
  .sort((a, b) => new Date(b[0].tanggal) - new Date(a[0].tanggal))
  .forEach((entries) => {
    const firstEntry = entries[0];
    journalBody.push([
      {
        content: `Tanggal: ${firstEntry.tanggal} | No: ${
          firstEntry.noBukti
        } | Kelompok: ${firstEntry.kelompok || "Lainnya"}`,
        colSpan: 3,
        styles: {
          fontStyle: "bold",
          fillColor: "#e8f0fe",
          textColor: "#1e3a8a",
        },
      },
    ]);
    entries.forEach((entry) => {
      if (entry.debit > 0 || entry.kredit > 0) {
        let akunCell =
          entry.kredit > 0
            ? `    ${entry.akun}\n    (${entry.keterangan})`
            : `${entry.akun}\n(${entry.keterangan})`;
        journalBody.push([
          akunCell,
          entry.debit ? utils.formatCurrency(entry.debit) : "",
          entry.kredit ? utils.formatCurrency(entry.kredit) : "",
        ]);
      }
    });
  });

doc.autoTable({
  startY: journalY + 5,
  head: [["Akun & Keterangan", "Debit", "Kredit"]],
  body: journalBody,
  theme: "grid",
  headStyles: {
    fillColor: "#1e40af",
    textColor: "#ffffff",
    fontStyle: "bold",
  },
  columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  didDrawCell: (data) => {
    if (data.cell && data.cell.raw && data.cell.raw.colSpan === 3) {
      doc.setFontSize(9);
      doc.setTextColor(100);
    }
  },
});
```

**What it does:**

**Part 1: Group Journals**

1. **Adds a new page** for journal entries
2. **Groups journal entries by transaction number** (`noBukti`)
   - Each transaction can have multiple entries (double-entry bookkeeping)
3. **Sorts by date** (newest first)

**Part 2: Format Entries**
For each transaction:

1. **Adds header row** with:
   - Date, transaction number, and category
   - Spans all 3 columns
   - Light blue background (#e8f0fe)
   - Dark blue text (#1e3a8a)

2. **Adds entry rows**:
   - **Debit entries**: Account name flush left
   - **Credit entries**: Account name indented (4 spaces)
   - Description in parentheses
   - Debit and credit amounts right-aligned

**Part 3: Create Table**

1. Uses "grid" theme (borders around cells)
2. Blue header (#1e40af)
3. Right-aligns debit and credit columns

**Example Output:**

```
┌─────────────────────────────────────────────────────────────┐
│ Akun & Keterangan          │ Debit        │ Kredit        │
├─────────────────────────────────────────────────────────────┤
│ Tanggal: 2026-01-15 | No: JRN-001 | Kelompok: Residential  │
├─────────────────────────────────────────────────────────────┤
│ Kas                        │ Rp 5,000,000 │               │
│ (Penerimaan dari klien)    │              │               │
│     Pendapatan Jasa        │              │ Rp 5,000,000  │
│     (Pembayaran proyek A)  │              │               │
└─────────────────────────────────────────────────────────────┘
```

**Indentation Logic:**

- Credit entries are indented to follow accounting convention
- Makes it easier to see which accounts are debited vs credited

---

### **K. Save PDF (Lines 288-289)**

```javascript
doc.save(`Laporan_Keuangan_${state.currentMonth}.pdf`);
utils.closeModal();
```

**What it does:**

1. **Saves the PDF file** with filename including the current month
   - Example: `Laporan_Keuangan_2026-01.pdf`
2. **Closes the loading modal** to inform user that generation is complete

The browser will automatically download the PDF file.

---

## **4. Method 2: `generateInvoicePDF(piutangId)` (Lines 292-408)**

### **Overview**

Generates a professional invoice PDF for a specific receivable (piutang/accounts receivable).

---

### **A. Find Receivable Data (Lines 293-297)**

```javascript
const piutang = state.piutangs.find((p) => p.id === piutangId);
if (!piutang) {
  utils.showModal("Error", "Data piutang tidak ditemukan.");
  return;
}
```

**What it does:**

1. **Searches** the `state.piutangs` array for a receivable with matching ID
2. **Shows error modal** if not found
3. **Exits function** early if data doesn't exist

**Data Structure:**

```javascript
piutang = {
  id: "PIT-001",
  namaPelanggan: "PT ABC",
  jumlah: 10000000,
  tanggalPembelian: "2026-01-15",
  tanggalJatuhTempo: "2026-02-15",
  keterangan: "Jasa konsultasi",
  payments: [{ amount: 3000000, date: "2026-01-20" }],
};
```

---

### **B. Loading Modal (Lines 299-303)**

```javascript
utils.showModal(
  "Info",
  '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Membuat Invoice PDF...</p></div>',
);
await new Promise((resolve) => setTimeout(resolve, 50));
```

**What it does:**

- Shows loading spinner with message "Membuat Invoice PDF..." (Creating Invoice PDF...)
- Waits 50ms for modal to render

---

### **C. Initialize PDF (Lines 305-306)**

```javascript
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
```

**What it does:**

- Creates a new PDF document instance for the invoice

---

### **D. Calculate Payment Status (Lines 308-312)**

```javascript
const totalPaid = (piutang.payments || []).reduce(
  (sum, p) => sum + p.amount,
  0,
);
const remainingAmount = piutang.jumlah - totalPaid;
```

**What it does:**

1. **Sums all payments** made on this receivable
   - Uses `reduce()` to add up all payment amounts
   - Defaults to empty array if no payments exist
2. **Calculates remaining balance** (total - paid)

**Example:**

```javascript
piutang.jumlah = 10,000,000
payments = [
  { amount: 3,000,000 },
  { amount: 2,000,000 }
]
totalPaid = 5,000,000
remainingAmount = 5,000,000
```

---

### **E. Invoice Header (Lines 314-344)**

```javascript
doc.setFontSize(22);
doc.setFont("helvetica", "bold");
doc.text("INVOICE", 105, 20, { align: "center" });

// From section
doc.setFontSize(10);
doc.setFont("helvetica", "bold");
doc.text("DARI:", 14, 40);
doc.setFont("helvetica", "normal");
doc.text("Perusahaan Anda", 14, 46);
doc.text("Jalan Contoh No. 123", 14, 51);
doc.text("Kota, 12345", 14, 56);

// To section
doc.setFont("helvetica", "bold");
doc.text("KEPADA:", 130, 40);
doc.setFont("helvetica", "normal");
doc.text(piutang.namaPelanggan, 130, 46);

// Invoice details
doc.setFont("helvetica", "bold");
doc.text("Invoice #:", 130, 60);
doc.setFont("helvetica", "normal");
doc.text(`INV-${piutang.id}`, 160, 60);

doc.setFont("helvetica", "bold");
doc.text("Tanggal Terbit:", 130, 65);
doc.setFont("helvetica", "normal");
doc.text(piutang.tanggalPembelian, 160, 65);

doc.setFont("helvetica", "bold");
doc.text("Jatuh Tempo:", 130, 70);
doc.setFont("helvetica", "normal");
doc.text(piutang.tanggalJatuhTempo, 160, 70);
```

**What it does:**

**1. Title**

- Large centered "INVOICE" text (22pt, bold)

**2. From Section (Left side)**

- Label "DARI:" (FROM:)
- Your company name
- Address line 1
- Address line 2

**3. To Section (Right side)**

- Label "KEPADA:" (TO:)
- Customer name from receivable data

**4. Invoice Details (Right side)**

- Invoice number (e.g., "INV-PIT-001")
- Issue date
- Due date

**Layout:**

```
                    INVOICE

DARI:                           KEPADA:
Perusahaan Anda                 PT ABC
Jalan Contoh No. 123
Kota, 12345                     Invoice #: INV-PIT-001
                                Tanggal Terbit: 2026-01-15
                                Jatuh Tempo: 2026-02-15
```

---

### **F. Item Table (Lines 348-367)**

```javascript
let lastY = 85;

doc.autoTable({
  startY: lastY,
  head: [["Deskripsi", "Kuantitas", "Harga Satuan", "Total"]],
  body: [
    [
      piutang.keterangan,
      1,
      utils.formatCurrency(piutang.jumlah),
      utils.formatCurrency(piutang.jumlah),
    ],
  ],
  theme: "striped",
  headStyles: { fillColor: "#374151" },
  columnStyles: {
    1: { halign: "center" },
    2: { halign: "right" },
    3: { halign: "right" },
  },
});
lastY = doc.autoTable.previous.finalY;
```

**What it does:**

1. **Creates a table** with item details:
   - **Description**: From `piutang.keterangan`
   - **Quantity**: Always 1 (simplified)
   - **Unit Price**: The receivable amount
   - **Total**: Same as unit price

2. **Styling**:
   - Striped theme (alternating row colors)
   - Dark gray header
   - Center-align quantity
   - Right-align prices

**Example Output:**

```
┌────────────────────────────────────────────────────────────┐
│ Deskripsi          │ Kuantitas │ Harga Satuan │ Total     │
├────────────────────────────────────────────────────────────┤
│ Jasa konsultasi    │     1     │ Rp 10,000,000│Rp 10,000,000│
└────────────────────────────────────────────────────────────┘
```

**Note:** This is simplified. In a real invoice, you might have multiple line items.

---

### **G. Payment Summary (Lines 369-388)**

```javascript
const totalX = 150;
const totalYStart = lastY + 10;
doc.setFontSize(11);
doc.setFont("helvetica", "normal");

doc.text("Subtotal:", totalX, totalYStart, { align: "right" });
doc.text(utils.formatCurrency(piutang.jumlah), 200, totalYStart, {
  align: "right",
});

doc.text("Total Pembayaran:", totalX, totalYStart + 7, { align: "right" });
doc.text(`(${utils.formatCurrency(totalPaid)})`, 200, totalYStart + 7, {
  align: "right",
});

doc.setFont("helvetica", "bold");
doc.text("SISA TAGIHAN:", totalX, totalYStart + 14, { align: "right" });
doc.text(utils.formatCurrency(remainingAmount), 200, totalYStart + 14, {
  align: "right",
});
```

**What it does:**

1. **Positions summary on the right side** (X=150 for labels, X=200 for amounts)
2. **Shows three lines**:
   - **Subtotal**: Original invoice amount
   - **Total Pembayaran**: Amount already paid (in parentheses)
   - **SISA TAGIHAN**: Remaining balance (bold, emphasized)

**Example Output:**

```
                        Subtotal:  Rp 10,000,000
                Total Pembayaran:  (Rp 5,000,000)
                   SISA TAGIHAN:   Rp 5,000,000
```

**Why parentheses?** In accounting, parentheses indicate a reduction/credit.

---

### **H. Footer Notes (Lines 392-402)**

```javascript
lastY = totalYStart + 25;

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text("Catatan:", 14, lastY);
doc.text(
  "Mohon lakukan pembayaran sebelum tanggal jatuh tempo.",
  14,
  lastY + 5,
);
doc.text("Terima kasih atas bisnis Anda.", 105, lastY + 20, {
  align: "center",
});
```

**What it does:**

1. **Adds "Catatan:" (Notes:)** label
2. **Payment reminder**: "Please make payment before due date"
3. **Thank you message**: Centered at bottom

**Professional Touch:**
These notes make the invoice more professional and friendly.

---

### **I. Save Invoice (Lines 404-407)**

```javascript
doc.save(
  `Invoice_${piutang.namaPelanggan.replace(/\s+/g, "_")}_${piutang.id}.pdf`,
);
utils.closeModal();
```

**What it does:**

1. **Saves PDF** with descriptive filename:
   - Replaces spaces in customer name with underscores
   - Includes customer name and invoice ID
   - Example: `Invoice_PT_ABC_PIT-001.pdf`
2. **Closes loading modal**

**Regex Explanation:**

- `/\s+/g`: Matches one or more whitespace characters globally
- Replaces with `_` for valid filename

---

## **5. Method 3: `generateCategoryPDF()` (Lines 410-696)**

### **Overview**

Generates a financial report separated by business categories (Residential, Project, and Uncategorized). This is useful for businesses that track different revenue streams or departments.

---

### **A. Loading Modal (Lines 411-415)**

```javascript
utils.showModal(
  "Info",
  '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i><p class="mt-2">Mempersiapkan Laporan Per Kategori...</p></div>',
);
await new Promise((resolve) => setTimeout(resolve, 100));
```

**What it does:**

- Shows purple spinner (different color to distinguish from other PDFs)
- Message: "Mempersiapkan Laporan Per Kategori..." (Preparing Report by Category...)

---

### **B. Initialize PDF (Lines 417-418)**

```javascript
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
```

**What it does:**

- Creates new PDF document instance

---

### **C. Filter Journals by Category (Lines 420-427)**

```javascript
// Filter journals by category
const residentialJurnals = state.jurnals.filter(
  (j) => j.category === "Residential",
);
const projectJurnals = state.jurnals.filter((j) => j.category === "Project");
const uncategorizedJurnals = state.jurnals.filter((j) => !j.category);
```

**What it does:**

1. **Separates journal entries** into three groups:
   - **Residential**: Transactions tagged with "Residential" category
   - **Project**: Transactions tagged with "Project" category
   - **Uncategorized**: Transactions without a category

**Use Case:**
If you run a construction company:

- **Residential**: Home renovations, residential projects
- **Project**: Commercial buildings, large contracts
- **Uncategorized**: General overhead, admin expenses

---

### **D. Calculate Category Financials Function (Lines 429-458)**

```javascript
// Helper function to calculate financials for a specific category
const calculateCategoryFinancials = (jurnals) => {
  let totalPendapatan = 0;
  let totalBeban = 0;
  const pendapatanDetails = {};
  const bebanDetails = {};

  jurnals.forEach((j) => {
    const akun = state.settings.akuns.find((a) => a.name === j.akun);
    if (!akun) return;

    if (akun.type === "Pendapatan") {
      const amount = j.kredit - j.debit;
      totalPendapatan += amount;
      pendapatanDetails[j.akun] = (pendapatanDetails[j.akun] || 0) + amount;
    } else if (akun.type === "Beban") {
      const amount = j.debit - j.kredit;
      totalBeban += amount;
      bebanDetails[j.akun] = (bebanDetails[j.akun] || 0) + amount;
    }
  });

  return {
    totalPendapatan,
    totalBeban,
    labaBersih: totalPendapatan - totalBeban,
    pendapatanDetails,
    bebanDetails,
  };
};
```

**What it does:**
This is a **reusable helper function** that:

1. **Takes an array of journal entries** as input
2. **Loops through each entry** and:
   - Finds the account definition
   - Checks if it's income or expense
   - Calculates the amount:
     - **Income**: `kredit - debit` (credits increase income)
     - **Expense**: `debit - kredit` (debits increase expenses)
   - Accumulates totals and details by account

3. **Returns an object** with:
   - `totalPendapatan`: Total income
   - `totalBeban`: Total expenses
   - `labaBersih`: Net profit (income - expenses)
   - `pendapatanDetails`: Breakdown of income by account
   - `bebanDetails`: Breakdown of expenses by account

**Why a helper function?**
Because we need to calculate the same metrics for three different categories. This avoids code duplication.

---

### **E. Calculate for Each Category (Lines 460-463)**

```javascript
// Calculate for each category
const residentialData = calculateCategoryFinancials(residentialJurnals);
const projectData = calculateCategoryFinancials(projectJurnals);
const uncategorizedData = calculateCategoryFinancials(uncategorizedJurnals);
```

**What it does:**

- **Calls the helper function** three times, once for each category
- **Stores results** in separate variables

**Example Output:**

```javascript
residentialData = {
  totalPendapatan: 50000000,
  totalBeban: 30000000,
  labaBersih: 20000000,
  pendapatanDetails: { "Pendapatan Jasa": 50000000 },
  bebanDetails: { Gaji: 20000000, Sewa: 10000000 },
};
```

---

### **F. Cover Page with Summary (Lines 465-506)**

```javascript
// ========== COVER PAGE ==========
doc.setFontSize(22);
doc.setFont("helvetica", "bold");
doc.text("Laporan Keuangan Per Kategori", 105, 30, { align: "center" });

doc.setFontSize(14);
doc.setFont("helvetica", "normal");
doc.text(`Periode: ${utils.formatMonth(state.currentMonth)}`, 105, 40, {
  align: "center",
});

doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Ringkasan:", 14, 60);

doc.setFontSize(10);
doc.setFont("helvetica", "normal");

const summaryData = [
  ["* Residential", utils.formatCurrency(residentialData.labaBersih)],
  ["* Project", utils.formatCurrency(projectData.labaBersih)],
  ["* Tanpa Kategori", utils.formatCurrency(uncategorizedData.labaBersih)],
  [
    { content: "Total Keseluruhan", styles: { fontStyle: "bold" } },
    {
      content: utils.formatCurrency(
        residentialData.labaBersih +
          projectData.labaBersih +
          uncategorizedData.labaBersih,
      ),
      styles: { fontStyle: "bold" },
    },
  ],
];

doc.autoTable({
  startY: 65,
  body: summaryData,
  theme: "striped",
  headStyles: { fillColor: "#7c3aed" },
  columnStyles: { 1: { halign: "right" } },
});
```

**What it does:**

**1. Title Section**

- Large title: "Laporan Keuangan Per Kategori" (Financial Report by Category)
- Period subtitle

**2. Summary Table**

- Shows net profit for each category
- Calculates and displays grand total
- Bold formatting for total row
- Purple theme (#7c3aed)

**Example Output:**

```
        Laporan Keuangan Per Kategori
            Periode: Januari 2026

Ringkasan:
┌──────────────────────────────────────────┐
│ * Residential      │ Rp 20,000,000       │
│ * Project          │ Rp 15,000,000       │
│ * Tanpa Kategori   │ Rp 5,000,000        │
│ Total Keseluruhan  │ Rp 40,000,000       │
└──────────────────────────────────────────┘
```

**Purpose:**
Gives executives a quick overview before diving into details.

---

### **G. Render Category Section Function (Lines 508-672)**

This is a **large, reusable function** that renders a complete section for one category. Let's break it down:

```javascript
const renderCategorySection = (
  categoryName,
  icon,
  data,
  jurnals,
  startNewPage = true,
) => {
  if (startNewPage) {
    doc.addPage();
  }

  let lastY = 20;

  // ... (rest of function)
};
```

**Parameters:**

- `categoryName`: Name of the category (e.g., "Residential")
- `icon`: Icon character (e.g., "\*")
- `data`: Financial data object from `calculateCategoryFinancials()`
- `jurnals`: Array of journal entries for this category
- `startNewPage`: Whether to start on a new page (default: true)

---

#### **G1. Category Header (Lines 520-526)**

```javascript
// Category Header
doc.setFontSize(18);
doc.setFont("helvetica", "bold");
doc.text(`${icon} ${categoryName}`, 14, lastY);
lastY += 10;
```

**What it does:**

- Adds large, bold category name with icon
- Example: "\* Residential"

---

#### **G2. Financial Summary Table (Lines 528-563)**

```javascript
// Financial Summary
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Ringkasan Laba Rugi", 14, lastY);
lastY += 5;

const summaryBody = [
  ["Total Pendapatan", utils.formatCurrency(data.totalPendapatan)],
  ["Total Beban", utils.formatCurrency(data.totalBeban)],
  [
    {
      content: "Laba (Rugi) Bersih",
      styles: {
        fontStyle: "bold",
        fillColor: data.labaBersih >= 0 ? "#dcfce7" : "#fee2e2",
      },
    },
    {
      content: utils.formatCurrency(data.labaBersih),
      styles: {
        fontStyle: "bold",
        fillColor: data.labaBersih >= 0 ? "#dcfce7" : "#fee2e2",
      },
    },
  ],
];

doc.autoTable({
  startY: lastY,
  body: summaryBody,
  theme: "plain",
  styles: { fontSize: 10 },
  columnStyles: { 1: { halign: "right" } },
});

lastY = doc.autoTable.previous.finalY + 15;
```

**What it does:**

1. **Creates summary table** with:
   - Total income
   - Total expenses
   - Net profit/loss

2. **Color coding**:
   - **Green background** (#dcfce7) if profit (labaBersih >= 0)
   - **Red background** (#fee2e2) if loss (labaBersih < 0)

**Visual Feedback:**
The color immediately shows if this category is profitable or not.

---

#### **G3. Detailed Breakdown (Lines 565-604)**

```javascript
// Detailed Breakdown
if (
  Object.keys(data.pendapatanDetails).length > 0 ||
  Object.keys(data.bebanDetails).length > 0
) {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Rincian Pendapatan & Beban", 14, lastY);
  lastY += 5;

  const detailBody = [];

  // Pendapatan
  Object.entries(data.pendapatanDetails).forEach(([key, value]) => {
    if (value > 0) {
      detailBody.push([`Pendapatan: ${key}`, utils.formatCurrency(value)]);
    }
  });

  // Beban
  Object.entries(data.bebanDetails).forEach(([key, value]) => {
    if (value > 0) {
      detailBody.push([`Beban: ${key}`, utils.formatCurrency(value)]);
    }
  });

  if (detailBody.length > 0) {
    doc.autoTable({
      startY: lastY,
      body: detailBody,
      theme: "striped",
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
    });
    lastY = doc.autoTable.previous.finalY + 15;
  }
}
```

**What it does:**

1. **Checks if there are any details** to show
2. **Creates a detailed table** listing:
   - All income accounts with amounts
   - All expense accounts with amounts
3. **Prefixes each row** with "Pendapatan:" or "Beban:" for clarity

**Example Output:**

```
Rincian Pendapatan & Beban
┌────────────────────────────────────────┐
│ Pendapatan: Jasa Konsultasi│Rp 30,000,000│
│ Pendapatan: Jasa Desain    │Rp 20,000,000│
│ Beban: Gaji                │Rp 15,000,000│
│ Beban: Sewa                │Rp 10,000,000│
│ Beban: Listrik             │Rp 5,000,000 │
└────────────────────────────────────────┘
```

---

#### **G4. Journal Entries (Lines 606-671)**

```javascript
// Journal Entries
if (jurnals.length > 0) {
  if (lastY > 220) {
    doc.addPage();
    lastY = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Rincian Jurnal", 14, lastY);
  lastY += 5;

  const journalBody = [];
  const groupedJurnals = jurnals.reduce((acc, j) => {
    (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
    return acc;
  }, {});

  Object.values(groupedJurnals)
    .sort((a, b) => new Date(b[0].tanggal) - new Date(a[0].tanggal))
    .forEach((entries) => {
      const firstEntry = entries[0];
      journalBody.push([
        {
          content: `Tanggal: ${firstEntry.tanggal} | No: ${firstEntry.noBukti}`,
          colSpan: 3,
          styles: {
            fontStyle: "bold",
            fillColor: "#f3e8ff",
            textColor: "#6b21a8",
          },
        },
      ]);
      entries.forEach((entry) => {
        if (entry.debit > 0 || entry.kredit > 0) {
          let akunCell =
            entry.kredit > 0
              ? `    ${entry.akun}\n    (${entry.keterangan})`
              : `${entry.akun}\n(${entry.keterangan})`;
          journalBody.push([
            akunCell,
            entry.debit ? utils.formatCurrency(entry.debit) : "",
            entry.kredit ? utils.formatCurrency(entry.kredit) : "",
          ]);
        }
      });
    });

  doc.autoTable({
    startY: lastY,
    head: [["Akun & Keterangan", "Debit", "Kredit"]],
    body: journalBody,
    theme: "grid",
    headStyles: {
      fillColor: "#7c3aed",
      textColor: "#ffffff",
      fontStyle: "bold",
    },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    styles: { fontSize: 8 },
  });
} else {
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Tidak ada transaksi untuk kategori ini.", 14, lastY);
}
```

**What it does:**

**If there are journal entries:**

1. **Checks page space** and adds new page if needed
2. **Groups entries by transaction number**
3. **Sorts by date** (newest first)
4. **Creates formatted table** with:
   - Purple theme (#7c3aed) to match category report theme
   - Light purple header rows (#f3e8ff)
   - Indented credit entries
   - Smaller font (8pt) to fit more data

**If no entries:**

- Shows italic message: "Tidak ada transaksi untuk kategori ini." (No transactions for this category)

**Color Scheme:**

- Purple theme distinguishes category report from comprehensive report (which uses blue)

---

### **H. Render All Categories (Lines 674-692)**

```javascript
// Render each category section
renderCategorySection(
  "Residential",
  "*",
  residentialData,
  residentialJurnals,
  true,
);
renderCategorySection("Project", "*", projectData, projectJurnals, true);

if (uncategorizedJurnals.length > 0) {
  renderCategorySection(
    "Tanpa Kategori",
    "*",
    uncategorizedData,
    uncategorizedJurnals,
    true,
  );
}
```

**What it does:**

1. **Calls `renderCategorySection()`** for Residential category
2. **Calls `renderCategorySection()`** for Project category
3. **Conditionally renders** Uncategorized section only if there are entries

**Why conditional?**
If all transactions are properly categorized, there's no need to show an empty "Uncategorized" section.

---

### **I. Save PDF (Lines 694-695)**

```javascript
doc.save(`Laporan_Per_Kategori_${state.currentMonth}.pdf`);
utils.closeModal();
```

**What it does:**

1. **Saves PDF** with filename including current month
   - Example: `Laporan_Per_Kategori_2026-01.pdf`
2. **Closes loading modal**

---

## **Summary**

### **Three PDF Generation Methods:**

| Method                      | Purpose                        | Key Features                                                                                                                           |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **`generatePDF()`**         | Comprehensive financial report | • Line chart (monthly profit trend)<br>• Pie chart (expense composition)<br>• Profit/loss summary<br>• All journal entries             |
| **`generateInvoicePDF()`**  | Customer invoice               | • Professional invoice layout<br>• Payment tracking<br>• Remaining balance calculation<br>• Customer details                           |
| **`generateCategoryPDF()`** | Category-based report          | • Separate sections per category<br>• Individual P&L for each category<br>• Category-specific journal entries<br>• Grand total summary |

---

### **Common Patterns Used:**

1. **Loading Modals**: User feedback during PDF generation
2. **Page Management**: Automatic page breaks when content exceeds page height
3. **Chart to Image**: Convert Chart.js charts to base64 images for embedding
4. **autoTable Plugin**: Professional table formatting
5. **Currency Formatting**: Consistent use of `utils.formatCurrency()`
6. **Color Coding**: Visual indicators (green=profit, red=loss, purple=category theme)
7. **Grouping**: Journal entries grouped by transaction number
8. **Sorting**: Chronological sorting (newest first)
9. **Indentation**: Credit entries indented for accounting convention

---

### **Key Technologies:**

- **jsPDF**: Core PDF generation library
- **Chart.js**: Chart creation (line, pie)
- **autoTable**: Table plugin for jsPDF
- **JavaScript Array Methods**: `reduce()`, `filter()`, `map()`, `forEach()`, `sort()`
- **Template Literals**: Dynamic string formatting
- **Async/Await**: Asynchronous chart rendering

---

### **Accounting Principles Applied:**

1. **Double-Entry Bookkeeping**: Debit and credit columns
2. **Indentation Convention**: Credit entries indented
3. **Profit/Loss Calculation**: Income - Expenses
4. **Transaction Grouping**: Multiple entries per transaction
5. **Category Tracking**: Separate P&L by business segment
6. **Receivables Management**: Invoice with payment tracking

---

### **File Structure:**

```
pdf.js
├── Imports (state, utils, calculateFinancials)
├── pdfService object
│   ├── generatePDF()
│   │   ├── Loading modal
│   │   ├── Initialize PDF
│   │   ├── Calculate financials
│   │   ├── Aggregate monthly data
│   │   ├── Generate line chart
│   │   ├── Generate pie chart
│   │   ├── Add PDF header
│   │   ├── Add P&L summary table
│   │   ├── Add line chart to PDF
│   │   ├── Add pie chart & legend
│   │   ├── Add journal entries
│   │   └── Save PDF
│   │
│   ├── generateInvoicePDF(piutangId)
│   │   ├── Find receivable data
│   │   ├── Loading modal
│   │   ├── Initialize PDF
│   │   ├── Calculate payment status
│   │   ├── Add invoice header
│   │   ├── Add item table
│   │   ├── Add payment summary
│   │   ├── Add footer notes
│   │   └── Save PDF
│   │
│   └── generateCategoryPDF()
│       ├── Loading modal
│       ├── Initialize PDF
│       ├── Filter journals by category
│       ├── Calculate category financials (helper function)
│       ├── Calculate for each category
│       ├── Add cover page with summary
│       ├── Render category section (helper function)
│       │   ├── Category header
│       │   ├── Financial summary
│       │   ├── Detailed breakdown
│       │   └── Journal entries
│       ├── Render all categories
│       └── Save PDF
```

---

### **Best Practices Demonstrated:**

1. ✅ **Modular Code**: Reusable helper functions
2. ✅ **Error Handling**: Check for missing data
3. ✅ **User Feedback**: Loading modals
4. ✅ **Memory Management**: Destroy charts after use
5. ✅ **Responsive Layout**: Dynamic page breaks
6. ✅ **Professional Styling**: Consistent fonts, colors, spacing
7. ✅ **Data Validation**: Filter out zero values
8. ✅ **Descriptive Filenames**: Include date/customer in filename
9. ✅ **Code Comments**: Section markers for clarity
10. ✅ **DRY Principle**: Don't Repeat Yourself (helper functions)

---

## **How to Use These Functions:**

```javascript
// Import the service
import { pdfService } from "./js/services/pdf.js";

// Generate comprehensive report
pdfService.generatePDF();

// Generate invoice for specific receivable
pdfService.generateInvoicePDF("PIT-001");

// Generate category report
pdfService.generateCategoryPDF();
```

---

**End of Documentation**

This file provides a complete explanation of every part of the `pdf.js` service. You can reference this anytime you need to understand or modify the PDF generation functionality.
