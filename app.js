document.addEventListener('DOMContentLoaded', () => {
    // !!! PENTING !!!
    // GANTI URL DI BAWAH INI DENGAN URL WEB APP DARI GOOGLE APPS SCRIPT ANDA
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxosaQI63j86jZGccW1R8uWxEUipqPrMFZ_iHfsuqvF0bdu2Doqs0bRSEPwwdRJSplOoQ/exec';

    const App = {
        // --- DOM ELEMENTS ---
        elements: {
            nav: document.querySelector('nav'),
            pages: document.querySelectorAll('.page'),
            loadingOverlay: document.getElementById('loading-overlay'),
            // Dashboard
            dashboardCards: document.getElementById('dashboard-cards'),
            lowStockTableBody: document.querySelector('#low-stock-table tbody'),
            // Products
            addProductBtn: document.getElementById('addProductBtn'),
            productTableBody: document.querySelector('#productTable tbody'),
            productSearchInput: document.getElementById('product-search-input'),
            productCategoryFilter: document.getElementById('product-category-filter'),
            // Product Modal
            productModal: document.getElementById('productModal'),
            productModalTitle: document.getElementById('modalTitle'),
            productModalCloseBtn: document.querySelector('#productModal .close-btn'),
            productForm: document.getElementById('productForm'),
            productIdInput: document.getElementById('productId'),
            productNameInput: document.getElementById('productName'),
            productCategorySelect: document.getElementById('productCategory'),
            newCategoryInput: document.getElementById('newCategory'),
            productUnitSelect: document.getElementById('productUnit'),
            initialStockInput: document.getElementById('initialStock'),
            lowStockThresholdInput: document.getElementById('lowStockThreshold'),
            // Transaction In
            txInForm: document.getElementById('tx-in-form'),
            txInProductSelect: document.getElementById('tx-in-product'),
            txInDateInput: document.getElementById('tx-in-date'),
            txInQuantityInput: document.getElementById('tx-in-quantity'),
            txInNotesInput: document.getElementById('tx-in-notes'),
            txInTableBody: document.querySelector('#tx-in-table tbody'),
            // Transaction Out
            txOutForm: document.getElementById('tx-out-form'),
            txOutProductSelect: document.getElementById('tx-out-product'),
            txOutDateInput: document.getElementById('tx-out-date'),
            txOutQuantityInput: document.getElementById('tx-out-quantity'),
            txOutUsageSelect: document.getElementById('tx-out-usage'),
            txOutNotesInput: document.getElementById('tx-out-notes'),
            txOutTableBody: document.querySelector('#tx-out-table tbody'),
            // Reports
            reportFiltersForm: document.getElementById('report-filters'),
            reportStartDateInput: document.getElementById('report-start-date'),
            reportEndDateInput: document.getElementById('report-end-date'),
            reportCategorySelect: document.getElementById('report-category'),
            reportTableBody: document.querySelector('#report-table tbody'),
            exportCsvBtn: document.getElementById('exportCsvBtn'),
        },

        // --- STATE ---
        state: {
            products: [],
            transactions: [],
            categories: new Set(),
            editingProductId: null,
        },

        // --- INITIALIZATION ---
        async init() {
            this.bindEvents();
            if (GOOGLE_SCRIPT_URL === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
                alert('PENTING: Harap edit file app.js dan ganti placeholder GOOGLE_SCRIPT_URL dengan URL Google Apps Script Anda.');
                this.showLoader(false);
                return;
            }
            await this.loadData();
            this.navigateTo('dashboard-page');
            this.elements.txInDateInput.valueAsDate = new Date();
            this.elements.txOutDateInput.valueAsDate = new Date();
        },

        // --- API & DATA HANDLING ---
        showLoader(show = true) {
            this.elements.loadingOverlay.classList.toggle('hidden', !show);
        },

        async apiPost(action, payload) {
            this.showLoader();
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action, payload })
                });
                const result = await response.json();
                if (result.status !== 'success') {
                    throw new Error(result.message || 'Terjadi kesalahan pada server.');
                }
                return result.data;
            } catch (error) {
                console.error('API Error:', error);
                alert(`Gagal berkomunikasi dengan server: ${error.message}`);
                return null;
            } finally {
                this.showLoader(false);
            }
        },

        async loadData() {
            this.showLoader();
            const data = await this.apiPost('getData', {});
            if (data) {
                this.state.products = data.products || [];
                this.state.transactions = data.transactions || [];
                this.updateCategories();
                this.renderAllPages();
            }
            this.showLoader(false);
        },

        updateCategories() {
            this.state.categories.clear();
            ['Shampoo', 'Conditioner', 'Creambath', 'Cat Rambut', 'Styling'].forEach(c => this.state.categories.add(c));
            this.state.products.forEach(p => this.state.categories.add(p.category));
        },

        // --- CORE LOGIC ---
        getStockData(productId) {
            const product = this.state.products.find(p => p.id === productId);
            if (!product) return { initial: 0, stockIn: 0, stockOut: 0, finalStock: 0 };
            const initial = product.initialStock;
            let stockIn = 0, stockOut = 0;
            this.state.transactions.filter(t => t.productId === productId).forEach(t => {
                if (t.type === 'in') stockIn += t.quantity;
                if (t.type === 'out') stockOut += t.quantity;
            });
            return { initial, stockIn, stockOut, finalStock: initial + stockIn - stockOut };
        },

        getAugmentedProducts() {
            return this.state.products.map(p => ({ ...p, ...this.getStockData(p.id) }));
        },

        // --- NAVIGATION ---
        navigateTo(pageId) {
            this.elements.pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            this.elements.nav.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.page === pageId);
            });
            const renderFunction = `render${pageId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
            if (typeof this[renderFunction] === 'function') {
                this[renderFunction]();
            }
        },

        // --- RENDER FUNCTIONS ---
        renderAllPages() {
            this.renderDashboardPage();
            this.renderProductsPage();
            this.renderTxInPage();
            this.renderTxOutPage();
            this.renderReportsPage();
        },

        renderDashboardPage() {
            const augmentedProducts = this.getAugmentedProducts();
            const totalProductTypes = this.state.products.length;
            const totalStock = augmentedProducts.reduce((sum, p) => sum + p.finalStock, 0);
            this.elements.dashboardCards.innerHTML = `
                <div class="dashboard-card">
                    <h3>Total Jenis Produk</h3>
                    <div class="value">${totalProductTypes}</div>
                </div>
                <div class="dashboard-card">
                    <h3>Total Stok Semua Produk</h3>
                    <div class="value">${totalStock}</div>
                </div>
            `;
            const lowStockProducts = augmentedProducts.filter(p => p.finalStock <= p.lowStockThreshold).sort((a, b) => a.finalStock - b.finalStock);
            this.elements.lowStockTableBody.innerHTML = lowStockProducts.map(p => `
                <tr class="low-stock-row">
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${p.finalStock} / ${p.lowStockThreshold}</td>
                </tr>
            `).join('') || '<tr><td colspan="3" style="text-align:center;">Tidak ada produk yang stoknya menipis.</td></tr>';
        },

        renderProductsPage() {
            this.populateCategorySelect(this.elements.productCategoryFilter);
            const augmentedProducts = this.getAugmentedProducts();
            const searchTerm = this.elements.productSearchInput.value.toLowerCase();
            const categoryFilter = this.elements.productCategoryFilter.value;
            const filteredProducts = augmentedProducts.filter(p => {
                const matchesCategory = !categoryFilter || p.category === categoryFilter;
                const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm);
                return matchesCategory && matchesSearch;
            });
            this.elements.productTableBody.innerHTML = filteredProducts.map(p => {
                const isLow = p.finalStock <= p.lowStockThreshold;
                return `
                    <tr class="${isLow ? 'low-stock-row' : ''}">
                        <td>${p.id}</td>
                        <td>${p.name}</td>
                        <td>${p.category}</td>
                        <td>${p.unit}</td>
                        <td>${p.initialStock}</td>
                        <td>${p.stockIn}</td>
                        <td>${p.stockOut}</td>
                        <td><strong>${p.finalStock}</strong></td>
                        <td>
                            <button class="btn btn-edit" data-id="${p.id}">Edit</button>
                            <button class="btn btn-delete" data-id="${p.id}">Hapus</button>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="9" style="text-align:center;">Tidak ada produk yang cocok dengan filter.</td></tr>';
        },

        renderTxInPage() {
            this.populateProductSelect(this.elements.txInProductSelect);
            const txs = this.state.transactions.filter(t => t.type === 'in').sort((a, b) => new Date(b.date) - new Date(a.date));
            this.elements.txInTableBody.innerHTML = txs.map(t => {
                const product = this.state.products.find(p => p.id === t.productId);
                return `
                    <tr>
                        <td>${new Date(t.date).toLocaleDateString('id-ID')}</td>
                        <td>${t.productId}</td>
                        <td>${product ? product.name : 'N/A'}</td>
                        <td>${t.quantity}</td>
                        <td>${t.notes || ''}</td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="5" style="text-align:center;">Belum ada transaksi masuk.</td></tr>';
        },

        renderTxOutPage() {
            this.populateProductSelect(this.elements.txOutProductSelect);
            const txs = this.state.transactions.filter(t => t.type === 'out').sort((a, b) => new Date(b.date) - new Date(a.date));
            this.elements.txOutTableBody.innerHTML = txs.map(t => {
                const product = this.state.products.find(p => p.id === t.productId);
                return `
                    <tr>
                        <td>${new Date(t.date).toLocaleDateString('id-ID')}</td>
                        <td>${t.productId}</td>
                        <td>${product ? product.name : 'N/A'}</td>
                        <td>${t.quantity}</td>
                        <td>${t.usageType || ''}</td>
                        <td>${t.notes || ''}</td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="6" style="text-align:center;">Belum ada transaksi keluar.</td></tr>';
        },

        renderReportsPage() {
            this.populateCategorySelect(this.elements.reportCategorySelect);
            this.handleReportGeneration();
        },

        // --- FORM & MODAL HANDLING ---
        openProductModal(productId = null) {
            this.elements.productForm.reset();
            this.elements.newCategoryInput.classList.add('hidden');
            this.populateCategorySelect(this.elements.productCategorySelect, true);
            if (productId) {
                this.state.editingProductId = productId;
                const product = this.state.products.find(p => p.id === productId);
                this.elements.productModalTitle.textContent = 'Edit Produk';
                this.elements.productIdInput.value = product.id;
                this.elements.productIdInput.disabled = true;
                this.elements.productNameInput.value = product.name;
                this.elements.productCategorySelect.value = product.category;
                this.elements.productUnitSelect.value = product.unit;
                this.elements.initialStockInput.value = product.initialStock;
                this.elements.lowStockThresholdInput.value = product.lowStockThreshold;
            } else {
                this.state.editingProductId = null;
                this.elements.productModalTitle.textContent = 'Tambah Produk Baru';
                this.elements.productIdInput.disabled = false;
            }
            this.elements.productModal.classList.add('active');
        },

        closeProductModal() {
            this.elements.productModal.classList.remove('active');
        },

        async handleProductFormSubmit(e) {
            e.preventDefault();
            let category = this.elements.productCategorySelect.value;
            if (category === 'Lainnya') category = this.elements.newCategoryInput.value.trim();
            
            const payload = {
                id: this.elements.productIdInput.value.trim(),
                name: this.elements.productNameInput.value.trim(),
                category,
                unit: this.elements.productUnitSelect.value,
                initialStock: parseInt(this.elements.initialStockInput.value),
                lowStockThreshold: parseInt(this.elements.lowStockThresholdInput.value),
            };

            if (!payload.id || !payload.name || !payload.category || !payload.unit || isNaN(payload.initialStock) || isNaN(payload.lowStockThreshold)) {
                return alert('Harap isi semua kolom yang wajib diisi.');
            }

            const action = this.state.editingProductId ? 'updateProduct' : 'addProduct';
            if (action === 'addProduct' && this.state.products.some(p => p.id === payload.id)) {
                return alert('Kode Produk sudah ada. Harap gunakan kode yang unik.');
            }
            
            if (this.state.editingProductId) payload.id = this.state.editingProductId;

            const result = await this.apiPost(action, payload);
            if (result) {
                await this.loadData();
                this.closeProductModal();
            }
        },

        async handleTxInFormSubmit(e) {
            e.preventDefault();
            const payload = {
                productId: this.elements.txInProductSelect.value,
                date: this.elements.txInDateInput.value,
                quantity: parseInt(this.elements.txInQuantityInput.value),
                notes: this.elements.txInNotesInput.value.trim(),
                type: 'in'
            };

            if (!payload.productId || !payload.date || isNaN(payload.quantity) || payload.quantity <= 0) {
                return alert('Harap isi produk, tanggal, dan jumlah dengan benar.');
            }

            const result = await this.apiPost('addTransaction', payload);
            if (result) {
                await this.loadData();
                this.elements.txInForm.reset();
                this.elements.txInDateInput.valueAsDate = new Date();
            }
        },

        async handleTxOutFormSubmit(e) {
            e.preventDefault();
            const productId = this.elements.txOutProductSelect.value;
            const quantity = parseInt(this.elements.txOutQuantityInput.value);

            if (!productId || !this.elements.txOutDateInput.value || isNaN(quantity) || quantity <= 0) {
                return alert('Harap isi produk, tanggal, dan jumlah dengan benar.');
            }

            const stockData = this.getStockData(productId);
            if (quantity > stockData.finalStock) {
                return alert(`Stok tidak mencukupi. Stok saat ini: ${stockData.finalStock}.`);
            }

            const payload = {
                productId,
                quantity,
                date: this.elements.txOutDateInput.value,
                usageType: this.elements.txOutUsageSelect.value,
                notes: this.elements.txOutNotesInput.value.trim(),
                type: 'out'
            };

            const result = await this.apiPost('addTransaction', payload);
            if (result) {
                await this.loadData();
                this.elements.txOutForm.reset();
                this.elements.txOutDateInput.valueAsDate = new Date();
            }
        },
        
        async deleteProduct(productId) {
            if (confirm('Yakin ingin menghapus produk ini?')) {
                const result = await this.apiPost('deleteProduct', { id: productId });
                if (result) {
                    await this.loadData();
                }
            }
        },

        handleReportGeneration(e) {
            if(e) e.preventDefault();
            const startDate = this.elements.reportStartDateInput.value;
            const endDate = this.elements.reportEndDateInput.value;
            const category = this.elements.reportCategorySelect.value;
            let filteredProducts = this.state.products;
            if (category) {
                filteredProducts = filteredProducts.filter(p => p.category === category);
            }
            const reportData = filteredProducts.map(p => {
                const transactions = this.state.transactions.filter(t => {
                    let inDateRange = true;
                    if (startDate && endDate) inDateRange = t.date >= startDate && t.date <= endDate;
                    else if (startDate) inDateRange = t.date >= startDate;
                    else if (endDate) inDateRange = t.date <= endDate;
                    return t.productId === p.id && inDateRange;
                });
                const stockIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
                const stockOut = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);
                const finalStock = this.getStockData(p.id).finalStock;
                return { ...p, stockIn, stockOut, finalStock };
            });
            this.elements.reportTableBody.innerHTML = reportData.map(d => `
                <tr>
                    <td>${d.id}</td>
                    <td>${d.name}</td>
                    <td>${d.category}</td>
                    <td>${d.stockIn}</td>
                    <td>${d.stockOut}</td>
                    <td>${d.finalStock}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">Tidak ada data untuk laporan ini.</td></tr>';
        },

        exportReportToCSV() {
            const headers = ['Kode Produk', 'Nama Produk', 'Kategori', 'Total Masuk', 'Total Keluar', 'Stok Akhir'];
            const rows = Array.from(this.elements.reportTableBody.querySelectorAll('tr'));
            const data = rows.map(row => Array.from(row.querySelectorAll('td')).map(td => `"${td.textContent.replace(/"/g, '""')}"`));
            const csvContent = [headers.join(','), ...data.map(d => d.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `laporan_stok_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        populateProductSelect(selectElement) {
            selectElement.innerHTML = '<option value="">Pilih Produk...</option>' + this.state.products.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
        },

        populateCategorySelect(selectElement, includeNewOption = false) {
            const categories = Array.from(this.state.categories).sort();
            selectElement.innerHTML = '<option value="">Semua Kategori</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
            if (includeNewOption) selectElement.innerHTML += '<option value="Lainnya">Lainnya (Baru)</option>';
        },

        bindEvents() {
            this.elements.nav.addEventListener('click', e => {
                if (e.target.matches('.nav-btn')) this.navigateTo(e.target.dataset.page);
            });

            this.elements.addProductBtn.addEventListener('click', () => this.openProductModal());
            this.elements.productModalCloseBtn.addEventListener('click', () => this.closeProductModal());
            this.elements.productForm.addEventListener('submit', e => this.handleProductFormSubmit(e));
            
            this.elements.productCategorySelect.addEventListener('change', e => {
                this.elements.newCategoryInput.classList.toggle('hidden', e.target.value !== 'Lainnya');
            });

            this.elements.productTableBody.addEventListener('click', e => {
                if (e.target.matches('.btn-edit')) this.openProductModal(e.target.dataset.id);
                if (e.target.matches('.btn-delete')) this.deleteProduct(e.target.dataset.id);
            });
            
            this.elements.productSearchInput.addEventListener('input', () => this.renderProductsPage());
            this.elements.productCategoryFilter.addEventListener('change', () => this.renderProductsPage());

            this.elements.txInForm.addEventListener('submit', e => this.handleTxInFormSubmit(e));
            this.elements.txOutForm.addEventListener('submit', e => this.handleTxOutFormSubmit(e));

            this.elements.reportFiltersForm.addEventListener('submit', e => this.handleReportGeneration(e));
            this.elements.exportCsvBtn.addEventListener('click', () => this.exportReportToCSV());
        },
    };

    App.init();
});