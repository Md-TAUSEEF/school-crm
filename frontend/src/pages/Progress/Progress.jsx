import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  RefreshCw,
  Award,
  CalendarDays,
  UserRound,
  BookOpen,
} from "lucide-react";
import { api, getData, getMessage } from "../../services/api";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/ui";

const initialForm = {
  student: "",
  academicSession: "",
  skillLevel: "",
  beltRank: "",
  assessment: "",
  strengths: "",
  weaknesses: "",
  instructorComments: "",
  nextGoals: "",
  assessmentDate: "",
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFullName = (student) => {
  if (!student) return "-";

  const firstName =
    student?.firstName ||
    student?.user?.firstName ||
    "";

  const lastName =
    student?.lastName ||
    student?.user?.lastName ||
    "";

  return `${firstName} ${lastName}`.trim() || "-";
};

const getStudentId = (student) => {
  if (!student) return "";

  return (
    student?._id ||
    student?.user?._id ||
    ""
  );
};

const getUserCode = (student) => {
  return (
    student?.userId ||
    student?.user?.userId ||
    ""
  );
};

const getSessionName = (session) => {
  if (!session) return "-";

  if (typeof session === "string") {
    return session;
  }

  return (
    session?.name ||
    session?.title ||
    session?.code ||
    "-"
  );
};

const getProgressStudentId = (progress) => {
  if (!progress?.student) return "";

  if (typeof progress.student === "string") {
    return progress.student;
  }

  return progress.student?._id || "";
};

const getProgressStudentName = (progress) => {
  if (!progress?.student) return "-";

  if (typeof progress.student === "string") {
    return progress.student;
  }

  return getFullName(progress.student);
};

const getProgressSessionName = (progress) => {
  if (!progress?.academicSession) return "-";

  if (typeof progress.academicSession === "string") {
    return progress.academicSession;
  }

  return getSessionName(progress.academicSession);
};

function Modal({
  title,
  children,
  onClose,
  width = "max-w-3xl",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[92vh] w-full ${width} overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required = false,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

const textareaClass =
  "min-h-[100px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

function Progress() {
  const [progressRecords, setProgressRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState(null);
  const [selectedProgress, setSelectedProgress] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  const loadProgress = async (currentPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: currentPage,
        limit,
      };

      if (studentFilter) {
        params.student = studentFilter;
      }

      if (sessionFilter) {
        params.academicSession = sessionFilter;
      }

      const response = await api.get("/progress", {
        params,
      });

      const data = getData(response);

      const items = Array.isArray(data)
        ? data
        : data?.items ||
          data?.records ||
          data?.progress ||
          [];

      setProgressRecords(
        Array.isArray(items) ? items : []
      );

      const pagination =
        data?.pagination ||
        response?.data?.pagination ||
        {};

      const calculatedTotalPages =
        pagination?.totalPages ||
        pagination?.pages ||
        (pagination?.total
          ? Math.ceil(pagination.total / limit)
          : 1);

      setTotalPages(
        Math.max(1, Number(calculatedTotalPages) || 1)
      );

      setPage(currentPage);
    } catch (err) {
      setError(
        getMessage(
          err,
          "Unable to load progress records."
        )
      );
      setProgressRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      setLoadingFormData(true);
      setFormError("");

      const [studentsResponse, sessionsResponse] =
        await Promise.all([
          api.get("/students", {
            params: {
              page: 1,
              limit: 100,
            },
          }),
          api.get("/academic-sessions", {
            params: {
              page: 1,
              limit: 100,
            },
          }),
        ]);

      const studentsData = getData(studentsResponse);
      const sessionsData = getData(sessionsResponse);

      const studentItems = Array.isArray(studentsData)
        ? studentsData
        : studentsData?.items ||
          studentsData?.students ||
          [];

      const sessionItems = Array.isArray(sessionsData)
        ? sessionsData
        : sessionsData?.items ||
          sessionsData?.sessions ||
          [];

      setStudents(
        Array.isArray(studentItems)
          ? studentItems
          : []
      );

      setSessions(
        Array.isArray(sessionItems)
          ? sessionItems
          : []
      );
    } catch (err) {
      setFormError(
        getMessage(
          err,
          "Unable to load students and academic sessions."
        )
      );
    } finally {
      setLoadingFormData(false);
    }
  };

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    loadProgress(1);
  }, [studentFilter, sessionFilter]);

  const filteredRecords = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return progressRecords;
    }

    return progressRecords.filter((record) => {
      const studentName =
        getProgressStudentName(record).toLowerCase();

      const studentId =
        typeof record?.student === "object"
          ? String(
              record?.student?.userId || ""
            ).toLowerCase()
          : "";

      const belt =
        String(record?.beltRank || "").toLowerCase();

      const skill =
        String(record?.skillLevel || "").toLowerCase();

      const assessment =
        String(record?.assessment || "").toLowerCase();

      return (
        studentName.includes(value) ||
        studentId.includes(value) ||
        belt.includes(value) ||
        skill.includes(value) ||
        assessment.includes(value)
      );
    });
  }, [progressRecords, search]);

  const resetForm = () => {
    setForm(initialForm);
    setFormError("");
  };

  const closeModal = () => {
    if (submitting) return;

    setModal(null);
    setSelectedProgress(null);
    resetForm();
  };

  const openCreateModal = async () => {
    resetForm();

    if (!students.length || !sessions.length) {
      await loadFormData();
    }

    setModal("create");
  };

  const openViewModal = (record) => {
    setSelectedProgress(record);
    setModal("view");
  };

  const openEditModal = async (record) => {
    try {
      setFormError("");

      if (!students.length || !sessions.length) {
        await loadFormData();
      }

      const studentId =
        getProgressStudentId(record);

      const sessionId =
        typeof record?.academicSession === "object"
          ? record?.academicSession?._id
          : record?.academicSession;

      setForm({
        student: studentId || "",
        academicSession: sessionId || "",
        skillLevel: record?.skillLevel || "",
        beltRank: record?.beltRank || "",
        assessment: record?.assessment || "",
        strengths: record?.strengths || "",
        weaknesses: record?.weaknesses || "",
        instructorComments:
          record?.instructorComments || "",
        nextGoals: record?.nextGoals || "",
        assessmentDate: record?.assessmentDate
          ? new Date(record.assessmentDate)
              .toISOString()
              .slice(0, 10)
          : "",
      });

      setSelectedProgress(record);
      setModal("edit");
    } catch (err) {
      setFormError(
        getMessage(
          err,
          "Unable to open progress record."
        )
      );
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError("");

      if (!form.student) {
        setFormError("Please select a student.");
        return;
      }

      if (!form.academicSession) {
        setFormError(
          "Please select an academic session."
        );
        return;
      }

      if (!form.assessmentDate) {
        setFormError(
          "Please select the assessment date."
        );
        return;
      }

      const payload = {
        student: form.student,
        academicSession: form.academicSession,
        skillLevel: form.skillLevel.trim(),
        beltRank: form.beltRank.trim(),
        assessment: form.assessment.trim(),
        strengths: form.strengths.trim(),
        weaknesses: form.weaknesses.trim(),
        instructorComments:
          form.instructorComments.trim(),
        nextGoals: form.nextGoals.trim(),
        assessmentDate: form.assessmentDate,
      };

      if (modal === "create") {
        await api.post("/progress", payload);
      } else if (
        modal === "edit" &&
        selectedProgress?._id
      ) {
        await api.put(
          `/progress/${selectedProgress._id}`,
          payload
        );
      }

      closeModal();
      await loadProgress(page);
    } catch (err) {
      setFormError(
        getMessage(
          err,
          "Unable to save progress record."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadFormData(),
      loadProgress(page),
    ]);
  };

  const clearFilters = () => {
    setSearch("");
    setStudentFilter("");
    setSessionFilter("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        intro="Track student skill development, belt progression, assessments, instructor feedback, and next goals."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2"
          >
            <Plus size={17} />
            Add Progress
          </Button>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student, belt, skill or assessment..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={studentFilter}
            onChange={(event) =>
              setStudentFilter(event.target.value)
            }
            className={inputClass}
          >
            <option value="">All students</option>

            {students.map((student) => {
              const id = getStudentId(student);

              if (!id) return null;

              return (
                <option key={id} value={id}>
                  {getFullName(student)}
                  {getUserCode(student)
                    ? ` — ${getUserCode(student)}`
                    : ""}
                </option>
              );
            })}
          </select>

          <select
            value={sessionFilter}
            onChange={(event) =>
              setSessionFilter(event.target.value)
            }
            className={inputClass}
          >
            <option value="">
              All academic sessions
            </option>

            {sessions.map((session) => {
              const id = session?._id;

              if (!id) return null;

              return (
                <option key={id} value={id}>
                  {getSessionName(session)}
                </option>
              );
            })}
          </select>
        </div>

        {(search ||
          studentFilter ||
          sessionFilter) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : filteredRecords.length === 0 ? (
        <Empty
          title={
            search ||
            studentFilter ||
            sessionFilter
              ? "No progress records found"
              : "No progress records yet"
          }
          description={
            search ||
            studentFilter ||
            sessionFilter
              ? "Try changing your search or filters."
              : "Progress records will appear here after an authorized admin or teacher creates them."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[950px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Skill
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Belt
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assessment
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {getProgressStudentName(
                                record
                              )}
                            </p>

                            {typeof record.student ===
                              "object" &&
                              record.student?.userId && (
                                <p className="text-xs text-slate-500">
                                  {
                                    record.student
                                      .userId
                                  }
                                </p>
                              )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getProgressSessionName(
                          record
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {record.skillLevel || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Award size={13} />
                          {record.beltRank || "-"}
                        </div>
                      </td>

                      <td className="max-w-[240px] px-5 py-4">
                        <p className="truncate text-sm text-slate-700">
                          {record.assessment || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          record.assessmentDate
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openViewModal(record)
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(record)
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  loadProgress(page - 1)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  loadProgress(page + 1)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {(modal === "create" ||
        modal === "edit") && (
        <Modal
          title={
            modal === "create"
              ? "Add Student Progress"
              : "Edit Student Progress"
          }
          onClose={closeModal}
        >
          {formError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {loadingFormData ? (
            <Loading />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Student"
                  required
                >
                  <select
                    name="student"
                    value={form.student}
                    onChange={handleChange}
                    className={inputClass}
                    disabled={modal === "edit"}
                  >
                    <option value="">
                      Select student
                    </option>

                    {students.map((student) => {
                      const id =
                        getStudentId(student);

                      if (!id) return null;

                      return (
                        <option
                          key={id}
                          value={id}
                        >
                          {getFullName(student)}
                          {getUserCode(student)
                            ? ` — ${getUserCode(
                                student
                              )}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field
                  label="Academic Session"
                  required
                >
                  <select
                    name="academicSession"
                    value={form.academicSession}
                    onChange={handleChange}
                    className={inputClass}
                    disabled={modal === "edit"}
                  >
                    <option value="">
                      Select academic session
                    </option>

                    {sessions.map((session) => {
                      if (!session?._id) {
                        return null;
                      }

                      return (
                        <option
                          key={session._id}
                          value={session._id}
                        >
                          {getSessionName(session)}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field label="Skill Level">
                  <input
                    type="text"
                    name="skillLevel"
                    value={form.skillLevel}
                    onChange={handleChange}
                    placeholder="e.g. Beginner, Intermediate"
                    className={inputClass}
                  />
                </Field>

                <Field label="Belt Rank">
                  <input
                    type="text"
                    name="beltRank"
                    value={form.beltRank}
                    onChange={handleChange}
                    placeholder="e.g. White Belt"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Assessment Date"
                  required
                >
                  <input
                    type="date"
                    name="assessmentDate"
                    value={form.assessmentDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </Field>

                <Field label="Assessment">
                  <input
                    type="text"
                    name="assessment"
                    value={form.assessment}
                    onChange={handleChange}
                    placeholder="Assessment result"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Strengths">
                <textarea
                  name="strengths"
                  value={form.strengths}
                  onChange={handleChange}
                  placeholder="Student strengths..."
                  className={textareaClass}
                />
              </Field>

              <Field label="Weaknesses">
                <textarea
                  name="weaknesses"
                  value={form.weaknesses}
                  onChange={handleChange}
                  placeholder="Areas that need improvement..."
                  className={textareaClass}
                />
              </Field>

              <Field label="Instructor Comments">
                <textarea
                  name="instructorComments"
                  value={form.instructorComments}
                  onChange={handleChange}
                  placeholder="Instructor observations and comments..."
                  className={textareaClass}
                />
              </Field>

              <Field label="Next Goals">
                <textarea
                  name="nextGoals"
                  value={form.nextGoals}
                  onChange={handleChange}
                  placeholder="Goals for the next assessment period..."
                  className={textareaClass}
                />
              </Field>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <Button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : modal === "create"
                    ? "Create Progress"
                    : "Update Progress"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {modal === "view" &&
        selectedProgress && (
          <Modal
            title="Progress Details"
            onClose={closeModal}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <UserRound size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Student
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {getProgressStudentName(
                      selectedProgress
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <BookOpen size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Skill Level
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {selectedProgress.skillLevel ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <Award size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Belt Rank
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {selectedProgress.beltRank || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Academic Session
                  </p>

                  <p className="text-sm text-slate-700">
                    {getProgressSessionName(
                      selectedProgress
                    )}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assessment Date
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays size={15} />
                    {formatDate(
                      selectedProgress.assessmentDate
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Assessment
                </p>

                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedProgress.assessment ||
                    "No assessment details added."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Strengths
                  </p>

                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedProgress.strengths ||
                      "No strengths recorded."}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Weaknesses
                  </p>

                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedProgress.weaknesses ||
                      "No weaknesses recorded."}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Instructor Comments
                </p>

                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedProgress
                    .instructorComments ||
                    "No instructor comments recorded."}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Next Goals
                </p>

                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedProgress.nextGoals ||
                    "No next goals recorded."}
                </p>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
}

export default Progress;