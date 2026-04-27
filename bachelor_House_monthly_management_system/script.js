
// LocalStorage helper
const LocalStorage = {
    STORAGE_KEY: 'bachelor_house_data',

    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return [];
        }
    },

    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
            return false;
        }
    }
};

// Data storage
let allData = [];
let members = [];
let bills = [];
let payments = [];
let mealEntries = [];
let useLocalStorage = true;
let filterMonth = null;
let searchQuery = '';

const defaultConfig = {
    app_title: "Bachelor House Meal Manager",
    dashboard_title: "Dashboard Overview",
    members_title: "House Members",
    bills_title: "Monthly Bills",
    payments_title: "Payment History",
    settlement_title: "Month-End Settlement"
};

// Element SDK
async function onConfigChange(config) {
    const appTitle = config.app_title || defaultConfig.app_title;
    const dashboardTitle = config.dashboard_title || defaultConfig.dashboard_title;
    const membersTitle = config.members_title || defaultConfig.members_title;
    const billsTitle = config.bills_title || defaultConfig.bills_title;
    const paymentsTitle = config.payments_title || defaultConfig.payments_title;
    const settlementTitle = config.settlement_title || defaultConfig.settlement_title;

    const appNameElement = document.getElementById('app-name');
    if (appNameElement) appNameElement.textContent = appTitle;

    const dashboardTitleElement = document.getElementById('dashboard-title');
    if (dashboardTitleElement) dashboardTitleElement.textContent = dashboardTitle;

    const membersTitleElement = document.getElementById('members-title');
    if (membersTitleElement) membersTitleElement.textContent = membersTitle;

    const billsTitleElement = document.getElementById('bills-title');
    if (billsTitleElement) billsTitleElement.textContent = billsTitle;

    const paymentsTitleElement = document.getElementById('payments-title');
    if (paymentsTitleElement) paymentsTitleElement.textContent = paymentsTitle;

    const settlementTitleElement = document.getElementById('settlement-title');
    if (settlementTitleElement) settlementTitleElement.textContent = settlementTitle;
}

function mapToCapabilities(config) {
    return {
        recolorables: [],
        borderables: [],
        fontEditable: undefined,
        fontSizeable: undefined
    };
}

function mapToEditPanelValues(config) {
    return new Map([
        ["app_title", config.app_title || defaultConfig.app_title],
        ["dashboard_title", config.dashboard_title || defaultConfig.dashboard_title],
        ["members_title", config.members_title || defaultConfig.members_title],
        ["bills_title", config.bills_title || defaultConfig.bills_title],
        ["payments_title", config.payments_title || defaultConfig.payments_title],
        ["settlement_title", config.settlement_title || defaultConfig.settlement_title]
    ]);
}

// Filter helpers
function getFilteredData() {
    let filteredBills = bills;
    let filteredPayments = payments;
    let filteredMealEntries = mealEntries;

    if (filterMonth) {
        const [year, month] = filterMonth.split('-').map(Number);

        filteredBills = bills.filter(b => {
            const billDate = new Date(b.date);
            return billDate.getFullYear() === year && billDate.getMonth() === month - 1;
        });

        filteredPayments = payments.filter(p => {
            const paymentDate = new Date(p.date);
            return paymentDate.getFullYear() === year && paymentDate.getMonth() === month - 1;
        });

        filteredMealEntries = mealEntries.filter(m => {
            const mealDate = new Date(m.meal_date);
            return mealDate.getFullYear() === year && mealDate.getMonth() === month - 1;
        });
    }

    return { filteredBills, filteredPayments, filteredMealEntries };
}

function getFilteredMembers() {
    if (!searchQuery) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.phone && m.phone.includes(query))
    );
}

// Update all views
function updateAllViews() {
    members = allData.filter(d => d.type === 'member');
    bills = allData.filter(d => d.type === 'bill');
    payments = allData.filter(d => d.type === 'payment');
    mealEntries = allData.filter(d => d.type === 'meal_entry');

    renderMembersTable();
    renderMembersList();
    renderBills();
    renderPayments();
    renderMealsGrid();
    renderSettlement();
    updateDashboardStats();
    updatePaymentMemberSelect();
}

// Data SDK Handler
const dataHandler = {
    onDataChanged(data) {
        allData = data;
        updateAllViews();
    }
};

// Initialize
async function initializeApp() {
    setupEventListeners();

    if (window.elementSdk) {
        await window.elementSdk.init({
            defaultConfig,
            onConfigChange,
            mapToCapabilities,
            mapToEditPanelValues
        });
    }

    if (window.dataSdk) {
        useLocalStorage = false;
        const result = await window.dataSdk.init(dataHandler);
        if (!result.isOk) {
            console.warn('Data SDK failed, falling back to localStorage');
            useLocalStorage = true;
        }
    }

    if (useLocalStorage) {
        allData = LocalStorage.load();
        updateAllViews();
        showToast('💾 Using local storage mode (data saved in your browser)');
    }

    updateMonthDisplay();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// CRUD operations
async function createRecord(record) {
    if (useLocalStorage) {
        record.__backendId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    if (useLocalStorage) {
        allData.push(record);
        LocalStorage.save(allData);
        updateAllViews();
        return { isOk: true };
    } else if (window.dataSdk) {
        return await window.dataSdk.create(record);
    }
    return { isOk: false };
}

async function deleteRecord(record) {
    if (useLocalStorage) {
        allData = allData.filter(d => d.__backendId !== record.__backendId);
        LocalStorage.save(allData);
        updateAllViews();
        return { isOk: true };
    } else if (window.dataSdk) {
        return await window.dataSdk.delete(record);
    }
    return { isOk: false };
}

// Member class
class Member {
    constructor(data, usedBills = null, usedPayments = null, usedMealEntries = null) {
        this.id = data.id;
        this.name = data.name;
        this.phone = data.phone || '';
        this.join_date = data.join_date;
        this.__backendId = data.__backendId;
        this.bills = usedBills || bills;
        this.payments = usedPayments || payments;
        this.mealEntries = usedMealEntries || mealEntries;
    }

    getMealCountForDate(date) {
        const meal = this.mealEntries.find(m => m.member_id === this.id && m.meal_date === date);
        return meal ? meal.meal_count : 0;
    }

    getMonthlyMealTotal() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        return this.mealEntries
            .filter(m => {
                if (m.member_id !== this.id) return false;
                const mealDate = new Date(m.meal_date);
                return mealDate.getFullYear() === year && mealDate.getMonth() === month;
            })
            .reduce((sum, m) => sum + m.meal_count, 0);
    }

    getTotalPaid() {
        const memberPayments = this.payments.filter(p => p.member_id === this.id);
        return memberPayments.reduce((sum, p) => sum + p.amount, 0);
    }

    getTotalBills() {
        const totalBillAmount = this.bills.reduce((sum, b) => sum + b.amount, 0);
        const totalMeals = members.reduce((sum, m) => {
            const memberObj = new Member(m, this.bills, this.payments, this.mealEntries);
            return sum + memberObj.getMonthlyMealTotal();
        }, 0);

        if (totalMeals === 0) return 0;

        const mealRate = totalBillAmount / totalMeals;
        return mealRate * this.getMonthlyMealTotal();
    }

    getTotalDue() {
        return Math.max(0, this.getTotalBills() - this.getTotalPaid());
    }
}

// Manager class
class BachelorHouseMealManager {
    static totalExpense() {
        return bills.reduce((sum, b) => sum + b.amount, 0);
    }

    static totalDeposits() {
        const memberObjects = members.map(m => new Member(m));
        return memberObjects.reduce((sum, m) => sum + m.getTotalPaid(), 0);
    }

    static totalDue() {
        const memberObjects = members.map(m => new Member(m));
        return memberObjects.reduce((sum, m) => sum + m.getTotalDue(), 0);
    }

    static settlementReport() {
        return members.map(m => {
            const memberObj = new Member(m);
            return {
                name: m.name,
                join_date: m.join_date,
                total_paid: memberObj.getTotalPaid(),
                total_bills: memberObj.getTotalBills(),
                total_due: memberObj.getTotalDue(),
                monthly_meals: memberObj.getMonthlyMealTotal()
            };
        });
    }
}

// Render functions
function renderMembersTable() {
    const container = document.getElementById('members-table-container');

    if (members.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-title">No Members Yet</div>
            <div class="empty-text">Add your first house member to get started</div>
            <button class="btn btn-primary" onclick="openAddMemberModal()">+ Add Member</button>
          </div>
        `;
        return;
    }

    const { filteredBills, filteredPayments, filteredMealEntries } = getFilteredData();
    const displayMembers = getFilteredMembers();

    if (displayMembers.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">No Members Found</div>
            <div class="empty-text">No members match your search criteria</div>
          </div>
        `;
        return;
    }

    const memberObjects = displayMembers.map(m => new Member(m, filteredBills, filteredPayments, filteredMealEntries));

    const tableHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Join Date</th>
                <th>Monthly Meals</th>
                <th>Total Paid</th>
                <th>Total Bills</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${memberObjects.map((memberObj, index) => {
        const member = members[index];
        const totalPaid = memberObj.getTotalPaid();
        const totalBills = memberObj.getTotalBills();
        const totalDue = memberObj.getTotalDue();
        const monthlyMeals = memberObj.getMonthlyMealTotal();
        const status = totalDue > 0 ? 'due' : 'paid';
        const statusClass = status === 'paid' ? 'status-paid' : 'status-due';
        const statusText = status === 'paid' ? 'Paid' : 'Due';

        return `
                  <tr>
                    <td>${String(index + 1).padStart(2, '0')}</td>
                    <td>${member.name}</td>
                    <td>${member.phone || 'N/A'}</td>
                    <td>${new Date(member.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style="font-weight: 600; color: #0B5FFF;">${monthlyMeals} meals</td>
                    <td>৳${totalPaid.toLocaleString()}</td>
                    <td>৳${totalBills.toFixed(0).toLocaleString()}</td>
                    <td>৳${totalDue.toFixed(0).toLocaleString()}</td>
                    <td>
                      <div class="action-buttons">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <button class="btn btn-danger btn-sm" onclick="deleteMember('${member.__backendId}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      `;

    container.innerHTML = tableHTML;
}

function renderMembersList() {
    const container = document.getElementById('members-list-container');

    if (members.length === 0) {
        container.innerHTML = `
          <div class="card">
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <div class="empty-title">No Members Yet</div>
              <div class="empty-text">Add your first house member to start tracking expenses</div>
            </div>
          </div>
        `;
        return;
    }

    const memberObjects = members.map(m => new Member(m));

    const cardsHTML = `
        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Member Name</th>
                  <th>Mobile</th>
                  <th>Join Date</th>
                  <th>Monthly Meals</th>
                  <th>Total Paid</th>
                  <th>Total Bills</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${memberObjects.map((memberObj, index) => {
        const member = members[index];
        const totalPaid = memberObj.getTotalPaid();
        const totalBills = memberObj.getTotalBills();
        const totalDue = memberObj.getTotalDue();
        const monthlyMeals = memberObj.getMonthlyMealTotal();

        return `
                    <tr>
                      <td>${String(index + 1).padStart(2, '0')}</td>
                      <td>${member.name}</td>
                      <td>${member.phone || 'N/A'}</td>
                      <td>${new Date(member.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td style="font-weight: 600; color: #0B5FFF;">${monthlyMeals} meals</td>
                      <td>৳${totalPaid.toLocaleString()}</td>
                      <td>৳${totalBills.toFixed(0).toLocaleString()}</td>
                      <td>৳${totalDue.toFixed(0).toLocaleString()}</td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn btn-danger btn-sm" onclick="deleteMember('${member.__backendId}')">Delete</button>
                        </div>
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    container.innerHTML = cardsHTML;
}

function renderBills() {
    const container = document.getElementById('bills-container');

    if (bills.length === 0) {
        container.innerHTML = `
          <div class="card">
            <div class="empty-state">
              <div class="empty-icon">💰</div>
              <div class="empty-title">No Bills Yet</div>
              <div class="empty-text">Add your first bill to start tracking expenses</div>
              <button class="btn btn-primary" onclick="openAddBillModal()">+ Add Bill</button>
            </div>
          </div>
        `;
        return;
    }

    const billIcons = {
        market: { icon: '🛒', bg: '#EBF4FF', color: '#0B5FFF' },
        electricity: { icon: '💡', bg: '#FFF4E6', color: '#FFA500' },
        gas: { icon: '🔥', bg: '#FFE8E8', color: '#FF4D4F' },
        internet: { icon: '📡', bg: '#F3E8FF', color: '#9B59B6' },
        rent: { icon: '🏠', bg: '#E8F8F5', color: '#00C48C' },
        garbage: { icon: '🗑️', bg: '#F0F0F0', color: '#34495E' },
        fridge: { icon: '❄️', bg: '#E6F7FF', color: '#1890FF' },
        other: { icon: '📝', bg: '#F7F9FC', color: '#4A5568' }
    };

    const cardsHTML = `
        <div class="bills-grid">
          ${bills.map(bill => {
        const iconData = billIcons[bill.bill_type] || billIcons.other;
        return `
              <div class="bill-card">
                <div class="bill-icon" style="background: ${iconData.bg}; color: ${iconData.color};">${iconData.icon}</div>
                <div class="bill-name">${bill.title}</div>
                <div class="bill-amount">৳${bill.amount.toLocaleString()}</div>
                <div class="bill-meta">📅 Date: ${new Date(bill.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div class="bill-meta">✂️ Split: ${bill.split_type === 'equal' ? 'Equal' : bill.split_type === 'custom' ? 'Custom' : 'Weight-based'}</div>
                <button class="btn btn-danger btn-sm" onclick="deleteBill('${bill.__backendId}')" style="width: 100%; margin-top: 12px;">Delete</button>
              </div>
            `;
    }).join('')}
        </div>
      `;

    container.innerHTML = cardsHTML;
}

function renderPayments() {
    const container = document.getElementById('payments-container');

    if (payments.length === 0) {
        container.innerHTML = `
          <div class="card">
            <div class="empty-state">
              <div class="empty-icon">💳</div>
              <div class="empty-title">No Payments Recorded</div>
              <div class="empty-text">Add your first payment to start tracking</div>
              <button class="btn btn-primary" onclick="openAddPaymentModal()">+ Add Payment</button>
            </div>
          </div>
        `;
        return;
    }

    const tableHTML = `
        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(payment => {
        const member = members.find(m => m.id === payment.member_id);
        const memberName = member ? member.name : 'Unknown';

        return `
                    <tr>
                      <td>${new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td>${memberName}</td>
                      <td>৳${payment.amount.toLocaleString()}</td>
                      <td>${payment.payment_method}</td>
                      <td>${payment.note || '-'}</td>
                      <td>
                        <button class="btn btn-danger btn-sm" onclick="deletePayment('${payment.__backendId}')">Delete</button>
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    container.innerHTML = tableHTML;
}

let selectedMealDate = new Date().toISOString().split('T')[0];

function renderMealsGrid() {
    const container = document.getElementById('meals-grid-container');
    const titleElement = document.getElementById('meals-card-title');

    if (members.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🍽️</div>
            <div class="empty-title">No Members Yet</div>
            <div class="empty-text">Add members first to track daily meals</div>
          </div>
        `;
        return;
    }

    const dateObj = new Date(selectedMealDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    titleElement.textContent = `Daily Meals - ${formattedDate}`;

    const memberObjects = members.map(m => new Member(m));

    const cardsHTML = `
        <div class="meals-grid">
          ${memberObjects.map((memberObj, index) => {
        const member = members[index];
        const dayCount = memberObj.getMealCountForDate(selectedMealDate);
        const monthlyTotal = memberObj.getMonthlyMealTotal();

        return `
              <div class="meal-card">
                <div class="meal-member-name">${member.name}</div>
                <div class="meal-counter">
                  <input type="number" class="meal-input" value="${dayCount}" min="0" 
                    onchange="updateMealCountDirect('${member.id}', this.value)"
                    onclick="this.select()">
                </div>
                <div class="meal-total">Total: ${monthlyTotal} meals this month</div>
              </div>
            `;
    }).join('')}
        </div>
      `;

    container.innerHTML = cardsHTML;
}

async function updateMealCountDirect(memberId, newValue) {
    const count = parseInt(newValue) || 0;
    if (count < 0) return;

    const existingMeal = mealEntries.find(m => m.member_id === memberId && m.meal_date === selectedMealDate);

    if (existingMeal) {
        if (count === 0) {
            await deleteRecord(existingMeal);
        } else {
            existingMeal.meal_count = count;

            const result = await (useLocalStorage ?
                Promise.resolve({ isOk: true }) :
                window.dataSdk.update(existingMeal)
            );

            if (useLocalStorage && result.isOk) {
                LocalStorage.save(allData);
                updateAllViews();
            }
        }
    } else if (count > 0) {
        const newMeal = {
            type: 'meal_entry',
            id: Date.now().toString() + '_' + memberId,
            member_id: memberId,
            meal_date: selectedMealDate,
            meal_count: count
        };

        await createRecord(newMeal);
    }
}

window.updateMealCountDirect = updateMealCountDirect;

function renderSettlement() {
    const container = document.getElementById('settlement-container');

    if (members.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-title">No Settlement Data</div>
            <div class="empty-text">Add members and record payments to generate settlement reports</div>
          </div>
        `;
        return;
    }

    const report = BachelorHouseMealManager.settlementReport();

    const tableHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Join Date</th>
                <th>Monthly Meals</th>
                <th>Total Paid</th>
                <th>Total Bills</th>
                <th>Total Due</th>
                <th>Advance Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${report.map(member => {
        const status = member.total_due > 0 ? 'due' : 'paid';
        const statusClass = status === 'paid' ? 'status-paid' : 'status-due';
        const statusText = status === 'paid' ? 'Fully Paid' : 'Pending';
        const advancePayment = member.total_paid - member.total_bills;

        return `
                  <tr>
                    <td>${member.name}</td>
                    <td>${new Date(member.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style="font-weight: 600; color: #0B5FFF;">${member.monthly_meals} meals</td>
                    <td>৳${member.total_paid.toLocaleString()}</td>
                    <td>৳${member.total_bills.toFixed(0).toLocaleString()}</td>
                    <td style="color: ${member.total_due > 0 ? '#FF4D4F' : '#00C48C'}; font-weight: 600;">৳${member.total_due.toFixed(0).toLocaleString()}</td>
                    <td style="color: ${advancePayment > 0 ? '#00C48C' : '#718096'}; font-weight: 600;">৳${advancePayment.toFixed(0).toLocaleString()}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      `;

    container.innerHTML = tableHTML;
}

function updateDashboardStats() {
    const totalExpense = BachelorHouseMealManager.totalExpense();
    const totalDeposits = BachelorHouseMealManager.totalDeposits();
    const totalDue = BachelorHouseMealManager.totalDue();

    document.getElementById('total-expense').textContent = `৳${totalExpense.toLocaleString()}`;
    document.getElementById('total-deposits').textContent = `৳${totalDeposits.toLocaleString()}`;
    document.getElementById('total-due').textContent = `৳${totalDue.toFixed(0).toLocaleString()}`;

    document.getElementById('settlement-total-expense').textContent = `৳${totalExpense.toLocaleString()}`;
    document.getElementById('settlement-total-deposits').textContent = `৳${totalDeposits.toLocaleString()}`;
    document.getElementById('settlement-total-due').textContent = `৳${totalDue.toFixed(0).toLocaleString()}`;
}

function updatePaymentMemberSelect() {
    const select = document.getElementById('payment-member');
    select.innerHTML = '<option value="">Choose a member...</option>' +
        members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// Mobile menu functions
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('mobile-menu-btn');

    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    menuBtn.classList.toggle('active');

    if (menuBtn.classList.contains('active')) {
        menuBtn.textContent = '✕';
    } else {
        menuBtn.textContent = '☰';
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('mobile-menu-btn');

    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    menuBtn.classList.remove('active');
    menuBtn.textContent = '☰';
}

// Event Listeners
function setupEventListeners() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    sidebarOverlay.addEventListener('click', closeMobileMenu);

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');

            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`${targetPage}-page`).classList.add('active');

            // Close mobile menu on navigation
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });

    // Member Modal
    const addMemberBtns = [
        document.getElementById('add-member-btn'),
        document.getElementById('add-member-dashboard')
    ];

    addMemberBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', openAddMemberModal);
    });

    document.getElementById('close-member-modal').addEventListener('click', closeAddMemberModal);
    document.getElementById('cancel-member-btn').addEventListener('click', closeAddMemberModal);

    const addMemberModal = document.getElementById('add-member-modal');
    addMemberModal.addEventListener('click', (e) => {
        if (e.target === addMemberModal) closeAddMemberModal();
    });

    // Bill Modal
    const addBillBtns = [
        document.getElementById('add-bill-btn-header'),
        document.getElementById('add-bill-fab')
    ];

    addBillBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', openAddBillModal);
    });

    document.getElementById('close-bill-modal').addEventListener('click', closeAddBillModal);
    document.getElementById('cancel-bill-btn').addEventListener('click', closeAddBillModal);

    const addBillModal = document.getElementById('add-bill-modal');
    addBillModal.addEventListener('click', (e) => {
        if (e.target === addBillModal) closeAddBillModal();
    });

    // Payment Modal
    const addPaymentBtns = [
        document.getElementById('add-payment-btn-header'),
        document.getElementById('add-payment-fab')
    ];

    addPaymentBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', openAddPaymentModal);
    });

    document.getElementById('close-payment-modal').addEventListener('click', closeAddPaymentModal);
    document.getElementById('cancel-payment-btn').addEventListener('click', closeAddPaymentModal);

    const addPaymentModal = document.getElementById('add-payment-modal');
    addPaymentModal.addEventListener('click', (e) => {
        if (e.target === addPaymentModal) closeAddPaymentModal();
    });

    // Forms
    document.getElementById('add-member-form').addEventListener('submit', handleMemberSubmit);
    document.getElementById('add-bill-form').addEventListener('submit', handleBillSubmit);
    document.getElementById('add-payment-form').addEventListener('submit', handlePaymentSubmit);

    // Month Navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthDisplay();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthDisplay();
    });

    // Dashboard Filter
    const dashboardFilter = document.getElementById('dashboard-month-filter');
    dashboardFilter.addEventListener('change', (e) => {
        filterMonth = e.target.value;
        updateAllViews();
    });

    document.getElementById('clear-filter-btn').addEventListener('click', () => {
        filterMonth = null;
        dashboardFilter.value = '';
        updateAllViews();
    });

    // Global Search
    const globalSearch = document.getElementById('global-search');
    globalSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderMembersTable();
    });

    // Generate Report
    document.getElementById('generate-report-btn').addEventListener('click', generatePDFReport);

    // Meal Date Picker
    const mealDatePicker = document.getElementById('meal-date-picker');
    mealDatePicker.valueAsDate = new Date();
    mealDatePicker.addEventListener('change', (e) => {
        selectedMealDate = e.target.value;
        renderMealsGrid();
    });
}

function openAddMemberModal() {
    const addMemberModal = document.getElementById('add-member-modal');
    addMemberModal.classList.add('active');
    document.getElementById('join-date').valueAsDate = new Date();
}

function closeAddMemberModal() {
    const addMemberModal = document.getElementById('add-member-modal');
    addMemberModal.classList.remove('active');
    document.getElementById('add-member-form').reset();
}

async function handleMemberSubmit(e) {
    e.preventDefault();

    if (allData.length >= 999) {
        showToast('Maximum limit of 999 records reached');
        return;
    }

    const submitBtn = document.getElementById('save-member-btn');
    const submitText = document.getElementById('save-member-text');

    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="loading-spinner"></span> Adding...';

    const name = document.getElementById('member-name').value;
    const phone = document.getElementById('member-phone').value;
    const joinDate = document.getElementById('join-date').value;

    const newMember = {
        type: 'member',
        id: Date.now().toString(),
        name: name,
        phone: phone,
        join_date: joinDate
    };

    const result = await createRecord(newMember);

    if (result.isOk) {
        showToast(`Member "${name}" added successfully!`);
        closeAddMemberModal();
    } else {
        showToast('Failed to add member. Please try again.');
    }

    submitBtn.disabled = false;
    submitText.innerHTML = '✓ Add Member';
}

async function deleteMember(backendId) {
    const member = members.find(m => m.__backendId === backendId);
    if (!member) return;

    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'toast show';
    confirmDiv.innerHTML = `
        Delete ${member.name}? 
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMember('${backendId}')" style="margin-left: 12px;">Confirm</button>
        <button class="btn btn-outline btn-sm" onclick="cancelDelete()" style="margin-left: 8px; color: white; border-color: white;">Cancel</button>
      `;
    document.body.appendChild(confirmDiv);

    setTimeout(() => {
        if (confirmDiv.parentNode) confirmDiv.remove();
    }, 5000);
}

window.confirmDeleteMember = async function (backendId) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const member = members.find(m => m.__backendId === backendId);
    if (!member) return;

    const result = await deleteRecord(member);

    if (result.isOk) {
        showToast(`Member deleted successfully`);
    } else {
        showToast('Failed to delete member');
    }
};

function openAddBillModal() {
    const addBillModal = document.getElementById('add-bill-modal');
    addBillModal.classList.add('active');
    document.getElementById('bill-date').valueAsDate = new Date();
}

function closeAddBillModal() {
    const addBillModal = document.getElementById('add-bill-modal');
    addBillModal.classList.remove('active');
    document.getElementById('add-bill-form').reset();
}

async function handleBillSubmit(e) {
    e.preventDefault();

    if (allData.length >= 999) {
        showToast('Maximum limit of 999 records reached');
        return;
    }

    const submitBtn = document.getElementById('save-bill-btn');
    const submitText = document.getElementById('save-bill-text');

    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="loading-spinner"></span> Adding...';

    const title = document.getElementById('bill-title').value;
    const billType = document.getElementById('bill-type').value;
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const date = document.getElementById('bill-date').value;
    const splitType = document.getElementById('split-type').value;

    const newBill = {
        type: 'bill',
        id: Date.now().toString(),
        title: title,
        bill_type: billType,
        amount: amount,
        date: date,
        split_type: splitType,
        participants: 'all'
    };

    const result = await createRecord(newBill);

    if (result.isOk) {
        showToast(`Bill "${title}" added successfully!`);
        closeAddBillModal();
    } else {
        showToast('Failed to add bill. Please try again.');
    }

    submitBtn.disabled = false;
    submitText.innerHTML = '✓ Add Bill';
}

async function deleteBill(backendId) {
    const bill = bills.find(b => b.__backendId === backendId);
    if (!bill) return;

    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'toast show';
    confirmDiv.innerHTML = `
        Delete bill "${bill.title}"? 
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteBill('${backendId}')" style="margin-left: 12px;">Confirm</button>
        <button class="btn btn-outline btn-sm" onclick="cancelDelete()" style="margin-left: 8px; color: white; border-color: white;">Cancel</button>
      `;
    document.body.appendChild(confirmDiv);

    setTimeout(() => {
        if (confirmDiv.parentNode) confirmDiv.remove();
    }, 5000);
}

window.confirmDeleteBill = async function (backendId) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const bill = bills.find(b => b.__backendId === backendId);
    if (!bill) return;

    const result = await deleteRecord(bill);

    if (result.isOk) {
        showToast(`Bill deleted successfully`);
    } else {
        showToast('Failed to delete bill');
    }
};

function openAddPaymentModal() {
    const addPaymentModal = document.getElementById('add-payment-modal');
    addPaymentModal.classList.add('active');
    document.getElementById('payment-date').valueAsDate = new Date();
}

function closeAddPaymentModal() {
    const addPaymentModal = document.getElementById('add-payment-modal');
    addPaymentModal.classList.remove('active');
    document.getElementById('add-payment-form').reset();
}

async function handlePaymentSubmit(e) {
    e.preventDefault();

    if (allData.length >= 999) {
        showToast('Maximum limit of 999 records reached');
        return;
    }

    const submitBtn = document.getElementById('save-payment-btn');
    const submitText = document.getElementById('save-payment-text');

    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="loading-spinner"></span> Adding...';

    const memberId = document.getElementById('payment-member').value;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const date = document.getElementById('payment-date').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const note = document.getElementById('payment-note').value;

    const newPayment = {
        type: 'payment',
        id: Date.now().toString(),
        member_id: memberId,
        amount: amount,
        date: date,
        payment_method: paymentMethod,
        note: note
    };

    const result = await createRecord(newPayment);

    if (result.isOk) {
        showToast(`Payment added successfully!`);
        closeAddPaymentModal();
    } else {
        showToast('Failed to add payment. Please try again.');
    }

    submitBtn.disabled = false;
    submitText.innerHTML = '✓ Add Payment';
}

async function deletePayment(backendId) {
    const payment = payments.find(p => p.__backendId === backendId);
    if (!payment) return;

    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'toast show';
    confirmDiv.innerHTML = `
        Delete payment? 
        <button class="btn btn-danger btn-sm" onclick="confirmDeletePayment('${backendId}')" style="margin-left: 12px;">Confirm</button>
        <button class="btn btn-outline btn-sm" onclick="cancelDelete()" style="margin-left: 8px; color: white; border-color: white;">Cancel</button>
      `;
    document.body.appendChild(confirmDiv);

    setTimeout(() => {
        if (confirmDiv.parentNode) confirmDiv.remove();
    }, 5000);
}

window.confirmDeletePayment = async function (backendId) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const payment = payments.find(p => p.__backendId === backendId);
    if (!payment) return;

    const result = await deleteRecord(payment);

    if (result.isOk) {
        showToast(`Payment deleted successfully`);
    } else {
        showToast('Failed to delete payment');
    }
};

window.cancelDelete = function () {
    document.querySelectorAll('.toast').forEach(t => t.remove());
};

// PDF Report Generation using jsPDF
function generatePDFReport() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        showToast('⚠️ PDF library is loading... Please try again in a moment');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const report = BachelorHouseMealManager.settlementReport();
    const totalExpense = BachelorHouseMealManager.totalExpense();
    const totalDeposits = BachelorHouseMealManager.totalDeposits();
    const totalDue = BachelorHouseMealManager.totalDue();
    const totalMeals = members.reduce((sum, m) => {
        const memberObj = new Member(m);
        return sum + memberObj.getMonthlyMealTotal();
    }, 0);
    const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;

    const monthYear = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(11, 95, 255);
    doc.text('Bachelor House Settlement Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(monthYear, 105, 28, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 105, 34, { align: 'center' });

    // Summary boxes
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    let yPos = 45;
    doc.setFillColor(235, 244, 255);
    doc.rect(15, yPos, 45, 20, 'F');
    doc.text('Total Expense', 37.5, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(11, 95, 255);
    doc.text(`${totalExpense.toLocaleString()}`, 37.5, yPos + 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(232, 248, 245);
    doc.rect(65, yPos, 45, 20, 'F');
    doc.text('Total Deposits', 87.5, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 196, 140);
    doc.text(`${totalDeposits.toLocaleString()}`, 87.5, yPos + 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 232, 232);
    doc.rect(115, yPos, 45, 20, 'F');
    doc.text('Total Due', 137.5, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(255, 77, 79);
    doc.text(`${totalDue.toFixed(0).toLocaleString()}`, 137.5, yPos + 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(243, 232, 255);
    doc.rect(165, yPos, 30, 20, 'F');
    doc.text('Total Meals', 180, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(155, 89, 182);
    doc.text(`${totalMeals}`, 180, yPos + 15, { align: 'center' });

    // Info section
    yPos = 72;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(247, 249, 252);
    doc.rect(15, yPos, 180, 25, 'F');

    doc.text(`Total Members: ${members.length} persons`, 20, yPos + 7);
    doc.text(`Meal Rate: ${mealRate.toFixed(2)} per meal`, 20, yPos + 13);
    doc.text(`Total Bills: ${bills.length} bills recorded`, 20, yPos + 19);
    doc.text(`Total Payments: ${payments.length} payments received`, 110, yPos + 19);

    // Table
    yPos = 105;
    doc.setFontSize(12);
    doc.setTextColor(45, 55, 72);
    doc.text('Member Settlement Details', 15, yPos);

    const tableData = report.map((m, i) => {
        const advancePayment = m.total_paid - m.total_bills;
        return [
            (i + 1).toString(),
            m.name,
            new Date(m.join_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            m.monthly_meals.toString(),
            `${m.total_paid.toLocaleString()}`,
            `${m.total_bills.toFixed(0).toLocaleString()}`,
            m.total_due > 0 ? `${m.total_due.toFixed(0).toLocaleString()}` : '0',
            advancePayment > 0 ? `${advancePayment.toFixed(0).toLocaleString()}` : '0',
            m.total_due > 0 ? 'Pending' : 'Paid'
        ];
    });

    doc.autoTable({
        startY: yPos + 5,
        head: [['#', 'Name', 'Join', 'Meals', 'Paid', 'Bills', 'Due', 'Advance', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [11, 95, 255],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 7,
            textColor: [45, 55, 72]
        },
        alternateRowStyles: {
            fillColor: [247, 249, 252]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 30 },
            2: { cellWidth: 20 },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 20, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' },
            8: { cellWidth: 18, halign: 'center' }
        }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setTextColor(113, 128, 150);
    doc.text('Bachelor House Meal Manager - Automated Settlement Report', 105, finalY, { align: 'center' });
    doc.text('Please verify all amounts and contact house manager for any discrepancies', 105, finalY + 5, { align: 'center' });
    doc.text('This is a system-generated report', 105, finalY + 10, { align: 'center' });

    // Save PDF
    doc.save(`Settlement_Report_${monthYear.replace(' ', '_')}.pdf`);
    showToast('📄 PDF downloaded successfully!');
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Month Navigation
let currentDate = new Date();

function updateMonthDisplay() {
    const monthDisplay = document.getElementById('current-month');
    const options = { year: 'numeric', month: 'long' };
    monthDisplay.textContent = currentDate.toLocaleDateString('en-US', options);
}