import React, { useEffect, useMemo, useState } from "react";
import {
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
  description: "",
  duration: "",
  status: "active",
};

const Programs = () => {
  const [programs, setPrograms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [editingProgram, setEditingProgram] =
    useState(null);

  const [viewingProgram, setViewingProgram] =
    useState(null);

  const [deleteProgramId, setDeleteProgramId] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  /* =========================
     FETCH PROGRAMS
  ========================= */

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/programs");

      const data = response?.data;

      setPrograms(
        Array.isArray(data?.programs)
          ? data.programs
          : []
      );
    } catch (err) {
      console.error(
        "Fetch programs error:",
        err
      );

      setPrograms([]);

      setError(
        err?.response?.data?.message ||
          "Failed to load programs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  /* =========================
     SEARCH
  ========================= */

  const filteredPrograms = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    if (!search) {
      return programs;
    }

    return programs.filter((program) => {
      return (
        program?.name
          ?.toLowerCase()
          .includes(search) ||
        program?.code
          ?.toLowerCase()
          .includes(search) ||
        program?.duration
          ?.toLowerCase()
          .includes(search) ||
        program?.status
          ?.toLowerCase()
          .includes(search)
      );
    });
  }, [programs, searchTerm]);

  /* =========================
     FORM
  ========================= */

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingProgram(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (program) => {
    setEditingProgram(program);

    setForm({
      name: program?.name || "",
      code: program?.code || "",
      description:
        program?.description || "",
      duration:
        program?.duration || "",
      status:
        program?.status || "active",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingProgram(null);
    setForm(initialForm);
  };

  /* =========================
     CREATE / UPDATE
  ========================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const code = form.code.trim();

    if (!name) {
      setError("Program name is required.");
      return;
    }

    if (!code) {
      setError("Program code is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        code: code.toUpperCase(),
        description:
          form.description.trim(),
        duration:
          form.duration.trim(),
        status: form.status,
      };

      if (editingProgram?._id) {
        const response = await api.put(
          `/programs/${editingProgram._id}`,
          payload
        );

        const updatedProgram =
          response?.data?.program;

        if (updatedProgram) {
          setPrograms((previous) =>
            previous.map((program) =>
              program._id ===
              editingProgram._id
                ? updatedProgram
                : program
            )
          );
        }

        setSuccess(
          response?.data?.message ||
            "Program updated successfully."
        );
      } else {
        const response = await api.post(
          "/programs",
          payload
        );

        const newProgram =
          response?.data?.program;

        if (newProgram) {
          setPrograms((previous) => [
            newProgram,
            ...previous,
          ]);
        }

        setSuccess(
          response?.data?.message ||
            "Program created successfully."
        );
      }

      setTimeout(() => {
        setModalOpen(false);
        setEditingProgram(null);
        setForm(initialForm);
        setSuccess("");
      }, 500);
    } catch (err) {
      console.error(
        "Save program error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to save program."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     VIEW
  ========================= */

  const handleView = async (program) => {
    try {
      setError("");

      const response = await api.get(
        `/programs/${program._id}`
      );

      setViewingProgram(
        response?.data?.program ||
          program
      );

      setViewModalOpen(true);
    } catch (err) {
      console.error(
        "View program error:",
        err
      );

      setViewingProgram(program);
      setViewModalOpen(true);
    }
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = async () => {
    if (!deleteProgramId) return;

    try {
      setDeleting(true);
      setError("");

      const response = await api.delete(
        `/programs/${deleteProgramId}`
      );

      setPrograms((previous) =>
        previous.filter(
          (program) =>
            program._id !==
            deleteProgramId
        )
      );

      setSuccess(
        response?.data?.message ||
          "Program deleted successfully."
      );

      setDeleteProgramId(null);

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(
        "Delete program error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to delete program."
      );
    } finally {
      setDeleting(false);
    }
  };

  /* =========================
     DATE
  ========================= */

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-5 lg:p-8">

      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Academic Section
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Programs
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage academy programs and their
            basic information.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={18} />
          New Program
        </button>

      </div>

      {/* Success */}
      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Check size={17} />
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-sm font-bold text-slate-950">
              All Programs
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {programs.length}{" "}
              {programs.length === 1
                ? "program"
                : "programs"}
            </p>
          </div>

          <div className="relative w-full sm:w-[280px]">

            <Search
              size={17}
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
              placeholder="Search programs..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />

          </div>

        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading programs...
            </div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          /* Empty */
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <School size={25} />
            </div>

            <h3 className="text-sm font-bold text-slate-900">
              {programs.length === 0
                ? "No programs found"
                : "No matching programs"}
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {programs.length === 0
                ? "Create your first academic program to get started."
                : "Try changing your search term."}
            </p>

            {programs.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={17} />
                Create Program
              </button>
            )}

          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">

            <table className="min-w-[850px] w-full">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Program
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Code
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Duration
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Created
                  </th>

                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredPrograms.map(
                  (program) => (
                    <tr
                      key={program._id}
                      className="transition hover:bg-slate-50/70"
                    >

                      {/* Program */}
                      <td className="px-5 py-4">

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {program.name}
                          </p>

                          {program.description && (
                            <p className="mt-0.5 max-w-[320px] truncate text-xs text-slate-400">
                              {
                                program.description
                              }
                            </p>
                          )}
                        </div>

                      </td>

                      {/* Code */}
                      <td className="px-5 py-4">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tracking-wide text-slate-700">
                          {program.code}
                        </span>

                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {program.duration ||
                          "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            program.status ===
                            "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {program.status ===
                          "active"
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          program.createdAt
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">

                        <div className="flex items-center justify-end gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              handleView(
                                program
                              )
                            }
                            title="View"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                program
                              )
                            }
                            title="Edit"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteProgramId(
                                program._id
                              )
                            }
                            title="Delete"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2
                              size={17}
                            />
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingProgram
                    ? "Edit Program"
                    : "Create Program"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {editingProgram
                    ? "Update program information."
                    : "Add a new academic program."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>

            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6"
            >

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Program Name
                    <span className="text-red-500">
                      {" "}
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Martial Arts Training"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Program Code
                    <span className="text-red-500">
                      {" "}
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="e.g. MAT"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm uppercase text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Duration
                  </label>

                  <input
                    type="text"
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                    placeholder="e.g. 12 Months"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
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

              {/* Description */}
              <div className="mt-5">

                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter program description..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />

              </div>

              {/* Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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

                  {editingProgram
                    ? "Update Program"
                    : "Create Program"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* View Modal */}
      {viewModalOpen &&
        viewingProgram && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">

            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Program Details
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    {
                      viewingProgram.name
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewModalOpen(
                      false
                    );
                    setViewingProgram(
                      null
                    );
                  }}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={19} />
                </button>

              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Program Name
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      viewingProgram.name ||
                      "—"
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Code
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      viewingProgram.code ||
                      "—"
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Duration
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      viewingProgram.duration ||
                      "—"
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>

                  <span
                    className={[
                      "mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      viewingProgram.status ===
                      "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {viewingProgram.status ===
                    "active"
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Description
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {viewingProgram.description ||
                      "No description available."}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Created At
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(
                      viewingProgram.createdAt
                    )}
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

      {/* Delete Confirmation */}
      {deleteProgramId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h2 className="text-lg font-bold text-slate-950">
              Delete Program?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This action will permanently
              delete the selected program.
              Please make sure it is not
              required by any existing class
              or enrollment.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setDeleteProgramId(
                    null
                  )
                }
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {deleting && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Delete Program

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Programs;