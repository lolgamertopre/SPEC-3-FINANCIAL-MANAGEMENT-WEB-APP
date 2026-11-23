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

        if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
            setIsAppInstalled(true);
        }

        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
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
                "• Android (Chrome / Edge):\nTap the three dots (⋮) in the top-right corner, then tap 'Install app' or 'Add to Home screen'."
            );
        }
    };
