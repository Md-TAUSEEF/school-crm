import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Users,
  GraduationCap,
  CalendarDays,
  Building2,
  Hash,
  DoorOpen,
  UserRound,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { api, getMessage } from "../../services/api";

const PAGE_SIZE = 10;

const emptyClassForm = {
  program: "",
  academicSession: "",
  name: "",
  code: "",
  description: "",
  status: "active",
};

const emptySectionForm = {
  name: "",
  code: "",
  capacity: "",
  roomNumber: "",
  status: "active",
};

const getList = (response, key) => {
  const data = response?.data;

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data?.[key])) {
    return data.data[key];
  }

  if (Array.isArray(data?.data?.items)) {
    return data.data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
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

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  if (student.fullName) {
    return student.fullName;
  }

  return `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim() || "Unknown Student";
};

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return value._id || value.id || "";
  }

  return value;
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    getMessage?.(error) ||
    fallback
  );
};

const DetailItem = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {Icon ? <Icon size={14} /> : null}
        <span>{label}</span>
      </div>

      <p className="break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {status || "—"}
    </span>
  );
};

const Modal = ({ children, onClose, title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>

            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-85px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function Classes() {
  /* =========================================================
     CLASS STATES
  ========================================================= */

  const [classes, setClasses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [classModal, setClassModal] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [classForm, setClassForm] = useState(emptyClassForm);

  /* =========================================================
     SECTION STATES
  ========================================================= */

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState("");

  const [sectionModal, setSectionModal] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [sectionForm, setSectionForm] =
    useState(emptySectionForm);

  const [sectionSubmitting, setSectionSubmitting] =
    useState(false);

  const [sectionDeletingId, setSectionDeletingId] =
    useState("");

  const [sectionStudents, setSectionStudents] = useState([]);
  const [sectionStudentsLoading, setSectionStudentsLoading] =
    useState(false);
  const [sectionStudentsError, setSectionStudentsError] =
    useState("");

  /* =========================================================
     INITIAL DATA
  ========================================================= */

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/classes");

      setClasses(getList(response, "classes"));
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to fetch classes")
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);

      const [programResponse, sessionResponse] =
        await Promise.all([
          api.get("/programs"),
          api.get("/academic-sessions"),
        ]);

      setPrograms(getList(programResponse, "programs"));
      setAcademicSessions(
        getList(sessionResponse, "academicSessions")
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Failed to fetch program and academic session data"
        )
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchOptions();
  }, []);

  /* =========================================================
     CLASS FILTERING
  ========================================================= */

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return classes.filter((item) => {
      const programId = getId(item.program);
      const sessionId = getId(item.academicSession);

      const matchesSearch =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.code?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword) ||
        item.program?.name?.toLowerCase().includes(keyword) ||
        item.academicSession?.name
          ?.toLowerCase()
          .includes(keyword);

      const matchesStatus =
        !statusFilter || item.status === statusFilter;

      const matchesProgram =
        !programFilter || programId === programFilter;

      const matchesSession =
        !sessionFilter || sessionId === sessionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProgram &&
        matchesSession
      );
    });
  }, [
    classes,
    search,
    statusFilter,
    programFilter,
    sessionFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClasses.length / PAGE_SIZE)
  );

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredClasses.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredClasses, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* =========================================================
     CLASS MODAL
  ========================================================= */

  const openCreateClass = () => {
    setClassForm(emptyClassForm);
    setSelectedClass(null);
    setClassModal("create");
    setError("");
    setSuccess("");
  };

  const openEditClass = async (item) => {
    try {
      setError("");

      const response = await api.get(`/classes/${item._id}`);

      const data = response?.data?.class || item;

      setSelectedClass(data);

      setClassForm({
        program: getId(data.program),
        academicSession: getId(data.academicSession),
        name: data.name || "",
        code: data.code || "",
        description: data.description || "",
        status: data.status || "active",
      });

      setClassModal("edit");
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to fetch class details")
      );
    }
  };

  const openViewClass = async (item) => {
    try {
      setError("");
      setSectionsError("");

      const response = await api.get(`/classes/${item._id}`);

      const data = response?.data?.class || item;

      setSelectedClass(data);
      setClassModal("view");

      await fetchSections(
        item._id,
        getId(data.academicSession)
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to fetch class details")
      );
    }
  };

  const closeClassModal = () => {
    setClassModal(null);
    setSelectedClass(null);
    setSections([]);
    setSectionsError("");
  };

  const handleClassChange = (event) => {
    const { name, value } = event.target;

    setClassForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     CREATE / UPDATE CLASS
  ========================================================= */

  const handleClassSubmit = async (event) => {
    event.preventDefault();

    if (
      !classForm.program ||
      !classForm.academicSession ||
      !classForm.name.trim() ||
      !classForm.code.trim()
    ) {
      setError(
        "Program, academic session, class name and code are required"
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        program: classForm.program,
        academicSession: classForm.academicSession,
        name: classForm.name.trim(),
        code: classForm.code.trim().toUpperCase(),
        description: classForm.description.trim(),
        status: classForm.status,
      };

      if (classModal === "edit" && selectedClass?._id) {
        await api.put(
          `/classes/${selectedClass._id}`,
          payload
        );

        setSuccess("Class updated successfully");
      } else {
        await api.post("/classes", payload);

        setSuccess("Class created successfully");
      }

      await fetchClasses();

      setClassModal(null);
      setSelectedClass(null);
      setClassForm(emptyClassForm);
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to save class")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     DELETE CLASS
  ========================================================= */

  const handleDeleteClass = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(item._id);
      setError("");
      setSuccess("");

      await api.delete(`/classes/${item._id}`);

      setSuccess("Class deleted successfully");

      await fetchClasses();
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to delete class")
      );
    } finally {
      setDeletingId("");
    }
  };

  /* =========================================================
     SECTION API
  ========================================================= */

  const fetchSections = async (
    classId,
    academicSessionId
  ) => {
    try {
      setSectionsLoading(true);
      setSectionsError("");

      let url = `/sections?class=${classId}`;

      if (academicSessionId) {
        url += `&academicSession=${academicSessionId}`;
      }

      const response = await api.get(url);

      const sectionList = getList(response, "sections");

      /**
       * Fetch real student counts from:
       * GET /sections/:id/students
       *
       * No Student Management API is used.
       */
      const sectionsWithCounts = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const studentsResponse = await api.get(
              `/sections/${section._id}/students`
            );

            const data = studentsResponse?.data || {};

            return {
              ...section,
              studentCount: Number(data.count || 0),
              availableSeats:
                data.availableSeats ?? null,
            };
          } catch (err) {
            console.error(
              `Failed to fetch students for section ${section._id}`,
              err
            );

            return {
              ...section,
              studentCount: 0,
              availableSeats:
                section.capacity !== null &&
                section.capacity !== undefined
                  ? Number(section.capacity)
                  : null,
              countError: true,
            };
          }
        })
      );

      setSections(sectionsWithCounts);
    } catch (err) {
      setSectionsError(
        getErrorMessage(err, "Failed to fetch sections")
      );
      setSections([]);
    } finally {
      setSectionsLoading(false);
    }
  };

  /* =========================================================
     ADD SECTION
  ========================================================= */

  const openCreateSection = () => {
    if (!selectedClass?._id) return;

    setSectionForm(emptySectionForm);
    setSectionModal("create");
    setError("");
  };

  const openEditSection = (section) => {
    setSectionForm({
      name: section.name || "",
      code: section.code || "",
      capacity:
        section.capacity === null ||
        section.capacity === undefined
          ? ""
          : String(section.capacity),
      roomNumber: section.roomNumber || "",
      status: section.status || "active",
    });

    setSelectedSection(section);
    setSectionModal("edit");
    setError("");
  };

  const closeSectionModal = () => {
    setSectionModal(null);
    setSelectedSection(null);
    setSectionForm(emptySectionForm);
  };

  const handleSectionChange = (event) => {
    const { name, value } = event.target;

    setSectionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSectionSubmit = async (event) => {
    event.preventDefault();

    if (
      !sectionForm.name.trim() ||
      !sectionForm.code.trim()
    ) {
      setError("Section name and code are required");
      return;
    }

    if (!selectedClass?._id) {
      setError("Class information is missing");
      return;
    }

    try {
      setSectionSubmitting(true);
      setError("");
      setSuccess("");

      const academicSessionId = getId(
        selectedClass.academicSession
      );

      const payload = {
        class: selectedClass._id,
        academicSession: academicSessionId,
        name: sectionForm.name.trim(),
        code: sectionForm.code.trim().toUpperCase(),
        capacity:
          sectionForm.capacity === ""
            ? null
            : Number(sectionForm.capacity),
        roomNumber: sectionForm.roomNumber.trim(),
        status: sectionForm.status,
      };

      if (
        sectionModal === "edit" &&
        selectedSection?._id
      ) {
        await api.put(
          `/sections/${selectedSection._id}`,
          payload
        );

        setSuccess("Section updated successfully");
      } else {
        await api.post("/sections", payload);

        setSuccess("Section created successfully");
      }

      closeSectionModal();

      await fetchSections(
        selectedClass._id,
        academicSessionId
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to save section")
      );
    } finally {
      setSectionSubmitting(false);
    }
  };

  /* =========================================================
     DELETE SECTION
  ========================================================= */

  const handleDeleteSection = async (section) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${section.name}"?`
    );

    if (!confirmed) return;

    try {
      setSectionDeletingId(section._id);
      setError("");
      setSuccess("");

      await api.delete(`/sections/${section._id}`);

      setSuccess("Section deleted successfully");

      await fetchSections(
        selectedClass._id,
        getId(selectedClass.academicSession)
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to delete section")
      );
    } finally {
      setSectionDeletingId("");
    }
  };

  /* =========================================================
     SECTION STUDENTS
  ========================================================= */

  const openSectionView = async (section) => {
    try {
      setSelectedSection(section);
      setSectionModal("view");
      setSectionStudents([]);
      setSectionStudentsError("");
      setSectionStudentsLoading(true);

      const response = await api.get(
        `/sections/${section._id}/students`
      );

      const data = response?.data || {};

      setSelectedSection({
        ...section,
        ...(data.section || {}),
        studentCount: Number(data.count || 0),
        availableSeats: data.availableSeats ?? null,
      });

      setSectionStudents(
        Array.isArray(data.students)
          ? data.students
          : []
      );
    } catch (err) {
      setSectionStudentsError(
        getErrorMessage(
          err,
          "Failed to fetch section students"
        )
      );
    } finally {
      setSectionStudentsLoading(false);
    }
  };

  const closeSectionView = () => {
    setSectionModal(null);
    setSelectedSection(null);
    setSectionStudents([]);
    setSectionStudentsError("");
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Classes
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage classes, sections and active student
            assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateClass}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Class
        </button>
      </div>

      {/* =====================================================
          GLOBAL MESSAGES
      ===================================================== */}

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2
            className="mt-0.5 shrink-0"
            size={18}
          />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto text-emerald-500 hover:text-emerald-700"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search class..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <select
            value={programFilter}
            onChange={(event) => {
              setProgramFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">All Programs</option>

            {programs.map((program) => (
              <option
                key={program._id}
                value={program._id}
              >
                {program.name}
              </option>
            ))}
          </select>

          <select
            value={sessionFilter}
            onChange={(event) => {
              setSessionFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">
              All Academic Sessions
            </option>

            {academicSessions.map((session) => (
              <option
                key={session._id}
                value={session._id}
              >
                {session.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading classes...
            </div>
          </div>
        ) : paginatedClasses.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3">
              <GraduationCap
                size={24}
                className="text-slate-500"
              />
            </div>

            <h3 className="text-sm font-semibold text-slate-900">
              No classes found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No class records match your current filters.
              Create a class when you are ready.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Code
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Program
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Academic Session
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedClasses.map((item) => (
                    <tr
                      key={item._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.name}
                          </p>

                          {item.description ? (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item.code || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {item.program?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {item.academicSession?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openViewClass(item)
                            }
                            title="View"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditClass(item)
                            }
                            title="Edit"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            disabled={
                              deletingId === item._id
                            }
                            onClick={() =>
                              handleDeleteClass(item)
                            }
                            title="Delete"
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === item._id ? (
                              <Loader2
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedClasses.map((item) => (
                <div
                  key={item._id}
                  className="space-y-4 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {item.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.code || "No code"}
                      </p>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem
                      icon={GraduationCap}
                      label="Program"
                      value={item.program?.name}
                    />

                    <DetailItem
                      icon={CalendarDays}
                      label="Session"
                      value={item.academicSession?.name}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openViewClass(item)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditClass(item)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingId === item._id
                      }
                      onClick={() =>
                        handleDeleteClass(item)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {!loading && filteredClasses.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {(currentPage - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(
                currentPage * PAGE_SIZE,
                filteredClasses.length
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {filteredClasses.length}
            </span>{" "}
            classes
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.max(page - 1, 1)
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(page + 1, totalPages)
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          CREATE / EDIT CLASS MODAL
      ===================================================== */}

      {classModal === "create" ||
      classModal === "edit" ? (
        <Modal
          title={
            classModal === "edit"
              ? "Edit Class"
              : "Create Class"
          }
          subtitle="Create a class under a program and academic session."
          onClose={closeClassModal}
        >
          <form
            onSubmit={handleClassSubmit}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Program
                </label>

                <select
                  name="program"
                  value={classForm.program}
                  onChange={handleClassChange}
                  disabled={loadingOptions}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">
                    Select Program
                  </option>

                  {programs.map((program) => (
                    <option
                      key={program._id}
                      value={program._id}
                    >
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Academic Session
                </label>

                <select
                  name="academicSession"
                  value={classForm.academicSession}
                  onChange={handleClassChange}
                  disabled={loadingOptions}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">
                    Select Academic Session
                  </option>

                  {academicSessions.map((session) => (
                    <option
                      key={session._id}
                      value={session._id}
                    >
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Class Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={classForm.name}
                  onChange={handleClassChange}
                  placeholder="e.g. Class 6"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Class Code
                </label>

                <input
                  type="text"
                  name="code"
                  value={classForm.code}
                  onChange={handleClassChange}
                  placeholder="e.g. CLS6"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={classForm.description}
                  onChange={handleClassChange}
                  rows={4}
                  placeholder="Optional class description..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={classForm.status}
                  onChange={handleClassChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={closeClassModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={17} />
                )}

                {submitting
                  ? "Saving..."
                  : classModal === "edit"
                  ? "Update Class"
                  : "Create Class"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* =====================================================
          VIEW CLASS
      ===================================================== */}

      {classModal === "view" && selectedClass ? (
        <Modal
          title={selectedClass.name}
          subtitle={`${selectedClass.code || "No code"} • ${
            selectedClass.program?.name || "Program"
          }`}
          onClose={closeClassModal}
        >
          <div className="space-y-6">
            {/* CLASS INFO */}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailItem
                icon={GraduationCap}
                label="Program"
                value={selectedClass.program?.name}
              />

              <DetailItem
                icon={CalendarDays}
                label="Academic Session"
                value={
                  selectedClass.academicSession?.name
                }
              />

              <DetailItem
                icon={Hash}
                label="Class Code"
                value={selectedClass.code}
              />

              <DetailItem
                icon={CheckCircle2}
                label="Status"
                value={selectedClass.status}
              />

              <DetailItem
                icon={CalendarDays}
                label="Created"
                value={formatDateTime(
                  selectedClass.createdAt
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Updated"
                value={formatDateTime(
                  selectedClass.updatedAt
                )}
              />
            </div>

            {selectedClass.description ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>

                <p className="text-sm leading-6 text-slate-700">
                  {selectedClass.description}
                </p>
              </div>
            ) : null}

            {/* =================================================
                SECTIONS
            ================================================= */}

            <div className="border-t border-slate-200 pt-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sections
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage sections and view active
                    students assigned to each section.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateSection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={17} />
                  Add Section
                </button>
              </div>

              {sectionsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {sectionsError}
                </div>
              ) : sectionsLoading ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Loading sections...
                  </div>
                </div>
              ) : sections.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                  <Building2
                    size={25}
                    className="mb-2 text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    No sections found
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Create a section for this class to
                    start assigning students.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[800px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Section
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Code
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Capacity
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Students
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {sections.map((section) => (
                        <tr
                          key={section._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {section.name}
                              </p>

                              {section.roomNumber ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  Room{" "}
                                  {section.roomNumber}
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                              {section.code}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {section.capacity ?? "Unlimited"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Users
                                size={16}
                                className="text-slate-400"
                              />

                              <span className="text-sm font-semibold text-slate-900">
                                {section.studentCount ?? 0}
                              </span>

                              {section.capacity !==
                                null &&
                              section.capacity !==
                                undefined ? (
                                <span className="text-xs text-slate-500">
                                  / {section.capacity}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={section.status}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openSectionView(
                                    section
                                  )
                                }
                                title="View Students"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditSection(
                                    section
                                  )
                                }
                                title="Edit Section"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                type="button"
                                disabled={
                                  sectionDeletingId ===
                                  section._id
                                }
                                onClick={() =>
                                  handleDeleteSection(
                                    section
                                  )
                                }
                                title="Delete Section"
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                {sectionDeletingId ===
                                section._id ? (
                                  <Loader2
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={17} />
                                )}
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
          </div>
        </Modal>
      ) : null}

      {/* =====================================================
          CREATE / EDIT SECTION
      ===================================================== */}

      {sectionModal === "create" ||
      sectionModal === "edit" ? (
        <Modal
          title={
            sectionModal === "edit"
              ? "Edit Section"
              : "Create Section"
          }
          subtitle={
            selectedClass
              ? `${selectedClass.name} • ${
                  selectedClass.academicSession?.name ||
                  "Academic Session"
                }`
              : "Create a section"
          }
          onClose={closeSectionModal}
        >
          <form
            onSubmit={handleSectionSubmit}
            className="space-y-5"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem
                  icon={GraduationCap}
                  label="Class"
                  value={selectedClass?.name}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Academic Session"
                  value={
                    selectedClass?.academicSession?.name
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Section Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={sectionForm.name}
                  onChange={handleSectionChange}
                  placeholder="e.g. Section A"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Section Code
                </label>

                <input
                  type="text"
                  name="code"
                  value={sectionForm.code}
                  onChange={handleSectionChange}
                  placeholder="e.g. A"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Capacity
                </label>

                <input
                  type="number"
                  min="1"
                  name="capacity"
                  value={sectionForm.capacity}
                  onChange={handleSectionChange}
                  placeholder="e.g. 30"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Room Number
                </label>

                <input
                  type="text"
                  name="roomNumber"
                  value={sectionForm.roomNumber}
                  onChange={handleSectionChange}
                  placeholder="e.g. Room 101"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={sectionForm.status}
                  onChange={handleSectionChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={closeSectionModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sectionSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sectionSubmitting ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={17} />
                )}

                {sectionSubmitting
                  ? "Saving..."
                  : sectionModal === "edit"
                  ? "Update Section"
                  : "Create Section"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* =====================================================
          SECTION DETAIL / STUDENT ROSTER
      ===================================================== */}

      {sectionModal === "view" &&
      selectedSection ? (
        <Modal
          title={`${selectedSection.name || "Section"}`}
          subtitle={`${
            selectedClass?.name ||
            selectedSection.class?.name ||
            "Class"
          } • ${
            selectedClass?.academicSession?.name ||
            selectedSection.academicSession?.name ||
            "Academic Session"
          }`}
          onClose={closeSectionView}
        >
          <div className="space-y-6">
            {/* SECTION SUMMARY */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem
                icon={Building2}
                label="Section"
                value={selectedSection.name}
              />

              <DetailItem
                icon={Hash}
                label="Code"
                value={selectedSection.code}
              />

              <DetailItem
                icon={Users}
                label="Students"
                value={
                  selectedSection.studentCount ?? 0
                }
              />

              <DetailItem
                icon={DoorOpen}
                label="Room"
                value={
                  selectedSection.roomNumber || "Not assigned"
                }
              />
            </div>

            {/* CAPACITY */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Capacity
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {selectedSection.capacity ??
                    "Unlimited"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active Students
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {selectedSection.studentCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Available Seats
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {selectedSection.availableSeats ??
                    "—"}
                </p>
              </div>
            </div>

            {/* STUDENTS */}

            <div className="border-t border-slate-200 pt-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Active Students
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Only students with an active membership
                  and active enrollment are shown here.
                </p>
              </div>

              {sectionStudentsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {sectionStudentsError}
                </div>
              ) : sectionStudentsLoading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Loading students...
                  </div>
                </div>
              ) : sectionStudents.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                  <Users
                    size={28}
                    className="mb-3 text-slate-400"
                  />

                  <h4 className="text-sm font-semibold text-slate-700">
                    No active students
                  </h4>

                  <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                    There are currently no students with
                    an active membership and active
                    enrollment in this section.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Roll No.
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student ID
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Phone
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Address
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Membership
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {sectionStudents.map(
                        (record, index) => {
                          const student =
                            record.student || {};

                          const profile =
                            record.profile || {};

                          const enrollment =
                            record.enrollment || {};

                          const membership =
                            record.membership || {};

                          const address = [
                            profile.address,
                            profile.city,
                            profile.state,
                            profile.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <tr
                              key={
                                record.membershipId ||
                                student.id ||
                                index
                              }
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-4 py-4">
                                <span className="font-semibold text-slate-900">
                                  {enrollment.rollNumber ||
                                    "—"}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                    <UserRound
                                      size={17}
                                      className="text-slate-500"
                                    />
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {getStudentName(
                                        student
                                      )}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Enrollment:{" "}
                                      {enrollment.status ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {student.studentId ||
                                    "—"}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Mail
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {student.email ||
                                      "—"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Phone
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {student.phone ||
                                      "—"}
                                  </span>
                                </div>
                              </td>

                              <td className="max-w-[220px] px-4 py-4">
                                <div className="flex items-start gap-2 text-sm text-slate-700">
                                  <MapPin
                                    size={15}
                                    className="mt-0.5 shrink-0 text-slate-400"
                                  />

                                  <span className="break-words">
                                    {address || "—"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="space-y-1.5">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2
                                      size={13}
                                    />
                                    {membership.status ||
                                      "active"}
                                  </span>

                                  <p className="text-xs text-slate-500">
                                    {membership.code ||
                                      "—"}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}