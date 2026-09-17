import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../../services/api";

const PAGE_LIMIT = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All payment statuses" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const initialCreateForm = {
  student: "",
  academicSession: "",
  previousMembership: "",
  startDate: "",
  endDate: "",
  amount: "",
  notes: "",
};

const getList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.renewals)) {
    return data.renewals;
  }

  if (Array.isArray(data?.students)) {
    return data.students;
  }

  if (Array.isArray(data?.sessions)) {
    return data.sessions;
  }

  if (Array.isArray(data?.academicSessions)) {
    return data.academicSessions;
  }

  if (Array.isArray(data?.memberships)) {
    return data.memberships;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data?.renewals)) {
    return response.data.renewals;
  }

  if (Array.isArray(response?.data?.students)) {
    return response.data.students;
  }

  if (Array.isArray(response?.data?.sessions)) {
    return response.data.sessions;
  }

  if (Array.isArray(response?.data?.academicSessions)) {
    return response.data.academicSessions;
  }

  if (Array.isArray(response?.data?.memberships)) {
    return response.data.memberships;
  }

  return [];
};

const getPagination = (response, fallbackCount = 0) => {
  const pagination = response?.data?.pagination || {};

  return {
    page: Number(pagination?.page || 1),
    limit: Number(pagination?.limit || PAGE_LIMIT),
    total: Number(pagination?.total ?? fallbackCount),
    totalPages: Number(pagination?.totalPages || 1),
  };
};

const getObject = (response) => {
  const data = response?.data?.data;

  if (data?.renewal) {
    return data.renewal;
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }

  if (response?.data?.renewal) {
    return response.data.renewal;
  }

  return null;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatAmount = (value) => {
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

const getStudentName = (student) => {
  if (!student) {
    return "—";
  }

  if (typeof student === "string") {
    return student;
  }

  const fullName = `${student?.firstName || ""} ${
    student?.lastName || ""
  }`.trim();

  return fullName || student?.name || student?.userId || student?.email || "—";
};

const getPlan = (renewal) => {
  return (
    renewal?.newMembership?.membershipName ||
    renewal?.previousMembership?.membershipName ||
    "—"
  );
};

const getMembershipCode = (renewal) => {
  return (
    renewal?.newMembership?.membershipCode ||
    renewal?.previousMembership?.membershipCode ||
    "—"
  );
};

const getMembershipName = (membership) => {
  if (!membership) {
    return "—";
  }

  return (
    membership?.membershipName ||
    membership?.name ||
    membership?.membershipCode ||
    "Membership"
  );
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "approved":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";

    case "in_progress":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const getPaymentStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "partial":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "pending":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const humanize = (value) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const StatusBadge = ({ value, payment = false }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
        payment ? getPaymentStatusClasses(value) : getStatusClasses(value)
      }`}
    >
      {humanize(value)}
    </span>
  );
};

const InfoItem = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, description }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          {description ? (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ onReset }) => {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FileText size={24} />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-900">
        No renewals found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        There are no renewal records matching the current filters. No demo or
        fake renewal data is being displayed.
      </p>

      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

        <div className="min-w-0">
          <h3 className="font-semibold text-red-900">
            Unable to load renewals
          </h3>

          <p className="mt-1 text-sm text-red-700">
            {message || "Something went wrong while loading renewals."}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};

function Renewals() {
  const [renewals, setRenewals] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const [selectedRenewal, setSelectedRenewal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [createLoading, setCreateLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [createError, setCreateError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createForm, setCreateForm] = useState(initialCreateForm);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const fetchRenewals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: PAGE_LIMIT,
      };

      if (status) {
        params.status = status;
      }

      if (paymentStatus) {
        params.paymentStatus = paymentStatus;
      }

      const response = await api.get("/renewals", {
        params,
      });

      let list = getList(response);

      /*
       * Backend currently does not support search.
       * Therefore search is handled on the frontend.
       */
      if (search.trim()) {
        const query = search.trim().toLowerCase();

        list = list.filter((renewal) => {
          const studentName = getStudentName(renewal?.student).toLowerCase();

          const studentId = String(
            renewal?.student?.userId || "",
          ).toLowerCase();

          const renewalNumber = String(
            renewal?.renewalNumber || "",
          ).toLowerCase();

          const membershipName = getPlan(renewal).toLowerCase();

          const membershipCode = getMembershipCode(renewal).toLowerCase();

          return (
            studentName.includes(query) ||
            studentId.includes(query) ||
            renewalNumber.includes(query) ||
            membershipName.includes(query) ||
            membershipCode.includes(query)
          );
        });
      }

      const paging = getPagination(response, list.length);

      setRenewals(list);
      setPagination(paging);
    } catch (err) {
      console.error("Failed to fetch renewals:", err);

      setRenewals([]);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load renewals.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, paymentStatus]);

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);

      const response = await api.get("/students", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const list = getList(response);

      setStudents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch students:", err);

      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  /*
   * IMPORTANT:
   * Academic sessions response can be:
   *
   * data: [...]
   * data.items: [...]
   * data.sessions: [...]
   * data.academicSessions: [...]
   *
   * getList() handles all of these.
   */
  const fetchAcademicSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);

      const response = await api.get("/academic-sessions", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      console.log("Academic sessions response:", response?.data);

      const list = getList(response);

      setAcademicSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch academic sessions:", err);

      setAcademicSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchMemberships = useCallback(async () => {
    try {
      setMembershipsLoading(true);

      const params = {
        page: 1,
        limit: 100,
      };

      if (createForm.student) {
        params.student = createForm.student;
      }

      if (createForm.academicSession) {
        params.academicSession = createForm.academicSession;
      }

      /*
       * Only active/expiring memberships should
       * normally be renewable.
       *
       * If backend does not accept status filter,
       * the local filter below still protects us.
       */
      try {
        params.status = "active";
      } catch {
        // intentionally ignored
      }

      const response = await api.get("/memberships", {
        params,
      });

      let list = getList(response);

      if (!Array.isArray(list)) {
        list = [];
      }

      /*
       * Local filtering ensures the correct
       * student's membership is shown even if
       * backend ignores query filters.
       */
      if (createForm.student) {
        list = list.filter((membership) => {
          const membershipStudent = membership?.student;

          const membershipStudentId =
            typeof membershipStudent === "string"
              ? membershipStudent
              : membershipStudent?._id;

          return (
            String(membershipStudentId || "") === String(createForm.student)
          );
        });
      }

      if (createForm.academicSession) {
        list = list.filter((membership) => {
          const membershipSession = membership?.academicSession;

          const membershipSessionId =
            typeof membershipSession === "string"
              ? membershipSession
              : membershipSession?._id;

          return (
            String(membershipSessionId || "") ===
            String(createForm.academicSession)
          );
        });
      }

      list = list.filter((membership) => {
        const currentStatus = String(membership?.status || "").toLowerCase();

        return currentStatus === "active" || currentStatus === "expiring";
      });

      setMemberships(list);
    } catch (err) {
      console.error("Failed to fetch memberships:", err);

      setMemberships([]);
    } finally {
      setMembershipsLoading(false);
    }
  }, [createForm.student, createForm.academicSession]);

  useEffect(() => {
    fetchRenewals();
  }, [fetchRenewals]);

  useEffect(() => {
    fetchStudents();
    fetchAcademicSessions();
  }, [fetchStudents, fetchAcademicSessions]);

  useEffect(() => {
    if (!showCreateModal) {
      return;
    }

    if (createForm.student || createForm.academicSession) {
      fetchMemberships();
    } else {
      setMemberships([]);
    }
  }, [
    showCreateModal,
    createForm.student,
    createForm.academicSession,
    fetchMemberships,
  ]);

  const openCreateModal = () => {
    setCreateError("");
    setCreateForm(initialCreateForm);
    setMemberships([]);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createLoading) {
      return;
    }

    setShowCreateModal(false);
    setCreateError("");
    setCreateForm(initialCreateForm);
    setMemberships([]);
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (createError) {
      setCreateError("");
    }
  };

  const handleStudentChange = (event) => {
    const studentId = event.target.value;

    setCreateForm((current) => ({
      ...current,
      student: studentId,
      previousMembership: "",
    }));

    setMemberships([]);
    setCreateError("");
  };

  const handleSessionChange = (event) => {
    const sessionId = event.target.value;

    setCreateForm((current) => ({
      ...current,
      academicSession: sessionId,
      previousMembership: "",
    }));

    setMemberships([]);
    setCreateError("");
  };

  const handleMembershipChange = (event) => {
    const membershipId = event.target.value;

    const selectedMembership = memberships.find(
      (membership) => String(membership?._id) === String(membershipId),
    );

    setCreateForm((current) => ({
      ...current,
      previousMembership: membershipId,
      amount: current.amount || selectedMembership?.amount || "",
    }));

    setCreateError("");
  };

  const createRenewal = async (event) => {
    event.preventDefault();

    setCreateError("");

    if (!createForm.student) {
      setCreateError("Please select a student.");
      return;
    }

    if (!createForm.academicSession) {
      setCreateError("Please select an academic session.");
      return;
    }

    if (!createForm.previousMembership) {
      setCreateError("Please select the previous membership.");
      return;
    }

    if (!createForm.startDate) {
      setCreateError("Please select the renewal start date.");
      return;
    }

    if (!createForm.endDate) {
      setCreateError("Please select the renewal end date.");
      return;
    }

    const startDate = new Date(createForm.startDate);

    const endDate = new Date(createForm.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setCreateError("Please enter valid dates.");
      return;
    }

    if (endDate <= startDate) {
      setCreateError("End date must be after start date.");
      return;
    }

    const amount = Number(createForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setCreateError("Renewal amount must be greater than 0.");
      return;
    }

    try {
      setCreateLoading(true);

      /*
       * EXACT backend createRenewal payload.
       *
       * Do not send:
       * newMembership
       * paidAmount
       * remainingAmount
       * paymentStatus
       * status
       * renewalNumber
       */
      const payload = {
        student: createForm.student,
        academicSession: createForm.academicSession,
        previousMembership: createForm.previousMembership,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        amount,
        notes: createForm.notes.trim(),
      };

      await api.post("/renewals", payload);

      closeCreateModal();

      setPage(1);

      await fetchRenewals();
    } catch (err) {
      console.error("Failed to create renewal:", err);

      setCreateError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create renewal.",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetails = async (renewal) => {
    try {
      setActionError("");
      setDetailsLoading(true);

      const response = await api.get(`/renewals/${renewal._id}`);

      const data = getObject(response);

      setSelectedRenewal(data || renewal);
    } catch (err) {
      console.error("Failed to fetch renewal details:", err);

      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load renewal details.",
      );

      setSelectedRenewal(renewal);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (actionLoading) {
      return;
    }

    setSelectedRenewal(null);
    setActionError("");
  };

  const approveRenewal = async (renewal) => {
    if (!renewal?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await api.put(`/renewals/${renewal._id}/approve`);

      await fetchRenewals();

      if (selectedRenewal?._id === renewal._id) {
        try {
          const response = await api.get(`/renewals/${renewal._id}`);

          setSelectedRenewal(getObject(response) || null);
        } catch {
          setSelectedRenewal(null);
        }
      }
    } catch (err) {
      console.error("Failed to approve renewal:", err);

      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to approve renewal.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const completeRenewal = async (renewal) => {
    if (!renewal?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await api.put(`/renewals/${renewal._id}/complete`);

      await fetchRenewals();

      if (selectedRenewal?._id === renewal._id) {
        try {
          const response = await api.get(`/renewals/${renewal._id}`);

          setSelectedRenewal(getObject(response) || null);
        } catch {
          setSelectedRenewal(null);
        }
      }
    } catch (err) {
      console.error("Failed to complete renewal:", err);

      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to complete renewal.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setPage(1);
  };

  const stats = useMemo(() => {
    return {
      pending: renewals.filter((item) => item?.status === "pending").length,

      approved: renewals.filter((item) => item?.status === "approved").length,

      completed: renewals.filter((item) => item?.status === "completed").length,

      cancelled: renewals.filter((item) => item?.status === "cancelled").length,
    };
  }, [renewals]);

  const hasPreviousPage = page > 1;

  const hasNextPage = page < Number(pagination.totalPages || 1);

  return (
    <div className="px-5 py-8 lg:px-8">
      {/* HEADER */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>CRM</span>
            <span>/</span>
            <span>Renewals</span>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Renewals
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage student membership renewals, payment status and renewal
            completion from the real backend data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Create Renewal
          </button>

          <button
            type="button"
            onClick={fetchRenewals}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock3}
          description="Current page"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          description="Current page"
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          description="Current page"
        />

        <StatCard
          title="Cancelled"
          value={stats.cancelled}
          icon={X}
          description="Current page"
        />
      </div>

      {/* FILTERS */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search renewals..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {error ? (
        <ErrorState message={error} onRetry={fetchRenewals} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                Loading renewals...
              </div>
            </div>
          ) : renewals.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Renewal
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Student
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Plan
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amount
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Due Date
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Payment
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {renewals.map((renewal) => (
                      <tr
                        key={renewal._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {renewal?.renewalNumber || "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(renewal?.renewalDate)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {getStudentName(renewal?.student)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {renewal?.student?.userId || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[240px] text-sm font-medium text-slate-800">
                            {getPlan(renewal)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {getMembershipCode(renewal)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatAmount(renewal?.amount)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Paid: {formatAmount(renewal?.paidAmount)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {formatDate(renewal?.endDate)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Renewal period end
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge value={renewal?.paymentStatus} payment />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge value={renewal?.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openDetails(renewal)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="grid gap-4 p-4 lg:hidden">
                {renewals.map((renewal) => (
                  <div
                    key={renewal._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {renewal?.renewalNumber || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(renewal?.renewalDate)}
                        </p>
                      </div>

                      <StatusBadge value={renewal?.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoItem
                        label="Student"
                        value={getStudentName(renewal?.student)}
                      />

                      <InfoItem label="Plan" value={getPlan(renewal)} />

                      <InfoItem
                        label="Amount"
                        value={formatAmount(renewal?.amount)}
                      />

                      <InfoItem
                        label="Due date"
                        value={formatDate(renewal?.endDate)}
                      />

                      <InfoItem
                        label="Paid"
                        value={formatAmount(renewal?.paidAmount)}
                      />

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Payment
                        </p>

                        <div className="mt-2">
                          <StatusBadge value={renewal?.paymentStatus} payment />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDetails(renewal)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      View details
                    </button>
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {renewals.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.total}
                  </span>{" "}
                  renewals
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasPreviousPage || loading}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white">
                    {pagination.page}
                  </div>

                  <button
                    type="button"
                    disabled={!hasNextPage || loading}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(pagination.totalPages, current + 1),
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CREATE RENEWAL MODAL */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close create renewal modal"
            onClick={closeCreateModal}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Membership
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Create Renewal
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a real renewal record from the existing membership.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                >
                  <X size={19} />
                </button>
              </div>

              {/* Modal Body */}
              <form
                onSubmit={createRenewal}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {createError ? (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          size={18}
                          className="mt-0.5 shrink-0 text-red-600"
                        />

                        <p className="text-sm leading-6 text-red-700">
                          {createError}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* STUDENT */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Student
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="student"
                        value={createForm.student}
                        onChange={handleStudentChange}
                        disabled={studentsLoading || createLoading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      >
                        <option value="">
                          {studentsLoading
                            ? "Loading students..."
                            : "Select student"}
                        </option>

                        {students.map((student) => (
                          <option key={student?._id} value={student?._id}>
                            {getStudentName(student)}
                            {student?.userId ? ` (${student.userId})` : ""}
                          </option>
                        ))}
                      </select>

                      {!studentsLoading && students.length === 0 ? (
                        <p className="mt-2 text-xs text-amber-600">
                          No students available.
                        </p>
                      ) : null}
                    </div>

                    {/* ACADEMIC SESSION */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Academic Session
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="academicSession"
                        value={createForm.academicSession}
                        onChange={handleSessionChange}
                        disabled={sessionsLoading || createLoading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      >
                        <option value="">
                          {sessionsLoading
                            ? "Loading academic sessions..."
                            : "Select academic session"}
                        </option>

                        {academicSessions.map((session) => (
                          <option key={session?._id} value={session?._id}>
                            {session?.name ||
                              session?.code ||
                              "Academic Session"}
                            {session?.code && session?.name
                              ? ` (${session.code})`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {!sessionsLoading && academicSessions.length === 0 ? (
                        <p className="mt-2 text-xs text-amber-600">
                          No academic sessions available. Please create an
                          academic session first.
                        </p>
                      ) : null}
                    </div>

                    {/* PREVIOUS MEMBERSHIP */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Previous Membership
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="previousMembership"
                        value={createForm.previousMembership}
                        onChange={handleMembershipChange}
                        disabled={
                          !createForm.student ||
                          !createForm.academicSession ||
                          membershipsLoading ||
                          createLoading
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      >
                        <option value="">
                          {!createForm.student
                            ? "Select student first"
                            : !createForm.academicSession
                              ? "Select academic session first"
                              : membershipsLoading
                                ? "Loading memberships..."
                                : "Select previous membership"}
                        </option>

                        {memberships.map((membership) => (
                          <option key={membership?._id} value={membership?._id}>
                            {getMembershipName(membership)}
                            {membership?.membershipCode
                              ? ` • ${membership.membershipCode}`
                              : ""}
                            {membership?.amount != null
                              ? ` • ${formatAmount(membership.amount)}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {createForm.student &&
                      createForm.academicSession &&
                      !membershipsLoading &&
                      memberships.length === 0 ? (
                        <p className="mt-2 text-xs text-amber-600">
                          No active or expiring membership found for this
                          student and academic session.
                        </p>
                      ) : null}
                    </div>

                    {/* START DATE */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Start Date
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="date"
                        name="startDate"
                        value={createForm.startDate}
                        onChange={handleCreateChange}
                        disabled={createLoading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      />
                    </div>

                    {/* END DATE */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        End Date
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="date"
                        name="endDate"
                        value={createForm.endDate}
                        onChange={handleCreateChange}
                        disabled={createLoading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      />
                    </div>

                    {/* AMOUNT */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Renewal Amount
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="amount"
                        value={createForm.amount}
                        onChange={handleCreateChange}
                        placeholder="Enter amount"
                        disabled={createLoading}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      />
                    </div>

                    {/* NOTES */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Notes
                      </label>

                      <textarea
                        name="notes"
                        value={createForm.notes}
                        onChange={handleCreateChange}
                        rows={4}
                        placeholder="Optional notes..."
                        disabled={createLoading}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Renewal workflow
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-700">
                      Create renewal → Approve renewal → Add payment → Complete
                      renewal. A new membership is created by the backend only
                      after the renewal is fully paid and completed.
                    </p>
                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={createLoading}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      createLoading ||
                      !createForm.student ||
                      !createForm.academicSession ||
                      !createForm.previousMembership
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Renewal
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* DETAILS DRAWER */}
      {selectedRenewal ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close renewal details"
            onClick={closeDetails}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Renewal details
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {selectedRenewal?.renewalNumber || "Renewal"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getStudentName(selectedRenewal?.student)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                disabled={actionLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {detailsLoading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <Loader2 size={19} className="animate-spin" />
                    Loading details...
                  </div>
                </div>
              ) : (
                <>
                  {actionError ? (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {actionError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem
                      label="Renewal number"
                      value={selectedRenewal?.renewalNumber}
                    />

                    <InfoItem
                      label="Student"
                      value={getStudentName(selectedRenewal?.student)}
                    />

                    <InfoItem
                      label="Student ID"
                      value={selectedRenewal?.student?.userId}
                    />

                    <InfoItem label="Plan" value={getPlan(selectedRenewal)} />

                    <InfoItem
                      label="Membership code"
                      value={getMembershipCode(selectedRenewal)}
                    />

                    <InfoItem
                      label="Amount"
                      value={formatAmount(selectedRenewal?.amount)}
                    />

                    <InfoItem
                      label="Paid amount"
                      value={formatAmount(selectedRenewal?.paidAmount)}
                    />

                    <InfoItem
                      label="Remaining amount"
                      value={formatAmount(selectedRenewal?.remainingAmount)}
                    />

                    <InfoItem
                      label="Payment status"
                      value={
                        <StatusBadge
                          value={selectedRenewal?.paymentStatus}
                          payment
                        />
                      }
                    />

                    <InfoItem
                      label="Renewal status"
                      value={<StatusBadge value={selectedRenewal?.status} />}
                    />

                    <InfoItem
                      label="Renewal date"
                      value={formatDate(selectedRenewal?.renewalDate)}
                    />

                    <InfoItem
                      label="Start date"
                      value={formatDate(selectedRenewal?.startDate)}
                    />

                    <InfoItem
                      label="Due date"
                      value={formatDate(selectedRenewal?.endDate)}
                    />

                    <InfoItem
                      label="Academic session"
                      value={selectedRenewal?.academicSession?.name}
                    />

                    <InfoItem
                      label="Session code"
                      value={selectedRenewal?.academicSession?.code}
                    />

                    <InfoItem
                      label="Created"
                      value={formatDateTime(selectedRenewal?.createdAt)}
                    />

                    <InfoItem
                      label="Updated"
                      value={formatDateTime(selectedRenewal?.updatedAt)}
                    />
                  </div>

                  {/* PREVIOUS MEMBERSHIP */}
                  {selectedRenewal?.previousMembership ? (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-slate-900">
                        Previous Membership
                      </h3>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoItem
                          label="Membership"
                          value={
                            selectedRenewal?.previousMembership?.membershipName
                          }
                        />

                        <InfoItem
                          label="Code"
                          value={
                            selectedRenewal?.previousMembership?.membershipCode
                          }
                        />

                        <InfoItem
                          label="Start date"
                          value={formatDate(
                            selectedRenewal?.previousMembership?.startDate,
                          )}
                        />

                        <InfoItem
                          label="End date"
                          value={formatDate(
                            selectedRenewal?.previousMembership?.endDate,
                          )}
                        />

                        <InfoItem
                          label="Amount"
                          value={formatAmount(
                            selectedRenewal?.previousMembership?.amount,
                          )}
                        />

                        <InfoItem
                          label="Status"
                          value={
                            <StatusBadge
                              value={
                                selectedRenewal?.previousMembership?.status
                              }
                            />
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* NEW MEMBERSHIP */}
                  {selectedRenewal?.newMembership ? (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-slate-900">
                        New Membership
                      </h3>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoItem
                          label="Membership"
                          value={selectedRenewal?.newMembership?.membershipName}
                        />

                        <InfoItem
                          label="Code"
                          value={selectedRenewal?.newMembership?.membershipCode}
                        />

                        <InfoItem
                          label="Start date"
                          value={formatDate(
                            selectedRenewal?.newMembership?.startDate,
                          )}
                        />

                        <InfoItem
                          label="End date"
                          value={formatDate(
                            selectedRenewal?.newMembership?.endDate,
                          )}
                        />

                        <InfoItem
                          label="Amount"
                          value={formatAmount(
                            selectedRenewal?.newMembership?.amount,
                          )}
                        />

                        <InfoItem
                          label="Status"
                          value={
                            <StatusBadge
                              value={selectedRenewal?.newMembership?.status}
                            />
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* PROCESSING */}
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-slate-900">
                      Processing
                    </h3>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoItem
                        label="Processed by"
                        value={
                          selectedRenewal?.processedBy
                            ? `${selectedRenewal.processedBy.firstName || ""} ${
                                selectedRenewal.processedBy.lastName || ""
                              }`.trim() || selectedRenewal.processedBy.userId
                            : "—"
                        }
                      />

                      <InfoItem
                        label="Processed at"
                        value={formatDateTime(selectedRenewal?.processedAt)}
                      />

                      <InfoItem
                        label="Created at"
                        value={formatDateTime(selectedRenewal?.createdAt)}
                      />

                      <InfoItem
                        label="Updated at"
                        value={formatDateTime(selectedRenewal?.updatedAt)}
                      />
                    </div>
                  </div>

                  {/* NOTES */}
                  {selectedRenewal?.notes ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Notes
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedRenewal.notes}
                      </p>
                    </div>
                  ) : null}

                  {/* CANCELLATION */}
                  {selectedRenewal?.cancellationReason ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                        Cancellation reason
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                        {selectedRenewal.cancellationReason}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {!detailsLoading ? (
              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {selectedRenewal?.status === "pending" ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => approveRenewal(selectedRenewal)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Approve Renewal
                    </button>
                  ) : null}

                  {selectedRenewal?.status === "approved" &&
                  Number(selectedRenewal?.paidAmount || 0) >=
                    Number(selectedRenewal?.amount || 0) ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => completeRenewal(selectedRenewal)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Complete Renewal
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={closeDetails}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default Renewals;
