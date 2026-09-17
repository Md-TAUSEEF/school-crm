import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../services/api";

const FEE_TYPES = [
  { value: "admission", label: "Admission" },
  { value: "registration", label: "Registration" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "annual", label: "Annual" },
  { value: "training", label: "Training" },
  { value: "assessment", label: "Assessment" },
  { value: "uniform", label: "Uniform" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const FREQUENCIES = [
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
];

const emptyForm = {
  name: "",
  code: "",
  academicSession: "",
  program: "",
  class: "",
  feeType: "admission",
  amount: "",
  frequency: "one_time",
  dueDay: "",
  description: "",
  status: "active",
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFeeTypeLabel = (value) => {
  return (
    FEE_TYPES.find((item) => item.value === value)?.label ||
    value ||
    "—"
  );
};

const getFrequencyLabel = (value) => {
  return (
    FREQUENCIES.find((item) => item.value === value)?.label ||
    value ||
    "—"
  );
};

const getStatusClasses = (status) => {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

function FeeStructures() {
  const [feeStructures, setFeeStructures] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feeTypeFilter, setFeeTypeFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [selectedFeeStructure, setSelectedFeeStructure] =
    useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async ({ silent = false } = {}) => {
    try {
      setError("");

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        feeStructuresResponse,
        sessionsResponse,
        programsResponse,
        classesResponse,
      ] = await Promise.all([
        api.get("/fee-structures"),
        api.get("/academic-sessions"),
        api.get("/programs"),
        api.get("/classes"),
      ]);

      const feeStructureList = Array.isArray(
        feeStructuresResponse?.data?.data
      )
        ? feeStructuresResponse.data.data
        : [];

      const sessionList = Array.isArray(
        sessionsResponse?.data?.sessions
      )
        ? sessionsResponse.data.sessions
        : [];

      const programList = Array.isArray(
        programsResponse?.data?.programs
      )
        ? programsResponse.data.programs
        : [];

      const classList = Array.isArray(
        classesResponse?.data?.classes
      )
        ? classesResponse.data.classes
        : [];

      setFeeStructures(feeStructureList);
      setSessions(sessionList);
      setPrograms(programList);
      setClasses(classList);
    } catch (err) {
      console.error("Failed to load fee structures:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load fee structures."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClasses = useMemo(() => {
    if (!form.program) {
      return [];
    }

    return classes.filter(
      (item) =>
        item?.program?._id === form.program &&
        (!form.academicSession ||
          item?.academicSession?._id ===
            form.academicSession)
    );
  }, [classes, form.program, form.academicSession]);

  const filteredFeeStructures = useMemo(() => {
    const query = search.trim().toLowerCase();

    return feeStructures.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const code = String(item?.code || "").toLowerCase();

      const sessionName = String(
        item?.academicSession?.name || ""
      ).toLowerCase();

      const sessionCode = String(
        item?.academicSession?.code || ""
      ).toLowerCase();

      const programName = String(
        item?.program?.name || ""
      ).toLowerCase();

      const programCode = String(
        item?.program?.code || ""
      ).toLowerCase();

      const className = String(
        item?.class?.name || ""
      ).toLowerCase();

      const classCode = String(
        item?.class?.code || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        code.includes(query) ||
        sessionName.includes(query) ||
        sessionCode.includes(query) ||
        programName.includes(query) ||
        programCode.includes(query) ||
        className.includes(query) ||
        classCode.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item?.status === statusFilter;

      const matchesFeeType =
        feeTypeFilter === "all" ||
        item?.feeType === feeTypeFilter;

      const matchesFrequency =
        frequencyFilter === "all" ||
        item?.frequency === frequencyFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFeeType &&
        matchesFrequency
      );
    });
  }, [
    feeStructures,
    search,
    statusFilter,
    feeTypeFilter,
    frequencyFilter,
  ]);

  const activeCount = feeStructures.filter(
    (item) => item?.status === "active"
  ).length;

  const inactiveCount = feeStructures.filter(
    (item) => item?.status === "inactive"
  ).length;

  const totalConfiguredAmount = feeStructures.reduce(
    (total, item) => total + Number(item?.amount || 0),
    0
  );

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item?._id || null);

    setForm({
      name: item?.name || "",
      code: item?.code || "",
      academicSession:
        item?.academicSession?._id ||
        item?.academicSession ||
        "",
      program:
        item?.program?._id ||
        item?.program ||
        "",
      class:
        item?.class?._id ||
        item?.class ||
        "",
      feeType: item?.feeType || "admission",
      amount:
        item?.amount !== undefined &&
        item?.amount !== null
          ? String(item.amount)
          : "",
      frequency: item?.frequency || "one_time",
      dueDay:
        item?.dueDay !== undefined &&
        item?.dueDay !== null
          ? String(item.dueDay)
          : "",
      description: item?.description || "",
      status: item?.status || "active",
    });

    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    const code = form.code.trim();

    if (!name) {
      setFormError("Fee structure name is required.");
      return;
    }

    if (!code) {
      setFormError("Fee structure code is required.");
      return;
    }

    if (!form.academicSession) {
      setFormError("Please select an academic session.");
      return;
    }

    if (!form.program) {
      setFormError("Please select a program.");
      return;
    }

    if (!form.feeType) {
      setFormError("Please select a fee type.");
      return;
    }

    if (
      form.amount === "" ||
      Number.isNaN(Number(form.amount)) ||
      Number(form.amount) < 0
    ) {
      setFormError(
        "Amount must be a valid non-negative number."
      );
      return;
    }

    if (
      form.dueDay !== "" &&
      (Number.isNaN(Number(form.dueDay)) ||
        Number(form.dueDay) < 1 ||
        Number(form.dueDay) > 31)
    ) {
      setFormError("Due day must be between 1 and 31.");
      return;
    }

    if (form.class) {
      const selectedClass = classes.find(
        (item) => item?._id === form.class
      );

      if (
        selectedClass &&
        selectedClass?.program?._id !== form.program
      ) {
        setFormError(
          "Selected class does not belong to the selected program."
        );
        return;
      }

      if (
        selectedClass &&
        selectedClass?.academicSession?._id !==
          form.academicSession
      ) {
        setFormError(
          "Selected class does not belong to the selected academic session."
        );
        return;
      }
    }

    const payload = {
      name,
      code,
      academicSession: form.academicSession,
      program: form.program,
      class: form.class || null,
      feeType: form.feeType,
      amount: Number(form.amount),
      frequency: form.frequency || "one_time",
      dueDay:
        form.dueDay === ""
          ? null
          : Number(form.dueDay),
      description: form.description.trim(),
      status: form.status || "active",
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(
          `/fee-structures/${editingId}`,
          payload
        );
      } else {
        await api.post("/fee-structures", payload);
      }

      closeForm();

      await fetchData({ silent: true });
    } catch (err) {
      console.error("Fee structure save error:", err);

      setFormError(
        err?.response?.data?.message ||
          "Unable to save fee structure."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setSaving(true);
      setFormError("");

      await api.delete(
        `/fee-structures/${deleteTarget._id}`
      );

      setDeleteTarget(null);

      if (
        selectedFeeStructure?._id === deleteTarget._id
      ) {
        setSelectedFeeStructure(null);
      }

      await fetchData({ silent: true });
    } catch (err) {
      console.error("Fee structure delete error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to delete fee structure."
      );

      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFeeTypeFilter("all");
    setFrequencyFilter("all");
  };

  const hasFilters =
    search.trim() ||
    statusFilter !== "all" ||
    feeTypeFilter !== "all" ||
    frequencyFilter !== "all";

  return (
    <div className="min-h-full bg-slate-50 px-5 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
            <FileText size={15} />
            Finance
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Fee Structures
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Configure real fee structures for academic
            sessions, programs and classes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={17} />
            Add Fee Structure
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="text-sm font-semibold">
              Unable to load fee structures
            </p>

            <p className="mt-1 text-sm">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => fetchData()}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Structures"
          value={feeStructures.length}
          icon={<FileText size={19} />}
        />

        <SummaryCard
          label="Active"
          value={activeCount}
          icon={<CheckCircle2 size={19} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-600"
        />

        <SummaryCard
          label="Inactive"
          value={inactiveCount}
          icon={<Clock3 size={19} />}
          iconClass="bg-slate-100 text-slate-600"
        />

        <SummaryCard
          label="Configured Amount"
          value={formatCurrency(
            totalConfiguredAmount
          )}
          icon={<FileText size={19} />}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search fee name, code, program, class..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={feeTypeFilter}
            onChange={(event) =>
              setFeeTypeFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="all">All Fee Types</option>

            {FEE_TYPES.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={frequencyFilter}
            onChange={(event) =>
              setFrequencyFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="all">All Frequencies</option>

            {FREQUENCIES.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X size={16} />
              Clear
            </button>
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filteredFeeStructures.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {feeStructures.length}
          </span>{" "}
          fee structures
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                size={28}
                className="animate-spin text-red-600"
              />

              <p className="text-sm text-slate-500">
                Loading fee structures...
              </p>
            </div>
          </div>
        ) : filteredFeeStructures.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
              <FileText size={28} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {feeStructures.length === 0
                ? "No fee structures found"
                : "No matching fee structures"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {feeStructures.length === 0
                ? "Create the first real fee structure for your academy."
                : "Try changing your search or filters."}
            </p>

            {feeStructures.length === 0 ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={16} />
                Add Fee Structure
              </button>
            ) : (
              hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Clear Filters
                </button>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Fee Structure
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Session
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Program / Class
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Frequency
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredFeeStructures.map((item) => (
                  <tr
                    key={item?._id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {item?.name || "—"}
                      </p>

                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item?.code || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {item?.academicSession?.name ||
                          "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item?.academicSession?.code ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {item?.program?.name || "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item?.class
                          ? `${item.class.name} (${item.class.code})`
                          : "All classes"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        {getFeeTypeLabel(
                          item?.feeType
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(item?.amount)}
                      </p>

                      {item?.dueDay && (
                        <p className="mt-1 text-xs text-slate-500">
                          Due day: {item.dueDay}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-slate-700">
                        {getFrequencyLabel(
                          item?.frequency
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          item?.status
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />

                        {item?.status
                          ? item.status
                              .charAt(0)
                              .toUpperCase() +
                            item.status.slice(1)
                          : "Unknown"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFeeStructure(item)
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                          <ChevronRight size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(item)
                          }
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(item)
                          }
                          className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close fee structure form"
            onClick={closeForm}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                  Finance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {editingId
                    ? "Edit Fee Structure"
                    : "Add Fee Structure"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the fee structure using real
                  academy data.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {formError && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    <p className="text-sm">
                      {formError}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    label="Fee Name"
                    required
                    value={form.name}
                    onChange={(value) =>
                      updateForm("name", value)
                    }
                    placeholder="e.g. Admission Fee"
                  />

                  <FormField
                    label="Fee Code"
                    required
                    value={form.code}
                    onChange={(value) =>
                      updateForm("code", value)
                    }
                    placeholder="e.g. ADM-FEE"
                  />

                  {/* Session */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Academic Session{" "}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={form.academicSession}
                      onChange={(event) => {
                        updateForm(
                          "academicSession",
                          event.target.value
                        );

                        updateForm("class", "");
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">
                        Select session
                      </option>

                      {sessions.map((session) => (
                        <option
                          key={session._id}
                          value={session._id}
                        >
                          {session.name} ({session.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Program */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Program{" "}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={form.program}
                      onChange={(event) => {
                        updateForm(
                          "program",
                          event.target.value
                        );

                        updateForm("class", "");
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">
                        Select program
                      </option>

                      {programs.map((program) => (
                        <option
                          key={program._id}
                          value={program._id}
                        >
                          {program.name} ({program.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Class
                    </label>

                    <select
                      value={form.class}
                      onChange={(event) =>
                        updateForm(
                          "class",
                          event.target.value
                        )
                      }
                      disabled={
                        !form.program ||
                        !form.academicSession
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">
                        All classes
                      </option>

                      {filteredClasses.map((item) => (
                        <option
                          key={item._id}
                          value={item._id}
                        >
                          {item.name} ({item.code})
                        </option>
                      ))}
                    </select>

                    <p className="mt-1.5 text-xs text-slate-400">
                      Leave empty if this fee applies to
                      all classes in the program.
                    </p>
                  </div>

                  {/* Fee Type */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Fee Type{" "}
                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={form.feeType}
                      onChange={(event) =>
                        updateForm(
                          "feeType",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      {FEE_TYPES.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <FormField
                    label="Amount"
                    required
                    type="number"
                    value={form.amount}
                    onChange={(value) =>
                      updateForm("amount", value)
                    }
                    placeholder="0"
                    min="0"
                  />

                  {/* Frequency */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Frequency
                    </label>

                    <select
                      value={form.frequency}
                      onChange={(event) =>
                        updateForm(
                          "frequency",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      {FREQUENCIES.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Day */}
                  <FormField
                    label="Due Day"
                    type="number"
                    value={form.dueDay}
                    onChange={(value) =>
                      updateForm("dueDay", value)
                    }
                    placeholder="1 - 31"
                    min="1"
                    max="31"
                  />

                  {/* Status */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Description
                    </label>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Describe this fee structure..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingId
                    ? "Update Fee Structure"
                    : "Create Fee Structure"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Details Drawer */}
      {selectedFeeStructure && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close details"
            onClick={() =>
              setSelectedFeeStructure(null)
            }
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                  Fee Structure
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {selectedFeeStructure.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedFeeStructure.code}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedFeeStructure(null)
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Amount
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(
                    selectedFeeStructure.amount
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    {getFeeTypeLabel(
                      selectedFeeStructure.feeType
                    )}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    {getFrequencyLabel(
                      selectedFeeStructure.frequency
                    )}
                  </span>
                </div>
              </div>

              <section className="mt-6">
                <h3 className="text-sm font-bold text-slate-950">
                  Configuration
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Status"
                    value={
                      selectedFeeStructure.status
                    }
                  />

                  <DetailItem
                    label="Due Day"
                    value={
                      selectedFeeStructure.dueDay
                        ? String(
                            selectedFeeStructure.dueDay
                          )
                        : "—"
                    }
                  />

                  <DetailItem
                    label="Fee Type"
                    value={getFeeTypeLabel(
                      selectedFeeStructure.feeType
                    )}
                  />

                  <DetailItem
                    label="Frequency"
                    value={getFrequencyLabel(
                      selectedFeeStructure.frequency
                    )}
                  />
                </div>
              </section>

              <section className="mt-7">
                <h3 className="text-sm font-bold text-slate-950">
                  Academic Session
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Name"
                    value={
                      selectedFeeStructure
                        ?.academicSession?.name
                    }
                  />

                  <DetailItem
                    label="Code"
                    value={
                      selectedFeeStructure
                        ?.academicSession?.code
                    }
                  />

                  <DetailItem
                    label="Start Date"
                    value={formatDate(
                      selectedFeeStructure
                        ?.academicSession?.startDate
                    )}
                  />

                  <DetailItem
                    label="End Date"
                    value={formatDate(
                      selectedFeeStructure
                        ?.academicSession?.endDate
                    )}
                  />
                </div>
              </section>

              <section className="mt-7">
                <h3 className="text-sm font-bold text-slate-950">
                  Program
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Name"
                    value={
                      selectedFeeStructure?.program?.name
                    }
                  />

                  <DetailItem
                    label="Code"
                    value={
                      selectedFeeStructure?.program?.code
                    }
                  />

                  <DetailItem
                    label="Duration"
                    value={
                      selectedFeeStructure?.program
                        ?.duration
                    }
                  />

                  <DetailItem
                    label="Status"
                    value={
                      selectedFeeStructure?.program
                        ?.status
                    }
                  />
                </div>
              </section>

              <section className="mt-7">
                <h3 className="text-sm font-bold text-slate-950">
                  Class
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Name"
                    value={
                      selectedFeeStructure?.class?.name ||
                      "All classes"
                    }
                  />

                  <DetailItem
                    label="Code"
                    value={
                      selectedFeeStructure?.class?.code ||
                      "—"
                    }
                  />

                  <DetailItem
                    label="Status"
                    value={
                      selectedFeeStructure?.class?.status ||
                      "—"
                    }
                  />
                </div>
              </section>

              {selectedFeeStructure.description && (
                <section className="mt-7">
                  <h3 className="text-sm font-bold text-slate-950">
                    Description
                  </h3>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedFeeStructure.description}
                    </p>
                  </div>
                </section>
              )}

              <section className="mt-7 pb-5">
                <h3 className="text-sm font-bold text-slate-950">
                  Record Information
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Created At"
                    value={formatDate(
                      selectedFeeStructure.createdAt
                    )}
                  />

                  <DetailItem
                    label="Updated At"
                    value={formatDate(
                      selectedFeeStructure.updatedAt
                    )}
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={20} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-950">
              Delete fee structure?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-700">
                {deleteTarget.name}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving && (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                )}

                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconClass = "bg-slate-100 text-slate-700",
  valueClass = "text-slate-950",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-red-500"> *</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        min={min}
        max={max}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}

function DetailItem({ label, value }) {
  const displayValue =
    value === null ||
    value === undefined ||
    String(value).trim() === ""
      ? "—"
      : value;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {displayValue}
      </p>
    </div>
  );
}

export default FeeStructures;