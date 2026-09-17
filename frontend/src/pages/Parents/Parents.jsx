
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  X,
  Users,
  UserRound,
  Link2,
  Unlink,
  Bell,
  Star,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { api } from "../../services/api";

const PAGE_SIZE = 10;

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  occupation: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  emergencyContact: "",
  status: "active",
};

const initialRelationshipForm = {
  student: "",
  relationship: "",
  isPrimary: false,
  canReceiveNotifications: true,
};

const statusOptions = ["active", "inactive", "suspended"];

const relationshipOptions = [
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Guardian", value: "guardian" },
  { label: "Grandfather", value: "grandfather" },
  { label: "Grandmother", value: "grandmother" },
  { label: "Uncle", value: "uncle" },
  { label: "Aunt", value: "aunt" },
  { label: "Sibling", value: "sibling" },
  { label: "Other", value: "other" },
];

const getApiData = (response) => {
  return response?.data?.data ?? response?.data ?? {};
};

const getApiMessage = (response, fallback) => {
  return (
    response?.data?.message ||
    response?.data?.error ||
    fallback
  );
};

const getParentList = (response) => {
  const data = getApiData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.parents)) {
    return data.parents;
  }

  if (Array.isArray(response?.data?.parents)) {
    return response.data.parents;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};

const getStudentList = (response) => {
  const data = getApiData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.students)) {
    return data.students;
  }

  if (Array.isArray(response?.data?.students)) {
    return response.data.students;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};

const getChildrenList = (response) => {
  const data = getApiData(response);

  if (Array.isArray(data.children)) {
    return data.children;
  }

  if (Array.isArray(response?.data?.children)) {
    return response.data.children;
  }

  return [];
};

const getParentFromResponse = (response) => {
  const data = getApiData(response);

  if (data?.parent) {
    return data.parent;
  }

  if (response?.data?.parent) {
    return response.data.parent;
  }

  return data;
};

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  const name = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  return name || student.userId || "Unknown Student";
};

const getParentName = (parent) => {
  if (!parent) return "Unknown Parent";

  const name = `${parent.firstName || ""} ${
    parent.lastName || ""
  }`.trim();

  return name || parent.userId || "Unknown Parent";
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

const statusClass = (status) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "inactive":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "suspended":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

function Modal({ title, children, onClose, maxWidth = "max-w-4xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full ${maxWidth} max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-70px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
}) {
  const styles = {
    primary:
      "bg-teal-600 text-white hover:bg-teal-700",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger:
      "bg-red-600 text-white hover:bg-red-700",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] =
    useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [selectedParent, setSelectedParent] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  const [relationshipForm, setRelationshipForm] =
    useState(initialRelationshipForm);

  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] =
    useState(false);

  const [relationshipEditingId, setRelationshipEditingId] =
    useState(null);

  const [relationshipError, setRelationshipError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const fetchParents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/parents");

      const list = getParentList(response);

      setParents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch parents error:", err);

      setError(
        getApiMessage(
          err?.response,
          "Failed to fetch parents"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);

      const response = await api.get("/students", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const list = getStudentList(response);

      setStudents(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      console.error("Fetch students error:", err);

      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchChildren = async (parentId) => {
    if (!parentId) return;

    try {
      setChildrenLoading(true);
      setRelationshipError("");

      const response = await api.get(
        `/guardians/parent/${parentId}`
      );

      const list = getChildrenList(response);

      setChildren(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      console.error(
        "Fetch parent children error:",
        err
      );

      setChildren([]);

      setRelationshipError(
        getApiMessage(
          err?.response,
          "Failed to fetch linked students"
        )
      );
    } finally {
      setChildrenLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filteredParents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return parents.filter((parent) => {
      const matchesStatus =
        statusFilter === "all" ||
        parent.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      const searchableText = [
        parent.firstName,
        parent.lastName,
        parent.userId,
        parent.email,
        parent.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [parents, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredParents.length / PAGE_SIZE
    )
  );

  const visibleParents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredParents.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredParents, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openCreateModal = () => {
    setForm(initialForm);
    setSelectedParent(null);
    setError("");
    setModal("create");
  };

  const openEditModal = async (parent) => {
    try {
      setActionLoading(true);
      setError("");

      const response = await api.get(
        `/parents/${parent._id}`
      );

      const fullParent =
        getParentFromResponse(response);

      const profile =
        fullParent?.profile || {};

      setSelectedParent(fullParent);

      setForm({
        firstName:
          fullParent?.firstName || "",
        lastName:
          fullParent?.lastName || "",
        email:
          fullParent?.email || "",
        phone:
          fullParent?.phone || "",
        password: "",
        occupation:
          profile?.occupation || "",
        address:
          profile?.address || "",
        city:
          profile?.city || "",
        state:
          profile?.state || "",
        postalCode:
          profile?.postalCode || "",
        emergencyContact:
          profile?.emergencyContact || "",
        status:
          fullParent?.status || "active",
      });

      setModal("edit");
    } catch (err) {
      console.error(
        "Fetch parent for edit error:",
        err
      );

      setError(
        getApiMessage(
          err?.response,
          "Failed to load parent details"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openViewModal = async (parent) => {
    try {
      setActionLoading(true);
      setError("");

      const response = await api.get(
        `/parents/${parent._id}`
      );

      const fullParent =
        getParentFromResponse(response);

      setSelectedParent(fullParent);
      setChildren([]);
      setRelationshipError("");

      setModal("view");

      await fetchChildren(parent._id);
    } catch (err) {
      console.error(
        "Fetch parent details error:",
        err
      );

      setError(
        getApiMessage(
          err?.response,
          "Failed to load parent details"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openRelationshipModal = async (parent) => {
    try {
      setSelectedParent(parent);
      setRelationshipForm(
        initialRelationshipForm
      );
      setRelationshipEditingId(null);
      setRelationshipError("");

      setModal("relationship");

      await fetchChildren(parent._id);
    } catch (err) {
      console.error(err);
    }
  };

  const closeModal = () => {
    if (actionLoading) return;

    setModal(null);
    setSelectedParent(null);
    setChildren([]);
    setRelationshipForm(
      initialRelationshipForm
    );
    setRelationshipEditingId(null);
    setRelationshipError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateParent = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);
      setError("");
      setSuccessMessage("");

      if (
        !form.firstName.trim() ||
        !form.email.trim() ||
        !form.password
      ) {
        setError(
          "First name, email and password are required"
        );
        return;
      }

      if (form.password.length < 6) {
        setError(
          "Password must be at least 6 characters"
        );
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        occupation: form.occupation.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        emergencyContact:
          form.emergencyContact.trim(),
        status: form.status,
      };

      const response = await api.post(
        "/parents",
        payload
      );

      setSuccessMessage(
        getApiMessage(
          response,
          "Parent created successfully"
        )
      );

      closeModal();
      await fetchParents();
    } catch (err) {
      console.error(
        "Create parent error:",
        err
      );

      setError(
        getApiMessage(
          err?.response,
          "Failed to create parent"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateParent = async (event) => {
    event.preventDefault();

    if (!selectedParent?._id) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.firstName.trim()) {
        setError(
          "First name cannot be empty"
        );
        return;
      }

      if (!form.email.trim()) {
        setError(
          "Email cannot be empty"
        );
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email
          .trim()
          .toLowerCase(),
        phone: form.phone.trim(),
        occupation: form.occupation.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        emergencyContact:
          form.emergencyContact.trim(),
        status: form.status,
      };

      if (form.password.trim()) {
        payload.password =
          form.password.trim();
      }

      const response = await api.put(
        `/parents/${selectedParent._id}`,
        payload
      );

      setSuccessMessage(
        getApiMessage(
          response,
          "Parent updated successfully"
        )
      );

      closeModal();
      await fetchParents();
    } catch (err) {
      console.error(
        "Update parent error:",
        err
      );

      setError(
        getApiMessage(
          err?.response,
          "Failed to update parent"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelationshipChange = (event) => {
    const { name, value, type, checked } =
      event.target;

    setRelationshipForm((current) => ({
      ...current,
      [name]:
        type === "checkbox" ? checked : value,
    }));
  };

  const handleLinkStudent = async (event) => {
    event.preventDefault();

    if (!selectedParent?._id) return;

    try {
      setActionLoading(true);
      setRelationshipError("");

      if (!relationshipForm.student) {
        setRelationshipError(
          "Please select a student"
        );
        return;
      }

      if (!relationshipForm.relationship.trim()) {
        setRelationshipError(
          "Please select a relationship"
        );
        return;
      }

      const payload = {
        student: relationshipForm.student,
        parent: selectedParent._id,
        relationship:
          relationshipForm.relationship.trim(),
        isPrimary:
          Boolean(
            relationshipForm.isPrimary
          ),
        canReceiveNotifications:
          Boolean(
            relationshipForm.canReceiveNotifications
          ),
        status: "active",
      };

      await api.post(
        "/guardians",
        payload
      );

      setSuccessMessage(
        "Student linked with parent successfully"
      );

      setRelationshipForm(
        initialRelationshipForm
      );

      await fetchChildren(
        selectedParent._id
      );
    } catch (err) {
      console.error(
        "Link student error:",
        err
      );

      setRelationshipError(
        getApiMessage(
          err?.response,
          "Failed to link student"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRelationship = async (
    relationshipId,
    updates
  ) => {
    try {
      setActionLoading(true);
      setRelationshipError("");

      await api.put(
        `/guardians/${relationshipId}`,
        updates
      );

      setSuccessMessage(
        "Student relationship updated successfully"
      );

      await fetchChildren(
        selectedParent._id
      );
    } catch (err) {
      console.error(
        "Update relationship error:",
        err
      );

      setRelationshipError(
        getApiMessage(
          err?.response,
          "Failed to update relationship"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkStudent = async (
    relationshipId,
    studentName
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to unlink ${studentName} from this parent?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setRelationshipError("");

      await api.delete(
        `/guardians/${relationshipId}`
      );

      setSuccessMessage(
        "Student unlinked successfully"
      );

      await fetchChildren(
        selectedParent._id
      );
    } catch (err) {
      console.error(
        "Unlink student error:",
        err
      );

      setRelationshipError(
        getApiMessage(
          err?.response,
          "Failed to unlink student"
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setSuccessMessage("");
    await Promise.all([
      fetchParents(),
      fetchStudents(),
    ]);
  };

  const selectedStudentIds = useMemo(() => {
    return new Set(
      children
        .map((item) => item?.student?._id)
        .filter(Boolean)
    );
  }, [children]);

  const availableStudents = useMemo(() => {
    return students.filter(
      (student) =>
        !selectedStudentIds.has(student._id)
    );
  }, [students, selectedStudentIds]);

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-xl bg-teal-100 p-2 text-teal-700">
                <Users size={20} />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Parents
              </h1>
            </div>

            <p className="text-sm text-slate-500">
              Manage parents and their linked students.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </Button>

            <Button
              onClick={openCreateModal}
            >
              <Plus size={17} />
              Add Parent
            </Button>
          </div>
        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="text-emerald-600 hover:text-emerald-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
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
                placeholder="Search by name, parent ID, email or phone..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">
                All Status
              </option>

              {statusOptions.map(
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
                )
              )}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading parents...
              </div>
            </div>
          ) : visibleParents.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-500">
                <Users size={26} />
              </div>

              <h3 className="text-base font-semibold text-slate-900">
                No parents found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                There are no parent records matching
                the current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Parent
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Parent ID
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contact
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleParents.map(
                      (parent) => (
                        <tr
                          key={parent._id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 font-semibold text-teal-700">
                                {(
                                  parent.firstName?.[0] ||
                                  "P"
                                ).toUpperCase()}
                              </div>

                              <div>
                                <div className="font-semibold text-slate-900">
                                  {getParentName(
                                    parent
                                  )}
                                </div>

                                <div className="text-xs text-slate-500">
                                  {parent.email ||
                                    "No email"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {parent.userId ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-sm text-slate-700">
                              {parent.phone ||
                                "No phone"}
                            </div>

                            <div className="text-xs text-slate-400">
                              {parent.email ||
                                "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                                parent.status
                              )}`}
                            >
                              {parent.status ||
                                "unknown"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                title="View"
                                onClick={() =>
                                  openViewModal(
                                    parent
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Edit"
                                onClick={() =>
                                  openEditModal(
                                    parent
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Manage Students"
                                onClick={() =>
                                  openRelationshipModal(
                                    parent
                                  )
                                }
                                className="rounded-lg p-2 text-teal-600 hover:bg-teal-50 hover:text-teal-800"
                              >
                                <Link2
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

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  {filteredParents.length === 0
                    ? 0
                    : (page - 1) *
                        PAGE_SIZE +
                      1}{" "}
                  to{" "}
                  {Math.min(
                    page * PAGE_SIZE,
                    filteredParents.length
                  )}{" "}
                  of{" "}
                  {filteredParents.length}{" "}
                  parents
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="px-2 text-sm text-slate-600">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      page >= totalPages
                    }
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CREATE / EDIT PARENT */}
      {(modal === "create" ||
        modal === "edit") && (
        <Modal
          title={
            modal === "create"
              ? "Add Parent"
              : "Edit Parent"
          }
          onClose={closeModal}
        >
          <form
            onSubmit={
              modal === "create"
                ? handleCreateParent
                : handleUpdateParent
            }
            className="space-y-6"
          >
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="First Name"
                  required
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="Last Name"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label={
                    modal === "create"
                      ? "Password"
                      : "New Password"
                  }
                  type="password"
                  required={
                    modal === "create"
                  }
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password:
                        event.target.value,
                    }))
                  }
                  placeholder={
                    modal === "edit"
                      ? "Leave blank to keep current password"
                      : "Minimum 6 characters"
                  }
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status:
                        event.target.value,
                    }))
                  }
                  options={[
                    {
                      value: "active",
                      label: "Active",
                    },
                    {
                      value: "inactive",
                      label: "Inactive",
                    },
                    {
                      value: "suspended",
                      label: "Suspended",
                    },
                  ]}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Additional Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Occupation"
                  value={form.occupation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      occupation:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="Emergency Contact"
                  value={
                    form.emergencyContact
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      emergencyContact:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="City"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="State"
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      state:
                        event.target.value,
                    }))
                  }
                />

                <Field
                  label="Postal Code"
                  value={form.postalCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      postalCode:
                        event.target.value,
                    }))
                  }
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address:
                        event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <ShieldCheck size={17} />
                )}

                {modal === "create"
                  ? "Create Parent"
                  : "Update Parent"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW PARENT */}
      {modal === "view" &&
        selectedParent && (
          <Modal
            title="Parent Details"
            onClose={closeModal}
          >
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-xl font-bold text-teal-700">
                    {(
                      selectedParent.firstName?.[0] ||
                      "P"
                    ).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      {getParentName(
                        selectedParent
                      )}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedParent.userId ||
                        "—"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                      selectedParent.status
                    )}`}
                  >
                    {selectedParent.status ||
                      "unknown"}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info
                    label="Email"
                    value={
                      selectedParent.email
                    }
                  />

                  <Info
                    label="Phone"
                    value={
                      selectedParent.phone
                    }
                  />

                  <Info
                    label="Occupation"
                    value={
                      selectedParent.profile
                        ?.occupation
                    }
                  />

                  <Info
                    label="Emergency Contact"
                    value={
                      selectedParent.profile
                        ?.emergencyContact
                    }
                  />

                  <Info
                    label="City"
                    value={
                      selectedParent.profile?.city
                    }
                  />

                  <Info
                    label="State"
                    value={
                      selectedParent.profile?.state
                    }
                  />

                  <Info
                    label="Postal Code"
                    value={
                      selectedParent.profile
                        ?.postalCode
                    }
                  />

                  <Info
                    label="Address"
                    value={
                      selectedParent.profile
                        ?.address
                    }
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Linked Students
                    </h3>

                    <p className="text-xs text-slate-500">
                      Students connected to this parent.
                    </p>
                  </div>

                  <Button
                    onClick={() =>
                      openRelationshipModal(
                        selectedParent
                      )
                    }
                  >
                    <Link2 size={16} />
                    Manage
                  </Button>
                </div>

                {childrenLoading ? (
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 p-8 text-sm text-slate-500">
                    <Loader2
                      size={17}
                      className="mr-2 animate-spin"
                    />
                    Loading linked students...
                  </div>
                ) : children.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <Users
                      size={24}
                      className="mx-auto mb-2 text-slate-400"
                    />

                    <p className="text-sm font-medium text-slate-700">
                      No students linked
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      This parent currently has no linked students.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {children.map((item) => (
                      <ChildRow
                        key={
                          item.relationshipId
                        }
                        item={item}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

      {/* RELATIONSHIP MANAGEMENT */}
      {modal === "relationship" &&
        selectedParent && (
          <Modal
            title={`Manage Students — ${getParentName(
              selectedParent
            )}`}
            onClose={closeModal}
            maxWidth="max-w-5xl"
          >
            <div className="space-y-6">
              {/* LINK FORM */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-teal-100 p-2 text-teal-700">
                    <Link2 size={18} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Link Student
                    </h3>

                    <p className="text-xs text-slate-500">
                      Connect an existing student to this parent.
                    </p>
                  </div>
                </div>

                {relationshipError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {relationshipError}
                  </div>
                )}

                <form
                  onSubmit={handleLinkStudent}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Student
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      name="student"
                      value={
                        relationshipForm.student
                      }
                      onChange={
                        handleRelationshipChange
                      }
                      disabled={
                        studentsLoading ||
                        actionLoading
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {studentsLoading
                          ? "Loading students..."
                          : "Select student"}
                      </option>

                      {availableStudents.map(
                        (student) => (
                          <option
                            key={student._id}
                            value={
                              student._id
                            }
                          >
                            {getStudentName(
                              student
                            )}{" "}
                            {student.userId
                              ? `(${student.userId})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {!studentsLoading &&
                      availableStudents.length ===
                        0 && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          No unlinked students available.
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Relationship
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                   <select
  name="relationship"
  value={relationshipForm.relationship}
  onChange={handleRelationshipChange}
  disabled={actionLoading}
  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
>
  <option value="">
    Select relationship
  </option>

  {relationshipOptions.map((relationship) => (
    <option
      key={relationship.value}
      value={relationship.value}
    >
      {relationship.label}
    </option>
  ))}
</select>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="isPrimary"
                        checked={
                          relationshipForm.isPrimary
                        }
                        onChange={
                          handleRelationshipChange
                        }
                        disabled={
                          actionLoading
                        }
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />

                      <span className="flex items-center gap-2">
                        <Star
                          size={15}
                          className="text-amber-500"
                        />
                        Make this the primary parent
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="canReceiveNotifications"
                        checked={
                          relationshipForm.canReceiveNotifications
                        }
                        onChange={
                          handleRelationshipChange
                        }
                        disabled={
                          actionLoading
                        }
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />

                      <span className="flex items-center gap-2">
                        <Bell
                          size={15}
                          className="text-teal-600"
                        />
                        Allow notifications for this student
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      type="submit"
                      disabled={
                        actionLoading ||
                        !relationshipForm.student ||
                        !relationshipForm.relationship
                      }
                    >
                      {actionLoading ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Link2 size={17} />
                      )}
                      Link Student
                    </Button>
                  </div>
                </form>
              </div>

              {/* LINKED STUDENTS */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Linked Students
                    </h3>

                    <p className="text-xs text-slate-500">
                      {children.length} student
                      {children.length === 1
                        ? ""
                        : "s"} linked with this parent.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fetchChildren(
                        selectedParent._id
                      )
                    }
                    disabled={
                      childrenLoading
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <RefreshCw
                      size={17}
                      className={
                        childrenLoading
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>
                </div>

                {childrenLoading ? (
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 p-10 text-sm text-slate-500">
                    <Loader2
                      size={18}
                      className="mr-2 animate-spin"
                    />
                    Loading...
                  </div>
                ) : children.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                    <Users
                      size={28}
                      className="mx-auto mb-3 text-slate-400"
                    />

                    <p className="font-semibold text-slate-700">
                      No linked students
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Use the form above to connect a student.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {children.map((item) => (
                      <ChildManagementCard
                        key={
                          item.relationshipId
                        }
                        item={item}
                        actionLoading={
                          actionLoading
                        }
                        onUpdate={
                          handleUpdateRelationship
                        }
                        onUnlink={
                          handleUnlinkStudent
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}

function ChildRow({ item }) {
  const student = item?.student;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <UserRound size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900">
          {getStudentName(student)}
        </div>

        <div className="mt-0.5 text-xs text-slate-500">
          {student?.userId || "—"}
          {item?.relationship
            ? ` • ${item.relationship}`
            : ""}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item?.isPrimary && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Star size={12} />
            Primary
          </span>
        )}

        {item?.canReceiveNotifications && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
            <Bell size={12} />
            Notifications
          </span>
        )}
      </div>
    </div>
  );
}

function ChildManagementCard({
  item,
  actionLoading,
  onUpdate,
  onUnlink,
}) {
  const student = item?.student;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <UserRound size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">
            {getStudentName(student)}
          </div>

          <div className="mt-0.5 text-xs text-slate-500">
            {student?.userId || "No student ID"}
          </div>

          {student?.email && (
            <div className="mt-1 truncate text-xs text-slate-400">
              {student.email}
            </div>
          )}
        </div>

        {item?.isPrimary && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star size={12} />
            Primary
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Relationship
          </label>

          <select
            value={item?.relationship || ""}
            onChange={(event) =>
              onUpdate(
                item.relationshipId,
                {
                  relationship:
                    event.target.value,
                }
              )
            }
            disabled={actionLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
          >
            {relationshipOptions.map(
              (relationship) => (
                <option
                  key={relationship.value}
                  value={relationship.value}
                >
                  {relationship.label}
                </option>
              )
            )}

            {!relationshipOptions.includes(
              item?.relationship
            ) &&
              item?.relationship && (
                <option
                  value={
                    item.relationship
                  }
                >
                  {item.relationship}
                </option>
              )}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={
                Boolean(item?.isPrimary)
              }
              onChange={(event) =>
                onUpdate(
                  item.relationshipId,
                  {
                    isPrimary:
                      event.target.checked,
                  }
                )
              }
              disabled={actionLoading}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />

            Primary parent
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(
                item?.canReceiveNotifications
              )}
              onChange={(event) =>
                onUpdate(
                  item.relationshipId,
                  {
                    canReceiveNotifications:
                      event.target.checked,
                  }
                )
              }
              disabled={actionLoading}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />

            Receive notifications
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            student?.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {student?.status || "unknown"}
        </span>

        <button
          type="button"
          disabled={actionLoading}
          onClick={() =>
            onUnlink(
              item.relationshipId,
              getStudentName(student)
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Unlink size={15} />
          Unlink
        </button>
      </div>
    </div>
  );
}
