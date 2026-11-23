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
