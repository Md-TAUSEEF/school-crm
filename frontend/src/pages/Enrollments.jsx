
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Eye,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../services/api";

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

const statusClass = (status) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700";

    case "completed":
      return "bg-blue-50 text-blue-700";

    case "transferred":
      return "bg-amber-50 text-amber-700";

    case "withdrawn":
      return "bg-red-50 text-red-700";

    case "cancelled":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
};

const Enrollments = () => {
  const [enrollments, setEnrollments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [selectedEnrollment, setSelectedEnrollment] =
    useState(null);

  const loadEnrollments =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            "/enrollments"
          );

        const payload =
          response?.data;

        const items =
          Array.isArray(
            payload?.enrollments
          )
            ? payload.enrollments
            : Array.isArray(
                payload?.data
              )
            ? payload.data
            : Array.isArray(
                payload
              )
            ? payload
            : [];

        setEnrollments(items);
      } catch (err) {
        console.error(
          "Enrollments load error:",
          err
        );

        setEnrollments([]);

        setError(
          getMessage(
            err,
            "Unable to load enrollments."
          )
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadEnrollments();
  }, []);

  const filteredEnrollments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return enrollments.filter(
        (item) => {
          const student =
            getName(
              item?.student
            ).toLowerCase();

          const userId =
            (
              item?.student
                ?.userId ||
              ""
            ).toLowerCase();

          const session =
            (
              item
                ?.academicSession
                ?.name ||
              ""
            ).toLowerCase();

          const program =
            (
              item?.program
                ?.name || ""
            ).toLowerCase();

          const className =
            (
              item?.class
                ?.name || ""
            ).toLowerCase();

          const section =
            (
              item?.section
                ?.name || ""
            ).toLowerCase();

          const matchesSearch =
            !query ||
            student.includes(
              query
            ) ||
            userId.includes(
              query
            ) ||
            session.includes(
              query
            ) ||
            program.includes(
              query
            ) ||
            className.includes(
              query
            ) ||
            section.includes(
              query
            );

          const matchesStatus =
            !statusFilter ||
            item?.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      enrollments,
      search,
      statusFilter,
    ]);

  return (
    <div className="min-h-screen px-5 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Enrollments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View students who have been enrolled through approved admissions.
          </p>
        </div>

        <button
          type="button"
          onClick={
            loadEnrollments
          }
          className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
              placeholder="Search student, session, program, class..."
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

            <option value="active">
              Active
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="transferred">
              Transferred
            </option>

            <option value="withdrawn">
              Withdrawn
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
            Loading enrollments...
          </div>
        ) : filteredEnrollments.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No enrollments found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Approve a pending admission to automatically create an enrollment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Academic Session
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Program
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Class
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Section
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Enrollment Date
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Roll Number
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEnrollments.map(
                  (item) => (
                    <tr
                      key={
                        item._id
                      }
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {getName(
                            item.student
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {
                            item
                              ?.student
                              ?.userId
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {
                            item
                              ?.academicSession
                              ?.name ||
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            item
                              ?.academicSession
                              ?.code ||
                            ""
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {
                          item?.program
                            ?.name ||
                          "—"
                        }
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {
                            item?.class
                              ?.name ||
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            item?.class
                              ?.code ||
                            ""
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {
                            item
                              ?.section
                              ?.name ||
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            item
                              ?.section
                              ?.code ||
                            ""
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          item.enrollmentDate
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.rollNumber ||
                          "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                            item.status
                          )}`}
                        >
                          {
                            item.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEnrollment(
                                item
                              )
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            title="View enrollment"
                          >
                            <Eye
                              size={16}
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

      {/* View Modal */}
      {selectedEnrollment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Enrollment Details
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {
                    selectedEnrollment
                      ?.student
                      ?.userId
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedEnrollment(
                    null
                  )
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
                    selectedEnrollment.student
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                    selectedEnrollment.status
                  )}`}
                >
                  {
                    selectedEnrollment.status
                  }
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Academic Session
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {
                    selectedEnrollment
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
                    selectedEnrollment
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
                    selectedEnrollment
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
                    selectedEnrollment
                      ?.section
                      ?.name
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Enrollment Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(
                    selectedEnrollment.enrollmentDate
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Roll Number
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedEnrollment.rollNumber ||
                    "Not assigned"}
                </p>
              </div>

              {selectedEnrollment.notes && (
                <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Notes
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {
                      selectedEnrollment.notes
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedEnrollment(
                    null
                  )
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

export default Enrollments;
