import { useState, useEffect, useMemo } from "react";
import {
  SRS_CATEGORIES,
  INCOME_SOURCES,
  initDatabaseDefaults,
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getIncomes,
  addIncome,
  updateIncome,
  deleteIncome,
  getSavings,
  addSavings,
  getBudgets,
  setCategoryBudget,
  getClient,
  updateClientProfile,
  verifyClientLogin,
  resetClientPassword,
  resetDatabaseToDemo,
} from "./db.js";

// Format currency in Philippine Peso (₱) as required by SRS 2.3.10
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₱${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format date nicely (e.g. "Nov 13")
function formatDateDisplay(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function PocketwiseApp() {
  // -------------------------------------------------------------
  // Core State
  // -------------------------------------------------------------
  const [client, setClient] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState("login"); // 'login' | 'reset'
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'income' | 'expenses' | 'reports' | 'settings'

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsAppInstalled(true);
    }

    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsAppInstalled(true);
      }
    } else {
      alert(
        "To install Pocketwise as an App on your phone:\n\n" +
          "• iPhone / iPad (Safari):\nTap the Share button (⎋) at the bottom, then scroll down and tap 'Add to Home Screen' (+).\n\n" +
          "• Android (Chrome / Edge):\nTap the three dots (⋮) in the top-right corner, then tap 'Install app' or 'Add to Home screen'.",
      );
    }
  };
  // Data lists
  const [expensesList, setExpensesList] = useState([]);
  const [incomesList, setIncomesList] = useState([]);
  const [savingsList, setSavingsList] = useState([]);
  const [budgetsList, setBudgetsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [incomeSourceFilter, setIncomeSourceFilter] = useState("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState("expense"); // 'expense' | 'income'
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudgetCat, setEditingBudgetCat] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Form inputs for Add/Edit
  const [formAmount, setFormAmount] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("food");
  const [formSource, setFormSource] = useState("Salary");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [formStatus, setFormStatus] = useState("Completed");
  const [formError, setFormError] = useState("");

  // Auth Form State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Reset Password Form State
  const [resetUser, setResetUser] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // Budget Edit Form
  const [formBudgetAmount, setFormBudgetAmount] = useState("");

  // -------------------------------------------------------------
  // Data Loading & Refresh
  // -------------------------------------------------------------
  const refreshAllData = async () => {
    try {
      await initDatabaseDefaults();
      const [c, exp, inc, sav, bud] = await Promise.all([
        getClient(),
        getExpenses(),
        getIncomes(),
        getSavings(),
        getBudgets(selectedMonth),
      ]);
      setClient(c);
      setExpensesList(exp || []);
      setIncomesList(inc || []);
      setSavingsList(sav || []);
      setBudgetsList(bud || []);
    } catch (err) {
      console.error("Dexie loading error:", err);
    }
  };
}

useEffect(() => {
  (async () => {
    await refreshAllData();
    setLoading(false);
  })();
}, [selectedMonth]);

// -------------------------------------------------------------
    // Financial Metrics Calculations (SRS 2.2.8, 2.2.9, 2.2.11)
    // -------------------------------------------------------------
    const metrics = useMemo(() => {
        // Filter by selected month
        const currentExpenses = expensesList.filter((e) => !e.isDeleted && (e.date || "").startsWith(selectedMonth));
        const currentIncomes = incomesList.filter((i) => !i.isDeleted && (i.date || "").startsWith(selectedMonth));
        const currentSavings = savingsList.filter((s) => !s.isDeleted);

         // Sum completed items (completed items count toward financial totals as per UI notes)
        const totalCompletedExpenses = currentExpenses
            .filter((e) => e.status !== "Pending")
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const totalCompletedIncome = currentIncomes
            .filter((i) => i.status !== "Pending")
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        const totalSavings = currentSavings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);