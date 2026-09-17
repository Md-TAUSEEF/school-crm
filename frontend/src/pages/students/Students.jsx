
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { api, getMessage } from "../../services/api";

const PAGE_SIZE = 8;

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  admissionDate: "",
  status: "active",
};

const statusOptions = [
  "active",
  "inactive",
  "graduated",
  "transferred",
  "suspended",
  "withdrawn",
];

const getId = (value) => {
  if (!value) return "";
  return typeof value === "object" ? value._id || "" : value;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFullName = (student) => {
  return [student?.firstName, student?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const getStatusClasses = (status) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

    case "inactive":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

    case "graduated":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

    case "transferred":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

    case "suspended":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";

    case "withdrawn":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

function Modal({ title, children, onClose, maxWidth = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClasses(
        status
      )}`}
    >
      {status || "unknown"}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
        <UserRound size={28} />
      </div>

      <h3 className="text-base font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function StudentForm({
  form,
  setForm,
  onSubmit,
  onClose,
  submitting,
  isEdit,
  formError,
}) {
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.firstName.trim()) {
      nextErrors.firstName = "First name is required";
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = "Last name is required";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone is required";
    }

    if (!isEdit && !form.password) {
      nextErrors.password = "Password is required";
    }

    if (form.password && form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    if (!form.admissionDate) {
      nextErrors.admissionDate = "Admission date is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />

          <span>{formError}</span>
        </div>
      )}

      {/* BASIC INFORMATION */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950">
            Basic Information
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Enter the student's basic personal information.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="First Name"
            required
            error={errors.firstName}
          >
            <input
              type="text"
              value={form.firstName}
              onChange={(e) =>
                updateField("firstName", e.target.value)
              }
              placeholder="Enter first name"
              className={inputClasses}
            />
          </FormField>

          <FormField
            label="Last Name"
            required
            error={errors.lastName}
          >
            <input
              type="text"
              value={form.lastName}
              onChange={(e) =>
                updateField("lastName", e.target.value)
              }
              placeholder="Enter last name"
              className={inputClasses}
            />
          </FormField>

          <FormField
            label="Email"
            required
            error={errors.email}
          >
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                updateField("email", e.target.value)
              }
              placeholder="student@example.com"
              className={inputClasses}
            />
          </FormField>

          <FormField
            label="Phone"
            required
            error={errors.phone}
          >
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                updateField("phone", e.target.value)
              }
              placeholder="Enter phone number"
              className={inputClasses}
            />
          </FormField>

          <FormField
            label={isEdit ? "Password (leave blank to keep current)" : "Password"}
            required={!isEdit}
            error={errors.password}
          >
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                updateField("password", e.target.value)
              }
              placeholder={
                isEdit
                  ? "Leave blank to keep current password"
                  : "Minimum 6 characters"
              }
              className={inputClasses}
            />
          </FormField>

          <FormField label="Gender">
            <select
              value={form.gender}
              onChange={(e) =>
                updateField("gender", e.target.value)
              }
              className={inputClasses}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </FormField>

          <FormField label="Date of Birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) =>
                updateField("dateOfBirth", e.target.value)
              }
              className={inputClasses}
            />
          </FormField>

          <FormField
            label="Admission Date"
            required
            error={errors.admissionDate}
          >
            <input
              type="date"
              value={form.admissionDate}
              onChange={(e) =>
                updateField("admissionDate", e.target.value)
              }
              className={inputClasses}
            />
          </FormField>
        </div>
      </section>

      {/* ADDRESS */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950">
            Address
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Enter the student's residential address.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Address" className="md:col-span-2">
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) =>
                updateField("address", e.target.value)
              }
              placeholder="Enter address"
              className={`${inputClasses} resize-none`}
            />
          </FormField>

          <FormField label="City">
            <input
              type="text"
              value={form.city}
              onChange={(e) =>
                updateField("city", e.target.value)
              }
              placeholder="Delhi"
              className={inputClasses}
            />
          </FormField>

          <FormField label="State">
            <input
              type="text"
              value={form.state}
              onChange={(e) =>
                updateField("state", e.target.value)
              }
              placeholder="Delhi"
              className={inputClasses}
            />
          </FormField>

          <FormField label="Postal Code">
            <input
              type="text"
              value={form.postalCode}
              onChange={(e) =>
                updateField("postalCode", e.target.value)
              }
              placeholder="110001"
              className={inputClasses}
            />
          </FormField>
        </div>
      </section>

      {/* STATUS */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950">
            Account Status
          </h3>
        </div>

        <FormField label="Status">
          <select
            value={form.status}
            onChange={(e) =>
              updateField("status", e.target.value)
            }
            className={inputClasses}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </FormField>
      </section>

      {/* ACADEMIC NOTE */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-slate-600"
          />

          <div>
            <p className="text-sm font-medium text-slate-800">
              Academic placement is handled separately
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Academic Session, Program, Class and Section will be
              assigned through the Admission and Enrollment process.
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}

          {submitting
            ? isEdit
              ? "Updating..."
              : "Creating..."
            : isEdit
            ? "Update Student"
            : "Create Student"}
        </button>
      </div>
    </form>
  );
}

function StudentDetails({ student, onClose }) {
  const profile = student?.profile;

  return (
    <Modal
      title="Student Details"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <UserRound size={25} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {getFullName(student) || "Unnamed Student"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Student ID: {student?.userId || "—"}
              </p>
            </div>
          </div>

          <StatusBadge status={student?.status} />
        </div>

        {/* CONTACT */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-950">
            Contact Information
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={15} />
                Email
              </div>

              <p className="mt-2 break-all text-sm font-medium text-slate-900">
                {student?.email || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone size={15} />
                Phone
              </div>

              <p className="mt-2 text-sm font-medium text-slate-900">
                {student?.phone || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* PERSONAL */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-950">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem
              label="Date of Birth"
              value={formatDate(profile?.dateOfBirth)}
            />

            <InfoItem
              label="Gender"
              value={
                profile?.gender
                  ? profile.gender.charAt(0).toUpperCase() +
                    profile.gender.slice(1)
                  : "—"
              }
            />

            <InfoItem
              label="Admission Date"
              value={formatDate(profile?.admissionDate)}
            />

            <InfoItem
              label="Account Status"
              value={
                <StatusBadge status={student?.status} />
              }
            />
          </div>
        </section>

        {/* ADDRESS */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
            <MapPin size={16} />
            Address
          </h3>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm leading-6 text-slate-700">
              {profile?.address || "Address not provided"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {[
                profile?.city,
                profile?.state,
                profile?.postalCode,
              ]
                .filter(Boolean)
                .join(", ") || "Location not provided"}
            </p>
          </div>
        </section>

        {/* ACADEMIC */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-950">
            Academic Placement
          </h3>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {profile?.currentAcademicSession ||
            profile?.currentClass ||
            profile?.currentSection ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InfoItem
                  label="Academic Session"
                  value={
                    profile.currentAcademicSession?.name ||
                    "—"
                  }
                />

                <InfoItem
                  label="Class"
                  value={profile.currentClass?.name || "—"}
                />

                <InfoItem
                  label="Section"
                  value={profile.currentSection?.name || "—"}
                />
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No academic placement assigned yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>

      <div className="mt-1 text-sm font-medium text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [form, setForm] = useState(initialForm);

  // --------------------------------------------------
  // FETCH STUDENTS
  // --------------------------------------------------

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/students");

      const data = response?.data;

      if (Array.isArray(data?.students)) {
        setStudents(data.students);
      } else if (Array.isArray(data?.data?.students)) {
        setStudents(data.data.students);
      } else if (Array.isArray(data?.data)) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Fetch students error:", err);

      setError(
        getMessage(err) || "Failed to fetch students"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName = getFullName(student).toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        String(student?.userId || "")
          .toLowerCase()
          .includes(query) ||
        String(student?.email || "")
          .toLowerCase()
          .includes(query) ||
        String(student?.phone || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        student?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;

    return filteredStudents.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredStudents, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {
    const total = students.length;

    const active = students.filter(
      (student) => student?.status === "active"
    ).length;

    const inactive = students.filter(
      (student) => student?.status === "inactive"
    ).length;

    const academicallyAssigned = students.filter(
      (student) =>
        student?.profile?.currentAcademicSession ||
        student?.profile?.currentClass ||
        student?.profile?.currentSection
    ).length;

    return {
      total,
      active,
      inactive,
      academicallyAssigned,
    };
  }, [students]);

  // --------------------------------------------------
  // RESET FORM
  // --------------------------------------------------

  const resetForm = () => {
    setForm(initialForm);
    setFormError("");
  };

  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------

  const handleCreate = async () => {
    try {
      setCreating(true);
      setFormError("");
      setSuccess("");

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || "",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        admissionDate: form.admissionDate || null,
        status: form.status,
      };

      await api.post("/students", payload);

      setSuccess("Student created successfully.");

      setShowCreateModal(false);
      resetForm();

      await fetchStudents();
    } catch (err) {
      console.error("Create student error:", err);

      setFormError(
        getMessage(err) || "Failed to create student"
      );
    } finally {
      setCreating(false);
    }
  };

  // --------------------------------------------------
  // OPEN EDIT
  // --------------------------------------------------

  const openEdit = (student) => {
    const profile = student?.profile || {};

    setSelectedStudent(student);

    setForm({
      firstName: student?.firstName || "",
      lastName: student?.lastName || "",
      email: student?.email || "",
      phone: student?.phone || "",
      password: "",
      dateOfBirth: profile?.dateOfBirth
        ? String(profile.dateOfBirth).slice(0, 10)
        : "",
      gender: profile?.gender || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      postalCode: profile?.postalCode || "",
      admissionDate: profile?.admissionDate
        ? String(profile.admissionDate).slice(0, 10)
        : "",
      status: student?.status || "active",
    });

    setFormError("");
    setShowEditModal(true);
  };

  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------

  const handleUpdate = async () => {
    if (!selectedStudent?._id) return;

    try {
      setUpdating(true);
      setFormError("");
      setSuccess("");

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || "",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        admissionDate: form.admissionDate || null,
        status: form.status,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      await api.put(
        `/students/${selectedStudent._id}`,
        payload
      );

      setSuccess("Student updated successfully.");

      setShowEditModal(false);
      setSelectedStudent(null);
      resetForm();

      await fetchStudents();
    } catch (err) {
      console.error("Update student error:", err);

      setFormError(
        getMessage(err) || "Failed to update student"
      );
    } finally {
      setUpdating(false);
    }
  };

  // --------------------------------------------------
  // VIEW DETAILS
  // --------------------------------------------------

  const openDetails = async (student) => {
    try {
      setLoadingDetails(true);
      setError("");

      const response = await api.get(
        `/students/${student._id}`
      );

      const data = response?.data;

      const details =
        data?.student ||
        data?.data?.student ||
        data?.data ||
        student;

      setSelectedStudent(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Get student details error:", err);

      setSelectedStudent(student);
      setShowDetailsModal(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Students
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage student profiles and account information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus size={17} />
          Add Student
        </button>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto rounded-md p-1 hover:bg-emerald-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>

          <button
            type="button"
            onClick={fetchStudents}
            className="ml-auto font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Students"
          value={summary.total}
        />

        <SummaryCard
          label="Active Students"
          value={summary.active}
        />

        <SummaryCard
          label="Inactive Students"
          value={summary.inactive}
        />

        <SummaryCard
          label="Academic Placement"
          value={summary.academicallyAssigned}
        />
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, student ID, email or phone..."
              className={`${inputClasses} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className={`${inputClasses} lg:w-48`}
          >
            <option value="all">All Status</option>

            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() +
                  status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTENT */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-20">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2
                size={20}
                className="animate-spin"
              />
              Loading students...
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title={
              students.length === 0
                ? "No students yet"
                : "No students found"
            }
            description={
              students.length === 0
                ? "Students will appear here after they are created through the student management process."
                : "Try changing your search or status filter."
            }
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Admission
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound size={18} />
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {getFullName(student) ||
                                "Unnamed Student"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {student?.userId || "No student ID"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Mail size={14} />
                            <span>{student?.email || "—"}</span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone size={14} />
                            <span>{student?.phone || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <CalendarDays size={15} />
                          {formatDate(
                            student?.profile?.admissionDate
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={student?.status} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDetails(student)
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                            title="View student"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(student)
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                            title="Edit student"
                          >
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {paginatedStudents.map((student) => (
                <div
                  key={student._id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <UserRound size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {getFullName(student) ||
                            "Unnamed Student"}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {student?.userId || "No student ID"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={student?.status} />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={15} />
                      <span className="break-all">
                        {student?.email || "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} />
                      <span>{student?.phone || "—"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarDays size={15} />
                      <span>
                        Admission:{" "}
                        {formatDate(
                          student?.profile?.admissionDate
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(student)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(student)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {filteredStudents.length === 0
                    ? 0
                    : (safePage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-slate-700">
                  {Math.min(
                    safePage * PAGE_SIZE,
                    filteredStudents.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {filteredStudents.length}
                </span>{" "}
                students
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() =>
                    setPage((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="min-w-20 text-center text-sm text-slate-600">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(totalPages, prev + 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal
          title="Create Student"
          onClose={() => {
            if (creating) return;

            setShowCreateModal(false);
            resetForm();
          }}
        >
          <StudentForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            onClose={() => {
              setShowCreateModal(false);
              resetForm();
            }}
            submitting={creating}
            isEdit={false}
            formError={formError}
          />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <Modal
          title="Edit Student"
          onClose={() => {
            if (updating) return;

            setShowEditModal(false);
            setSelectedStudent(null);
            resetForm();
          }}
        >
          <StudentForm
            form={form}
            setForm={setForm}
            onSubmit={handleUpdate}
            onClose={() => {
              setShowEditModal(false);
              setSelectedStudent(null);
              resetForm();
            }}
            submitting={updating}
            isEdit
            formError={formError}
          />
        </Modal>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedStudent && (
        <StudentDetails
          student={selectedStudent}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* DETAILS LOADING */}
      {loadingDetails && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/10">
          <div className="rounded-xl bg-white px-5 py-4 shadow-xl">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading student details...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}
