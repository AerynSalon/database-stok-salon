// =================================================================
// KODE GOOGLE APPS SCRIPT UNTUK MANAJEMEN STOK AERYN SALON (v3)
// =================================================================

// --- KONFIGURASI ---
const PRODUCTS_SHEET_NAME = 'products';
const TRANSACTIONS_SHEET_NAME = 'transactions';

// --- FUNGSI UTAMA: Menangani request dari aplikasi web ---

// doGet tetap ada untuk pengujian manual di browser
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getData') {
      const data = getAllData();
      return createJsonResponse({ status: 'success', data: data });
    }
    return createJsonResponse({ status: 'error', message: 'Aksi tidak valid.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message });
  }
}

// doPost sekarang juga menangani pengambilan data
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); 

  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const payload = requestData.payload;
    let result;

    switch (action) {
      case 'getData':
        result = getAllData();
        break;
      case 'addProduct':
        result = addProduct(payload);
        break;
      case 'updateProduct':
        result = updateProduct(payload);
        break;
      case 'deleteProduct':
        result = deleteProduct(payload);
        break;
      case 'addTransaction':
        result = addTransaction(payload);
        break;
      default:
        return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal.' });
    }
    
    return createJsonResponse({ status: 'success', data: result });

  } catch (error) {
    return createJsonResponse({ status: 'error', message: 'Gagal memproses permintaan: ' + error.message });
  } finally {
    lock.releaseLock();
  }
}


// --- FUNGSI-FUNGSI PEMBANTU ---

/**
 * Mengambil semua data dari sheet 'products' dan 'transactions'.
 * *** BARU: Ditambahkan pengecekan jika sheet tidak ada. ***
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const productsSheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  const transactionsSheet = ss.getSheetByName(TRANSACTIONS_SHEET_NAME);

  // Pengecekan penting!
  if (!productsSheet) {
    throw new Error(`Sheet dengan nama "${PRODUCTS_SHEET_NAME}" tidak ditemukan.`);
  }
  if (!transactionsSheet) {
    throw new Error(`Sheet dengan nama "${TRANSACTIONS_SHEET_NAME}" tidak ditemukan.`);
  }

  // Ambil data produk
  const productsRange = productsSheet.getDataRange();
  const productsData = productsRange.getValues();
  const productHeaders = productsData.shift() || []; // Ambil header dan hapus dari data
  const products = productsData.map(row => {
    let obj = {};
    productHeaders.forEach((header, i) => {
      if (header === 'initialStock' || header === 'lowStockThreshold') {
        obj[header] = parseInt(row[i], 10) || 0;
      } else {
        obj[header] = row[i];
      }
    });
    return obj;
  });

  // Ambil data transaksi
  const transactionsRange = transactionsSheet.getDataRange();
  const transactionsData = transactionsRange.getValues();
  const transactionHeaders = transactionsData.shift() || []; // Ambil header dan hapus dari data
  const transactions = transactionsData.map(row => {
    let obj = {};
    transactionHeaders.forEach((header, i) => {
      if (header === 'quantity') {
        obj[header] = parseInt(row[i], 10) || 0;
      } else {
        obj[header] = row[i];
      }
    });
    return obj;
  });

  return { products, transactions };
}

// ... (Fungsi lainnya tetap sama) ...
function addProduct(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${PRODUCTS_SHEET_NAME}" tidak ditemukan.`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => payload[header] || '');
  sheet.appendRow(newRow);
  return payload;
}

function updateProduct(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${PRODUCTS_SHEET_NAME}" tidak ditemukan.`);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idColumnIndex = headers.indexOf('id');

  if (idColumnIndex === -1) throw new Error("Kolom 'id' tidak ditemukan di sheet produk.");

  const rowIndex = data.findIndex(row => row[idColumnIndex] == payload.id);
  
  if (rowIndex !== -1) {
    const newRow = headers.map(header => payload[header] || '');
    sheet.getRange(rowIndex + 2, 1, 1, newRow.length).setValues([newRow]);
    return payload;
  }
  throw new Error(`Produk dengan ID ${payload.id} tidak ditemukan.`);
}

function deleteProduct(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${PRODUCTS_SHEET_NAME}" tidak ditemukan.`);
  const data = sheet.getDataRange().getValues();
  const idColumnIndex = data[0].indexOf('id');

  if (idColumnIndex === -1) throw new Error("Kolom 'id' tidak ditemukan.");

  const rowIndex = data.findIndex(row => row[idColumnIndex] == payload.id);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 1);
    return { id: payload.id };
  }
  throw new Error(`Produk dengan ID ${payload.id} tidak ditemukan.`);
}

function addTransaction(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSACTIONS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${TRANSACTIONS_SHEET_NAME}" tidak ditemukan.`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => payload[header] || '');
  sheet.appendRow(newRow);
  return payload;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
