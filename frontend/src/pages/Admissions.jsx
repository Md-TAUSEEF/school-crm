
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Eye,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../services/api";

const initialForm = {
  student: "",
  parent: "",
  academicSession: "",
  program: "",
  class: "",
  section: "",
  admissionDate: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition";

const getMessage = (
  error,
  fallback = "Something went wrong"
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getId = (value) =>
  value?._id ||
  value?.id ||
  value ||
  "";

const getName = (item) => {
  if (!item) return "";

  const fullName =
    `${item.firstName || ""} ${
      item.lastName || ""
    }`.trim();

  return (
    fullName ||
    item.name ||
    item.userId ||
    "Unnamed"
  );
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const toDateInputValue = (
  value
) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const statusClass = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";

    case "pending":
      return "bg-amber-50 text-amber-700";

    case "rejected":
      return "bg-red-50 text-red-700";

    case "cancelled":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
};

const Admissions = () => {
  const [admissions, setAdmissions] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [parents, setParents] =
    useState([]);

  const [sessions, setSessions] =
    useState([]);

  const [programs, setPrograms] =
    useState([]);

  const [classes, setClasses] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  const [form, setForm] =
    useState(initialForm);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [modal, setModal] =
    useState(null);

  const [selectedAdmission, setSelectedAdmission] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingOptions, setLoadingOptions] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/admissions"
        );

      const payload =
        response?.data;

      const items =
        Array.isArray(
          payload?.admissions
        )
          ? payload.admissions
          : Array.isArray(
              payload?.data
            )
          ? payload.data
          : [];

      setAdmissions(items);
    } catch (err) {
      console.error(
        "Admissions load error:",
        err
      );

      setAdmissions([]);

      setError(
        getMessage(
          err,
          "Unable to load admissions."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setFormError("");

      const [
        studentsResponse,
        parentsResponse,
        sessionsResponse,
        programsResponse,
        classesResponse,
        sectionsResponse,
      ] = await Promise.all([
        api.get("/students"),
        api.get("/parents"),
        api.get(
          "/academic-sessions"
        ),
        api.get("/programs"),
        api.get("/classes"),
        api.get("/sections"),
      ]);

      const extract = (
        response,
        keys = []
      ) => {
        const payload =
          response?.data;

        for (const key of keys) {
          if (
            Array.isArray(
              payload?.[key]
            )
          ) {
            return payload[key];
          }
        }

        if (
          Array.isArray(payload)
        ) {
          return payload;
        }

        if (
          Array.isArray(
            payload?.data
          )
        ) {
          return payload.data;
        }

        return [];
      };

      setStudents(
        extract(
          studentsResponse,
          [
            "students",
            "items",
          ]
        )
      );

      setParents(
        extract(
          parentsResponse,
          [
            "parents",
            "items",
          ]
        )
      );

      setSessions(
        extract(
          sessionsResponse,
          [
            "sessions",
            "items",
          ]
        )
      );

      setPrograms(
        extract(
          programsResponse,
          [
            "programs",
            "items",
          ]
        )
      );

      setClasses(
        extract(
          classesResponse,
          [
            "classes",
            "items",
          ]
        )
      );

      setSections(
        extract(
          sectionsResponse,
          [
            "sections",
            "items",
          ]
        )
      );
    } catch (err) {
      console.error(
        "Admission options error:",
        err
      );

      setFormError(
        getMessage(
          err,
          "Unable to load admission options."
        )
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
    loadOptions();
  }, []);

  const filteredAdmissions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return admissions.filter(
        (item) => {
          const studentName =
            getName(
              item?.student
            ).toLowerCase();

          const parentName =
            getName(
              item?.parent
            ).toLowerCase();

          const admissionNumber =
            (
              item?.admissionNumber ||
              ""
            ).toLowerCase();

          const status =
            (
              item?.status ||
              ""
            ).toLowerCase();

          const matchesSearch =
            !query ||
            studentName.includes(
              query
            ) ||
            parentName.includes(
              query
            ) ||
            admissionNumber.includes(
              query
            );

          const matchesStatus =
            !statusFilter ||
            status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      admissions,
      search,
      statusFilter,
    ]);

  const availableClasses =
    useMemo(() => {
      return classes.filter(
        (item) => {
          const sessionId =
            getId(
              item?.academicSession
            );

          const programId =
            getId(
              item?.program
            );

          return (
            (!form.academicSession ||
              sessionId ===
                form.academicSession) &&
            (!form.program ||
              programId ===
                form.program)
          );
        }
      );
    }, [
      classes,
      form.academicSession,
      form.program,
    ]);

  const availableSections =
    useMemo(() => {
      return sections.filter(
        (item) => {
          const classId =
            getId(item?.class);

          const sessionId =
            getId(
              item?.academicSession
            );

          return (
            (!form.class ||
              classId ===
                form.class) &&
            (!form.academicSession ||
              sessionId ===
                form.academicSession)
          );
        }
      );
    }, [
      sections,
      form.class,
      form.academicSession,
    ]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    if (
      name ===
      "academicSession"
    ) {
      setForm(
        (previous) => ({
          ...previous,
          academicSession:
            value,
          class: "",
          section: "",
        })
      );
    }

    if (
      name === "program"
    ) {
      setForm(
        (previous) => ({
          ...previous,
          program: value,
          class: "",
          section: "",
        })
      );
    }

    if (
      name === "class"
    ) {
      setForm(
        (previous) => ({
          ...previous,
          class: value,
          section: "",
        })
      );
    }
  };

  const openCreate = () => {
    setForm({
      ...initialForm,
      admissionDate:
        toDateInputValue(
          new Date()
        ),
    });

    setFormError("");
    setSuccess("");
    setModal("create");
  };

  const closeModal = () => {
    if (saving || actionLoading) {
      return;
    }

    setModal(null);
    setSelectedAdmission(null);
    setFormError("");
  };

  const handleCreate = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.student ||
      !form.parent ||
      !form.academicSession ||
      !form.program ||
      !form.class ||
      !form.section
    ) {
      setFormError(
        "Student, parent, academic session, program, class and section are required."
      );

      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccess("");

      const response =
        await api.post(
          "/admissions",
          {
            student:
              form.student,
            parent:
              form.parent,
            academicSession:
              form.academicSession,
            program:
              form.program,
            class:
              form.class,
            section:
              form.section,
            admissionDate:
              form.admissionDate ||
              undefined,
            notes:
              form.notes.trim(),
          }
        );

      const created =
        response?.data
          ?.admission;

      if (created) {
        setAdmissions(
          (previous) => [
            created,
            ...previous,
          ]
        );
      }

      setSuccess(
        response?.data
          ?.message ||
          "Admission created successfully."
      );

      setForm(initialForm);
      setModal(null);
    } catch (err) {
      console.error(
        "Create admission error:",
        err
      );

      setFormError(
        getMessage(
          err,
          "Unable to create admission."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove =
    async (admission) => {
      if (
        !admission?._id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Approve admission ${admission.admissionNumber}? This will automatically create an active enrollment.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(
          true
        );
        setError("");
        setSuccess("");

        const response =
          await api.put(
            `/admissions/${admission._id}/approve`
          );

        const updated =
          response?.data
            ?.admission;

        if (updated) {
          setAdmissions(
            (previous) =>
              previous.map(
                (item) =>
                  item._id ===
                  updated._id
                    ? updated
                    : item
              )
          );
        }

        setSuccess(
          response?.data
            ?.message ||
            "Admission approved and student enrolled successfully."
        );

        await loadAdmissions();
      } catch (err) {
        console.error(
          "Approve admission error:",
          err
        );

        setError(
          getMessage(
            err,
            "Unable to approve admission."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const handleReject =
    async (admission) => {
      if (
        !admission?._id
      ) {
        return;
      }

      const reason =
        window.prompt(
          "Enter rejection reason:"
        );

      if (
        !reason ||
        !reason.trim()
      ) {
        return;
      }

      try {
        setActionLoading(
          true
        );
        setError("");
        setSuccess("");

        const response =
          await api.put(
            `/admissions/${admission._id}/reject`,
            {
              rejectionReason:
                reason.trim(),
            }
          );

        const updated =
          response?.data
            ?.admission;

        if (updated) {
          setAdmissions(
            (previous) =>
              previous.map(
                (item) =>
                  item._id ===
                  updated._id
                    ? updated
                    : item
              )
          );
        }

        setSuccess(
          response?.data
            ?.message ||
            "Admission rejected successfully."
        );

        await loadAdmissions();
      } catch (err) {
        console.error(
          "Reject admission error:",
          err
        );

        setError(
          getMessage(
            err,
            "Unable to reject admission."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const openView = async (
    admission
  ) => {
    try {
      setModal("view");
      setSelectedAdmission(
        admission
      );

      const response =
        await api.get(
          `/admissions/${admission._id}`
        );

      if (
        response?.data
          ?.admission
      ) {
        setSelectedAdmission(
          response.data
            .admission
        );
      }
    } catch (err) {
      console.error(
        "Admission detail error:",
        err
      );
    }
  };

  return (
    <div className="min-h-screen px-5 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Admissions
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage student admissions and approve enrollment.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              loadAdmissions()
            }
            className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <RefreshCw
              size={16}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800`}
          >
            <Plus size={17} />
            New Admission
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search student, parent or admission number..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            Loading admissions...
          </div>
        ) : filteredAdmissions.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <UserPlus
                size={21}
                className="text-slate-500"
              />
            </div>

            <h3 className="text-sm font-semibold text-slate-900">
              No admissions found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a real admission for an enrolled student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Admission
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Parent
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Program
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Class / Section
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAdmissions.map(
                  (admission) => (
                    <tr
                      key={
                        admission._id
                      }
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {
                            admission.admissionNumber
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {getName(
                            admission.student
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {
                            admission
                              ?.student
                              ?.userId
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getName(
                          admission.parent
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {
                            admission
                              ?.program
                              ?.name ||
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            admission
                              ?.academicSession
                              ?.name ||
                            "—"
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {
                            admission
                              ?.class
                              ?.name ||
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            admission
                              ?.section
                              ?.name ||
                            "—"
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          admission.admissionDate
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                            admission.status
                          )}`}
                        >
                          {
                            admission.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openView(
                                admission
                              )
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            title="View"
                          >
                            <Eye
                              size={16}
                            />
                          </button>

                          {admission.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  actionLoading
                                }
                                onClick={() =>
                                  handleApprove(
                                    admission
                                  )
                                }
                                className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Approve"
                              >
                                <Check
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                disabled={
                                  actionLoading
                                }
                                onClick={() =>
                                  handleReject(
                                    admission
                                  )
                                }
                                className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Reject"
                              >
                                <X
                                  size={16}
                                />
                              </button>
                            </>
                          )}
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

      {/* Create Modal */}
      {modal === "create" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  New Admission
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Create a pending admission. Approval will create enrollment automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="space-y-5 p-6"
            >
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {loadingOptions ? (
                <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Loading admission options...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Student
                      </label>

                      <select
                        name="student"
                        value={
                          form.student
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select student
                        </option>

                        {students.map(
                          (student) => (
                            <option
                              key={
                                student._id
                              }
                              value={
                                student._id
                              }
                            >
                              {getName(
                                student
                              )}{" "}
                              {student.userId
                                ? `— ${student.userId}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Parent
                      </label>

                      <select
                        name="parent"
                        value={
                          form.parent
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select parent
                        </option>

                        {parents.map(
                          (parent) => (
                            <option
                              key={
                                parent._id
                              }
                              value={
                                parent._id
                              }
                            >
                              {getName(
                                parent
                              )}{" "}
                              {parent.userId
                                ? `— ${parent.userId}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Academic Session
                      </label>

                      <select
                        name="academicSession"
                        value={
                          form.academicSession
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select session
                        </option>

                        {sessions.map(
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
                              }{" "}
                              {session.code
                                ? `— ${session.code}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Program
                      </label>

                      <select
                        name="program"
                        value={
                          form.program
                        }
                        onChange={
                          handleChange
                        }
                        className={
                          inputClass
                        }
                      >
                        <option value="">
                          Select program
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
                              }{" "}
                              {program.code
                                ? `— ${program.code}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Class
                      </label>

                      <select
                        name="class"
                        value={
                          form.class
                        }
                        onChange={
                          handleChange
                        }
                        disabled={
                          !form.academicSession ||
                          !form.program
                        }
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50`}
                      >
                        <option value="">
                          Select class
                        </option>

                        {availableClasses.map(
                          (item) => (
                            <option
                              key={
                                item._id
                              }
                              value={
                                item._id
                              }
                            >
                              {
                                item.name
                              }{" "}
                              {item.code
                                ? `— ${item.code}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50`}
                      >
                        <option value="">
                          Select section
                        </option>

                        {availableSections.map(
                          (item) => (
                            <option
                              key={
                                item._id
                              }
                              value={
                                item._id
                              }
                            >
                              {
                                item.name
                              }{" "}
                              {item.code
                                ? `— ${item.code}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Admission Date
                    </label>

                    <input
                      type="date"
                      name="admissionDate"
                      value={
                        form.admissionDate
                      }
                      onChange={
                        handleChange
                      }
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                      placeholder="Optional admission notes..."
                      className={
                        inputClass
                      }
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
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
                  className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {saving
                    ? "Creating..."
                    : "Create Admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" &&
        selectedAdmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Admission Details
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {
                      selectedAdmission.admissionNumber
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getName(
                      selectedAdmission.student
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Parent
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getName(
                      selectedAdmission.parent
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Academic Session
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      selectedAdmission
                        ?.academicSession
                        ?.name
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      selectedAdmission
                        ?.program
                        ?.name
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Class
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      selectedAdmission
                        ?.class
                        ?.name
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Section
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {
                      selectedAdmission
                        ?.section
                        ?.name
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Admission Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(
                      selectedAdmission.admissionDate
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                      selectedAdmission.status
                    )}`}
                  >
                    {
                      selectedAdmission.status
                    }
                  </span>
                </div>

                {selectedAdmission.notes && (
                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Notes
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {
                        selectedAdmission.notes
                      }
                    </p>
                  </div>
                )}

                {selectedAdmission.rejectionReason && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                      Rejection Reason
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {
                        selectedAdmission.rejectionReason
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 px-6 py-4">
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
};

export default Admissions;
