import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../services/api";

const initialForm = {
  enrollment: "",
  feeStructure: "",
  startDate: "",
  endDate: "",
  autoRenew: false,
  notes: "",
};

const statusOptions = [
  "pending",
  "active",
  "expiring",
  "expired",
  "suspended",
  "cancelled",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition";

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value?._id || value?.id || "";
};

const getMessage = (
  error,
  fallback = "Something went wrong",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0] ||
    error?.message ||
    fallback
  );
};

const getStudentName = (student) => {
  if (!student) return "-";

  if (typeof student === "string") {
    return student;
  }

  const fullName = `${student?.firstName || ""} ${
    student?.lastName || ""
  }`.trim();

  return (
    fullName ||
    student?.name ||
    student?.email ||
    "-"
  );
};

const getStudentCode = (student) => {
  if (!student || typeof student === "string") {
    return "";
  }

  return student?.userId || "";
};

const getEnrollmentStudent = (enrollment) => {
  return (
    enrollment?.student ||
    enrollment?.studentId ||
    enrollment?.user ||
    null
  );
};

const getEnrollmentSession = (enrollment) => {
  return (
    enrollment?.academicSession ||
    enrollment?.academicSessionId ||
    enrollment?.session ||
    null
  );
};

const getEnrollmentProgram = (enrollment) => {
  return (
    enrollment?.program ||
    enrollment?.programId ||
    null
  );
};

const getEnrollmentClass = (enrollment) => {
  return (
    enrollment?.class ||
    enrollment?.classId ||
    null
  );
};

const getEnrollmentSection = (enrollment) => {
  return (
    enrollment?.section ||
    enrollment?.sectionId ||
    null
  );
};

const getFeeStructureSession = (feeStructure) => {
  return (
    feeStructure?.academicSession ||
    feeStructure?.academicSessionId ||
    null
  );
};

const getFeeStructureProgram = (feeStructure) => {
  return (
    feeStructure?.program ||
    feeStructure?.programId ||
    null
  );
};

const getFeeStructureClass = (feeStructure) => {
  return (
    feeStructure?.class ||
    feeStructure?.classId ||
    null
  );
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const getStatusClass = (status) => {
  switch (status) {
    case "pending":
      return "bg-blue-50 text-blue-700";

    case "active":
      return "bg-emerald-50 text-emerald-700";

    case "expiring":
      return "bg-yellow-50 text-yellow-700";

    case "expired":
      return "bg-amber-50 text-amber-700";

    case "suspended":
      return "bg-orange-50 text-orange-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getStatusLabel = (status) => {
  if (!status) return "-";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

function Memberships() {
  const [memberships, setMemberships] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [enrollmentFilter, setEnrollmentFilter] = useState("");
  const [feeStructureFilter, setFeeStructureFilter] =
    useState("");
  const [autoRenewFilter, setAutoRenewFilter] =
    useState("");

  const [page, setPage] = useState(1);

  const limit = 10;

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [modal, setModal] = useState(null);
  const [selectedMembership, setSelectedMembership] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  // ============================================================
  // LOAD OPTIONS
  // ============================================================

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setFormError("");

      const [
        enrollmentsResponse,
        feeStructuresResponse,
      ] = await Promise.all([
        api.get("/enrollments", {
          params: {
            page: 1,
            limit: 100,
          },
        }),

        api.get("/fee-structures", {
          params: {
            page: 1,
            limit: 100,
            status: "active",
          },
        }),
      ]);

      // --------------------------------------------------------
      // ENROLLMENTS
      // --------------------------------------------------------

      const enrollmentPayload =
        enrollmentsResponse?.data;

      const enrollmentItems =
        Array.isArray(
          enrollmentPayload?.enrollments,
        )
          ? enrollmentPayload.enrollments
          : Array.isArray(
                enrollmentPayload?.data,
              )
            ? enrollmentPayload.data
            : Array.isArray(
                  enrollmentPayload?.items,
                )
              ? enrollmentPayload.items
              : Array.isArray(
                    enrollmentPayload,
                  )
                ? enrollmentPayload
                : [];

      // --------------------------------------------------------
      // FEE STRUCTURES
      // --------------------------------------------------------

      const feeStructurePayload =
        feeStructuresResponse?.data;

      const feeStructureItems =
        Array.isArray(
          feeStructurePayload?.feeStructures,
        )
          ? feeStructurePayload.feeStructures
          : Array.isArray(
                feeStructurePayload?.data,
              )
            ? feeStructurePayload.data
            : Array.isArray(
                  feeStructurePayload?.items,
                )
              ? feeStructurePayload.items
              : Array.isArray(
                    feeStructurePayload,
                  )
                ? feeStructurePayload
                : [];

      /*
       * Only active enrollments should be available
       * for creating a new membership.
       */
      const activeEnrollments =
        enrollmentItems.filter(
          (item) =>
            item?.status === "active",
        );

      const activeFeeStructures =
        feeStructureItems.filter(
          (item) =>
            item?.status === "active",
        );

      setEnrollments(activeEnrollments);
      setFeeStructures(activeFeeStructures);

      console.log(
        "Membership enrollments:",
        activeEnrollments,
      );

      console.log(
        "Membership fee structures:",
        activeFeeStructures,
      );
    } catch (err) {
      console.error(
        "Membership options error:",
        err,
      );

      setEnrollments([]);
      setFeeStructures([]);

      setFormError(
        getMessage(
          err,
          "Unable to load enrollments and fee structures.",
        ),
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  // ============================================================
  // LOAD MEMBERSHIPS
  // ============================================================

  const loadMemberships = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (enrollmentFilter) {
        params.enrollment =
          enrollmentFilter;
      }

      if (feeStructureFilter) {
        params.feeStructure =
          feeStructureFilter;
      }

      if (autoRenewFilter !== "") {
        params.autoRenew =
          autoRenewFilter;
      }

      const response = await api.get(
        "/memberships",
        {
          params,
        },
      );

      const payload = response?.data;

      const items = Array.isArray(
        payload?.data,
      )
        ? payload.data
        : Array.isArray(
              payload?.memberships,
            )
          ? payload.memberships
          : Array.isArray(
                payload?.items,
              )
            ? payload.items
            : Array.isArray(payload)
              ? payload
              : [];

      setMemberships(items);

      const serverPagination =
        payload?.pagination || {};

      const total =
        Number(
          serverPagination?.total ??
            payload?.total ??
            payload?.count ??
            items.length,
        ) || 0;

      const currentPage =
        Number(
          serverPagination?.page ??
            payload?.page ??
            page,
        ) || page;

      const currentLimit =
        Number(
          serverPagination?.limit ??
            payload?.limit ??
            limit,
        ) || limit;

      const pages =
        Number(
          serverPagination?.totalPages ??
            serverPagination?.pages ??
            payload?.totalPages ??
            payload?.pages ??
            Math.max(
              1,
              Math.ceil(
                total / currentLimit,
              ),
            ),
        ) || 1;

      setPagination({
        page: currentPage,
        limit: currentLimit,
        total,
        pages,
      });
    } catch (err) {
      console.error(
        "Membership load error:",
        err,
      );

      setMemberships([]);

      setError(
        getMessage(
          err,
          "Unable to load memberships.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadMemberships();
  }, [
    page,
    statusFilter,
    enrollmentFilter,
    feeStructureFilter,
    autoRenewFilter,
  ]);

  // ============================================================
  // SEARCH DEBOUNCE
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
        return;
      }

      loadMemberships();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // ============================================================
  // FORM
  // ============================================================

  const resetForm = () => {
    setForm(initialForm);
    setFormError("");
  };

  const closeModal = () => {
    if (saving) return;

    setModal(null);
    setSelectedMembership(null);
    resetForm();
  };

  const openCreate = async () => {
    resetForm();
    setModal("create");

    if (
      enrollments.length === 0 ||
      feeStructures.length === 0
    ) {
      await loadOptions();
    }
  };

  const openView = (membership) => {
    setSelectedMembership(membership);
    setModal("view");
  };

  const openEdit = (membership) => {
    setSelectedMembership(membership);

    setForm({
      enrollment: getId(
        membership?.enrollment,
      ),

      feeStructure: getId(
        membership?.feeStructure,
      ),

      startDate: toDateInputValue(
        membership?.startDate,
      ),

      endDate: toDateInputValue(
        membership?.endDate,
      ),

      autoRenew: Boolean(
        membership?.autoRenew,
      ),

      notes: membership?.notes || "",
    });

    setFormError("");
    setModal("edit");
  };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // ============================================================
  // SELECTED ENROLLMENT
  // ============================================================

  const selectedEnrollment = useMemo(() => {
    return enrollments.find(
      (item) =>
        getId(item) ===
        form.enrollment,
    );
  }, [enrollments, form.enrollment]);

  // ============================================================
  // AVAILABLE FEE STRUCTURES
  // ============================================================

  const availableFeeStructures =
    useMemo(() => {
      if (!selectedEnrollment) {
        return [];
      }

      const sessionId = getId(
        getEnrollmentSession(
          selectedEnrollment,
        ),
      );

      const programId = getId(
        getEnrollmentProgram(
          selectedEnrollment,
        ),
      );

      const classId = getId(
        getEnrollmentClass(
          selectedEnrollment,
        ),
      );

      return feeStructures.filter(
        (fee) => {
          const feeSessionId =
            getId(
              getFeeStructureSession(
                fee,
              ),
            );

          const feeProgramId =
            getId(
              getFeeStructureProgram(
                fee,
              ),
            );

          const feeClass =
            getFeeStructureClass(
              fee,
            );

          const feeClassId =
            getId(feeClass);

          const sessionMatches =
            !sessionId ||
            !feeSessionId ||
            sessionId ===
              feeSessionId;

          const programMatches =
            !programId ||
            !feeProgramId ||
            programId ===
              feeProgramId;

          /*
           * Fee Structure class can be null.
           *
           * null means it applies to
           * the whole program.
           */
          const classMatches =
            !feeClassId ||
            !classId ||
            feeClassId ===
              classId;

          return (
            sessionMatches &&
            programMatches &&
            classMatches
          );
        },
      );
    }, [
      selectedEnrollment,
      feeStructures,
    ]);

  const selectedFeeStructure =
    useMemo(() => {
      return feeStructures.find(
        (item) =>
          getId(item) ===
          form.feeStructure,
      );
    }, [
      feeStructures,
      form.feeStructure,
    ]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateForm = () => {
    if (!form.enrollment) {
      return "Please select an active enrollment.";
    }

    if (!form.feeStructure) {
      return "Please select a fee structure.";
    }

    if (!form.startDate) {
      return "Start date is required.";
    }

    if (!form.endDate) {
      return "End date is required.";
    }

    const start = new Date(
      form.startDate,
    );

    const end = new Date(
      form.endDate,
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return "Invalid start or end date.";
    }

    if (end <= start) {
      return "End date must be after start date.";
    }

    return "";
  };

  // ============================================================
  // CREATE / UPDATE
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError,
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT
       *
       * Student
       * Academic Session
       * Membership Name
       * Membership Code
       * Amount
       *
       * are NOT sent from frontend.
       *
       * Backend derives them from:
       *
       * Enrollment + Fee Structure
       */

      const payload = {
        enrollment:
          form.enrollment,

        feeStructure:
          form.feeStructure,

        startDate:
          form.startDate,

        endDate:
          form.endDate,

        autoRenew:
          Boolean(form.autoRenew),

        notes:
          form.notes.trim(),
      };

      if (modal === "create") {
        await api.post(
          "/memberships",
          payload,
        );

        setSuccessMessage(
          "Membership created successfully.",
        );
      }

      if (
        modal === "edit" &&
        selectedMembership?._id
      ) {
        /*
         * Backend update only accepts:
         *
         * startDate
         * endDate
         * autoRenew
         * notes
         *
         * Enrollment and Fee Structure are
         * intentionally not changed.
         */

        const updatePayload = {
          startDate:
            form.startDate,

          endDate:
            form.endDate,

          autoRenew:
            Boolean(form.autoRenew),

          notes:
            form.notes.trim(),
        };

        await api.put(
          `/memberships/${selectedMembership._id}`,
          updatePayload,
        );

        setSuccessMessage(
          "Membership updated successfully.",
        );
      }

      closeModal();

      await loadMemberships();
    } catch (err) {
      console.error(
        "Membership save error:",
        err,
      );

      setFormError(
        getMessage(
          err,
          "Unable to save membership.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SUSPEND
  // ============================================================

  const suspendMembership = async (
    membership,
  ) => {
    if (!membership?._id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to suspend this membership?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.put(
        `/memberships/${membership._id}/suspend`,
      );

      setSuccessMessage(
        "Membership suspended successfully.",
      );

      await loadMemberships();
    } catch (err) {
      console.error(
        "Suspend membership error:",
        err,
      );

      setError(
        getMessage(
          err,
          "Unable to suspend membership.",
        ),
      );
    }
  };

  // ============================================================
  // CANCEL
  // ============================================================

  const cancelMembership = async (
    membership,
  ) => {
    if (!membership?._id) {
      return;
    }

    const reason =
      window.prompt(
        "Enter cancellation reason:",
      );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setError(
        "Cancellation reason is required.",
      );
      return;
    }

    try {
      setError("");

      await api.put(
        `/memberships/${membership._id}/cancel`,
        {
          cancellationReason:
            reason.trim(),
        },
      );

      setSuccessMessage(
        "Membership cancelled successfully.",
      );

      await loadMemberships();
    } catch (err) {
      console.error(
        "Cancel membership error:",
        err,
      );

      setError(
        getMessage(
          err,
          "Unable to cancel membership.",
        ),
      );
    }
  };

  // ============================================================
  // FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setEnrollmentFilter("");
    setFeeStructureFilter("");
    setAutoRenewFilter("");
    setPage(1);
  };

  // ============================================================
  // DISPLAY HELPERS
  // ============================================================

  const getDisplayStudent = (
    membership,
  ) => {
    const enrollment =
      membership?.enrollment;

    const student =
      getEnrollmentStudent(
        enrollment,
      ) ||
      membership?.student;

    return getStudentName(
      student,
    );
  };

  const getDisplayStudentCode = (
    membership,
  ) => {
    const enrollment =
      membership?.enrollment;

    const student =
      getEnrollmentStudent(
        enrollment,
      ) ||
      membership?.student;

    return getStudentCode(
      student,
    );
  };

  const getDisplaySession = (
    membership,
  ) => {
    const session =
      getEnrollmentSession(
        membership?.enrollment,
      ) ||
      membership?.academicSession;

    if (
      session &&
      typeof session === "object"
    ) {
      return (
        session?.name ||
        session?.code ||
        "-"
      );
    }

    return getId(session) || "-";
  };

  const getDisplayProgram = (
    membership,
  ) => {
    const program =
      getEnrollmentProgram(
        membership?.enrollment,
      );

    if (
      program &&
      typeof program === "object"
    ) {
      return (
        program?.name ||
        program?.code ||
        "-"
      );
    }

    return getId(program) || "-";
  };

  const getDisplayClass = (
    membership,
  ) => {
    const classValue =
      getEnrollmentClass(
        membership?.enrollment,
      );

    if (
      classValue &&
      typeof classValue === "object"
    ) {
      return (
        classValue?.name ||
        classValue?.code ||
        "-"
      );
    }

    return getId(classValue) || "-";
  };

  const getDisplaySection = (
    membership,
  ) => {
    const section =
      getEnrollmentSection(
        membership?.enrollment,
      );

    if (
      section &&
      typeof section === "object"
    ) {
      return (
        section?.name ||
        section?.code ||
        "-"
      );
    }

    return getId(section) || "-";
  };

  const getDisplayFeeStructure = (
    membership,
  ) => {
    const fee =
      membership?.feeStructure;

    if (
      fee &&
      typeof fee === "object"
    ) {
      return (
        fee?.name ||
        fee?.code ||
        "-"
      );
    }

    return getId(fee) || "-";
  };

  const getEnrollmentLabel = (
    enrollment,
  ) => {
    const student =
      getEnrollmentStudent(
        enrollment,
      );

    const studentName =
      getStudentName(student);

    const studentCode =
      getStudentCode(student);

    const session =
      getEnrollmentSession(
        enrollment,
      );

    const sessionName =
      typeof session === "object"
        ? session?.name ||
          session?.code ||
          ""
        : "";

    const classValue =
      getEnrollmentClass(
        enrollment,
      );

    const className =
      typeof classValue === "object"
        ? classValue?.name ||
          classValue?.code ||
          ""
        : "";

    const section =
      getEnrollmentSection(
        enrollment,
      );

    const sectionName =
      typeof section === "object"
        ? section?.name ||
          section?.code ||
          ""
        : "";

    const parts = [
      studentName,
      studentCode,
      sessionName,
      className,
      sectionName,
    ].filter(Boolean);

    return (
      parts.join(" — ") ||
      getId(enrollment)
    );
  };

  const availableEnrollments =
    useMemo(
      () => enrollments || [],
      [enrollments],
    );

  const availableFeeStructuresForFilter =
    useMemo(
      () => feeStructures || [],
      [feeStructures],
    );

  const totalPages = Math.max(
    1,
    pagination.pages || 1,
  );

  const showingText =
    pagination.total > 0
      ? `Showing ${
          (page - 1) * limit + 1
        }–${Math.min(
          page * limit,
          pagination.total,
        )} of ${
          pagination.total
        }`
      : "No memberships";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Memberships
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage memberships created from
            enrolled students and active fee
            structures.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              loadMemberships();
              loadOptions();
            }}
            className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-800`}
          >
            <Plus size={17} />
            Add Membership
          </button>
        </div>
      </div>

      {/* SUCCESS */}

      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>
            {successMessage}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccessMessage("")
            }
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/* SEARCH */}

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search memberships..."
              className={`${inputClass} pl-10`}
            />
          </div>

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              );
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">
              All statuses
            </option>

            {statusOptions.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {getStatusLabel(
                    status,
                  )}
                </option>
              ),
            )}
          </select>

          {/* ENROLLMENT FILTER */}

          <select
            value={enrollmentFilter}
            onChange={(event) => {
              setEnrollmentFilter(
                event.target.value,
              );
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">
              All enrollments
            </option>

            {availableEnrollments.map(
              (enrollment) => {
                const id =
                  getId(enrollment);

                if (!id) {
                  return null;
                }

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {getEnrollmentLabel(
                      enrollment,
                    )}
                  </option>
                );
              },
            )}
          </select>

          {/* FEE STRUCTURE FILTER */}

          <select
            value={feeStructureFilter}
            onChange={(event) => {
              setFeeStructureFilter(
                event.target.value,
              );
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">
              All fee structures
            </option>

            {availableFeeStructuresForFilter.map(
              (fee) => {
                const id =
                  getId(fee);

                if (!id) {
                  return null;
                }

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {fee?.name ||
                      fee?.code ||
                      "-"}
                  </option>
                );
              },
            )}
          </select>

          {/* AUTO RENEW */}

          <div className="flex gap-2">
            <select
              value={autoRenewFilter}
              onChange={(event) => {
                setAutoRenewFilter(
                  event.target.value,
                );
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">
                Auto Renew
              </option>

              <option value="true">
                Enabled
              </option>

              <option value="false">
                Disabled
              </option>
            </select>

            {(search ||
              statusFilter ||
              enrollmentFilter ||
              feeStructureFilter ||
              autoRenewFilter) && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50"
                title="Clear filters"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-sm text-slate-500">
              Loading memberships...
            </div>
          </div>
        ) : memberships.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3">
              <Search
                size={22}
                className="text-slate-400"
              />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              No memberships found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              There are no memberships
              matching the current
              filters. Create a
              membership from an
              active enrollment and
              fee structure.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Membership
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fee Structure
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Validity
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {memberships.map(
                    (membership) => {
                      const status =
                        membership?.status ||
                        "pending";

                      return (
                        <tr
                          key={
                            membership?._id
                          }
                          className="hover:bg-slate-50"
                        >
                          {/* STUDENT */}

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {getDisplayStudent(
                                membership,
                              )}
                            </div>

                            {getDisplayStudentCode(
                              membership,
                            ) && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {getDisplayStudentCode(
                                  membership,
                                )}
                              </div>
                            )}
                          </td>

                          {/* MEMBERSHIP */}

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {membership?.membershipName ||
                                "-"}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {membership?.membershipCode ||
                                "-"}
                            </div>
                          </td>

                          {/* FEE STRUCTURE */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {getDisplayFeeStructure(
                              membership,
                            )}
                          </td>

                          {/* SESSION */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {getDisplaySession(
                              membership,
                            )}
                          </td>

                          {/* VALIDITY */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            <div>
                              {formatDate(
                                membership?.startDate,
                              )}
                            </div>

                            <div className="text-xs text-slate-400">
                              to{" "}
                              {formatDate(
                                membership?.endDate,
                              )}
                            </div>
                          </td>

                          {/* AMOUNT */}

                          <td className="px-5 py-4 text-sm font-medium text-slate-900">
                            ₹
                            {Number(
                              membership?.amount ||
                                0,
                            ).toLocaleString(
                              "en-IN",
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                status,
                              )}`}
                            >
                              {getStatusLabel(
                                status,
                              )}
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              {/* VIEW */}

                              <button
                                type="button"
                                onClick={() =>
                                  openView(
                                    membership,
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title="View"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              {/* EDIT */}

                              {status !==
                                "cancelled" &&
                                status !==
                                  "expired" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEdit(
                                        membership,
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    title="Edit"
                                  >
                                    <Pencil
                                      size={16}
                                    />
                                  </button>
                                )}

                              {/* SUSPEND */}

                              {status ===
                                "active" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    suspendMembership(
                                      membership,
                                    )
                                  }
                                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50"
                                >
                                  Suspend
                                </button>
                              )}

                              {/* CANCEL */}

                              {status !==
                                "cancelled" &&
                                status !==
                                  "expired" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cancelMembership(
                                        membership,
                                      )
                                    }
                                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {showingText}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (previous) =>
                        Math.max(
                          1,
                          previous - 1,
                        ),
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-slate-500">
                  Page {page} of{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (previous) =>
                        Math.min(
                          totalPages,
                          previous + 1,
                        ),
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================
          CREATE / EDIT MODAL
      ======================================================== */}

      {(modal === "create" ||
        modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modal ===
                  "create"
                    ? "Create Membership"
                    : "Edit Membership"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {modal ===
                  "create"
                    ? "Create a membership from an active enrollment and fee structure."
                    : "Update membership validity and renewal settings."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6 p-6"
            >
              {/* ERROR */}

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {loadingOptions ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Loading enrollments and fee structures...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* CREATE FIELDS */}

                  {modal ===
                    "create" && (
                    <>
                      {/* ENROLLMENT */}

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Active Enrollment{" "}
                          <span className="text-red-500">
                            *
                          </span>
                        </label>

                        <select
                          name="enrollment"
                          value={
                            form.enrollment
                          }
                          onChange={
                            handleChange
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="">
                            Select active enrollment
                          </option>

                          {availableEnrollments.map(
                            (
                              enrollment,
                            ) => {
                              const id =
                                getId(
                                  enrollment,
                                );

                              if (
                                !id
                              ) {
                                return null;
                              }

                              return (
                                <option
                                  key={
                                    id
                                  }
                                  value={
                                    id
                                  }
                                >
                                  {getEnrollmentLabel(
                                    enrollment,
                                  )}
                                </option>
                              );
                            },
                          )}
                        </select>

                        {availableEnrollments.length ===
                          0 && (
                          <p className="mt-2 text-xs text-red-600">
                            No active enrollments are available. Approve an admission first.
                          </p>
                        )}
                      </div>

                      {/* ENROLLMENT SUMMARY */}

                      {selectedEnrollment && (
                        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-400">
                              Student
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {getStudentName(
                                getEnrollmentStudent(
                                  selectedEnrollment,
                                ),
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Session
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {getId(
                                getEnrollmentSession(
                                  selectedEnrollment,
                                ),
                              ) &&
                              typeof getEnrollmentSession(
                                selectedEnrollment,
                              ) ===
                                "object"
                                ? getEnrollmentSession(
                                    selectedEnrollment,
                                  )?.name ||
                                  getEnrollmentSession(
                                    selectedEnrollment,
                                  )?.code ||
                                  "-"
                                : "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Class
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {getId(
                                getEnrollmentClass(
                                  selectedEnrollment,
                                ),
                              ) &&
                              typeof getEnrollmentClass(
                                selectedEnrollment,
                              ) ===
                                "object"
                                ? getEnrollmentClass(
                                    selectedEnrollment,
                                  )?.name ||
                                  getEnrollmentClass(
                                    selectedEnrollment,
                                  )?.code ||
                                  "-"
                                : "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Section
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {getId(
                                getEnrollmentSection(
                                  selectedEnrollment,
                                ),
                              ) &&
                              typeof getEnrollmentSection(
                                selectedEnrollment,
                              ) ===
                                "object"
                                ? getEnrollmentSection(
                                    selectedEnrollment,
                                  )?.name ||
                                  getEnrollmentSection(
                                    selectedEnrollment,
                                  )?.code ||
                                  "-"
                                : "-"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* FEE STRUCTURE */}

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Fee Structure{" "}
                          <span className="text-red-500">
                            *
                          </span>
                        </label>

                        <select
                          name="feeStructure"
                          value={
                            form.feeStructure
                          }
                          onChange={
                            handleChange
                          }
                          disabled={
                            !selectedEnrollment
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="">
                            {!selectedEnrollment
                              ? "Select enrollment first"
                              : availableFeeStructures.length ===
                                  0
                                ? "No matching fee structure"
                                : "Select fee structure"}
                          </option>

                          {availableFeeStructures.map(
                            (
                              fee,
                            ) => {
                              const id =
                                getId(
                                  fee,
                                );

                              if (
                                !id
                              ) {
                                return null;
                              }

                              return (
                                <option
                                  key={
                                    id
                                  }
                                  value={
                                    id
                                  }
                                >
                                  {fee?.name ||
                                    fee?.code ||
                                    "-"}{" "}
                                  — ₹
                                  {Number(
                                    fee?.amount ||
                                      0,
                                  ).toLocaleString(
                                    "en-IN",
                                  )}
                                </option>
                              );
                            },
                          )}
                        </select>
                      </div>

                      {/* FEE PREVIEW */}

                      {selectedFeeStructure && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs text-emerald-600">
                                Selected Fee Structure
                              </p>

                              <p className="mt-1 font-semibold text-emerald-900">
                                {selectedFeeStructure?.name ||
                                  selectedFeeStructure?.code ||
                                  "-"}
                              </p>

                              {selectedFeeStructure?.feeType && (
                                <p className="mt-1 text-xs text-emerald-700">
                                  Fee Type:{" "}
                                  {
                                    selectedFeeStructure.feeType
                                  }
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs text-emerald-600">
                                Membership Amount
                              </p>

                              <p className="mt-1 text-xl font-semibold text-emerald-900">
                                ₹
                                {Number(
                                  selectedFeeStructure?.amount ||
                                    0,
                                ).toLocaleString(
                                  "en-IN",
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* EDIT INFO */}

                  {modal ===
                    "edit" &&
                    selectedMembership && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-400">
                              Student
                            </p>

                            <p className="mt-1 font-medium text-slate-900">
                              {getDisplayStudent(
                                selectedMembership,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Membership Code
                            </p>

                            <p className="mt-1 font-medium text-slate-900">
                              {selectedMembership?.membershipCode ||
                                "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Membership
                            </p>

                            <p className="mt-1 font-medium text-slate-900">
                              {selectedMembership?.membershipName ||
                                "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Amount
                            </p>

                            <p className="mt-1 font-medium text-slate-900">
                              ₹
                              {Number(
                                selectedMembership?.amount ||
                                  0,
                              ).toLocaleString(
                                "en-IN",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* DATES */}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* START DATE */}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Start Date{" "}
                        <span className="text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        type="date"
                        name="startDate"
                        value={
                          form.startDate
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      />
                    </div>

                    {/* END DATE */}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        End Date{" "}
                        <span className="text-red-500">
                          *
                        </span>
                      </label>

                      <input
                        type="date"
                        name="endDate"
                        min={
                          form.startDate ||
                          undefined
                        }
                        value={
                          form.endDate
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      />
                    </div>
                  </div>

                  {/* AUTO RENEW */}

                  <div className="flex items-center rounded-xl border border-slate-200 px-4 py-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="autoRenew"
                        checked={
                          form.autoRenew
                        }
                        onChange={
                          handleChange
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />

                      <span>
                        <span className="block text-sm font-medium text-slate-700">
                          Auto Renew
                        </span>

                        <span className="block text-xs text-slate-400">
                          Enable automatic renewal handling.
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* NOTES */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Notes
                    </label>

                    <textarea
                      name="notes"
                      value={
                        form.notes
                      }
                      onChange={
                        handleChange
                      }
                      rows={4}
                      placeholder="Optional membership notes..."
                      className={
                        inputClass
                      }
                    />
                  </div>
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingOptions
                  }
                  className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {saving
                    ? "Saving..."
                    : modal ===
                        "create"
                      ? "Create Membership"
                      : "Update Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW MODAL
      ======================================================== */}

      {modal ===
        "view" &&
        selectedMembership && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Membership Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Complete membership information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                {/* STUDENT */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Student
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplayStudent(
                      selectedMembership,
                    )}
                  </p>

                  {getDisplayStudentCode(
                    selectedMembership,
                  ) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {
                        getDisplayStudentCode(
                          selectedMembership,
                        )
                      }
                    </p>
                  )}
                </div>

                {/* SESSION */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Academic Session
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplaySession(
                      selectedMembership,
                    )}
                  </p>
                </div>

                {/* PROGRAM */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Program
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplayProgram(
                      selectedMembership,
                    )}
                  </p>
                </div>

                {/* CLASS */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Class
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplayClass(
                      selectedMembership,
                    )}
                  </p>
                </div>

                {/* SECTION */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Section
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplaySection(
                      selectedMembership,
                    )}
                  </p>
                </div>

                {/* MEMBERSHIP */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Membership Name
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedMembership?.membershipName ||
                      "-"}
                  </p>
                </div>

                {/* CODE */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Membership Code
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedMembership?.membershipCode ||
                      "-"}
                  </p>
                </div>

                {/* FEE STRUCTURE */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Fee Structure
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {getDisplayFeeStructure(
                      selectedMembership,
                    )}
                  </p>
                </div>

                {/* START */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Start Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(
                      selectedMembership?.startDate,
                    )}
                  </p>
                </div>

                {/* END */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    End Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(
                      selectedMembership?.endDate,
                    )}
                  </p>
                </div>

                {/* AMOUNT */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Amount
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    ₹
                    {Number(
                      selectedMembership?.amount ||
                        0,
                    ).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>

                {/* STATUS */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                      selectedMembership?.status ||
                        "pending",
                    )}`}
                  >
                    {getStatusLabel(
                      selectedMembership?.status ||
                        "pending",
                    )}
                  </span>
                </div>

                {/* AUTO RENEW */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Auto Renew
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedMembership?.autoRenew
                      ? "Enabled"
                      : "Disabled"}
                  </p>
                </div>

                {/* CREATED */}

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Created At
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(
                      selectedMembership?.createdAt,
                    )}
                  </p>
                </div>

                {/* NOTES */}

                <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs text-slate-400">
                    Notes
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {selectedMembership?.notes ||
                      "No notes added."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Memberships;