
import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../services/api";

const initialForm = {
  program: "",
  academicSession: "",
  class: "",
  section: "",
  name: "",
  code: "",
  description: "",
  maxMarks: "100",
  status: "active",
};

const Subject = () => {
  const [subjects, setSubjects] = useState([]);

  const [programs, setPrograms] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);

  /* =========================================================
     API RESPONSE HELPERS
  ========================================================= */

  const getResponseData = (response) => {
    return response?.data || {};
  };

  const extractArray = (response, key) => {
    const data = getResponseData(response);

    if (Array.isArray(data?.[key])) {
      return data[key];
    }

    if (Array.isArray(data?.data?.[key])) {
      return data.data[key];
    }

    if (Array.isArray(data?.result?.[key])) {
      return data.result[key];
    }

    return [];
  };

  /* =========================================================
     FETCH PROGRAMS
  ========================================================= */

  const fetchPrograms = async () => {
    try {
      const response = await api.get("/programs");

      const items = extractArray(response, "programs");

      setPrograms(items);

      console.log("Programs loaded:", items);
    } catch (err) {
      console.error("Fetch programs error:", err);
      throw err;
    }
  };

  /* =========================================================
     FETCH ACADEMIC SESSIONS
  ========================================================= */

  const fetchAcademicSessions = async () => {
    try {
      const response = await api.get("/academic-sessions");

      const items = extractArray(response, "sessions");

      setAcademicSessions(items);

      console.log("Academic sessions loaded:", items);
    } catch (err) {
      console.error(
        "Fetch academic sessions error:",
        err
      );

      throw err;
    }
  };

  /* =========================================================
     FETCH CLASSES
  ========================================================= */

  const fetchClasses = async () => {
    try {
      const response = await api.get("/classes");

      const items = extractArray(response, "classes");

      setClasses(items);

      console.log("Classes loaded:", items);
    } catch (err) {
      console.error("Fetch classes error:", err);
      throw err;
    }
  };

  /* =========================================================
     FETCH SECTIONS
  ========================================================= */

  const fetchSections = async () => {
    try {
      const response = await api.get("/sections");

      const items = extractArray(response, "sections");

      setSections(items);

      console.log("Sections loaded:", items);
    } catch (err) {
      console.error("Fetch sections error:", err);
      throw err;
    }
  };

  /* =========================================================
     FETCH SUBJECTS
  ========================================================= */

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/subjects");

      const items = extractArray(response, "subjects");

      setSubjects(items);

      console.log("Subjects loaded:", items);
    } catch (err) {
      console.error("Fetch subjects error:", err);
      throw err;
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          fetchPrograms(),
          fetchAcademicSessions(),
          fetchClasses(),
          fetchSections(),
          fetchSubjects(),
        ]);
      } catch (err) {
        console.error(
          "Load subject page error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Failed to load subject data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* =========================================================
     FILTER CLASSES
     
     Program + Academic Session
     -> Classes
  ========================================================= */

  const filteredClasses = useMemo(() => {
    if (
      !form.program ||
      !form.academicSession
    ) {
      return [];
    }

    return classes.filter((item) => {
      const programId =
        item?.program?._id ||
        item?.program ||
        "";

      const sessionId =
        item?.academicSession?._id ||
        item?.academicSession ||
        "";

      return (
        String(programId) ===
          String(form.program) &&
        String(sessionId) ===
          String(form.academicSession)
      );
    });
  }, [
    classes,
    form.program,
    form.academicSession,
  ]);

  /* =========================================================
     FILTER SECTIONS
     
     Class + Academic Session
     -> Sections
  ========================================================= */

  const filteredSections = useMemo(() => {
    if (
      !form.class ||
      !form.academicSession
    ) {
      return [];
    }

    return sections.filter((item) => {
      const classId =
        item?.class?._id ||
        item?.class ||
        "";

      const sessionId =
        item?.academicSession?._id ||
        item?.academicSession ||
        "";

      return (
        String(classId) ===
          String(form.class) &&
        String(sessionId) ===
          String(form.academicSession)
      );
    });
  }, [
    sections,
    form.class,
    form.academicSession,
  ]);

  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormError("");
  };

  /* =========================================================
     PROGRAM CHANGE
     
     Program changes:
     - reset class
     - reset section
  ========================================================= */

  const handleProgramChange = (event) => {
    const value = event.target.value;

    setForm((prev) => ({
      ...prev,
      program: value,
      class: "",
      section: "",
    }));

    setFormError("");
  };

  /* =========================================================
     SESSION CHANGE
     
     Session changes:
     - reset class
     - reset section
  ========================================================= */

  const handleSessionChange = (event) => {
    const value = event.target.value;

    setForm((prev) => ({
      ...prev,
      academicSession: value,
      class: "",
      section: "",
    }));

    setFormError("");
  };

  /* =========================================================
     CLASS CHANGE
     
     Class changes:
     - reset section
  ========================================================= */

  const handleClassChange = (event) => {
    const value = event.target.value;

    setForm((prev) => ({
      ...prev,
      class: value,
      section: "",
    }));

    setFormError("");
  };

  /* =========================================================
     OPEN CREATE MODAL
  ========================================================= */

  const openCreateModal = () => {
    setEditingSubject(null);
    setViewingSubject(null);

    setForm({
      ...initialForm,
    });

    setFormError("");
    setShowModal(true);
  };

  /* =========================================================
     OPEN EDIT MODAL
  ========================================================= */

  const openEditModal = (subject) => {
    setViewingSubject(null);
    setEditingSubject(subject);

    const programId =
      subject?.program?._id ||
      subject?.program ||
      "";

    const sessionId =
      subject?.academicSession?._id ||
      subject?.academicSession ||
      "";

    const classId =
      subject?.class?._id ||
      subject?.class ||
      "";

    const sectionId =
      subject?.section?._id ||
      subject?.section ||
      "";

    setForm({
      program: programId,
      academicSession: sessionId,
      class: classId,
      section: sectionId,
      name: subject?.name || "",
      code: subject?.code || "",
      description:
        subject?.description || "",
      maxMarks:
        subject?.maxMarks !== undefined &&
        subject?.maxMarks !== null
          ? String(subject.maxMarks)
          : "100",
      status:
        subject?.status || "active",
    });

    setFormError("");
    setShowModal(true);
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (formLoading) return;

    setShowModal(false);
    setEditingSubject(null);

    setForm({
      ...initialForm,
    });

    setFormError("");
  };

  /* =========================================================
     VALIDATE FORM
  ========================================================= */

  const validateForm = () => {
    if (!form.program) {
      return "Please select a program";
    }

    if (!form.academicSession) {
      return "Please select an academic session";
    }

    if (!form.class) {
      return "Please select a class";
    }

    if (!form.section) {
      return "Please select a section";
    }

    if (!form.name.trim()) {
      return "Subject name is required";
    }

    if (!form.code.trim()) {
      return "Subject code is required";
    }

    if (
      form.maxMarks === "" ||
      Number(form.maxMarks) < 0
    ) {
      return "Please enter a valid max marks value";
    }

    return "";
  };

  /* =========================================================
     CREATE / UPDATE SUBJECT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      const payload = {
        program: form.program,
        academicSession:
          form.academicSession,
        class: form.class,
        section: form.section,
        name: form.name.trim(),
        code: form.code
          .trim()
          .toUpperCase(),
        description:
          form.description.trim(),
        maxMarks: Number(
          form.maxMarks
        ),
        status: form.status,
      };

      console.log(
        "Subject payload:",
        payload
      );

      if (editingSubject) {
        await api.put(
          `/subjects/${editingSubject._id}`,
          payload
        );
      } else {
        await api.post(
          "/subjects",
          payload
        );
      }

      await fetchSubjects();

      closeModal();
    } catch (err) {
      console.error(
        "Save subject error:",
        err
      );

      setFormError(
        err?.response?.data?.message ||
          "Failed to save subject"
      );
    } finally {
      setFormLoading(false);
    }
  };

  /* =========================================================
     DELETE SUBJECT
  ========================================================= */

  const handleDelete = async (
    subject
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${subject.name}"?`
      );

    if (!confirmed) return;

    try {
      setDeletingId(subject._id);

      await api.delete(
        `/subjects/${subject._id}`
      );

      setSubjects((prev) =>
        prev.filter(
          (item) =>
            item._id !== subject._id
        )
      );
    } catch (err) {
      console.error(
        "Delete subject error:",
        err
      );

      window.alert(
        err?.response?.data?.message ||
          "Failed to delete subject"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     FILTER SUBJECTS
  ========================================================= */

  const filteredSubjects =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return subjects.filter(
        (subject) => {
          const programName =
            subject?.program?.name ||
            "";

          const programCode =
            subject?.program?.code ||
            "";

          const sessionName =
            subject?.academicSession
              ?.name || "";

          const sessionCode =
            subject?.academicSession
              ?.code || "";

          const className =
            subject?.class?.name || "";

          const classCode =
            subject?.class?.code || "";

          const sectionName =
            subject?.section?.name || "";

          const sectionCode =
            subject?.section?.code || "";

          const subjectName =
            subject?.name || "";

          const subjectCode =
            subject?.code || "";

          const matchesSearch =
            !search ||
            subjectName
              .toLowerCase()
              .includes(search) ||
            subjectCode
              .toLowerCase()
              .includes(search) ||
            programName
              .toLowerCase()
              .includes(search) ||
            programCode
              .toLowerCase()
              .includes(search) ||
            sessionName
              .toLowerCase()
              .includes(search) ||
            sessionCode
              .toLowerCase()
              .includes(search) ||
            className
              .toLowerCase()
              .includes(search) ||
            classCode
              .toLowerCase()
              .includes(search) ||
            sectionName
              .toLowerCase()
              .includes(search) ||
            sectionCode
              .toLowerCase()
              .includes(search);

          const matchesStatus =
            statusFilter === "all" ||
            subject.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      subjects,
      searchTerm,
      statusFilter,
    ]);

  /* =========================================================
     HELPERS
  ========================================================= */

  const getProgramName = (
    subject
  ) => {
    return (
      subject?.program?.name ||
      "—"
    );
  };

  const getSessionName = (
    subject
  ) => {
    return (
      subject?.academicSession
        ?.name || "—"
    );
  };

  const getClassName = (
    subject
  ) => {
    return (
      subject?.class?.name ||
      "—"
    );
  };

  const getSectionName = (
    subject
  ) => {
    return (
      subject?.section?.name ||
      "—"
    );
  };

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Subjects
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage subjects assigned to
            academic sections.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          {/* SEARCH */}

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search subject, code, program, class or section..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          {/* STATUS */}

          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          SUBJECT TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading subjects...
            </div>
          </div>
        ) : filteredSubjects.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Search
                size={20}
                className="text-slate-400"
              />
            </div>

            <h3 className="text-sm font-semibold text-slate-900">
              No subjects found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {subjects.length ===
              0
                ? "No subjects have been created yet."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Subject
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Program
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Academic Session
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Class
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Section
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Max Marks
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSubjects.map(
                  (subject) => (
                    <tr
                      key={
                        subject._id
                      }
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* SUBJECT */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {
                              subject.name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {
                              subject.code
                            }
                          </p>
                        </div>
                      </td>

                      {/* PROGRAM */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {getProgramName(
                              subject
                            )}
                          </p>

                          {subject
                            ?.program
                            ?.code && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {
                                subject
                                  .program
                                  .code
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* SESSION */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {getSessionName(
                              subject
                            )}
                          </p>

                          {subject
                            ?.academicSession
                            ?.code && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {
                                subject
                                  .academicSession
                                  .code
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* CLASS */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {getClassName(
                              subject
                            )}
                          </p>

                          {subject
                            ?.class
                            ?.code && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {
                                subject
                                  .class
                                  .code
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* SECTION */}

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {getSectionName(
                              subject
                            )}
                          </p>

                          {subject
                            ?.section
                            ?.code && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {
                                subject
                                  .section
                                  .code
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* MAX MARKS */}

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {
                            subject.maxMarks ??
                            0
                          }
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            subject.status ===
                            "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {subject.status ===
                          "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              setViewingSubject(
                                subject
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                            title="View"
                          >
                            <Eye
                              size={16}
                            />
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                subject
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit"
                          >
                            <Edit
                              size={16}
                            />
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                subject
                              )
                            }
                            disabled={
                              deletingId ===
                              subject._id
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId ===
                            subject._id ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSubject
                    ? "Edit Subject"
                    : "Add Subject"}
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Assign a subject to a specific academic section.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={formLoading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* =================================================
                  ACADEMIC ASSIGNMENT
              ================================================= */}

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Academic Assignment
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* PROGRAM */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Program
                    </label>

                    <select
                      name="program"
                      value={
                        form.program
                      }
                      onChange={
                        handleProgramChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                    >
                      <option value="">
                        Select Program
                      </option>

                      {programs.map(
                        (program) => (
                          <option
                            key={
                              program._id
                            }
                            value={
                              program._id
                            }
                          >
                            {
                              program.name
                            }

                            {program.code
                              ? ` (${program.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {programs.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No programs found.
                      </p>
                    )}
                  </div>

                  {/* ACADEMIC SESSION */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Academic Session
                    </label>

                    <select
                      name="academicSession"
                      value={
                        form.academicSession
                      }
                      onChange={
                        handleSessionChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                    >
                      <option value="">
                        Select Academic Session
                      </option>

                      {academicSessions.map(
                        (session) => (
                          <option
                            key={
                              session._id
                            }
                            value={
                              session._id
                            }
                          >
                            {
                              session.name
                            }

                            {session.code
                              ? ` (${session.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {academicSessions.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No academic sessions found.
                      </p>
                    )}
                  </div>

                  {/* CLASS */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Class
                    </label>

                    <select
                      name="class"
                      value={
                        form.class
                      }
                      onChange={
                        handleClassChange
                      }
                      disabled={
                        !form.program ||
                        !form.academicSession
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-slate-400"
                    >
                      <option value="">
                        {!form.program ||
                        !form.academicSession
                          ? "Select Program & Session First"
                          : filteredClasses.length ===
                            0
                          ? "No Classes Found"
                          : "Select Class"}
                      </option>

                      {filteredClasses.map(
                        (item) => (
                          <option
                            key={
                              item._id
                            }
                            value={
                              item._id
                            }
                          >
                            {item.name}

                            {item.code
                              ? ` (${item.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {form.program &&
                      form.academicSession &&
                      filteredClasses.length ===
                        0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          No class is available for this program and academic session.
                        </p>
                      )}
                  </div>

                  {/* SECTION */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Section
                    </label>

                    <select
                      name="section"
                      value={
                        form.section
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        !form.class
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-slate-400"
                    >
                      <option value="">
                        {!form.class
                          ? "Select Class First"
                          : filteredSections.length ===
                            0
                          ? "No Sections Found"
                          : "Select Section"}
                      </option>

                      {filteredSections.map(
                        (item) => (
                          <option
                            key={
                              item._id
                            }
                            value={
                              item._id
                            }
                          >
                            {item.name}

                            {item.code
                              ? ` (${item.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {form.class &&
                      filteredSections.length ===
                        0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          No section is available for this class.
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* =================================================
                  SUBJECT DETAILS
              ================================================= */}

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Subject Details
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* NAME */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Subject Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. Mathematics"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>

                  {/* CODE */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Subject Code
                    </label>

                    <input
                      type="text"
                      name="code"
                      value={
                        form.code
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. MATH"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>

                  {/* MAX MARKS */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Max Marks
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="maxMarks"
                      value={
                        form.maxMarks
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="100"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        form.status
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>
                  </div>
                </div>

                {/* DESCRIPTION */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    rows={4}
                    placeholder="Enter subject description..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>
              </div>

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    formLoading
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    formLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingSubject
                    ? "Update Subject"
                    : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW SUBJECT MODAL
      ===================================================== */}

      {viewingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Subject Details
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  View subject assignment details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewingSubject(
                    null
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="space-y-5 p-6">
              {/* SUBJECT */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subject
                </p>

                <div className="mt-1 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {
                        viewingSubject.name
                      }
                    </h3>

                    <p className="text-sm text-slate-500">
                      {
                        viewingSubject.code
                      }
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      viewingSubject.status ===
                      "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {viewingSubject.status ===
                    "active"
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>

              {/* HIERARCHY */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getProgramName(
                      viewingSubject
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Academic Session
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getSessionName(
                      viewingSubject
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Class
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getClassName(
                      viewingSubject
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Section
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getSectionName(
                      viewingSubject
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Maximum Marks
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      viewingSubject.maxMarks ??
                      0
                    }
                  </p>
                </div>
              </div>

              {/* DESCRIPTION */}

              {viewingSubject.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Description
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {
                      viewingSubject.description
                    }
                  </p>
                </div>
              )}

              {/* CLOSE */}

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setViewingSubject(
                      null
                    )
                  }
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subject;
