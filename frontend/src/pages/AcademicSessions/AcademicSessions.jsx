import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../services/api";

const initialForm = {
  name: "",
  code: "",
  startDate: "",
  endDate: "",
  status: "upcoming",
  description: "",
};

const statusOptions = [
  {
    value: "upcoming",
    label: "Upcoming",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "archived",
    label: "Archived",
  },
];

const AcademicSessions = () => {
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editingSession, setEditingSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const [form, setForm] = useState(initialForm);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/academic-sessions");

      setSessions(response?.data?.sessions || []);
    } catch (err) {
      console.error("Fetch academic sessions error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to fetch academic sessions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return sessions;
    }

    return sessions.filter((session) => {
      return (
        session?.name?.toLowerCase().includes(search) ||
        session?.code?.toLowerCase().includes(search) ||
        session?.status?.toLowerCase().includes(search) ||
        session?.description?.toLowerCase().includes(search)
      );
    });
  }, [sessions, searchTerm]);

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatInputDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "upcoming":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";

      case "archived":
        return "bg-amber-50 text-amber-700 border-amber-200";

      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(
      (item) => item.value === status
    );

    return option?.label || status || "-";
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingSession(null);
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (session) => {
    setError("");
    setSuccess("");

    setEditingSession(session);

    setForm({
      name: session?.name || "",
      code: session?.code || "",
      startDate: formatInputDate(session?.startDate),
      endDate: formatInputDate(session?.endDate),
      status: session?.status || "upcoming",
      description: session?.description || "",
    });

    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (submitting) return;

    setIsFormOpen(false);
    resetForm();
  };

  const openViewModal = async (session) => {
    try {
      setError("");

      const response = await api.get(
        `/academic-sessions/${session._id}`
      );

      setSelectedSession(response?.data?.session || session);
    } catch (err) {
      console.error("Fetch academic session error:", err);

      setSelectedSession(session);
    }

    setIsViewOpen(true);
  };

  const closeViewModal = () => {
    setIsViewOpen(false);
    setSelectedSession(null);
  };

  const openDeleteModal = (session) => {
    setError("");
    setSuccess("");

    setSessionToDelete(session);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setIsDeleteOpen(false);
    setSessionToDelete(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Session name is required";
    }

    if (!form.code.trim()) {
      return "Session code is required";
    }

    if (!form.startDate) {
      return "Start date is required";
    }

    if (!form.endDate) {
      return "End date is required";
    }

    if (
      new Date(form.startDate) >=
      new Date(form.endDate)
    ) {
      return "End date must be after start date";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        description: form.description.trim(),
      };

      if (editingSession?._id) {
        const response = await api.put(
          `/academic-sessions/${editingSession._id}`,
          payload
        );

        const updatedSession = response?.data?.session;

        setSessions((prev) =>
          prev.map((item) =>
            item._id === editingSession._id
              ? updatedSession
              : item
          )
        );

        setSuccess(
          response?.data?.message ||
            "Academic session updated successfully"
        );
      } else {
        const response = await api.post(
          "/academic-sessions",
          payload
        );

        const newSession = response?.data?.session;

        if (newSession) {
          setSessions((prev) => [
            newSession,
            ...prev,
          ]);
        }

        setSuccess(
          response?.data?.message ||
            "Academic session created successfully"
        );
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error("Save academic session error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to save academic session"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToDelete?._id) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const response = await api.delete(
        `/academic-sessions/${sessionToDelete._id}`
      );

      setSessions((prev) =>
        prev.filter(
          (item) => item._id !== sessionToDelete._id
        )
      );

      setIsDeleteOpen(false);
      setSessionToDelete(null);

      setSuccess(
        response?.data?.message ||
          "Academic session deleted successfully"
      );
    } catch (err) {
      console.error("Delete academic session error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete academic session"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Academic Sessions
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage academic sessions, dates and session status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          New Academic Session
        </button>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check size={18} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ERROR */}
      {error && !isFormOpen && !isDeleteOpen && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SEARCH / SUMMARY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search academic sessions..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredSessions.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {sessions.length}
            </span>{" "}
            sessions
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2
                size={20}
                className="animate-spin"
              />
              Loading academic sessions...
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CalendarDays size={26} />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              {searchTerm
                ? "No academic sessions found"
                : "No academic sessions yet"}
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {searchTerm
                ? "Try changing your search keyword."
                : "Create your first academic session to start managing the academic calendar."}
            </p>

            {!searchTerm && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus size={17} />
                Create Academic Session
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Academic Session
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Code
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session) => (
                  <tr
                    key={session._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {session.name}
                        </p>

                        {session.description && (
                          <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                            {session.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-700">
                        {session.code}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(session.startDate)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(session.endDate)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                          session.status
                        )}`}
                      >
                        {getStatusLabel(session.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openViewModal(session)
                          }
                          title="View"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(session)
                          }
                          title="Edit"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDeleteModal(session)
                          }
                          title="Delete"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={17} />
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

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingSession
                    ? "Edit Academic Session"
                    : "New Academic Session"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingSession
                    ? "Update academic session details."
                    : "Create a new academic session."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* NAME */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Session Name
                    <span className="text-red-500"> *</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Academic Session 2026-27"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* CODE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Session Code
                    <span className="text-red-500"> *</span>
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleFormChange}
                    placeholder="e.g. 2026-27"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
                  />
                </div>

                {/* START DATE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Start Date
                    <span className="text-red-500"> *</span>
                  </label>

                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* END DATE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    End Date
                    <span className="text-red-500"> *</span>
                  </label>

                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    {statusOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="Add session description..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingSession
                    ? "Update Session"
                    : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Academic Session Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete session information
                </p>
              </div>

              <button
                type="button"
                onClick={closeViewModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <CalendarDays size={23} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedSession.name}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {selectedSession.code}
                    </p>
                  </div>

                  <span
                    className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                      selectedSession.status
                    )}`}
                  >
                    {getStatusLabel(
                      selectedSession.status
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Start Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(
                      selectedSession.startDate
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    End Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(
                      selectedSession.endDate
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedSession.description ||
                    "No description added."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(
                      selectedSession.createdAt
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Last Updated
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(
                      selectedSession.updatedAt
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Delete Academic Session?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {sessionToDelete.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Delete Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSessions;