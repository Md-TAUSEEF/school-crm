
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../../services/api";

const STATUS_OPTIONS = [
  "due",
  "partial",
  "paid",
  "overdue",
  "cancelled",
];

const initialForm = {
  membership: "",
  discount: "",
  dueDate: "",
  notes: "",
};

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getList = (response, keys = []) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getPagination = (response) => {
  const pagination = response?.data?.pagination;

  return {
    page: Number(pagination?.page || 1),
    limit: Number(pagination?.limit || 20),
    total: Number(pagination?.total || 0),
    totalPages: Number(pagination?.totalPages || 1),
  };
};

const getStudentName = (student) => {
  if (!student) return "Unknown student";

  const fullName = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  return (
    fullName ||
    student.userId ||
    student.email ||
    "Unknown student"
  );
};

const getFeeStructureName = (feeStructure) => {
  if (!feeStructure) return "Unknown fee";

  return (
    feeStructure.name ||
    feeStructure.code ||
    "Unknown fee structure"
  );
};

const getMembershipStudent = (membership) => {
  return membership?.student || null;
};

const getMembershipSession = (membership) => {
  return membership?.academicSession || null;
};

const getMembershipFeeStructure = (membership) => {
  return membership?.feeStructure || null;
};

const statusClasses = {
  due: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
        statusClasses[status] ||
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function Drawer({
  children,
  onClose,
  title,
  subtitle,
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Close"
      />

      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {children}

      {required && (
        <span className="ml-1 text-red-500">*</span>
      )}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${className}`}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${className}`}
    />
  );
}

export default function FeeAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingMemberships, setLoadingMemberships] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [form, setForm] = useState(initialForm);

  const [editingAssignment, setEditingAssignment] =
    useState(null);

  const [viewingAssignment, setViewingAssignment] =
    useState(null);

  const [showForm, setShowForm] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);

  /*
   * SELECTED MEMBERSHIP
   */
  const selectedMembership = useMemo(() => {
    return memberships.find(
      (membership) =>
        String(membership._id) ===
        String(form.membership),
    );
  }, [memberships, form.membership]);

  /*
   * PAYABLE PREVIEW
   */
  const payablePreview = useMemo(() => {
    if (!selectedMembership) return 0;

    const total = Number(
      selectedMembership.amount || 0,
    );

    const discount = Number(
      form.discount || 0,
    );

    if (!Number.isFinite(discount)) {
      return total;
    }

    return Math.max(0, total - discount);
  }, [selectedMembership, form.discount]);

  /*
   * LOAD FEE ASSIGNMENTS
   */
  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (sessionFilter) {
        params.academicSession = sessionFilter;
      }

      if (studentFilter) {
        params.student = studentFilter;
      }

      const response = await api.get(
        "/fee-assignments",
        {
          params,
        },
      );

      const list = getList(response, [
        "feeAssignments",
        "items",
      ]);

      setAssignments(
        Array.isArray(list) ? list : [],
      );

      setPagination(
        getPagination(response),
      );
    } catch (err) {
      console.error(
        "Fee assignments fetch error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load fee assignments",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * LOAD PENDING MEMBERSHIPS
   *
   * Fee Assignment is created from Membership.
   */
  const loadMemberships = async () => {
    try {
      setLoadingMemberships(true);

      const response = await api.get(
        "/memberships",
        {
          params: {
            status: "pending",
            page: 1,
            limit: 100,
          },
        },
      );

      const list = getList(response, [
        "memberships",
        "items",
      ]);

      setMemberships(
        Array.isArray(list) ? list : [],
      );
    } catch (err) {
      console.error(
        "Membership options error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load pending memberships",
      );
    } finally {
      setLoadingMemberships(false);
    }
  };

  /*
   * INITIAL LOAD
   */
  useEffect(() => {
    loadMemberships();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [
    page,
    statusFilter,
    sessionFilter,
    studentFilter,
  ]);

  /*
   * SUCCESS MESSAGE AUTO HIDE
   */
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [success]);

  /*
   * SEARCH
   */
  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter(
      (assignment) => {
        const student = getStudentName(
          assignment.student,
        );

        const studentId =
          assignment.student?.userId || "";

        const fee = getFeeStructureName(
          assignment.feeStructure,
        );

        const feeCode =
          assignment.feeStructure?.code || "";

        const status =
          assignment.status || "";

        const sessionName =
          assignment.academicSession?.name ||
          "";

        const sessionCode =
          assignment.academicSession?.code ||
          "";

        const text = [
          student,
          studentId,
          fee,
          feeCode,
          status,
          sessionName,
          sessionCode,
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      },
    );
  }, [assignments, search]);

  /*
   * FILTER STUDENTS
   */
  const filterStudents = useMemo(() => {
    const map = new Map();

    assignments.forEach((assignment) => {
      const student =
        assignment.student;

      if (!student?._id) return;

      map.set(
        String(student._id),
        student,
      );
    });

    return Array.from(map.values());
  }, [assignments]);

  /*
   * FILTER SESSIONS
   */
  const filterSessions = useMemo(() => {
    const map = new Map();

    assignments.forEach((assignment) => {
      const session =
        assignment.academicSession;

      if (!session?._id) return;

      map.set(
        String(session._id),
        session,
      );
    });

    return Array.from(map.values());
  }, [assignments]);

  /*
   * SUMMARY
   */
  const summary = useMemo(() => {
    return assignments.reduce(
      (acc, item) => {
        const payable = Number(
          item.payableAmount || 0,
        );

        const paid = Number(
          item.paidAmount || 0,
        );

        const remaining = Number(
          item.remainingAmount || 0,
        );

        acc.payable += payable;
        acc.paid += paid;
        acc.remaining += remaining;

        if (item.status === "due") {
          acc.due += 1;
        }

        if (item.status === "partial") {
          acc.partial += 1;
        }

        if (item.status === "paid") {
          acc.paidCount += 1;
        }

        if (item.status === "overdue") {
          acc.overdue += 1;
        }

        return acc;
      },
      {
        payable: 0,
        paid: 0,
        remaining: 0,
        due: 0,
        partial: 0,
        paidCount: 0,
        overdue: 0,
      },
    );
  }, [assignments]);

  /*
   * FORM RESET
   */
  const resetForm = () => {
    setForm(initialForm);
    setEditingAssignment(null);
  };

  /*
   * OPEN CREATE
   */
  const openCreate = () => {
    resetForm();

    setError("");
    setSuccess("");

    setShowForm(true);

    loadMemberships();
  };

  /*
   * OPEN EDIT
   */
  const openEdit = (assignment) => {
    setEditingAssignment(
      assignment,
    );

    setForm({
      membership: "",
      discount:
        assignment.discount !==
        undefined
          ? String(assignment.discount)
          : "",
      dueDate: assignment.dueDate
        ? new Date(
            assignment.dueDate,
          )
            .toISOString()
            .slice(0, 10)
        : "",
      notes: assignment.notes || "",
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };

  /*
   * CLOSE FORM
   */
  const closeForm = () => {
    if (saving) return;

    setShowForm(false);

    resetForm();
  };

  /*
   * FORM CHANGE
   */
  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * VALIDATE CREATE
   */
  const validateCreateForm = () => {
    if (!form.membership) {
      return "Please select a membership";
    }

    if (!selectedMembership) {
      return "Selected membership was not found";
    }

    if (
      selectedMembership.status !==
      "pending"
    ) {
      return "Only pending memberships can be assigned a fee";
    }

    if (!selectedMembership.student) {
      return "Selected membership has no student";
    }

    if (
      !selectedMembership.academicSession
    ) {
      return "Selected membership has no academic session";
    }

    if (
      !selectedMembership.feeStructure
    ) {
      return "Selected membership has no fee structure";
    }

    const discount = Number(
      form.discount || 0,
    );

    if (
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      return "Discount must be a valid non-negative number";
    }

    const total = Number(
      selectedMembership.amount || 0,
    );

    if (discount > total) {
      return "Discount cannot be greater than membership amount";
    }

    if (
      form.notes.length > 1000
    ) {
      return "Notes cannot exceed 1000 characters";
    }

    return "";
  };

  /*
   * VALIDATE EDIT
   */
  const validateEditForm = () => {
    const discount = Number(
      form.discount || 0,
    );

    if (
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      return "Discount must be a valid non-negative number";
    }

    const total = Number(
      editingAssignment?.totalFee || 0,
    );

    if (discount > total) {
      return "Discount cannot be greater than total fee";
    }

    if (
      form.notes.length > 1000
    ) {
      return "Notes cannot exceed 1000 characters";
    }

    return "";
  };

  /*
   * SUBMIT
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation =
      editingAssignment
        ? validateEditForm()
        : validateCreateForm();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      /*
       * EDIT
       */
      if (editingAssignment) {
        const payload = {
          discount: Number(
            form.discount || 0,
          ),
          dueDate:
            form.dueDate || null,
          notes:
            form.notes.trim(),
        };

        await api.put(
          `/fee-assignments/${editingAssignment._id}`,
          payload,
        );

        setSuccess(
          "Fee assignment updated successfully",
        );
      } else {
        /*
         * CREATE
         *
         * IMPORTANT:
         *
         * Backend now expects ONLY:
         * membership
         * discount
         * dueDate
         * notes
         *
         * Student, enrollment, academic session,
         * fee structure and total fee are resolved
         * server-side from the selected membership.
         */
        const payload = {
          membership:
            selectedMembership._id,
          discount: Number(
            form.discount || 0,
          ),
          dueDate:
            form.dueDate || null,
          notes:
            form.notes.trim(),
        };

        console.log(
          "Create Fee Assignment Payload:",
          payload,
        );

        await api.post(
          "/fee-assignments",
          payload,
        );

        setSuccess(
          "Fee assignment created successfully",
        );
      }

      setShowForm(false);

      resetForm();

      await Promise.all([
        loadAssignments(),
        loadMemberships(),
      ]);
    } catch (err) {
      console.error(
        "Fee assignment save error:",
        err,
      );

      console.error(
        "Fee assignment server response:",
        err?.response?.data,
      );

      setError(
        err?.response?.data?.message ||
          "Failed to save fee assignment",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * CANCEL ASSIGNMENT
   */
  const handleCancelAssignment =
    async () => {
      if (!cancelTarget) return;

      try {
        setCancelling(true);

        setError("");
        setSuccess("");

        await api.put(
          `/fee-assignments/${cancelTarget._id}/cancel`,
        );

        setCancelTarget(null);

        setSuccess(
          "Fee assignment cancelled successfully",
        );

        await loadAssignments();
      } catch (err) {
        console.error(
          "Cancel fee assignment error:",
          err,
        );

        setError(
          err?.response?.data?.message ||
            "Failed to cancel fee assignment",
        );
      } finally {
        setCancelling(false);
      }
    };

  /*
   * PAGINATION
   */
  const changePage = (nextPage) => {
    if (nextPage < 1) return;

    if (
      pagination.totalPages &&
      nextPage >
        pagination.totalPages
    ) {
      return;
    }

    setPage(nextPage);
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <CircleDollarSign size={16} />
            Finance
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Fee Assignments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create fee assignments from
            pending memberships and manage
            student dues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadAssignments();
              loadMemberships();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Plus size={17} />
            Assign Fee
          </button>
        </div>
      </div>

      {/* ALERT */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            {error}
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>{success}</div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payable
          </p>

          <p className="mt-2 text-xl font-bold text-slate-950">
            {formatMoney(
              summary.payable,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Paid
          </p>

          <p className="mt-2 text-xl font-bold text-emerald-600">
            {formatMoney(
              summary.paid,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Remaining
          </p>

          <p className="mt-2 text-xl font-bold text-red-600">
            {formatMoney(
              summary.remaining,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assignment Status
          </p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
              Due {summary.due}
            </span>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
              Partial {summary.partial}
            </span>

            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              Paid{" "}
              {summary.paidCount}
            </span>

            <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">
              Overdue{" "}
              {summary.overdue}
            </span>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search student, ID, fee..."
              className="pl-10"
            />
          </div>

          <Select
            value={studentFilter}
            onChange={(event) => {
              setStudentFilter(
                event.target.value,
              );
              setPage(1);
            }}
          >
            <option value="">
              All Students
            </option>

            {filterStudents.map(
              (student) => (
                <option
                  key={student._id}
                  value={student._id}
                >
                  {getStudentName(
                    student,
                  )}
                  {student.userId
                    ? ` — ${student.userId}`
                    : ""}
                </option>
              ),
            )}
          </Select>

          <Select
            value={sessionFilter}
            onChange={(event) => {
              setSessionFilter(
                event.target.value,
              );
              setPage(1);
            }}
          >
            <option value="">
              All Academic Sessions
            </option>

            {filterSessions.map(
              (session) => (
                <option
                  key={session._id}
                  value={session._id}
                >
                  {session.name}
                  {session.code
                    ? ` (${session.code})`
                    : ""}
                </option>
              ),
            )}
          </Select>

          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              );
              setPage(1);
            }}
          >
            <option value="">
              All Statuses
            </option>

            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status
                    .charAt(0)
                    .toUpperCase() +
                    status.slice(1)}
                </option>
              ),
            )}
          </Select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Student
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Fee Structure
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Session
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Total
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payable
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Paid
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Remaining
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Due Date
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-5 py-14 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Loading fee
                      assignments...
                    </div>
                  </td>
                </tr>
              ) : filteredAssignments.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
                        <FileText
                          size={28}
                        />
                      </div>

                      <h3 className="font-semibold text-slate-900">
                        No fee
                        assignments
                        found
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        No matching fee
                        assignments
                        exist in the
                        database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map(
                  (assignment) => (
                    <tr
                      key={
                        assignment._id
                      }
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound
                              size={17}
                            />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {getStudentName(
                                assignment.student,
                              )}
                            </p>

                            <p className="text-xs text-slate-500">
                              {assignment
                                .student
                                ?.userId ||
                                assignment
                                  .student
                                  ?.email ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {getFeeStructureName(
                            assignment.feeStructure,
                          )}
                        </p>

                        <p className="text-xs capitalize text-slate-500">
                          {assignment
                            .feeStructure
                            ?.feeType?.replaceAll(
                              "_",
                              " ",
                            ) ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {assignment
                            .academicSession
                            ?.name ||
                            "—"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {assignment
                            .academicSession
                            ?.code ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-800">
                        {formatMoney(
                          assignment.totalFee,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatMoney(
                          assignment.payableAmount,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-600">
                        {formatMoney(
                          assignment.paidAmount,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-red-600">
                        {formatMoney(
                          assignment.remainingAmount,
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          assignment.dueDate,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            assignment.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingAssignment(
                                assignment,
                              )
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View"
                          >
                            <Eye
                              size={17}
                            />
                          </button>

                          {assignment.status !==
                            "cancelled" && (
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  assignment,
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit"
                            >
                              <Pencil
                                size={17}
                              />
                            </button>
                          )}

                          {assignment.status !==
                            "cancelled" &&
                            Number(
                              assignment.paidAmount ||
                                0,
                            ) === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelTarget(
                                    assignment,
                                  )
                                }
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                                title="Cancel"
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading &&
          pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing page{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {
                    pagination.totalPages
                  }
                </span>{" "}
                ·{" "}
                {pagination.total} total
                assignments
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    changePage(
                      page - 1,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={16}
                  />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    changePage(
                      page + 1,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* CREATE / EDIT DRAWER */}
      {showForm && (
        <Drawer
          title={
            editingAssignment
              ? "Edit Fee Assignment"
              : "Assign Fee"
          }
          subtitle={
            editingAssignment
              ? "Update discount, due date or notes."
              : "Create a fee assignment from a pending membership."
          }
          onClose={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* MEMBERSHIP */}
            {!editingAssignment && (
              <>
                <div>
                  <FieldLabel required>
                    Membership
                  </FieldLabel>

                  <Select
                    name="membership"
                    value={form.membership}
                    onChange={handleChange}
                    disabled={
                      loadingMemberships
                    }
                  >
                    <option value="">
                      {loadingMemberships
                        ? "Loading memberships..."
                        : "Select membership"}
                    </option>

                    {memberships.map(
                      (membership) => {
                        const student =
                          getMembershipStudent(
                            membership,
                          );

                        const session =
                          getMembershipSession(
                            membership,
                          );

                        const fee =
                          getMembershipFeeStructure(
                            membership,
                          );

                        return (
                          <option
                            key={
                              membership._id
                            }
                            value={
                              membership._id
                            }
                          >
                            {getStudentName(
                              student,
                            )}{" "}
                            —{" "}
                            {membership.membershipName ||
                              "Membership"}{" "}
                            —{" "}
                            {formatMoney(
                              membership.amount,
                            )}
                            {session?.name
                              ? ` — ${session.name}`
                              : ""}
                            {fee?.code
                              ? ` — ${fee.code}`
                              : ""}
                          </option>
                        );
                      },
                    )}
                  </Select>

                  {!loadingMemberships &&
                    memberships.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        No pending
                        memberships are
                        available for fee
                        assignment.
                      </p>
                    )}
                </div>

                {/* MEMBERSHIP DETAILS */}
                {selectedMembership && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Membership
                          Details
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Fee assignment
                          will use the
                          membership
                          information.
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          selectedMembership.status
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          Student
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {getStudentName(
                            selectedMembership.student,
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          {selectedMembership
                            .student
                            ?.userId ||
                            selectedMembership
                              .student
                              ?.email ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Membership
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedMembership.membershipName ||
                            "—"}
                        </p>

                        <p className="text-xs text-slate-500">
                          Code:{" "}
                          {selectedMembership.membershipCode ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Academic
                          Session
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedMembership
                            .academicSession
                            ?.name ||
                            "—"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {selectedMembership
                            .academicSession
                            ?.code ||
                            ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Fee Structure
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {getFeeStructureName(
                            selectedMembership.feeStructure,
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          Code:{" "}
                          {selectedMembership
                            .feeStructure
                            ?.code ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Membership
                          Start
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(
                            selectedMembership.startDate,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Membership End
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(
                            selectedMembership.endDate,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* EDIT INFORMATION */}
            {editingAssignment && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Student
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {getStudentName(
                    editingAssignment.student,
                  )}
                </p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fee Structure
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {getFeeStructureName(
                    editingAssignment.feeStructure,
                  )}
                </p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Academic Session
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {editingAssignment
                    .academicSession
                    ?.name || "—"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {editingAssignment
                    .academicSession
                    ?.code || ""}
                </p>
              </div>
            )}

            {/* DISCOUNT */}
            <div>
              <FieldLabel>
                Discount
              </FieldLabel>

              <Input
                type="number"
                min="0"
                step="0.01"
                name="discount"
                value={form.discount}
                onChange={handleChange}
                placeholder="0"
              />

              {!editingAssignment &&
                selectedMembership && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Membership
                        Amount
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatMoney(
                          selectedMembership.amount,
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Discount
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatMoney(
                          Number(
                            form.discount ||
                              0,
                          ),
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-semibold text-slate-700">
                        Payable Amount
                      </span>

                      <span className="text-lg font-bold text-slate-950">
                        {formatMoney(
                          payablePreview,
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>

            {/* EDIT PAYMENT INFO */}
            {editingAssignment && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">
                  Payment-controlled
                  amount
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-blue-700">
                      Paid
                    </p>

                    <p className="mt-1 font-bold text-blue-950">
                      {formatMoney(
                        editingAssignment.paidAmount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">
                      Remaining
                    </p>

                    <p className="mt-1 font-bold text-blue-950">
                      {formatMoney(
                        editingAssignment.remainingAmount,
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-blue-700">
                  Paid amount cannot be
                  changed here. Use the
                  Payments module for
                  payments.
                </p>
              </div>
            )}

            {/* DUE DATE */}
            <div>
              <FieldLabel>
                Due Date
              </FieldLabel>

              <div className="relative">
                <CalendarDays
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* NOTES */}
            <div>
              <FieldLabel>
                Notes
              </FieldLabel>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={5}
                maxLength={1000}
                placeholder="Optional notes..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {form.notes.length}/1000
              </p>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  loadingMemberships ||
                  (!editingAssignment &&
                    !selectedMembership)
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {editingAssignment
                  ? "Update Assignment"
                  : "Assign Fee"}
              </button>
            </div>
          </form>
        </Drawer>
      )}

      {/* VIEW DRAWER */}
      {viewingAssignment && (
        <Drawer
          title="Fee Assignment Details"
          subtitle="Complete fee assignment information."
          onClose={() =>
            setViewingAssignment(null)
          }
        >
          <div className="space-y-5">
            {/* STUDENT HEADER */}
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {getStudentName(
                      viewingAssignment.student,
                    )}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {viewingAssignment
                      .student
                      ?.userId ||
                      viewingAssignment
                        .student
                        ?.email ||
                      "—"}
                  </p>
                </div>

                <StatusBadge
                  status={
                    viewingAssignment.status
                  }
                />
              </div>
            </div>

            {/* MONEY DETAILS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Total Fee
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {formatMoney(
                    viewingAssignment.totalFee,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Discount
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {formatMoney(
                    viewingAssignment.discount,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Payable
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {formatMoney(
                    viewingAssignment.payableAmount,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Paid
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {formatMoney(
                    viewingAssignment.paidAmount,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs text-red-600">
                  Remaining
                </p>

                <p className="mt-1 text-lg font-bold text-red-700">
                  {formatMoney(
                    viewingAssignment.remainingAmount,
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Due Date
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {formatDate(
                    viewingAssignment.dueDate,
                  )}
                </p>
              </div>
            </div>

            {/* FEE STRUCTURE */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fee Structure
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {getFeeStructureName(
                  viewingAssignment.feeStructure,
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Code:{" "}
                {viewingAssignment
                  .feeStructure?.code ||
                  "—"}
              </p>

              <p className="mt-1 text-sm capitalize text-slate-500">
                Type:{" "}
                {viewingAssignment
                  .feeStructure
                  ?.feeType?.replaceAll(
                    "_",
                    " ",
                  ) || "—"}
              </p>
            </div>

            {/* SESSION */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Academic Session
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {viewingAssignment
                  .academicSession
                  ?.name || "—"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {viewingAssignment
                  .academicSession
                  ?.code || "—"}
              </p>
            </div>

            {/* NOTES */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {viewingAssignment.notes ||
                  "No notes."}
              </p>
            </div>

            {/* CREATED / UPDATED */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Created
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  viewingAssignment.createdAt,
                )}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Last updated
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  viewingAssignment.updatedAt,
                )}
              </p>
            </div>
          </div>
        </Drawer>
      )}

      {/* CANCEL CONFIRMATION */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle
                size={22}
              />
            </div>

            <h3 className="text-lg font-bold text-slate-950">
              Cancel fee
              assignment?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will mark the fee
              assignment as cancelled.
              The backend will reject
              cancellation if any payment
              already exists.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                {getStudentName(
                  cancelTarget.student,
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {getFeeStructureName(
                  cancelTarget.feeStructure,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {cancelTarget
                  .academicSession?.name ||
                  ""}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={() =>
                  setCancelTarget(null)
                }
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Keep
              </button>

              <button
                type="button"
                disabled={cancelling}
                onClick={
                  handleCancelAssignment
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Cancel Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
