import Dexie from 'dexie';

export const db = new Dexie('FinancialManagementDB');

// Version 1 schema (legacy backwards compatibility)
db.version(1).stores({
    transactions: 'id, date, kind, name, syncStatus, isDeleted',
    auditLogs: 'logId, timestamp, action, syncStatus',
    meta: 'key',
});

// Define database schema matching SRS Section 2.5 and ERD
db.version(2).stores({
    clients: 'client_id, username',
    categories: 'category_id, category_name',
    incomes: 'income_id, client_id, source, date, isDeleted, syncStatus',
    expenses: 'expense_id, client_id, category_id, date, isDeleted, syncStatus',
    budgets: 'budget_id, client_id, category_id, month',
    savings: 'savings_id, owner_id, date, isDeleted, syncStatus',
    transactions: 'id, date, kind, name, syncStatus, isDeleted',
    auditLogs: 'logId, timestamp, action, syncStatus',
    meta: 'key',
});
let dbOpenPromise = null;
export async function ensureDbOpen() {
    if (db.isOpen()) return;
    if (!dbOpenPromise) {
        dbOpenPromise = (async () => {
            try {
                await db.open();
            } catch (err) {
                console.warn('Dexie open error, auto-recovering database:', err);
                try {
                    db.close();
                    await Dexie.delete('FinancialManagementDB');
                    await db.open();
                } catch (recovErr) {
                    console.error('Dexie critical recovery error:', recovErr);
                }
            }
        })();
    }
    return dbOpenPromise;
}
// Default SRS categories
export const SRS_CATEGORIES = [
    {
        category_id: 'food',
        category_name: 'Food',
        emoji: '🛒',
        color: '#F97316',
        bg: '#FFF7ED',
        arrowBg: '#FFEDD5',
        arrowColor: '#EA580C',
        defaultBudget: 5000,
    },
    {
        category_id: 'transport',
        category_name: 'Transportation',
        shortName: 'Transport',
        emoji: '🚌',
        color: '#06B6D4',
        bg: '#ECFEFF',
        arrowBg: '#CFFAFE',
        arrowColor: '#0891B2',
        defaultBudget: 2000,
    },
    {
        category_id: 'bills',
        category_name: 'Bills',
        emoji: '⚡',
        color: '#EF4444',
        bg: '#FEF2F2',
        arrowBg: '#FEE2E2',
        arrowColor: '#DC2626',
        defaultBudget: 3000,
    },
    {
        category_id: 'medicine',
        category_name: 'Medicine',
        emoji: '💊',
        color: '#10B981',
        bg: '#ECFDF5',
        arrowBg: '#D1FAE5',
        arrowColor: '#059669',
        defaultBudget: 1500,
    },
    {
        category_id: 'shopping',
        category_name: 'Shopping',
        emoji: '🛍️',
        color: '#8B5CF6',
        bg: '#F5F3FF',
        arrowBg: '#EDE9FE',
        arrowColor: '#7C3AED',
        defaultBudget: 1500,
    },
    {
        category_id: 'personal',
        category_name: 'Personal Needs',
        shortName: 'Personal',
        emoji: '🧴',
        color: '#EC4899',
        bg: '#FDF2F8',
        arrowBg: '#FCE7F3',
        arrowColor: '#DB2777',
        defaultBudget: 2000,
    },
    {
        category_id: 'others',
        category_name: 'Others',
        emoji: '🏷️',
        color: '#64748B',
        bg: '#F8FAFC',
        arrowBg: '#F1F5F9',
        arrowColor: '#475569',
        defaultBudget: 1000,
    },
];

export const INCOME_SOURCES = [
    { id: 'salary', name: 'Salary', emoji: '💼' },
    { id: 'business', name: 'Business income', emoji: '📈' },
    { id: 'allowance', name: 'Allowance', emoji: '💵' },
    { id: 'other_income', name: 'Other income', emoji: '✨' },
];

// Initialize default seed data matching SRS requirements and Screenshot demo
export async function initDatabaseDefaults() {
    await ensureDbOpen();
    // HYBRID: run client check + category check in parallel
    const [clientCount, existingCategories] = await Promise.all([
        db.clients.count(),
        db.categories.toArray(),
    ]);

    // 1. Seed or update client profile
    const existingClient = await db.clients.get('client_1');
    if (!existingClient) {
        await db.clients.put({
            client_id: 'client_1',
            name: 'Sherwin Banquil',
            username: 'sherwin',
            password: 'password123',
            email: 'kasherwinbanquil@gmail.com',
        });
    } else if (existingClient.name && existingClient.name.includes('Maria')) {
        // Upgrade legacy client to owner Sherwin Banquil
        await db.clients.put({
            ...existingClient,
            name: 'Sherwin Banquil',
            username: 'sherwin',
            email: 'kasherwinbanquil@gmail.com',
        });
    }