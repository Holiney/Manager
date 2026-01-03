import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Phone,
  MapPin,
  X,
  Edit2,
  Trash2,
  ArrowLeft,
  Wallet,
  MessageSquare,
  ShoppingBag,
  Clock,
  User,
  Check,
} from "lucide-react";

// ============ STORAGE SERVICE ============
const StorageService = {
  getClients: () => JSON.parse(localStorage.getItem("clients") || "[]"),
  saveClients: (clients) =>
    localStorage.setItem("clients", JSON.stringify(clients)),
  getJobs: () => JSON.parse(localStorage.getItem("jobs") || "[]"),
  saveJobs: (jobs) => localStorage.setItem("jobs", JSON.stringify(jobs)),
  getPayments: () => JSON.parse(localStorage.getItem("payments") || "[]"),
  savePayments: (payments) =>
    localStorage.setItem("payments", JSON.stringify(payments)),
};

// ============ UTILITIES ============
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("EUR", "€");
};

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPhone = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("32") && cleaned.length >= 11) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(
      5,
      7
    )} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.length === 10 || cleaned.length === 9) {
    return `+32 ${cleaned.slice(1)}`;
  }
  return phone;
};

const getJobPaymentStatus = (job, payments) => {
  const paid = payments
    .filter((p) => p.jobId === job.id)
    .reduce((sum, p) => sum + p.amount, 0);

  if (paid === 0) return { status: "unpaid", paid, remaining: job.totalPrice };
  if (paid >= job.totalPrice) return { status: "paid", paid, remaining: 0 };
  return { status: "partial", paid, remaining: job.totalPrice - paid };
};

const statusConfig = {
  pending: {
    label: "Очікує",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: "⏳",
  },
  in_progress: {
    label: "В роботі",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "🔨",
  },
  done: {
    label: "Завершено",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "✅",
  },
};

// ============ UI COMPONENTS ============

// Reusable Bottom Sheet Component
const BottomSheet = ({ title, onClose, children }) => {
  // Закриття при кліку на фон
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Handle bar for visual cue */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
export default function MastersApp() {
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("home");
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Load data
  useEffect(() => {
    setClients(StorageService.getClients());
    setJobs(StorageService.getJobs());
    setPayments(StorageService.getPayments());
  }, []);

  // Save data
  useEffect(() => {
    StorageService.saveClients(clients);
  }, [clients]);
  useEffect(() => {
    StorageService.saveJobs(jobs);
  }, [jobs]);
  useEffect(() => {
    StorageService.savePayments(payments);
  }, [payments]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let netProfit = 0;

    jobs.forEach((job) => {
      totalRevenue += job.totalPrice || 0;
      const jobExpenses = (job.expenses || []).reduce(
        (sum, e) => sum + e.amount,
        0
      );
      totalExpenses += jobExpenses;
    });

    netProfit = totalRevenue - totalExpenses;
    return { totalRevenue, totalExpenses, netProfit };
  }, [jobs]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  const getClientJobs = (clientId) => {
    return jobs
      .filter((j) => j.clientId === clientId)
      .map((job) => ({
        ...job,
        paymentInfo: getJobPaymentStatus(job, payments),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  // CRUD Operations
  const addClient = (data) => {
    const client = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setClients([...clients, client]);
    return client;
  };

  const updateClient = (id, data) => {
    setClients(
      clients.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c
      )
    );
  };

  const deleteClient = (id) => {
    if (!confirm("Видалити клієнта та всі його роботи?")) return;
    setClients(clients.filter((c) => c.id !== id));
    const clientJobs = jobs.filter((j) => j.clientId === id);
    setJobs(jobs.filter((j) => j.clientId !== id));
    clientJobs.forEach((job) => {
      setPayments(payments.filter((p) => p.jobId !== job.id));
    });
  };

  const addJob = (clientId, data) => {
    const job = {
      ...data,
      id: generateId(),
      clientId,
      status: "pending",
      expenses: [],
      notes: [],
      hours: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setJobs([...jobs, job]);
    return job;
  };

  const updateJob = (id, data) => {
    setJobs(
      jobs.map((j) =>
        j.id === id ? { ...j, ...data, updatedAt: Date.now() } : j
      )
    );
  };

  // --- Sub-items logic ---
  const addJobNote = (jobId, text) => {
    const newNote = {
      id: generateId(),
      text,
      timestamp: Date.now(),
      isStruck: false,
    };
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedNotes = [...(job.notes || []), newNote];
      updateJob(jobId, { notes: updatedNotes });
      setSelectedJob({ ...job, notes: updatedNotes });
    }
  };

  const toggleJobNoteStrike = (jobId, noteId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedNotes = (job.notes || []).map((n) =>
        n.id === noteId ? { ...n, isStruck: !n.isStruck } : n
      );
      updateJob(jobId, { notes: updatedNotes });
      setSelectedJob({ ...job, notes: updatedNotes });
    }
  };

  const addJobExpense = (jobId, expenseData) => {
    const expense = { ...expenseData, id: generateId(), timestamp: Date.now() };
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedExpenses = [...(job.expenses || []), expense];
      updateJob(jobId, { expenses: updatedExpenses });
      setSelectedJob({ ...job, expenses: updatedExpenses });
    }
  };

  const deleteJobExpense = (jobId, expenseId) => {
    if (!confirm("Видалити витрату?")) return;
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedExpenses = (job.expenses || []).filter(
        (e) => e.id !== expenseId
      );
      updateJob(jobId, { expenses: updatedExpenses });
      setSelectedJob({ ...job, expenses: updatedExpenses });
    }
  };

  const addJobHours = (jobId, hoursData) => {
    const entry = { ...hoursData, id: generateId(), timestamp: Date.now() };
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedHours = [...(job.hours || []), entry];
      updateJob(jobId, { hours: updatedHours });
      setSelectedJob({ ...job, hours: updatedHours });
    }
  };

  const deleteJobHours = (jobId, entryId) => {
    if (!confirm("Видалити запис годин?")) return;
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      const updatedHours = (job.hours || []).filter((h) => h.id !== entryId);
      updateJob(jobId, { hours: updatedHours });
      setSelectedJob({ ...job, hours: updatedHours });
    }
  };

  const deleteJob = (id) => {
    if (!confirm("Видалити роботу та всі оплати?")) return;
    setJobs(jobs.filter((j) => j.id !== id));
    setPayments(payments.filter((p) => p.jobId !== id));
    setCurrentView("client");
  };

  const addPayment = (jobId, data) => {
    const payment = { ...data, id: generateId(), jobId, createdAt: Date.now() };
    setPayments([...payments, payment]);
  };

  const deletePayment = (id) => {
    if (!confirm("Видалити оплату?")) return;
    setPayments(payments.filter((p) => p.id !== id));
  };

  // Navigation
  const openClient = (client) => {
    setSelectedClient(client);
    setCurrentView("client");
  };
  const openJob = (job) => {
    setSelectedJob(job);
    setCurrentView("job");
  };
  const goBack = () => {
    if (currentView === "job") {
      setCurrentView("client");
      setSelectedJob(null);
    } else if (currentView === "client") {
      setCurrentView("home");
      setSelectedClient(null);
    }
  };

  // ============ MODALS (Updated to BottomSheet) ============

  const ClientModal = ({ client, onClose, onSave }) => {
    const [form, setForm] = useState(
      client || { name: "", phone: "", address: "", description: "" }
    );
    return (
      <BottomSheet
        title={client ? "Редагувати клієнта" : "Новий клієнт"}
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ім'я</label>
            <input
              type="text"
              placeholder="Іван Петренко"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Телефон</label>
            <input
              type="tel"
              placeholder="+32 4XX XX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Адреса</label>
            <input
              type="text"
              placeholder="вул. Шевченка, 1"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Опис</label>
            <textarea
              placeholder="Код домофону, нотатки..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows="3"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-transform mt-4"
          >
            Зберегти
          </button>
        </form>
      </BottomSheet>
    );
  };

  const JobModal = ({ clientId, job, onClose, onSave }) => {
    const [form, setForm] = useState(job || { title: "", totalPrice: "" });
    return (
      <BottomSheet
        title={job ? "Редагувати роботу" : "Нова робота"}
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(clientId, {
              ...form,
              totalPrice: parseFloat(form.totalPrice),
            });
          }}
          className="space-y-5"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Назва роботи
            </label>
            <input
              type="text"
              placeholder="Наприклад: Ремонт ванної"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Загальний бюджет (€)
            </label>
            <input
              type="number"
              placeholder="0"
              value={form.totalPrice}
              onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-transform mt-4"
          >
            Зберегти
          </button>
        </form>
      </BottomSheet>
    );
  };

  const ExpenseModal = ({
    jobId,
    existingExpenses,
    allPayments,
    onClose,
    onSave,
  }) => {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [paidBy, setPaidBy] = useState("me");

    const totalPaidByClient = allPayments
      .filter((p) => p.jobId === jobId)
      .reduce((sum, p) => sum + p.amount, 0);
    const usedAdvance = existingExpenses
      .filter((e) => e.paidBy === "common")
      .reduce((sum, e) => sum + e.amount, 0);
    const availableAdvance = totalPaidByClient - usedAdvance;
    const isAdvanceDisabled = !amount || parseFloat(amount) > availableAdvance;

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!amount || !description) return;
      onSave(jobId, { amount: parseFloat(amount), description, paidBy });
      onClose();
    };

    useEffect(() => {
      if (paidBy === "common" && isAdvanceDisabled) {
        setPaidBy("me");
      }
    }, [amount, isAdvanceDisabled, paidBy]);

    return (
      <BottomSheet title="Нова витрата" onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Сума (€)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              На що витрачено
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Матеріал..."
              required
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-sm font-bold mb-3 text-gray-700">
              Хто платив?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaidBy("me")}
                className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                  paidBy === "me"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                Віталік
              </button>
              <button
                type="button"
                onClick={() => setPaidBy("partner")}
                className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                  paidBy === "partner"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                Міша
              </button>
              <button
                type="button"
                onClick={() => !isAdvanceDisabled && setPaidBy("common")}
                disabled={isAdvanceDisabled}
                className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                  paidBy === "common"
                    ? "bg-gray-700 text-white border-gray-700 shadow-md"
                    : isAdvanceDisabled
                    ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                Аванс
              </button>
            </div>
            <div className="mt-2 text-center">
              <span
                className={`text-xs font-medium ${
                  isAdvanceDisabled && amount > 0
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                Доступно авансу:{" "}
                {formatCurrency(availableAdvance < 0 ? 0 : availableAdvance)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-700 active:scale-95 transition-transform mt-2"
          >
            Додати витрату
          </button>
        </form>
      </BottomSheet>
    );
  };

  const HoursModal = ({ jobId, onClose, onSave }) => {
    const [hours, setHours] = useState("");
    const [worker, setWorker] = useState("me");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    return (
      <BottomSheet title="Додати години" onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(jobId, { hours: parseFloat(hours), worker, date });
            onClose();
          }}
          className="space-y-5"
        >
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Кількість годин
              </label>
              <input
                type="number"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="8"
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-sm font-bold mb-3 text-gray-700">
              Хто працював?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWorker("me")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${
                  worker === "me"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                Віталік
              </button>
              <button
                type="button"
                onClick={() => setWorker("partner")}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${
                  worker === "partner"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                Міша
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-transform mt-2"
          >
            Додати
          </button>
        </form>
      </BottomSheet>
    );
  };

  const PaymentModal = ({ jobId, remaining, onClose, onSave }) => {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    return (
      <BottomSheet title="Оплата від клієнта" onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(jobId, {
              amount: parseFloat(amount),
              date: Date.now(),
              note,
            });
            onClose();
          }}
          className="space-y-5"
        >
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">
                Сума (€)
              </label>
              <button
                type="button"
                onClick={() => setAmount(remaining.toString())}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold"
              >
                Борг: {remaining}
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-3xl font-bold text-green-700 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Нотатка</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Готівка, на карту..."
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 p-4 rounded-xl font-bold text-lg hover:bg-gray-200 active:scale-95 transition-transform"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex-[2] bg-green-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-transform"
            >
              Підтвердити
            </button>
          </div>
        </form>
      </BottomSheet>
    );
  };

  // ============ VIEWS (Views remain mostly the same, just updated classNames for cleaner mobile look) ============
  const HomeView = () => (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Redesigned Header */}
      <div className="bg-white pt-12 pb-6 px-6 shadow-sm border-b rounded-b-[2rem]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Masters<span className="text-blue-600">App</span>
          </h1>
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
            <User size={20} />
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-2xl shadow-lg shadow-blue-200">
            <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">
              Чистий прибуток
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.netProfit)}
            </div>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Очікується
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(
                stats.totalRevenue -
                  stats.netProfit -
                  stats.totalExpenses +
                  stats.netProfit
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 mt-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук клієнтів..."
            className="w-full pl-12 pr-4 py-4 bg-white border-none shadow-sm rounded-2xl text-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="px-6 mt-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 ml-1">Мої клієнти</h2>
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Список порожній</div>
        ) : (
          filteredClients.map((client) => {
            const clientJobs = getClientJobs(client.id);
            const totalDebt = clientJobs.reduce(
              (sum, j) => sum + j.paymentInfo.remaining,
              0
            );

            return (
              <div
                key={client.id}
                onClick={() => openClient(client)}
                className="bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between border border-transparent hover:border-blue-100"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-900">
                    {client.name}
                  </h3>
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone size={14} className="mr-1.5" />{" "}
                      {formatPhone(client.phone)}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin size={14} className="mr-1.5" /> {client.address}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg mb-2 font-medium">
                    {clientJobs.length} робіт
                  </span>
                  {totalDebt > 0 ? (
                    <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                      -{formatCurrency(totalDebt)}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Check size={14} /> Ok
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => setShowModal("addClient")}
        className="fixed bottom-8 right-6 bg-black text-white rounded-full p-4 shadow-2xl hover:bg-gray-800 active:scale-90 transition-transform z-40"
      >
        <Plus size={32} />
      </button>
    </div>
  );

  const ClientView = () => {
    if (!selectedClient) return null;
    const clientJobs = getClientJobs(selectedClient.id);

    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-white border-b px-6 pt-12 pb-4 sticky top-0 z-10 flex items-center shadow-sm">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 mr-2"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold flex-1 truncate">
            {selectedClient.name}
          </h2>
          <button
            onClick={() => {
              setEditingItem(selectedClient);
              setShowModal("editClient");
            }}
            className="p-2 text-gray-500 bg-gray-100 rounded-full mr-2"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => deleteClient(selectedClient.id)}
            className="p-2 text-red-500 bg-red-50 rounded-full"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {selectedClient.phone && (
              <a
                href={`tel:${selectedClient.phone}`}
                className="flex items-center text-blue-600 mb-3 font-medium text-lg"
              >
                <Phone size={20} className="mr-3" />{" "}
                {formatPhone(selectedClient.phone)}
              </a>
            )}
            {selectedClient.address && (
              <div className="flex items-center text-gray-700 mb-3">
                <MapPin size={20} className="mr-3" /> {selectedClient.address}
              </div>
            )}
            {selectedClient.description && (
              <div className="mt-4 pt-4 border-t text-gray-600 italic bg-gray-50 p-3 rounded-xl">
                {selectedClient.description}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-xl text-gray-800 mb-4 ml-1">
              Роботи
            </h3>
            <div className="space-y-3">
              {clientJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => openJob(job)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg text-gray-900">
                      {job.title}
                    </h4>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wide border ${
                        statusConfig[job.status].color
                      }`}
                    >
                      {statusConfig[job.status].label}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(job.totalPrice)}
                      </div>
                      {job.paymentInfo.remaining > 0 ? (
                        <div className="text-sm text-red-500 font-bold mt-1">
                          Борг: {formatCurrency(job.paymentInfo.remaining)}
                        </div>
                      ) : (
                        <div className="text-sm text-green-600 font-bold mt-1 flex items-center gap-1">
                          <Check size={14} /> Оплачено
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowModal("addJob")}
          className="fixed bottom-8 right-6 bg-black text-white rounded-full p-4 shadow-2xl hover:bg-gray-800 active:scale-90 transition-transform z-40"
        >
          <Plus size={32} />
        </button>
      </div>
    );
  };

  const JobView = () => {
    if (!selectedJob) return null;
    const paymentInfo = getJobPaymentStatus(selectedJob, payments);
    const jobPayments = payments
      .filter((p) => p.jobId === selectedJob.id)
      .sort((a, b) => b.date - a.date);

    // Calculations
    const expenses = selectedJob.expenses || [];
    const hours = selectedJob.hours || [];
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const myMaterialExpenses = expenses
      .filter((e) => e.paidBy === "me")
      .reduce((sum, e) => sum + e.amount, 0);
    const partnerMaterialExpenses = expenses
      .filter((e) => e.paidBy === "partner")
      .reduce((sum, e) => sum + e.amount, 0);
    const netProfit = selectedJob.totalPrice - totalExpenses;
    const myHours = hours
      .filter((h) => h.worker === "me")
      .reduce((sum, h) => sum + h.hours, 0);
    const partnerHours = hours
      .filter((h) => h.worker === "partner")
      .reduce((sum, h) => sum + h.hours, 0);
    const totalHours = myHours + partnerHours;
    const hourlyRate = totalHours > 0 ? netProfit / totalHours : 0;
    const myLaborShare = myHours * hourlyRate;
    const partnerLaborShare = partnerHours * hourlyRate;
    const myTotalPayout = myLaborShare + myMaterialExpenses;
    const partnerTotalPayout = partnerLaborShare + partnerMaterialExpenses;

    const handleStatusChange = () => {
      const statuses = ["pending", "in_progress", "done"];
      const nextIdx =
        (statuses.indexOf(selectedJob.status) + 1) % statuses.length;
      const newStatus = statuses[nextIdx];
      updateJob(selectedJob.id, { status: newStatus });
      setSelectedJob({ ...selectedJob, status: newStatus });
    };

    return (
      <div className="pb-32 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b px-6 pt-12 pb-4 flex items-center sticky top-0 z-20 shadow-sm">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 mr-2"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold flex-1 truncate">
            {selectedJob.title}
          </h2>
          <button
            onClick={handleStatusChange}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
              statusConfig[selectedJob.status].color
            }`}
          >
            <span>{statusConfig[selectedJob.status].icon}</span>
            <span>{statusConfig[selectedJob.status].label}</span>
          </button>
        </div>

        {/* --- TABS SYSTEM --- */}

        {/* 1. FINANCIAL SUMMARY CARD */}
        <div className="p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-medium">Бюджет</span>
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(selectedJob.totalPrice)}
              </span>
            </div>

            {/* Visual Math */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Витрати (матеріали):</span>
                <span className="text-orange-600 font-bold">
                  -{formatCurrency(totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="font-bold text-gray-800 text-lg">
                  Чистий прибуток:
                </span>
                <span className="font-bold text-blue-600 text-lg">
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>

            {/* THE SPLIT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-blue-800 font-bold uppercase mb-1 opacity-70">
                    Віталік
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {formatCurrency(myLaborShare)}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <div className="text-[10px] text-blue-600 font-medium">
                    Компенсація: <br />+ {formatCurrency(myMaterialExpenses)}
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-medium bg-white/60 p-1 rounded text-center">
                    На руки: {formatCurrency(myTotalPayout)}
                  </div>
                </div>
              </div>

              <div className="border border-purple-100 bg-purple-50/50 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-purple-800 font-bold uppercase mb-1 opacity-70">
                    Міша
                  </div>
                  <div className="text-xl font-bold text-purple-900">
                    {formatCurrency(partnerLaborShare)}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-purple-200">
                  <div className="text-[10px] text-purple-600 font-medium">
                    Компенсація: <br />+{" "}
                    {formatCurrency(partnerMaterialExpenses)}
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-medium bg-white/60 p-1 rounded text-center">
                    На руки: {formatCurrency(partnerTotalPayout)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. HOURS TRACKING */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Clock size={20} /> Години ({totalHours} год)
            </h3>
            <button
              onClick={() => setShowModal("addHours")}
              className="text-xs bg-black text-white font-bold px-4 py-2 rounded-full"
            >
              + Додати
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex p-4 bg-gray-50 text-xs text-gray-500 font-medium border-b">
              <div className="flex-1">
                Ставка:{" "}
                <span className="text-gray-900 font-bold">
                  {formatCurrency(hourlyRate)}/год
                </span>
              </div>
            </div>
            {hours.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Ще не працювали
              </div>
            ) : (
              hours.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center p-4 border-b last:border-0 hover:bg-gray-50"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-4 shadow-sm ${
                      h.worker === "me"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {h.worker === "me" ? "В" : "М"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-lg">
                      {h.hours} год
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(h.date)}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteJobHours(selectedJob.id, h.id)}
                    className="p-2 text-gray-300 hover:text-red-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. EXPENSES */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag size={20} /> Витрати ({formatCurrency(totalExpenses)}
              )
            </h3>
            <button
              onClick={() => setShowModal("addExpense")}
              className="text-xs bg-black text-white font-bold px-4 py-2 rounded-full"
            >
              + Додати
            </button>
          </div>
          {expenses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-base font-bold text-gray-800">
                      {exp.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                          exp.paidBy === "me"
                            ? "bg-blue-100 text-blue-700"
                            : exp.paidBy === "partner"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {exp.paidBy === "me"
                          ? "Платив Віталік"
                          : exp.paidBy === "partner"
                          ? "Платив Міша"
                          : "З авансу"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700 text-lg">
                      {formatCurrency(exp.amount)}
                    </span>
                    <button
                      onClick={() => deleteJobExpense(selectedJob.id, exp.id)}
                      className="p-2 text-gray-300 hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. PAYMENTS */}
        <div className="px-6 mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Wallet size={20} /> Оплати від клієнта
          </h3>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-gray-500 font-medium">
                Оплачено:{" "}
                <span className="text-green-600 font-bold">
                  {formatCurrency(paymentInfo.paid)}
                </span>
              </span>
              <span className="text-gray-500 font-medium">
                Залишок:{" "}
                <span className="text-red-500 font-bold">
                  {formatCurrency(paymentInfo.remaining)}
                </span>
              </span>
            </div>
            {jobPayments.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-2">
                Ще немає оплат
              </div>
            ) : (
              <div className="space-y-3">
                {jobPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
                  >
                    <div>
                      <span className="font-bold text-green-700 text-lg">
                        {formatCurrency(p.amount)}
                      </span>
                      <span className="text-gray-400 text-xs ml-2 font-medium">
                        {formatDate(p.date)}
                      </span>
                    </div>
                    <button
                      onClick={() => deletePayment(p.id)}
                      className="p-2 text-gray-300 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. JOURNAL */}
        <div className="px-6 mb-24">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <MessageSquare size={20} /> Журнал
          </h3>
          <div className="bg-gray-900 rounded-2xl p-5 text-gray-300 font-mono text-sm shadow-inner">
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {(selectedJob.notes || []).map((n) => (
                <div
                  key={n.id}
                  onClick={() => toggleJobNoteStrike(selectedJob.id, n.id)}
                  className={`cursor-pointer hover:text-white transition-colors flex gap-2 ${
                    n.isStruck ? "line-through opacity-40" : ""
                  }`}
                >
                  <span className="text-blue-400 font-bold">
                    [{formatDateTime(n.timestamp).split(",")[1].trim()}]
                  </span>
                  <span>{n.text}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
              <span className="text-blue-500 animate-pulse">❯</span>
              <input
                type="text"
                placeholder="Введіть запис..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    addJobNote(selectedJob.id, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full bg-transparent border-none text-white focus:ring-0 placeholder-gray-600 outline-none"
              />
            </div>
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowModal("addPayment")}
          className="fixed bottom-8 right-6 bg-green-600 text-white rounded-full px-6 py-4 shadow-2xl hover:bg-green-700 font-bold flex items-center gap-2 z-40 active:scale-95 transition-transform"
        >
          <Wallet size={24} /> <span className="text-lg">ОПЛАТА</span>
        </button>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl overflow-hidden font-sans text-gray-900">
      {currentView === "home" && <HomeView />}
      {currentView === "client" && <ClientView />}
      {currentView === "job" && <JobView />}

      {/* Modals Injection */}
      {showModal === "addClient" && (
        <ClientModal
          onClose={() => setShowModal(null)}
          onSave={(data) => {
            const c = addClient(data);
            setShowModal(null);
            if (confirm("Додати роботу?")) {
              setSelectedClient(c);
              setCurrentView("client");
              setTimeout(() => setShowModal("addJob"), 100);
            }
          }}
        />
      )}
      {showModal === "editClient" && editingItem && (
        <ClientModal
          client={editingItem}
          onClose={() => {
            setShowModal(null);
            setEditingItem(null);
          }}
          onSave={(data) => {
            updateClient(editingItem.id, data);
            setSelectedClient({ ...editingItem, ...data });
            setEditingItem(null);
          }}
        />
      )}
      {showModal === "addJob" && (
        <JobModal
          clientId={selectedClient?.id}
          onClose={() => setShowModal(null)}
          onSave={(cid, data) => {
            const j = addJob(cid, data);
            openJob(j);
          }}
        />
      )}
      {showModal === "addExpense" && (
        <ExpenseModal
          jobId={selectedJob?.id}
          existingExpenses={selectedJob.expenses || []}
          allPayments={payments}
          onClose={() => setShowModal(null)}
          onSave={(jid, data) => addJobExpense(jid, data)}
        />
      )}
      {showModal === "addHours" && (
        <HoursModal
          jobId={selectedJob?.id}
          onClose={() => setShowModal(null)}
          onSave={(jid, data) => addJobHours(jid, data)}
        />
      )}
      {showModal === "addPayment" && (
        <PaymentModal
          jobId={selectedJob?.id}
          remaining={
            selectedJob
              ? getJobPaymentStatus(selectedJob, payments).remaining
              : 0
          }
          onClose={() => setShowModal(null)}
          onSave={(jid, data) => addPayment(jid, data)}
        />
      )}
    </div>
  );
}
