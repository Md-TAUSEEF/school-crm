import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

import { api } from "../../services/api";

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

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const getStudentName = (payment) => {
  const student = payment?.student;

  if (!student) return "—";

  const name = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  return name || student.userId || "—";
};

const getStudentNameFromRecord = (record) => {
  const student = record?.student;

  if (!student || typeof student !== "object") {
    return "Unnamed Student";
  }

  const name = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  return name || student.userId || "Unnamed Student";
};

const getPaymentType = (payment) => {
  if (payment?.renewal) {
    return "Renewal";
  }

  if (payment?.feeAssignment) {
    return "Fee";
  }

  return "Other";
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "refunded":
      return "border-violet-200 bg-violet-50 text-violet-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const getStatusIcon = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "success":
      return <CheckCircle2 size={14} />;

    case "pending":
      return <Clock3 size={14} />;

    case "failed":
    case "cancelled":
      return <XCircle size={14} />;

    default:
      return <AlertCircle size={14} />;
  }
};

const getMethodLabel = (method) => {
  switch (method) {
    case "cash":
      return "Cash";

    case "upi":
      return "UPI";

    case "bank_transfer":
      return "Bank Transfer";

    case "cheque":
      return "Cheque";

    case "razorpay":
      return "Razorpay";

    default:
      return method || "—";
  }
};

const getTypeClasses = (type) => {
  if (type === "Renewal") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (type === "Fee") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const getSessionsList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.sessions)) {
    return data.sessions;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(response?.data?.sessions)) {
    return response.data.sessions;
  }

  return [];
};

const getFeeAssignmentsList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.assignments)) {
    return data.assignments;
  }

  if (Array.isArray(data?.feeAssignments)) {
    return data.feeAssignments;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(response?.data?.assignments)) {
    return response.data.assignments;
  }

  return [];
};

const getRenewalsList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.renewals)) {
    return data.renewals;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(response?.data?.renewals)) {
    return response.data.renewals;
  }

  return [];
};

const getRecordId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return value?._id || "";
  }

  return value;
};

const getRecordStudentId = (record) => {
  return getRecordId(record?.student);
};

const getRecordSessionId = (record) => {
  return getRecordId(record?.academicSession);
};

function Payments() {
  const [payments, setPayments] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [showCreateDrawer, setShowCreateDrawer] =
    useState(false);

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [feeAssignments, setFeeAssignments] = useState([]);
  const [renewals, setRenewals] = useState([]);

  const [loadingFormData, setLoadingFormData] =
    useState(false);

  const [form, setForm] = useState({
    paymentType: "fee",
    feeAssignment: "",
    renewal: "",
    student: "",
    academicSession: "",
    amount: "",
    paymentMethod: "cash",
    paymentStatus: "success",
    transactionId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const fetchPayments = async ({ silent = false } = {}) => {
    try {
      setError("");

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/payments");

      const responseData = response?.data;

      const list = Array.isArray(responseData?.data)
        ? responseData.data
        : [];

      setPayments(list);

      setCount(
        Number.isFinite(Number(responseData?.count))
          ? Number(responseData.count)
          : list.length
      );
    } catch (err) {
      console.error("Failed to fetch payments:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load payments. Please try again."
      );

      setPayments([]);
      setCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchCreateFormData = async () => {
    try {
      setLoadingFormData(true);
      setCreateError("");

      const [
        sessionsResponse,
        assignmentsResponse,
        renewalsResponse,
      ] = await Promise.all([
        api.get("/academic-sessions"),

        api.get("/fee-assignments", {
          params: {
            page: 1,
            limit: 100,
          },
        }),

        api.get("/renewals", {
          params: {
            page: 1,
            limit: 100,
          },
        }),
      ]);

      setSessions(getSessionsList(sessionsResponse));

      setFeeAssignments(
        getFeeAssignmentsList(assignmentsResponse)
      );

      setRenewals(
        getRenewalsList(renewalsResponse)
      );
    } catch (err) {
      console.error(
        "Failed to load payment form data:",
        err
      );

      setCreateError(
        err?.response?.data?.message ||
          "Unable to load payment options."
      );
    } finally {
      setLoadingFormData(false);
    }
  };

  const resetCreateForm = () => {
    setForm({
      paymentType: "fee",
      feeAssignment: "",
      renewal: "",
      student: "",
      academicSession: "",
      amount: "",
      paymentMethod: "cash",
      paymentStatus: "success",
      transactionId: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    setCreateError("");
  };

  const openCreateDrawer = async () => {
    resetCreateForm();
    setShowCreateDrawer(true);
    await fetchCreateFormData();
  };

  const closeCreateDrawer = () => {
    if (createLoading) return;

    setShowCreateDrawer(false);
    resetCreateForm();
  };

  /*
   * Only fee assignments which actually have money
   * remaining are allowed for fee payment.
   */
  const payableFeeAssignments = useMemo(() => {
    return feeAssignments.filter((assignment) => {
      if (!assignment?._id) {
        return false;
      }

      if (assignment.status === "cancelled") {
        return false;
      }

      const remaining = Number(
        assignment.remainingAmount || 0
      );

      return Number.isFinite(remaining) && remaining > 0;
    });
  }, [feeAssignments]);

  /*
   * Only approved renewals with remaining payable amount
   * are allowed for renewal payment.
   */
  const payableRenewals = useMemo(() => {
    return renewals.filter((renewal) => {
      if (!renewal?._id) {
        return false;
      }

      if (
        renewal.status === "cancelled" ||
        renewal.status === "rejected"
      ) {
        return false;
      }

      /*
       * Renewal payment should only happen after
       * the renewal has been approved.
       */
      if (renewal.status !== "approved") {
        return false;
      }

      if (
        renewal.paymentStatus === "paid" ||
        renewal.paymentStatus === "cancelled"
      ) {
        return false;
      }

      const remaining = Number(
        renewal.remainingAmount || 0
      );

      return Number.isFinite(remaining) && remaining > 0;
    });
  }, [renewals]);

  const selectedAssignment = useMemo(() => {
    return payableFeeAssignments.find(
      (assignment) =>
        String(assignment?._id) ===
        String(form.feeAssignment)
    );
  }, [
    payableFeeAssignments,
    form.feeAssignment,
  ]);

  const selectedRenewal = useMemo(() => {
    return payableRenewals.find(
      (renewal) =>
        String(renewal?._id) ===
        String(form.renewal)
    );
  }, [payableRenewals, form.renewal]);

  /*
   * Current student is always derived from the selected
   * payable source record.
   */
  const selectedStudent = useMemo(() => {
    if (form.paymentType === "fee") {
      return selectedAssignment?.student || null;
    }

    return selectedRenewal?.student || null;
  }, [
    form.paymentType,
    selectedAssignment,
    selectedRenewal,
  ]);

  /*
   * Current academic session is also derived from
   * the selected payable source record.
   */
  const selectedSession = useMemo(() => {
    if (form.paymentType === "fee") {
      return selectedAssignment?.academicSession || null;
    }

    return selectedRenewal?.academicSession || null;
  }, [
    form.paymentType,
    selectedAssignment,
    selectedRenewal,
  ]);

  /*
   * Keep session list available for displaying a proper
   * session name when populated data is incomplete.
   */
  const sessionNameById = useMemo(() => {
    const map = new Map();

    sessions.forEach((session) => {
      if (session?._id) {
        map.set(String(session._id), session);
      }
    });

    return map;
  }, [sessions]);

  const selectedSessionName = useMemo(() => {
    if (!form.academicSession) {
      return "—";
    }

    if (
      selectedSession &&
      typeof selectedSession === "object"
    ) {
      return (
        selectedSession.name ||
        selectedSession.code ||
        "—"
      );
    }

    const session = sessionNameById.get(
      String(form.academicSession)
    );

    return (
      session?.name ||
      session?.code ||
      "—"
    );
  }, [
    form.academicSession,
    selectedSession,
    sessionNameById,
  ]);

  const selectedStudentName = useMemo(() => {
    if (
      selectedStudent &&
      typeof selectedStudent === "object"
    ) {
      return getStudentNameFromRecord({
        student: selectedStudent,
      });
    }

    return "—";
  }, [selectedStudent]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "paymentType") {
      setForm((current) => ({
        ...current,
        paymentType: value,
        feeAssignment: "",
        renewal: "",
        student: "",
        academicSession: "",
        amount: "",
      }));

      setCreateError("");
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setCreateError("");
  };

  const handleAssignmentChange = (event) => {
    const assignmentId = event.target.value;

    const assignment = payableFeeAssignments.find(
      (item) =>
        String(item?._id) === String(assignmentId)
    );

    if (!assignment) {
      setForm((current) => ({
        ...current,
        feeAssignment: "",
        student: "",
        academicSession: "",
        amount: "",
      }));

      return;
    }

    const studentId = getRecordStudentId(assignment);
    const sessionId = getRecordSessionId(assignment);

    const remaining = Number(
      assignment.remainingAmount || 0
    );

    setForm((current) => ({
      ...current,
      paymentType: "fee",
      feeAssignment: assignmentId,
      renewal: "",
      student: studentId,
      academicSession: sessionId,
      amount:
        Number.isFinite(remaining) && remaining > 0
          ? String(remaining)
          : "",
    }));

    setCreateError("");
  };

  const handleRenewalChange = (event) => {
    const renewalId = event.target.value;

    const renewal = payableRenewals.find(
      (item) =>
        String(item?._id) === String(renewalId)
    );

    if (!renewal) {
      setForm((current) => ({
        ...current,
        renewal: "",
        student: "",
        academicSession: "",
        amount: "",
      }));

      return;
    }

    const studentId = getRecordStudentId(renewal);
    const sessionId = getRecordSessionId(renewal);

    const remaining = Number(
      renewal.remainingAmount || 0
    );

    setForm((current) => ({
      ...current,
      paymentType: "renewal",
      renewal: renewalId,
      feeAssignment: "",
      student: studentId,
      academicSession: sessionId,
      amount:
        Number.isFinite(remaining) && remaining > 0
          ? String(remaining)
          : "",
    }));

    setCreateError("");
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError("");

      /*
       * Student and academic session are derived from
       * the selected payable record.
       */
      if (!form.student) {
        throw new Error(
          "Student could not be determined from the selected payment record."
        );
      }

      if (!form.academicSession) {
        throw new Error(
          "Academic session could not be determined from the selected payment record."
        );
      }

      if (
        form.paymentType === "fee" &&
        !form.feeAssignment
      ) {
        throw new Error(
          "Please select a payable fee assignment."
        );
      }

      if (
        form.paymentType === "renewal" &&
        !form.renewal
      ) {
        throw new Error(
          "Please select an approved payable renewal."
        );
      }

      const amount = Number(form.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
          "Please enter a valid payment amount."
        );
      }

      let remainingAmount = 0;

      if (form.paymentType === "fee") {
        if (!selectedAssignment) {
          throw new Error(
            "Selected fee assignment is no longer payable."
          );
        }

        remainingAmount = Number(
          selectedAssignment.remainingAmount || 0
        );
      }

      if (form.paymentType === "renewal") {
        if (!selectedRenewal) {
          throw new Error(
            "Selected renewal is no longer payable."
          );
        }

        remainingAmount = Number(
          selectedRenewal.remainingAmount || 0
        );
      }

      if (
        !Number.isFinite(remainingAmount) ||
        remainingAmount <= 0
      ) {
        throw new Error(
          "There is no remaining amount available for this payment."
        );
      }

      if (amount > remainingAmount) {
        throw new Error(
          `Payment amount cannot be greater than the remaining amount of ${formatCurrency(
            remainingAmount
          )}.`
        );
      }

      const payload = {
        student: form.student,
        academicSession: form.academicSession,
        amount,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        paymentDate: form.paymentDate
          ? new Date(
              form.paymentDate
            ).toISOString()
          : undefined,
        transactionId:
          form.transactionId.trim() || undefined,
        notes: form.notes.trim(),
      };

      if (form.paymentType === "fee") {
        payload.feeAssignment =
          form.feeAssignment;
      }

      if (form.paymentType === "renewal") {
        payload.renewal = form.renewal;
      }

      Object.keys(payload).forEach((key) => {
        if (
          payload[key] === undefined ||
          payload[key] === ""
        ) {
          delete payload[key];
        }
      });

      console.log(
        "Creating payment payload:",
        payload
      );

      await api.post("/payments", payload);

      setShowCreateDrawer(false);
      resetCreateForm();

      /*
       * Refresh payment list after successful creation.
       */
      await fetchPayments({ silent: true });
    } catch (err) {
      console.error(
        "Failed to create payment:",
        err
      );

      setCreateError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to create payment."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const studentName =
        getStudentName(payment).toLowerCase();

      const paymentNumber = String(
        payment?.paymentNumber || ""
      ).toLowerCase();

      const transactionId = String(
        payment?.transactionId || ""
      ).toLowerCase();

      const userId = String(
        payment?.student?.userId || ""
      ).toLowerCase();

      const renewalNumber = String(
        payment?.renewal?.renewalNumber || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        studentName.includes(query) ||
        paymentNumber.includes(query) ||
        transactionId.includes(query) ||
        userId.includes(query) ||
        renewalNumber.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        payment?.paymentStatus === statusFilter;

      const matchesMethod =
        methodFilter === "all" ||
        payment?.paymentMethod === methodFilter;

      const paymentType = getPaymentType(payment);

      const matchesType =
        typeFilter === "all" ||
        paymentType.toLowerCase() ===
          typeFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod &&
        matchesType
      );
    });
  }, [
    payments,
    search,
    statusFilter,
    methodFilter,
    typeFilter,
  ]);

  const summary = useMemo(() => {
    const successful = payments.filter(
      (payment) =>
        payment?.paymentStatus === "success"
    );

    const pending = payments.filter(
      (payment) =>
        payment?.paymentStatus === "pending"
    );

    const failed = payments.filter(
      (payment) =>
        payment?.paymentStatus === "failed" ||
        payment?.paymentStatus === "cancelled"
    );

    const successfulAmount = successful.reduce(
      (total, payment) =>
        total + Number(payment?.amount || 0),
      0
    );

    const pendingAmount = pending.reduce(
      (total, payment) =>
        total + Number(payment?.amount || 0),
      0
    );

    return {
      successfulCount: successful.length,
      successfulAmount,
      pendingCount: pending.length,
      pendingAmount,
      failedCount: failed.length,
    };
  }, [payments]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters =
    search.trim() ||
    statusFilter !== "all" ||
    methodFilter !== "all" ||
    typeFilter !== "all";

  const noPayableFeeAssignments =
    form.paymentType === "fee" &&
    payableFeeAssignments.length === 0;

  const noPayableRenewals =
    form.paymentType === "renewal" &&
    payableRenewals.length === 0;

  return (
    <div className="min-h-full bg-slate-50 px-5 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
            <WalletCards size={15} />
            Finance
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Payments
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create and monitor real fee and renewal
            payment records from the Force Strike CRM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              fetchPayments({ silent: true })
            }
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={17} />
            Create Payment
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Payments
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {count}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <CreditCard size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Successful
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {summary.successfulCount}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatCurrency(
                  summary.successfulAmount
                )}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pending
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {summary.pendingCount}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatCurrency(summary.pendingAmount)}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Clock3 size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Failed / Cancelled
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {summary.failedCount}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <XCircle size={19} />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            className="mt-0.5 shrink-0"
            size={18}
          />

          <div className="flex-1">
            <p className="text-sm font-semibold">
              Unable to load payments
            </p>

            <p className="mt-1 text-sm">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => fetchPayments()}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

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
              placeholder="Search payment, student, ID, transaction..."
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
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">
              Cancelled
            </option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">
              Bank Transfer
            </option>
            <option value="cheque">Cheque</option>
            <option value="razorpay">Razorpay</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="all">All Types</option>
            <option value="fee">Fee</option>
            <option value="renewal">Renewal</option>
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <X size={16} />
              Clear
            </button>
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredPayments.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {payments.length}
            </span>{" "}
            payments
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                size={28}
                className="animate-spin text-red-600"
              />

              <p className="text-sm text-slate-500">
                Loading payments...
              </p>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
              <CreditCard size={28} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {payments.length === 0
                ? "No payments found"
                : "No matching payments"}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {payments.length === 0
                ? "There are no payment records in the database yet."
                : "Try changing your search or filters to find a payment."}
            </p>

            {payments.length === 0 && (
              <button
                type="button"
                onClick={openCreateDrawer}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Plus size={16} />
                Create Payment
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Method
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const type = getPaymentType(payment);

                  return (
                    <tr
                      key={payment?._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {payment?.paymentNumber ||
                              "—"}
                          </p>

                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {payment?.transactionId ||
                              payment?.razorpayOrderId ||
                              "No transaction ID"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {getStudentName(payment)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {payment?.student?.userId ||
                              "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTypeClasses(
                            type
                          )}`}
                        >
                          {type}
                        </span>

                        {payment?.renewal
                          ?.renewalNumber && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              payment.renewal
                                .renewalNumber
                            }
                          </p>
                        )}

                        {payment?.feeAssignment && (
                          <p className="mt-1 text-xs text-slate-500">
                            Due:{" "}
                            {formatDate(
                              payment.feeAssignment
                                .dueDate
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(
                            payment?.amount
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {getMethodLabel(
                            payment?.paymentMethod
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            payment?.paymentStatus
                          )}`}
                        >
                          {getStatusIcon(
                            payment?.paymentStatus
                          )}

                          {payment?.paymentStatus
                            ? payment.paymentStatus
                                .charAt(0)
                                .toUpperCase() +
                              payment.paymentStatus.slice(
                                1
                              )
                            : "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {formatDate(
                            payment?.paymentDate
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayment(payment)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Eye size={14} />
                          View
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payment Drawer */}
      {showCreateDrawer && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close create payment drawer"
            onClick={closeCreateDrawer}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                  Finance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Create Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record a real fee or renewal payment
                  against a payable record.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateDrawer}
                disabled={createLoading}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreatePayment}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {createError && (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle
                      className="mt-0.5 shrink-0"
                      size={18}
                    />

                    <p className="text-sm leading-6">
                      {createError}
                    </p>
                  </div>
                )}

                {loadingFormData ? (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2
                        size={28}
                        className="animate-spin text-red-600"
                      />

                      <p className="text-sm text-slate-500">
                        Loading payment options...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Payment Type */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Payment Type
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              paymentType: "fee",
                              feeAssignment: "",
                              renewal: "",
                              student: "",
                              academicSession: "",
                              amount: "",
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            form.paymentType === "fee"
                              ? "border-orange-300 bg-orange-50 text-orange-700 ring-2 ring-orange-100"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-bold">
                            Fee Payment
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Pay against fee assignment
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              paymentType: "renewal",
                              feeAssignment: "",
                              renewal: "",
                              student: "",
                              academicSession: "",
                              amount: "",
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            form.paymentType ===
                            "renewal"
                              ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-bold">
                            Renewal Payment
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Pay against approved renewal
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Fee Assignment Selector */}
                    {form.paymentType === "fee" && (
                      <>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-slate-800">
                              Fee Assignment
                            </label>

                            <span className="text-xs font-medium text-slate-400">
                              Payable only
                            </span>
                          </div>

                          <select
                            name="feeAssignment"
                            value={form.feeAssignment}
                            onChange={
                              handleAssignmentChange
                            }
                            required
                            disabled={
                              payableFeeAssignments.length ===
                              0
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                          >
                            <option value="">
                              {noPayableFeeAssignments
                                ? "No payable fee assignment found"
                                : "Select fee assignment"}
                            </option>

                            {payableFeeAssignments.map(
                              (assignment) => (
                                <option
                                  key={
                                    assignment?._id
                                  }
                                  value={
                                    assignment?._id
                                  }
                                >
                                  {getStudentNameFromRecord(
                                    assignment
                                  )}{" "}
                                  —{" "}
                                  {assignment
                                    ?.feeStructure
                                    ?.name ||
                                    assignment
                                      ?.feeStructure
                                      ?.code ||
                                    "Fee"}{" "}
                                  — Remaining{" "}
                                  {formatCurrency(
                                    assignment?.remainingAmount
                                  )}
                                </option>
                              )
                            )}
                          </select>

                          {noPayableFeeAssignments && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              No student is available for
                              fee payment because there is
                              no payable fee assignment with
                              a remaining amount.
                            </p>
                          )}
                        </div>

                        {/* Selected Student */}
                        {selectedAssignment && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Payment Target
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <DetailItem
                                label="Student"
                                value={
                                  selectedStudentName
                                }
                              />

                              <DetailItem
                                label="Academic Session"
                                value={
                                  selectedSessionName
                                }
                              />

                              <DetailItem
                                label="Student ID"
                                value={
                                  selectedStudent?.userId
                                }
                              />

                              <DetailItem
                                label="Fee Structure"
                                value={
                                  selectedAssignment
                                    ?.feeStructure
                                    ?.name ||
                                  selectedAssignment
                                    ?.feeStructure
                                    ?.code
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Fee Assignment Summary */}
                        {selectedAssignment && (
                          <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                              Fee Assignment Summary
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <DetailItem
                                label="Total Fee"
                                value={formatCurrency(
                                  selectedAssignment.totalFee
                                )}
                              />

                              <DetailItem
                                label="Discount"
                                value={formatCurrency(
                                  selectedAssignment.discount
                                )}
                              />

                              <DetailItem
                                label="Payable"
                                value={formatCurrency(
                                  selectedAssignment.payableAmount
                                )}
                              />

                              <DetailItem
                                label="Already Paid"
                                value={formatCurrency(
                                  selectedAssignment.paidAmount
                                )}
                              />

                              <DetailItem
                                label="Remaining"
                                value={formatCurrency(
                                  selectedAssignment.remainingAmount
                                )}
                              />

                              <DetailItem
                                label="Status"
                                value={
                                  selectedAssignment.status
                                }
                              />

                              <DetailItem
                                label="Due Date"
                                value={formatDate(
                                  selectedAssignment.dueDate
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Renewal Selector */}
                    {form.paymentType ===
                      "renewal" && (
                      <>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-slate-800">
                              Renewal
                            </label>

                            <span className="text-xs font-medium text-slate-400">
                              Approved & payable only
                            </span>
                          </div>

                          <select
                            name="renewal"
                            value={form.renewal}
                            onChange={
                              handleRenewalChange
                            }
                            required
                            disabled={
                              payableRenewals.length ===
                              0
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                          >
                            <option value="">
                              {noPayableRenewals
                                ? "No payable renewal found"
                                : "Select renewal"}
                            </option>

                            {payableRenewals.map(
                              (renewal) => (
                                <option
                                  key={renewal?._id}
                                  value={renewal?._id}
                                >
                                  {getStudentNameFromRecord(
                                    renewal
                                  )}{" "}
                                  —{" "}
                                  {renewal?.renewalNumber ||
                                    "Renewal"}{" "}
                                  — Remaining{" "}
                                  {formatCurrency(
                                    renewal?.remainingAmount
                                  )}
                                </option>
                              )
                            )}
                          </select>

                          {noPayableRenewals && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              No student is available for
                              renewal payment because there
                              is no approved renewal with a
                              remaining amount.
                            </p>
                          )}
                        </div>

                        {/* Selected Renewal Student */}
                        {selectedRenewal && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Payment Target
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <DetailItem
                                label="Student"
                                value={
                                  selectedStudentName
                                }
                              />

                              <DetailItem
                                label="Academic Session"
                                value={
                                  selectedSessionName
                                }
                              />

                              <DetailItem
                                label="Student ID"
                                value={
                                  selectedStudent?.userId
                                }
                              />

                              <DetailItem
                                label="Renewal Number"
                                value={
                                  selectedRenewal?.renewalNumber
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Renewal Summary */}
                        {selectedRenewal && (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                  Renewal Payment
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-900">
                                  {selectedRenewal
                                    .renewalNumber ||
                                    "Renewal"}
                                </p>
                              </div>

                              <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                                {selectedRenewal.status}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <DetailItem
                                label="Renewal Amount"
                                value={formatCurrency(
                                  selectedRenewal.amount
                                )}
                              />

                              <DetailItem
                                label="Already Paid"
                                value={formatCurrency(
                                  selectedRenewal.paidAmount
                                )}
                              />

                              <DetailItem
                                label="Remaining"
                                value={formatCurrency(
                                  selectedRenewal.remainingAmount
                                )}
                              />

                              <DetailItem
                                label="Payment Status"
                                value={
                                  selectedRenewal.paymentStatus
                                }
                              />

                              <DetailItem
                                label="Start Date"
                                value={formatDate(
                                  selectedRenewal.startDate
                                )}
                              />

                              <DetailItem
                                label="End Date"
                                value={formatDate(
                                  selectedRenewal.endDate
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Amount */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-800">
                          Payment Amount
                        </label>

                        {form.paymentType ===
                          "fee" &&
                          selectedAssignment && (
                            <span className="text-xs font-medium text-slate-500">
                              Max:{" "}
                              {formatCurrency(
                                selectedAssignment.remainingAmount
                              )}
                            </span>
                          )}

                        {form.paymentType ===
                          "renewal" &&
                          selectedRenewal && (
                            <span className="text-xs font-medium text-slate-500">
                              Max:{" "}
                              {formatCurrency(
                                selectedRenewal.remainingAmount
                              )}
                            </span>
                          )}
                      </div>

                      <input
                        type="number"
                        name="amount"
                        value={form.amount}
                        onChange={handleFormChange}
                        min="0.01"
                        step="0.01"
                        max={
                          form.paymentType === "fee"
                            ? selectedAssignment?.remainingAmount ||
                              undefined
                            : selectedRenewal?.remainingAmount ||
                              undefined
                        }
                        required
                        disabled={
                          form.paymentType === "fee"
                            ? !selectedAssignment
                            : !selectedRenewal
                        }
                        placeholder={
                          form.paymentType === "fee"
                            ? "Select fee assignment first"
                            : "Select renewal first"
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      {(selectedAssignment ||
                        selectedRenewal) && (
                        <p className="mt-2 text-xs text-slate-500">
                          Amount automatically starts with
                          the remaining payable amount. You
                          can enter a lower amount for a
                          partial payment.
                        </p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Payment Method
                      </label>

                      <select
                        name="paymentMethod"
                        value={form.paymentMethod}
                        onChange={handleFormChange}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      >
                        <option value="cash">
                          Cash
                        </option>

                        <option value="upi">
                          UPI
                        </option>

                        <option value="bank_transfer">
                          Bank Transfer
                        </option>

                        <option value="cheque">
                          Cheque
                        </option>

                        <option value="razorpay">
                          Razorpay
                        </option>
                      </select>
                    </div>

                    {/* Payment Status */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Payment Status
                      </label>

                      <select
                        name="paymentStatus"
                        value={form.paymentStatus}
                        onChange={handleFormChange}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      >
                        <option value="success">
                          Success
                        </option>

                        <option value="pending">
                          Pending
                        </option>

                        <option value="failed">
                          Failed
                        </option>

                        <option value="cancelled">
                          Cancelled
                        </option>

                        <option value="refunded">
                          Refunded
                        </option>
                      </select>
                    </div>

                    {/* Transaction ID */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Transaction ID
                        <span className="ml-1 font-normal text-slate-400">
                          (optional)
                        </span>
                      </label>

                      <input
                        type="text"
                        name="transactionId"
                        value={form.transactionId}
                        onChange={handleFormChange}
                        placeholder="UPI / bank / cheque transaction ID"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Payment Date
                      </label>

                      <input
                        type="date"
                        name="paymentDate"
                        value={form.paymentDate}
                        onChange={handleFormChange}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Notes
                        <span className="ml-1 font-normal text-slate-400">
                          (optional)
                        </span>
                      </label>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleFormChange}
                        rows={4}
                        maxLength={1000}
                        placeholder="Payment notes..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreateDrawer}
                    disabled={createLoading}
                    className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      createLoading ||
                      loadingFormData ||
                      !form.student ||
                      !form.academicSession ||
                      (form.paymentType === "fee"
                        ? !form.feeAssignment
                        : !form.renewal)
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createLoading ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CreditCard size={17} />
                        Create Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Details Drawer */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close payment details"
            onClick={() =>
              setSelectedPayment(null)
            }
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                  Payment Details
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {selectedPayment.paymentNumber ||
                    "Payment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getStudentName(selectedPayment)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPayment(null)
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Payment Amount
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {formatCurrency(
                        selectedPayment.amount
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                      selectedPayment.paymentStatus
                    )}`}
                  >
                    {getStatusIcon(
                      selectedPayment.paymentStatus
                    )}

                    {selectedPayment.paymentStatus
                      ? selectedPayment.paymentStatus
                          .charAt(0)
                          .toUpperCase() +
                        selectedPayment.paymentStatus.slice(
                          1
                        )
                      : "Unknown"}
                  </span>
                </div>
              </div>

              <section className="mt-6">
                <h3 className="text-sm font-bold text-slate-950">
                  Basic Information
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Payment Number"
                    value={
                      selectedPayment.paymentNumber
                    }
                  />

                  <DetailItem
                    label="Payment Type"
                    value={getPaymentType(
                      selectedPayment
                    )}
                  />

                  <DetailItem
                    label="Payment Method"
                    value={getMethodLabel(
                      selectedPayment.paymentMethod
                    )}
                  />

                  <DetailItem
                    label="Payment Date"
                    value={formatDateTime(
                      selectedPayment.paymentDate
                    )}
                  />

                  <DetailItem
                    label="Transaction ID"
                    value={
                      selectedPayment.transactionId
                    }
                  />

                  <DetailItem
                    label="Academic Session"
                    value={
                      selectedPayment
                        ?.academicSession?.name
                    }
                  />
                </div>
              </section>

              <section className="mt-7">
                <h3 className="text-sm font-bold text-slate-950">
                  Student
                </h3>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    {getStudentName(selectedPayment)}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Student ID"
                      value={
                        selectedPayment?.student
                          ?.userId
                      }
                    />

                    <DetailItem
                      label="Email"
                      value={
                        selectedPayment?.student?.email
                      }
                    />

                    <DetailItem
                      label="Phone"
                      value={
                        selectedPayment?.student?.phone
                      }
                    />

                    <DetailItem
                      label="Session Code"
                      value={
                        selectedPayment
                          ?.academicSession?.code
                      }
                    />
                  </div>
                </div>
              </section>

              {selectedPayment.feeAssignment && (
                <section className="mt-7">
                  <h3 className="text-sm font-bold text-slate-950">
                    Fee Assignment
                  </h3>

                  <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <DetailItem
                        label="Total Fee"
                        value={formatCurrency(
                          selectedPayment
                            .feeAssignment
                            .totalFee
                        )}
                      />

                      <DetailItem
                        label="Payable Amount"
                        value={formatCurrency(
                          selectedPayment
                            .feeAssignment
                            .payableAmount
                        )}
                      />

                      <DetailItem
                        label="Paid Amount"
                        value={formatCurrency(
                          selectedPayment
                            .feeAssignment
                            .paidAmount
                        )}
                      />

                      <DetailItem
                        label="Remaining Amount"
                        value={formatCurrency(
                          selectedPayment
                            .feeAssignment
                            .remainingAmount
                        )}
                      />

                      <DetailItem
                        label="Due Date"
                        value={formatDate(
                          selectedPayment
                            .feeAssignment.dueDate
                        )}
                      />

                      <DetailItem
                        label="Assignment Status"
                        value={
                          selectedPayment
                            .feeAssignment.status
                        }
                      />
                    </div>
                  </div>
                </section>
              )}

              {selectedPayment.renewal && (
                <section className="mt-7">
                  <h3 className="text-sm font-bold text-slate-950">
                    Renewal
                  </h3>

                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <DetailItem
                        label="Renewal Number"
                        value={
                          selectedPayment.renewal
                            .renewalNumber
                        }
                      />

                      <DetailItem
                        label="Renewal Amount"
                        value={formatCurrency(
                          selectedPayment.renewal
                            .amount
                        )}
                      />

                      <DetailItem
                        label="Paid Amount"
                        value={formatCurrency(
                          selectedPayment.renewal
                            .paidAmount
                        )}
                      />

                      <DetailItem
                        label="Remaining Amount"
                        value={formatCurrency(
                          selectedPayment.renewal
                            .remainingAmount
                        )}
                      />

                      <DetailItem
                        label="Start Date"
                        value={formatDate(
                          selectedPayment.renewal
                            .startDate
                        )}
                      />

                      <DetailItem
                        label="End Date"
                        value={formatDate(
                          selectedPayment.renewal
                            .endDate
                        )}
                      />

                      <DetailItem
                        label="Payment Status"
                        value={
                          selectedPayment.renewal
                            .paymentStatus
                        }
                      />

                      <DetailItem
                        label="Renewal Status"
                        value={
                          selectedPayment.renewal.status
                        }
                      />
                    </div>
                  </div>
                </section>
              )}

              {(selectedPayment.razorpayOrderId ||
                selectedPayment.razorpayPaymentId ||
                selectedPayment.razorpaySignature) && (
                <section className="mt-7">
                  <h3 className="text-sm font-bold text-slate-950">
                    Razorpay Information
                  </h3>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <DetailItem
                      label="Razorpay Order ID"
                      value={
                        selectedPayment.razorpayOrderId
                      }
                    />

                    <DetailItem
                      label="Razorpay Payment ID"
                      value={
                        selectedPayment
                          .razorpayPaymentId
                      }
                    />

                    <DetailItem
                      label="Razorpay Signature"
                      value={
                        selectedPayment
                          .razorpaySignature
                      }
                    />
                  </div>
                </section>
              )}

              <section className="mt-7">
                <h3 className="text-sm font-bold text-slate-950">
                  Received By
                </h3>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                  {selectedPayment.receivedBy ? (
                    <>
                      <p className="text-sm font-bold text-slate-900">
                        {`${selectedPayment.receivedBy.firstName || ""} ${
                          selectedPayment.receivedBy.lastName || ""
                        }`.trim() || "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {selectedPayment.receivedBy
                          .email || "—"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No receiver recorded.
                    </p>
                  )}
                </div>
              </section>

              {selectedPayment.notes && (
                <section className="mt-7">
                  <h3 className="text-sm font-bold text-slate-950">
                    Notes
                  </h3>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedPayment.notes}
                    </p>
                  </div>
                </section>
              )}

              <section className="mt-7 pb-4">
                <h3 className="text-sm font-bold text-slate-950">
                  Record Information
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Created At"
                    value={formatDateTime(
                      selectedPayment.createdAt
                    )}
                  />

                  <DetailItem
                    label="Updated At"
                    value={formatDateTime(
                      selectedPayment.updatedAt
                    )}
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
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

export default Payments;