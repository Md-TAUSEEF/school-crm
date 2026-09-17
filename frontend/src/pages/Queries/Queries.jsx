import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import { api } from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "admission", label: "Admission" },
  { value: "attendance", label: "Attendance" },
  { value: "progress", label: "Progress" },
  { value: "class", label: "Class" },
  { value: "schedule", label: "Schedule" },
  { value: "membership", label: "Membership" },
  { value: "renewal", label: "Renewal" },
  { value: "payment", label: "Payment" },
  { value: "trial", label: "Trial" },
  { value: "technical", label: "Technical" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const getList = (response) => {
  const data = response?.data?.data;

  // Actual Query API response:
  // data.queries
  if (Array.isArray(data?.queries)) {
    return data.queries;
  }

  // Generic fallback
  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  return [];
};

const getPagination = (response) => {
  const data = response?.data?.data;

  // Actual Query API pagination:
  // data.total
  // data.page
  // data.limit
  // data.totalPages
  return {
    page: Number(data?.page || 1),
    limit: Number(data?.limit || 10),
    total: Number(data?.total || 0),
    totalPages: Number(data?.totalPages || 1),
  };
};

const getObject = (response) => {
  const data = response?.data?.data;

  if (!data) {
    return null;
  }

  /*
    Detail API can return:
    data: { query object }
  */

  if (data?.query && typeof data.query === "object") {
    return data.query;
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    return data;
  }

  return null;
};

/* =========================================================
   FORMAT HELPERS
========================================================= */

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

const getUserName = (user) => {
  if (!user) return "—";

  if (typeof user === "string") {
    return user;
  }

  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user.name || user.email || "—";
};

const getStatusClass = (status) => {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "assigned":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "closed":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const getPriorityClass = (priority) => {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-700 border-red-200";

    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "low":
      return "bg-slate-50 text-slate-600 border-slate-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const prettyText = (value) => {
  if (!value) return "—";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getQueryId = (query) => query?._id || query?.id;

/* =========================================================
   MAIN PAGE
========================================================= */

function Queries() {
  const [queries, setQueries] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showAssign, setShowAssign] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const hasFilters = useMemo(
    () => Boolean(search || status || priority || category),
    [search, status, priority, category]
  );

  /* =========================================================
     FETCH QUERIES
  ========================================================= */

  const fetchQueries = async (page = 1, isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = {
        page,
        limit: 10,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status) {
        params.status = status;
      }

      if (priority) {
        params.priority = priority;
      }

      if (category) {
        params.category = category;
      }

      const response = await api.get("/queries", {
        params,
      });

      const list = getList(response);
      const pageData = getPagination(response);

      setQueries(list);
      setPagination(pageData);
    } catch (err) {
      console.error("Fetch queries error:", err);

      setQueries([]);

      setError(
        err?.response?.data?.message ||
          "Unable to load queries. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueries(1);
  }, [status, priority, category]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchQueries(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setCategory("");

    setTimeout(() => {
      fetchQueries(1);
    }, 0);
  };

  /* =========================================================
     OPEN QUERY DETAILS
  ========================================================= */

  const openQuery = async (query) => {
    const queryId = getQueryId(query);

    if (!queryId) {
      return;
    }

    try {
      setSelectedQuery(query);
      setSelectedStatus(query.status || "");
      setInternalNotes(query.internalNotes || "");
      setReplyMessage("");
      setActionError("");
      setActionSuccess("");
      setDetailsLoading(true);

      const response = await api.get(`/queries/${queryId}`);

      const details = getObject(response);

      if (details) {
        setSelectedQuery(details);
        setSelectedStatus(details.status || "");
        setInternalNotes(details.internalNotes || "");
      }
    } catch (err) {
      console.error("Query details error:", err);

      setActionError(
        err?.response?.data?.message ||
          "Unable to load query details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (actionLoading) return;

    setSelectedQuery(null);
    setReplyMessage("");
    setActionError("");
    setActionSuccess("");
    setShowAssign(false);
  };

  /* =========================================================
     REFRESH SELECTED QUERY
  ========================================================= */

  const refreshSelectedQuery = async () => {
    if (!selectedQuery) return;

    const queryId = getQueryId(selectedQuery);

    if (!queryId) return;

    try {
      const response = await api.get(`/queries/${queryId}`);

      const details = getObject(response);

      if (details) {
        setSelectedQuery(details);
        setSelectedStatus(details.status || "");
        setInternalNotes(details.internalNotes || "");
      }
    } catch (err) {
      console.error(
        "Refresh query details error:",
        err
      );
    }
  };

  /* =========================================================
     REPLY
  ========================================================= */

  const handleReply = async () => {
    if (!selectedQuery || !replyMessage.trim()) {
      return;
    }

    const queryId = getQueryId(selectedQuery);

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await api.post(
        `/queries/${queryId}/replies`,
        {
          message: replyMessage.trim(),
          isInternal: false,
        }
      );

      setReplyMessage("");

      setActionSuccess(
        "Reply added successfully."
      );

      await refreshSelectedQuery();

      await fetchQueries(
        pagination.page,
        true
      );
    } catch (err) {
      console.error("Reply error:", err);

      setActionError(
        err?.response?.data?.message ||
          "Unable to send reply."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     INTERNAL NOTES
  ========================================================= */

  const handleInternalNotes = async () => {
    if (!selectedQuery) return;

    const queryId = getQueryId(selectedQuery);

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await api.put(
        `/queries/${queryId}/internal-notes`,
        {
          internalNotes: internalNotes.trim(),
        }
      );

      setActionSuccess(
        "Internal notes updated successfully."
      );

      await refreshSelectedQuery();

      await fetchQueries(
        pagination.page,
        true
      );
    } catch (err) {
      console.error(
        "Internal notes error:",
        err
      );

      setActionError(
        err?.response?.data?.message ||
          "Unable to update internal notes."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     STATUS UPDATE
  ========================================================= */

  const handleStatusChange = async () => {
    if (!selectedQuery || !selectedStatus) {
      return;
    }

    const queryId = getQueryId(selectedQuery);

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await api.put(
        `/queries/${queryId}/status`,
        {
          status: selectedStatus,
        }
      );

      setActionSuccess(
        "Query status updated successfully."
      );

      await refreshSelectedQuery();

      await fetchQueries(
        pagination.page,
        true
      );
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setActionError(
        err?.response?.data?.message ||
          "Unable to update query status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     FETCH TEACHERS
  ========================================================= */

  const fetchTeachers = async () => {
    try {
      const response = await api.get(
        "/teachers",
        {
          params: {
            page: 1,
            limit: 100,
          },
        }
      );

      const list = getList(response);

      setTeachers(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      console.error(
        "Fetch teachers error:",
        err
      );

      setTeachers([]);

      setActionError(
        err?.response?.data?.message ||
          "Unable to load staff members."
      );
    }
  };

  /* =========================================================
     OPEN ASSIGN
  ========================================================= */

  const openAssign = async () => {
    if (!selectedQuery) return;

    setActionError("");
    setActionSuccess("");

    setSelectedAssignee(
      selectedQuery?.assignedTo?._id ||
        selectedQuery?.assignedTo ||
        ""
    );

    setShowAssign(true);

    await fetchTeachers();
  };

  /* =========================================================
     ASSIGN
  ========================================================= */

  const handleAssign = async () => {
    if (
      !selectedQuery ||
      !selectedAssignee
    ) {
      return;
    }

    const queryId = getQueryId(selectedQuery);

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await api.put(
        `/queries/${queryId}/assign`,
        {
          assignedTo: selectedAssignee,
        }
      );

      setShowAssign(false);

      setActionSuccess(
        "Query assigned successfully."
      );

      await refreshSelectedQuery();

      await fetchQueries(
        pagination.page,
        true
      );
    } catch (err) {
      console.error(
        "Assign query error:",
        err
      );

      setActionError(
        err?.response?.data?.message ||
          "Unable to assign query."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     CLOSE QUERY
  ========================================================= */

  const handleCloseQuery = async () => {
    if (!selectedQuery) return;

    const queryId = getQueryId(selectedQuery);

    const confirmed = window.confirm(
      "Are you sure you want to close this query?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await api.put(
        `/queries/${queryId}/close`
      );

      setActionSuccess(
        "Query closed successfully."
      );

      await refreshSelectedQuery();

      await fetchQueries(
        pagination.page,
        true
      );
    } catch (err) {
      console.error(
        "Close query error:",
        err
      );

      setActionError(
        err?.response?.data?.message ||
          "Unable to close query."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     STATS
  ========================================================= */

  const stats = useMemo(() => {
    return {
      total:
        pagination.total || queries.length,

      open: queries.filter(
        (item) => item.status === "open"
      ).length,

      progress: queries.filter(
        (item) =>
          item.status === "in_progress"
      ).length,

      urgent: queries.filter(
        (item) =>
          item.priority === "urgent"
      ).length,
    };
  }, [queries, pagination.total]);

  return (
    <div className="min-h-full bg-slate-50 px-5 py-8 lg:px-8">

      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600">
            <MessageSquare size={16} />
            Support & Queries
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Queries
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage parent, student, visitor and
            academy support queries from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            fetchQueries(
              pagination.page,
              true
            )
          }
          disabled={refreshing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total queries"
          value={stats.total}
          icon={
            <MessageSquare size={19} />
          }
        />

        <StatCard
          label="Open on this page"
          value={stats.open}
          icon={
            <AlertCircle size={19} />
          }
        />

        <StatCard
          label="In progress"
          value={stats.progress}
          icon={<Clock3 size={19} />}
        />

        <StatCard
          label="Urgent on this page"
          value={stats.urgent}
          icon={<XCircle size={19} />}
        />
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1"
          >
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search query number, subject, message..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
            />
          </form>

          <button
            type="button"
            onClick={() =>
              setShowFilters((value) => !value)
            }
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              showFilters || hasFilters
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={17} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-slate-100 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SelectField
                label="Status"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
              />

              <SelectField
                label="Priority"
                value={priority}
                onChange={setPriority}
                options={PRIORITY_OPTIONS}
              />

              <SelectField
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="font-semibold">
              Unable to load queries
            </p>

            <p className="mt-1 text-red-600">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchQueries(pagination.page)
            }
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState />
        ) : queries.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Query
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      From
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Priority
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Assigned
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Created
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {queries.map((query) => (
                    <QueryRow
                      key={getQueryId(query)}
                      query={query}
                      onOpen={() =>
                        openQuery(query)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={pagination}
              onChange={(page) =>
                fetchQueries(page)
              }
            />
          </>
        )}
      </div>

      {/* Details Drawer */}
      {selectedQuery && (
        <QueryDetails
          query={selectedQuery}
          loading={detailsLoading}
          actionLoading={actionLoading}
          actionError={actionError}
          actionSuccess={actionSuccess}
          replyMessage={replyMessage}
          setReplyMessage={setReplyMessage}
          internalNotes={internalNotes}
          setInternalNotes={setInternalNotes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          showAssign={showAssign}
          setShowAssign={setShowAssign}
          teachers={teachers}
          selectedAssignee={selectedAssignee}
          setSelectedAssignee={setSelectedAssignee}
          onClose={closeDetails}
          onReply={handleReply}
          onSaveNotes={handleInternalNotes}
          onStatusChange={handleStatusChange}
          onOpenAssign={openAssign}
          onAssign={handleAssign}
          onCloseQuery={handleCloseQuery}
        />
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
      >
        {options.map((option) => (
          <option
            key={option.value || "all"}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================================================
   QUERY ROW
========================================================= */

function QueryRow({
  query,
  onOpen,
}) {
  const visitorName =
    query?.visitorName ||
    getUserName(query?.createdBy) ||
    getUserName(query?.parent) ||
    getUserName(query?.student);

  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="max-w-[300px]">
          <p className="truncate text-sm font-bold text-slate-950">
            {query?.subject ||
              "Untitled query"}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            {query?.queryNumber ||
              "No query number"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {visitorName}
          </p>

          {query?.visitorEmail && (
            <p className="mt-1 text-xs text-slate-400">
              {query.visitorEmail}
            </p>
          )}

          {query?.parent &&
            !query?.visitorEmail && (
              <p className="mt-1 text-xs text-slate-400">
                Parent
              </p>
            )}
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm font-medium text-slate-600">
          {prettyText(query?.category)}
        </span>
      </td>

      <td className="px-5 py-4">
        <Badge
          className={getPriorityClass(
            query?.priority
          )}
        >
          {prettyText(
            query?.priority
          )}
        </Badge>
      </td>

      <td className="px-5 py-4">
        <Badge
          className={getStatusClass(
            query?.status
          )}
        >
          {prettyText(
            query?.status
          )}
        </Badge>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm font-medium text-slate-600">
          {getUserName(
            query?.assignedTo
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="whitespace-nowrap text-sm text-slate-500">
          {formatDate(
            query?.createdAt
          )}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Eye size={16} />
          View
        </button>
      </td>
    </tr>
  );
}

/* =========================================================
   BADGE
========================================================= */

function Badge({
  children,
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

/* =========================================================
   PAGINATION
========================================================= */

function Pagination({
  pagination,
  onChange,
}) {
  const currentPage = Number(
    pagination?.page || 1
  );

  const totalPages = Number(
    pagination?.totalPages || 1
  );

  if (totalPages <= 1) {
    const total = Number(
      pagination?.total || 0
    );

    return (
      <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
        {total
          ? `${total} ${
              total === 1
                ? "query"
                : "queries"
            }`
          : "No queries"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Page{" "}
        <span className="font-semibold text-slate-800">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-800">
          {totalPages}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() =>
            onChange(currentPage - 1)
          }
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <button
          type="button"
          disabled={
            currentPage >= totalPages
          }
          onClick={() =>
            onChange(currentPage + 1)
          }
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING STATE
========================================================= */

function LoadingState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-5">
      <Loader2
        size={30}
        className="animate-spin text-red-600"
      />

      <p className="mt-4 text-sm font-semibold text-slate-700">
        Loading queries...
      </p>

      <p className="mt-1 text-sm text-slate-400">
        Fetching real CRM data.
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  hasFilters,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <MessageSquare size={26} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950">
        {hasFilters
          ? "No matching queries"
          : "No queries yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No real query records match the selected search and filters."
          : "There are currently no query records in the system. New visitor, parent or student queries will appear here."}
      </p>
    </div>
  );
}

/* =========================================================
   QUERY DETAILS DRAWER
========================================================= */

function QueryDetails({
  query,
  loading,
  actionLoading,
  actionError,
  actionSuccess,
  replyMessage,
  setReplyMessage,
  internalNotes,
  setInternalNotes,
  selectedStatus,
  setSelectedStatus,
  showAssign,
  setShowAssign,
  teachers,
  selectedAssignee,
  setSelectedAssignee,
  onClose,
  onReply,
  onSaveNotes,
  onStatusChange,
  onOpenAssign,
  onAssign,
  onCloseQuery,
}) {
  const replies = Array.isArray(
    query?.replies
  )
    ? query.replies
    : [];

  const isClosed =
    query?.status === "closed";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">

        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                {query?.queryNumber ||
                  "Query"}
              </span>

              <Badge
                className={getStatusClass(
                  query?.status
                )}
              >
                {prettyText(
                  query?.status
                )}
              </Badge>

              <Badge
                className={getPriorityClass(
                  query?.priority
                )}
              >
                {prettyText(
                  query?.priority
                )}
              </Badge>
            </div>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {query?.subject ||
                "Untitled query"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Created{" "}
              {formatDateTime(
                query?.createdAt
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-red-600"
              />
            </div>
          ) : (
            <div className="space-y-6 p-6">

              {/* Feedback */}
              {actionError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {actionError}
                  </span>
                </div>
              )}

              {actionSuccess && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {actionSuccess}
                  </span>
                </div>
              )}

              {/* Query information */}
              <section>
                <SectionTitle title="Query information" />

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoItem
                    label="Category"
                    value={prettyText(
                      query?.category
                    )}
                  />

                  <InfoItem
                    label="Priority"
                    value={prettyText(
                      query?.priority
                    )}
                  />

                  <InfoItem
                    label="Created"
                    value={formatDateTime(
                      query?.createdAt
                    )}
                  />

                  <InfoItem
                    label="Updated"
                    value={formatDateTime(
                      query?.updatedAt
                    )}
                  />
                </div>
              </section>

              {/* Sender */}
              <section>
                <SectionTitle title="Raised by" />

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    {query?.visitorName ||
                      getUserName(
                        query?.createdBy
                      ) ||
                      getUserName(
                        query?.parent
                      ) ||
                      getUserName(
                        query?.student
                      )}
                  </p>

                  {query?.visitorEmail && (
                    <p className="mt-1 text-sm text-slate-500">
                      {query.visitorEmail}
                    </p>
                  )}

                  {query?.visitorPhone && (
                    <p className="mt-1 text-sm text-slate-500">
                      {query.visitorPhone}
                    </p>
                  )}

                  {query?.parent && (
                    <p className="mt-2 text-xs text-slate-400">
                      Parent:{" "}
                      <span className="font-semibold text-slate-600">
                        {getUserName(
                          query.parent
                        )}
                      </span>
                    </p>
                  )}

                  {query?.student && (
                    <p className="mt-1 text-xs text-slate-400">
                      Student:{" "}
                      <span className="font-semibold text-slate-600">
                        {getUserName(
                          query.student
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </section>

              {/* Message */}
              <section>
                <SectionTitle title="Original message" />

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  {query?.message ||
                    "No message provided."}
                </div>
              </section>

              {/* Assignment */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionTitle title="Assignment" />

                  {!isClosed && (
                    <button
                      type="button"
                      onClick={
                        onOpenAssign
                      }
                      disabled={
                        actionLoading
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <UserCheck
                        size={15}
                      />

                      Assign
                    </button>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assigned to
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {getUserName(
                      query?.assignedTo
                    )}
                  </p>
                </div>

                {showAssign && (
                  <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Staff / Teacher
                      </span>

                      <select
                        value={
                          selectedAssignee
                        }
                        onChange={(event) =>
                          setSelectedAssignee(
                            event.target
                              .value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                      >
                        <option value="">
                          Select staff member
                        </option>

                        {teachers.map(
                          (teacher) => {
                            const id =
                              teacher?._id ||
                              teacher?.user?._id;

                            const name =
                              getUserName(
                                teacher?.user
                              ) ||
                              getUserName(
                                teacher
                              );

                            if (!id) {
                              return null;
                            }

                            return (
                              <option
                                key={id}
                                value={id}
                              >
                                {name}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </label>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={onAssign}
                        disabled={
                          actionLoading ||
                          !selectedAssignee
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading && (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        )}

                        Save assignment
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowAssign(
                            false
                          )
                        }
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Status */}
              {!isClosed && (
                <section>
                  <SectionTitle title="Update status" />

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <select
                      value={
                        selectedStatus
                      }
                      onChange={(event) =>
                        setSelectedStatus(
                          event.target
                            .value
                        )
                      }
                      className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
                    >
                      {STATUS_OPTIONS.filter(
                        (option) =>
                          option.value
                      ).map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={
                        onStatusChange
                      }
                      disabled={
                        actionLoading ||
                        !selectedStatus ||
                        selectedStatus ===
                          query?.status
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      )}

                      Update
                    </button>
                  </div>
                </section>
              )}

              {/* Replies */}
              <section>
                <SectionTitle
                  title={`Conversation (${replies.length})`}
                />

                <div className="mt-3 space-y-3">
                  {replies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No replies yet.
                    </div>
                  ) : (
                    replies.map(
                      (reply) => (
                        <div
                          key={
                            reply?._id ||
                            `${reply?.createdAt}-${reply?.message}`
                          }
                          className={`rounded-xl border p-4 ${
                            reply?.isInternal
                              ? "border-amber-200 bg-amber-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {reply?.sender
                                  ? getUserName(
                                      reply.sender
                                    )
                                  : prettyText(
                                      reply?.senderType
                                    )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {formatDateTime(
                                  reply?.createdAt
                                )}
                              </p>
                            </div>

                            {reply?.isInternal && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Internal
                              </span>
                            )}
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {reply?.message}
                          </p>
                        </div>
                      )
                    )
                  )}
                </div>

                {!isClosed && (
                  <div className="mt-4">
                    <textarea
                      value={replyMessage}
                      onChange={(event) =>
                        setReplyMessage(
                          event.target
                            .value
                        )
                      }
                      rows={4}
                      placeholder="Write a reply..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                    />

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={onReply}
                        disabled={
                          actionLoading ||
                          !replyMessage.trim()
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Send size={16} />
                        )}

                        Send reply
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Internal Notes */}
              <section>
                <SectionTitle title="Internal notes" />

                <div className="mt-3">
                  <textarea
                    value={internalNotes}
                    onChange={(event) =>
                      setInternalNotes(
                        event.target
                          .value
                      )
                    }
                    rows={4}
                    disabled={isClosed}
                    placeholder="Only staff can see these notes..."
                    className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {!isClosed && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={
                          onSaveNotes
                        }
                        disabled={
                          actionLoading
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {actionLoading && (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        )}

                        Save notes
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-between">
            <div>
              {!isClosed && (
                <button
                  type="button"
                  onClick={
                    onCloseQuery
                  }
                  disabled={
                    actionLoading
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  Close query
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
}) {
  return (
    <h3 className="text-sm font-bold text-slate-950">
      {title}
    </h3>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

export default Queries;