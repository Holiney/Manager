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

  // ============ MODALS ============
  const ClientModal = ({ client, onClose, onSave }) => {
    const [form, setForm] = useState(
      client || { name: "", phone: "", address: "", description: "" }
    );
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full sm:max-w-md rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">
            {client ? "Редагувати" : "Новий клієнт"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(form);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Ім'я"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg p-3"
              required
            />
            <input
              type="tel"
              placeholder="+32 4XX XX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg p-3"
            />
            <input
              type="text"
              placeholder="Адреса (напр. Kerkstraat 1)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border rounded-lg p-3"
            />
            <textarea
              placeholder="Опис"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border rounded-lg p-3"
              rows="3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 p-3 rounded-lg font-medium"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium"
              >
                Зберегти
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const JobModal = ({ clientId, job, onClose, onSave }) => {
    const [form, setForm] = useState(job || { title: "", totalPrice: "" });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full sm:max-w-md rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">
            {job ? "Редагувати роботу" : "Нова робота"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(clientId, {
                ...form,
                totalPrice: parseFloat(form.totalPrice),
              });
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Назва роботи"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded-lg p-3"
              required
            />
            <input
              type="number"
              placeholder="Ціна (€)"
              value={form.totalPrice}
              onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
              className="w-full border rounded-lg p-3"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 p-3 rounded-lg font-medium"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium"
              >
                Зберегти
              </button>
            </div>
          </form>
        </div>
      </div>
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

    // Logic to check advance availability
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

    // If "common" was selected but amount is now too high, switch to "me"
    useEffect(() => {
      if (paidBy === "common" && isAdvanceDisabled) {
        setPaidBy("me");
      }
    }, [amount, isAdvanceDisabled, paidBy]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full sm:max-w-md rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Нова витрата</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg p-3 text-lg"
              placeholder="Сума (€)"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg p-3"
              placeholder="Матеріал..."
              required
            />

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Хто платив?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaidBy("me")}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    paidBy === "me"
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-gray-600"
                  }`}
                >
                  Віталік
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy("partner")}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    paidBy === "partner"
                      ? "bg-purple-600 text-white"
                      : "bg-white border text-gray-600"
                  }`}
                >
                  Міша
                </button>
                <button
                  type="button"
                  onClick={() => !isAdvanceDisabled && setPaidBy("common")}
                  disabled={isAdvanceDisabled}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    paidBy === "common"
                      ? "bg-gray-600 text-white"
                      : isAdvanceDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border"
                      : "bg-white border text-gray-600"
                  }`}
                >
                  Аванс
                </button>
              </div>
              {isAdvanceDisabled && amount > 0 && (
                <div className="text-[10px] text-red-500 mt-1">
                  Доступно авансу:{" "}
                  {formatCurrency(availableAdvance < 0 ? 0 : availableAdvance)}
                </div>
              )}
              {!isAdvanceDisabled && (
                <div className="text-[10px] text-gray-500 mt-1">
                  Доступно авансу: {formatCurrency(availableAdvance)}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 p-3 rounded-lg font-medium"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-orange-600 text-white p-3 rounded-lg font-medium"
              >
                Додати
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const HoursModal = ({ jobId, onClose, onSave }) => {
    const [hours, setHours] = useState("");
    const [worker, setWorker] = useState("me");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full sm:max-w-md rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Додати години</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(jobId, { hours: parseFloat(hours), worker, date });
              onClose();
            }}
            className="space-y-4"
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Кількість годин
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full border rounded-lg p-3 text-xl"
                  placeholder="8"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Хто працював?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWorker("me")}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    worker === "me"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white border text-gray-600"
                  }`}
                >
                  Віталік
                </button>
                <button
                  type="button"
                  onClick={() => setWorker("partner")}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    worker === "partner"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white border text-gray-600"
                  }`}
                >
                  Міша
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 p-3 rounded-lg font-medium"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium"
              >
                Додати
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const PaymentModal = ({ jobId, remaining, onClose, onSave }) => {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full sm:max-w-md rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Нова оплата</h3>
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
            className="space-y-4"
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">Сума (€)</label>
                <button
                  type="button"
                  onClick={() => setAmount(remaining.toString())}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                >
                  Все: {remaining}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg p-3 text-2xl font-bold"
                placeholder="0"
                required
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg p-3"
              placeholder="Нотатка"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-200"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white p-3 rounded-lg font-medium hover:bg-green-700"
              >
                Підтвердити
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ VIEWS ============
  const HomeView = () => (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Redesigned Header */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b rounded-b-3xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Привіт, Віталік 👋 V1.4
        </h1>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200">
            <div className="text-blue-100 text-xs font-medium mb-1">
              Чистий прибуток (за весь час)
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.netProfit)}
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-2xl">
            <div className="text-gray-500 text-xs font-medium mb-1">
              Очікується оплат
            </div>
            <div className="text-xl font-bold text-gray-800">
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
      <div className="p-4 mt-2">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук клієнтів..."
            className="w-full pl-10 pr-4 py-3 border-none bg-white shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="px-4 space-y-3">
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
                className="bg-white rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between border border-transparent hover:border-blue-100"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{client.name}</h3>
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone size={12} className="mr-1" />{" "}
                      {formatPhone(client.phone)}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin size={12} className="mr-1" /> {client.address}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg mb-1">
                    {clientJobs.length} робіт
                  </span>
                  {totalDebt > 0 ? (
                    <span className="text-sm font-bold text-red-500">
                      Board: {formatCurrency(totalDebt)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      Ok
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
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700 active:scale-90 transition-transform"
      >
        <Plus size={28} />
      </button>
    </div>
  );

  const ClientView = () => {
    if (!selectedClient) return null;
    const clientJobs = getClientJobs(selectedClient.id);

    return (
      <div className="pb-20 bg-gray-50 min-h-screen">
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex items-center shadow-sm">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-lg font-bold flex-1 ml-2 truncate">
            {selectedClient.name}
          </h2>
          <button
            onClick={() => {
              setEditingItem(selectedClient);
              setShowModal("editClient");
            }}
            className="p-2 text-gray-500"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => deleteClient(selectedClient.id)}
            className="p-2 text-red-500"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            {selectedClient.phone && (
              <a
                href={`tel:${selectedClient.phone}`}
                className="flex items-center text-blue-600 mb-2 font-medium"
              >
                <Phone size={16} className="mr-3" />{" "}
                {formatPhone(selectedClient.phone)}
              </a>
            )}
            {selectedClient.address && (
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin size={16} className="mr-3" /> {selectedClient.address}
              </div>
            )}
            {selectedClient.description && (
              <div className="mt-3 pt-3 border-t text-sm text-gray-600 italic">
                {selectedClient.description}
              </div>
            )}
          </div>

          <h3 className="font-bold text-gray-700 ml-1">Роботи</h3>
          {clientJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => openJob(job)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800">{job.title}</h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border ${
                    statusConfig[job.status].color
                  }`}
                >
                  {statusConfig[job.status].label}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(job.totalPrice)}
                  </div>
                  {job.paymentInfo.remaining > 0 ? (
                    <div className="text-xs text-red-500 font-medium">
                      Залишок: {formatCurrency(job.paymentInfo.remaining)}
                    </div>
                  ) : (
                    <div className="text-xs text-green-600 font-medium">
                      Оплачено
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowModal("addJob")}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700"
        >
          <Plus size={28} />
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

    // --- COMPLEX CALCULATIONS ---
    const expenses = selectedJob.expenses || [];
    const hours = selectedJob.hours || [];

    // 1. Total Expenses Calculation
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const myMaterialExpenses = expenses
      .filter((e) => e.paidBy === "me")
      .reduce((sum, e) => sum + e.amount, 0);
    const partnerMaterialExpenses = expenses
      .filter((e) => e.paidBy === "partner")
      .reduce((sum, e) => sum + e.amount, 0);

    // 2. Net Profit
    const netProfit = selectedJob.totalPrice - totalExpenses;

    // 3. Labor Logic
    const myHours = hours
      .filter((h) => h.worker === "me")
      .reduce((sum, h) => sum + h.hours, 0);
    const partnerHours = hours
      .filter((h) => h.worker === "partner")
      .reduce((sum, h) => sum + h.hours, 0);
    const totalHours = myHours + partnerHours;

    // 4. Rate per hour
    const hourlyRate = totalHours > 0 ? netProfit / totalHours : 0;

    // 5. Final Payouts
    const myLaborShare = myHours * hourlyRate;
    const partnerLaborShare = partnerHours * hourlyRate;

    // Total cash to take (Labor + Reimbursement) for display logic if needed
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
      <div className="pb-20 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center sticky top-0 z-20">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-lg font-bold flex-1 ml-2 truncate">
            {selectedJob.title}
          </h2>
          {/* Compact Status Switcher */}
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
        <div className="p-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 text-sm">Загальний бюджет</span>
              <span className="text-xl font-bold">
                {formatCurrency(selectedJob.totalPrice)}
              </span>
            </div>

            {/* Visual Math */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Витрати (матеріали):</span>
                <span className="text-orange-600 font-medium">
                  -{formatCurrency(totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-bold text-gray-800">
                  Чистий прибуток:
                </span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>

            {/* THE SPLIT (PARTNERSHIP) - FIXED */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-blue-800 font-bold uppercase mb-1">
                    Віталік
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {formatCurrency(myLaborShare)}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="text-[10px] text-blue-600 font-medium">
                    Компенсація: <br />+ {formatCurrency(myMaterialExpenses)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Всього на руки: <b>{formatCurrency(myTotalPayout)}</b>
                  </div>
                </div>
              </div>

              <div className="border border-purple-100 bg-purple-50 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-purple-800 font-bold uppercase mb-1">
                    Міша
                  </div>
                  <div className="text-xl font-bold text-purple-900">
                    {formatCurrency(partnerLaborShare)}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <div className="text-[10px] text-purple-600 font-medium">
                    Компенсація: <br />+{" "}
                    {formatCurrency(partnerMaterialExpenses)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Всього на руки: <b>{formatCurrency(partnerTotalPayout)}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. HOURS TRACKING */}
        <div className="px-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Clock size={18} /> Години ({totalHours} год)
            </h3>
            <button
              onClick={() => setShowModal("addHours")}
              className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg"
            >
              + Додати
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex p-3 bg-gray-50 text-xs text-gray-500 font-medium border-b">
              <div className="flex-1">
                Ставка за годину:{" "}
                <span className="text-gray-900 font-bold">
                  {formatCurrency(hourlyRate)}/год
                </span>
              </div>
            </div>
            {hours.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Ще не працювали
              </div>
            ) : (
              hours.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center p-3 border-b last:border-0 hover:bg-gray-50"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      h.worker === "me"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {h.worker === "me" ? "В" : "М"}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {h.hours} год
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(h.date)}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteJobHours(selectedJob.id, h.id)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. EXPENSES */}
        <div className="px-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <ShoppingBag size={18} /> Витрати ({formatCurrency(totalExpenses)}
              )
            </h3>
            <button
              onClick={() => setShowModal("addExpense")}
              className="text-xs bg-orange-100 text-orange-700 font-bold px-3 py-1.5 rounded-lg"
            >
              + Додати
            </button>
          </div>
          {expenses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {exp.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
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
                    <span className="font-bold text-gray-700">
                      {formatCurrency(exp.amount)}
                    </span>
                    <button
                      onClick={() => deleteJobExpense(selectedJob.id, exp.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. PAYMENTS */}
        <div className="px-4 mb-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2">
            <Wallet size={18} /> Оплати від клієнта
          </h3>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3 text-sm">
              <span className="text-gray-500">
                Оплачено:{" "}
                <span className="text-green-600 font-bold">
                  {formatCurrency(paymentInfo.paid)}
                </span>
              </span>
              <span className="text-gray-500">
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
              <div className="space-y-2">
                {jobPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-bold text-green-700">
                        {formatCurrency(p.amount)}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        {formatDate(p.date)}
                      </span>
                    </div>
                    <button
                      onClick={() => deletePayment(p.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. JOURNAL */}
        <div className="px-4 mb-20">
          <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2">
            <MessageSquare size={18} /> Журнал
          </h3>
          <div className="bg-gray-900 rounded-xl p-4 text-gray-300 font-mono text-xs shadow-inner">
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {(selectedJob.notes || []).map((n) => (
                <div
                  key={n.id}
                  onClick={() => toggleJobNoteStrike(selectedJob.id, n.id)}
                  className={`cursor-pointer hover:text-white ${
                    n.isStruck ? "line-through opacity-40" : ""
                  }`}
                >
                  <span className="text-blue-400 mr-2">
                    [{formatDateTime(n.timestamp).split(",")[1].trim()}]
                  </span>
                  {n.text}
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Додати запис..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value.trim()) {
                  addJobNote(selectedJob.id, e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full bg-gray-800 border-none rounded text-white text-xs p-2 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowModal("addPayment")}
          className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full px-6 py-4 shadow-xl hover:bg-green-700 font-bold flex items-center gap-2"
        >
          <Wallet size={20} /> <span>ОПЛАТА</span>
        </button>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl overflow-hidden font-sans text-gray-900">
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
