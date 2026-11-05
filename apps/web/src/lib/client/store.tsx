"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api } from "./api";
import type { BudgetCat, FinancialSummary, Goal, Project, Task, Tx, User } from "@/lib/data";

interface DataContextType {
  transactions: Tx[];
  budgets: (BudgetCat & { id?: string })[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  metrics: FinancialSummary | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  // Transactions
  addTransaction: (tx: { name: string; amt: number; cat: string; date: string; method: string; memo: string }) => Promise<Tx>;
  updateTransaction: (tx: Tx) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Budgets
  addBudget: (b: { k: string; budget: number; owner: string; alert?: string }) => Promise<void>;
  updateBudget: (id: string, patch: Partial<BudgetCat>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  // Goals
  addGoal: (g: { type: string; name: string; cur: number; target: number; date: string; down?: boolean }) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  // Projects
  addProject: (p: { name: string; desc: string }) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  // Tasks
  addTask: (t: { name: string; prompt: string; freq: string; next?: string }) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  runTask: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteTask: (id: string) => Promise<void>;
  // Refresh
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [budgets, setBudgets] = useState<(BudgetCat & { id?: string })[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [txs, bgs, gls, prjs, tsks, met, me] = await Promise.all([
        api.get<any[]>("/api/transactions"),
        api.get<any[]>("/api/budgets"),
        api.get<any[]>("/api/goals"),
        api.get<any[]>("/api/projects"),
        api.get<any[]>("/api/scheduled"),
        api.get<FinancialSummary>("/api/analytics"),
        api.get<{ user: User | null }>("/api/auth/me"),
      ]);

      // Normalize transactions
      const mappedTxs: Tx[] = txs.map((t: any) => ({
        id: t.id,
        name: t.payee || t.name || "Manual entry",
        memo: t.memo || "",
        cat: t.categoryName || t.cat || "Software",
        date: t.date,
        amt: t.amountMinor !== undefined ? t.amountMinor / 100 : (t.amt ?? 0),
        status: (t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : "Cleared") as any,
        method: t.method || "Bank transfer",
      }));

      // Normalize budgets
      const mappedBudgets = bgs.map((b: any) => ({
        id: b.id,
        k: b.categoryName || b.k || "General",
        budget: b.amountMinor !== undefined ? b.amountMinor / 100 : (b.budget ?? 0),
        oct: b.spentMinor !== undefined ? b.spentMinor / 100 : (b.oct ?? 0),
        sep: b.sep ?? 0,
        owner: b.ownerLabel || b.owner || "Finance",
        alert: b.alert,
      }));

      // Normalize goals
      const mappedGoals: Goal[] = gls.map((g: any) => ({
        id: g.id,
        type: g.type,
        name: g.name,
        cur: g.currentMinor !== undefined ? g.currentMinor / 100 : (g.cur ?? 0),
        target: g.targetMinor !== undefined ? g.targetMinor / 100 : (g.target ?? 0),
        start: g.startMinor !== undefined ? g.startMinor / 100 : (g.start ?? 0),
        date: g.targetDate || g.date,
        down: g.down,
        status: g.status,
        ai: g.aiGuidance || g.ai || "Tracking pace toward goal.",
      }));

      // Normalize tasks
      const mappedTasks: Task[] = tsks.map((t: any) => ({
        id: t.id,
        name: t.name,
        prompt: t.prompt,
        freq: t.cron ? `Cron: ${t.cron}` : (t.freq || "Weekly"),
        next: t.nextRunAt || t.next || "Next cycle",
        last: t.lastRunStatus ? `Status: ${t.lastRunStatus}` : (t.last || "Completed"),
        lastFailed: t.lastRunStatus === "failed" || t.lastFailed,
        on: t.enabled ?? t.on ?? true,
      }));

      // Normalize projects
      const mappedProjects: Project[] = prjs.map((p: any) => ({
        id: p.id,
        name: p.name,
        desc: p.description || p.desc || "",
        chats: p.chats || [],
        docs: p.docs || [],
        reports: p.reports || [],
        updated: p.updatedAt || p.updated || "Recently",
      }));

      setTransactions(mappedTxs);
      setBudgets(mappedBudgets);
      setGoals(mappedGoals);
      setProjects(mappedProjects);
      setTasks(mappedTasks);
      setMetrics(met);
      setUser(me.user);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Transactions Actions
  const addTransaction = useCallback(
    async (tx: { name: string; amt: number; cat: string; date: string; method: string; memo: string }) => {
      const tempId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;
      const optimisticTx: Tx = { ...tx, id: tempId, status: "Cleared" };
      setTransactions((prev) => [optimisticTx, ...prev]);

      try {
        const created = await api.post<any>("/api/transactions", {
          payee: tx.name,
          name: tx.name,
          amt: tx.amt,
          amountMinor: Math.round(tx.amt * 100),
          categoryName: tx.cat,
          cat: tx.cat,
          date: tx.date,
          method: tx.method,
          memo: tx.memo,
        });

        const mapped: Tx = {
          id: created.id || tempId,
          name: created.payee || created.name || tx.name,
          amt: created.amountMinor !== undefined ? created.amountMinor / 100 : (created.amt ?? tx.amt),
          cat: created.categoryName || created.cat || tx.cat,
          date: created.date || tx.date,
          method: created.method || tx.method,
          memo: created.memo || tx.memo,
          status: (created.status ? (created.status.charAt(0).toUpperCase() + created.status.slice(1)) : "Cleared") as any,
        };

        setTransactions((prev) => prev.map((t) => (t.id === tempId ? mapped : t)));
        refresh();
        return mapped;
      } catch (e) {
        setTransactions((prev) => prev.filter((t) => t.id !== tempId));
        throw e;
      }
    },
    [refresh]
  );

  const updateTransaction = useCallback(async (tx: Tx) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    try {
      await api.put(`/api/transactions/${tx.id}`, {
        ...tx,
        payee: tx.name,
        categoryName: tx.cat,
        amountMinor: Math.round(tx.amt * 100),
      });
      refresh();
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/api/transactions/${id}`);
      refresh();
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  // Budgets Actions
  const addBudget = useCallback(
    async (b: { k: string; budget: number; owner: string; alert?: string }) => {
      const tempItem = { id: `b-${Date.now()}`, k: b.k, oct: 0, sep: 0, budget: b.budget, owner: b.owner, alert: b.alert };
      setBudgets((prev) => [...prev, tempItem]);
      try {
        const created = await api.post<any>("/api/budgets", {
          categoryName: b.k,
          budget: b.budget,
          amountMinor: Math.round(b.budget * 100),
          ownerLabel: b.owner,
        });
        setBudgets((prev) => prev.map((item) => (item.k === b.k ? { ...item, id: created.id } : item)));
      } catch (e) {
        refresh();
        throw e;
      }
    },
    [refresh]
  );

  const updateBudget = useCallback(async (id: string, patch: Partial<BudgetCat>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    try {
      await api.put(`/api/budgets/${id}`, {
        ...patch,
        ...(patch.budget !== undefined ? { amountMinor: Math.round(patch.budget * 100) } : {}),
        ...(patch.k !== undefined ? { categoryName: patch.k } : {}),
      });
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const deleteBudget = useCallback(async (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    try {
      await api.delete(`/api/budgets/${id}`);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  // Goals Actions
  const addGoal = useCallback(
    async (g: { type: string; name: string; cur: number; target: number; date: string; down?: boolean }) => {
      const tempId = `g-${Date.now()}`;
      const optimistic: Goal = {
        id: tempId,
        type: g.type,
        name: g.name,
        cur: g.cur,
        target: g.target,
        start: g.cur,
        date: g.date,
        down: g.down,
        status: "On track",
        ai: "Tracking pace toward goal.",
      };
      setGoals((prev) => [...prev, optimistic]);
      try {
        const created = await api.post<any>("/api/goals", {
          type: g.type,
          name: g.name,
          currentMinor: Math.round(g.cur * 100),
          targetMinor: Math.round(g.target * 100),
          targetDate: g.date,
        });
        setGoals((prev) => prev.map((item) => (item.id === tempId ? { ...optimistic, id: created.id } : item)));
      } catch (e) {
        refresh();
        throw e;
      }
    },
    [refresh]
  );

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    try {
      await api.put(`/api/goals/${id}`, patch);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await api.delete(`/api/goals/${id}`);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  // Projects Actions
  const addProject = useCallback(
    async (p: { name: string; desc: string }) => {
      const tempId = `p-${Date.now()}`;
      const optimistic: Project = { id: tempId, name: p.name, desc: p.desc, chats: [], docs: [], reports: [], updated: "Just now" };
      setProjects((prev) => [...prev, optimistic]);
      try {
        const created = await api.post<any>("/api/projects", {
          name: p.name,
          description: p.desc,
        });
        const mapped: Project = {
          id: created.id || tempId,
          name: created.name || p.name,
          desc: created.description || p.desc,
          chats: created.chats || [],
          docs: created.docs || [],
          reports: created.reports || [],
          updated: created.updatedAt || "Just now",
        };
        setProjects((prev) => prev.map((item) => (item.id === tempId ? mapped : item)));
        return mapped;
      } catch (e) {
        refresh();
        throw e;
      }
    },
    [refresh]
  );

  const updateProject = useCallback(async (id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      await api.put(`/api/projects/${id}`, patch);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.delete(`/api/projects/${id}`);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  // Tasks Actions
  const addTask = useCallback(
    async (t: { name: string; prompt: string; freq: string; next?: string }) => {
      const tempId = `t-${Date.now()}`;
      const optimistic: Task = { id: tempId, name: t.name, prompt: t.prompt, freq: t.freq, next: t.next || "Next cycle", last: "Not run yet", on: true };
      setTasks((prev) => [...prev, optimistic]);
      try {
        const created = await api.post<any>("/api/scheduled", {
          name: t.name,
          prompt: t.prompt,
          nextRunAt: t.next,
          enabled: true,
        });
        setTasks((prev) => prev.map((item) => (item.id === tempId ? { ...optimistic, id: created.id } : item)));
      } catch (e) {
        refresh();
        throw e;
      }
    },
    [refresh]
  );

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await api.put(`/api/scheduled/${id}`, {
        ...patch,
        ...(patch.on !== undefined ? { enabled: patch.on } : {}),
      });
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const runTask = useCallback(async (id: string) => {
    try {
      const { task, ok, message } = await api.post<any>(`/api/scheduled/${id}`);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, last: task.last, lastFailed: task.lastFailed } : t)));
      return { success: ok, message };
    } catch (e: any) {
      return { success: false, message: e.message || "Execution error" };
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/api/scheduled/${id}`);
    } catch (e) {
      refresh();
      throw e;
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      transactions,
      budgets,
      goals,
      projects,
      tasks,
      metrics,
      user,
      loading,
      error,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      deleteGoal,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      runTask,
      deleteTask,
      refresh,
    }),
    [
      transactions,
      budgets,
      goals,
      projects,
      tasks,
      metrics,
      user,
      loading,
      error,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      deleteGoal,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      runTask,
      deleteTask,
      refresh,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}
