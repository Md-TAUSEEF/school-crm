import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Eye,
  UserCheck,
  UserX,
  X,
  Loader2,
  GraduationCap,
  BookOpen,
  School,
  DoorOpen,
} from "lucide-react";

import { api, getData } from "../../services/api";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  qualification: "",
  specialization: "",
  joiningDate: "",
  employeeType: "full_time",
  status: "active",
};

const employeeTypeLabels = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
};

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
};

export default function Teacher() {
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeTypeFilter, setEmployeeTypeFilter] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [assignmentError, setAssignmentError] =
    useState("");

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] =
    useState(false);

  const [editingTeacher, setEditingTeacher] =
    useState(null);
  const [selectedTeacher, setSelectedTeacher] =
    useState(null);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // FETCH TEACHERS
  // =====================================================

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/teachers");

      const data = getData(response);

      setTeachers(
        data?.items ||
          data?.teachers ||
          []
      );
    } catch (err) {
      console.error(
        "Fetch teachers error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load teachers."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH SCHEDULE ASSIGNMENTS
  // IMPORTANT:
  // /schedules returns response.data.schedules
  // =====================================================

  const fetchAssignments = async () => {
    try {
      setAssignmentLoading(true);
      setAssignmentError("");

      const response = await api.get("/schedules", {
        params: {
          page: 1,
          limit: 1000,
        },
      });

      const data = response?.data || {};

      console.log(
        "🔥 TEACHER PAGE SCHEDULE RESPONSE:",
        data
      );

      const scheduleItems =
        data.schedules ||
        data.items ||
        data.data?.schedules ||
        data.data?.items ||
        [];

      console.log(
        "🔥 TEACHER PAGE ASSIGNMENTS:",
        scheduleItems
      );

      setAssignments(
        Array.isArray(scheduleItems)
          ? scheduleItems
          : []
      );
    } catch (err) {
      console.error(
        "Fetch assignments error:",
        err
      );

      setAssignmentError(
        err?.response?.data?.message ||
          "Failed to load teaching assignments."
      );

      setAssignments([]);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchTeachers();
    fetchAssignments();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE TEACHER MODAL
  // =====================================================

  const openCreateModal = () => {
    setEditingTeacher(null);

    setForm({
      ...initialForm,
    });

    setShowModal(true);
  };

  // =====================================================
  // EDIT TEACHER MODAL
  // =====================================================

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);

    setForm({
      firstName: teacher?.firstName || "",
      lastName: teacher?.lastName || "",
      email: teacher?.email || "",
      phone: teacher?.phone || "",
      password: "",
      qualification:
        teacher?.profile?.qualification || "",
      specialization:
        teacher?.profile?.specialization || "",
      joiningDate:
        teacher?.profile?.joiningDate
          ? teacher.profile.joiningDate.slice(
              0,
              10
            )
          : "",
      employeeType:
        teacher?.profile?.employeeType ||
        "full_time",
      status:
        teacher?.status ||
        teacher?.profile?.status ||
        "active",
    });

    setShowModal(true);
  };

  // =====================================================
  // CLOSE CREATE/EDIT MODAL
  // =====================================================

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    setEditingTeacher(null);

    setForm({
      ...initialForm,
    });
  };

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  const validateForm = () => {
    if (!form.firstName.trim()) {
      return "First name is required.";
    }

    if (!form.lastName.trim()) {
      return "Last name is required.";
    }

    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.phone.trim()) {
      return "Phone is required.";
    }

    if (
      !editingTeacher &&
      !form.password.trim()
    ) {
      return "Password is required.";
    }

    return "";
  };

  // =====================================================
  // CREATE / UPDATE TEACHER
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        firstName:
          form.firstName.trim(),

        lastName:
          form.lastName.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim(),

        qualification:
          form.qualification.trim(),

        specialization:
          form.specialization.trim(),

        joiningDate:
          form.joiningDate || null,

        employeeType:
          form.employeeType,

        status:
          form.status,
      };

      if (form.password.trim()) {
        payload.password =
          form.password.trim();
      }

      if (editingTeacher) {
        await api.put(
          `/teachers/${editingTeacher._id}`,
          payload
        );
      } else {
        await api.post("/teachers", {
          ...payload,
          password:
            form.password.trim(),
        });
      }

      closeModal();

      await fetchTeachers();
      await fetchAssignments();
    } catch (err) {
      console.error(
        "Teacher save error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to save teacher."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // CHANGE TEACHER STATUS
  // =====================================================

  const changeTeacherStatus = async (
    teacher
  ) => {
    try {
      setError("");

      const isActive =
        teacher.status === "active";

      const endpoint = isActive
        ? `/teachers/${teacher._id}/deactivate`
        : `/teachers/${teacher._id}/activate`;

      await api.put(endpoint);

      await fetchTeachers();
      await fetchAssignments();
    } catch (err) {
      console.error(
        "Teacher status error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to update teacher status."
      );
    }
  };

  // =====================================================
  // VIEW TEACHER
  // =====================================================

  const openViewModal = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedTeacher(null);
  };

  // =====================================================
  // FILTER TEACHERS
  // =====================================================

  const filteredTeachers = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const fullName =
        `${teacher.firstName || ""} ${
          teacher.lastName || ""
        }`
          .trim()
          .toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        (teacher.email || "")
          .toLowerCase()
          .includes(search) ||
        (teacher.phone || "")
          .toLowerCase()
          .includes(search) ||
        (teacher.userId || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !statusFilter ||
        teacher.status === statusFilter;

      const matchesEmployeeType =
        !employeeTypeFilter ||
        teacher?.profile?.employeeType ===
          employeeTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesEmployeeType
      );
    });
  }, [
    teachers,
    searchTerm,
    statusFilter,
    employeeTypeFilter,
  ]);

  // =====================================================
  // GET TEACHER ASSIGNMENTS
  // =====================================================

  const getTeacherAssignments = (
    teacher
  ) => {
    if (!teacher) return [];

    const teacherId = String(
      teacher?._id ||
        teacher?.id ||
        teacher?.user?._id ||
        teacher?.user?.id ||
        ""
    );

    if (!teacherId) {
      return [];
    }

    return assignments.filter(
      (assignment) => {
        const instructorId = String(
          assignment?.instructor?._id ||
            assignment?.instructor?.id ||
            assignment?.instructor ||
            ""
        );

        return (
          instructorId === teacherId
        );
      }
    );
  };

  // =====================================================
  // SELECTED TEACHER ASSIGNMENTS
  // =====================================================

  const selectedTeacherAssignments =
    getTeacherAssignments(
      selectedTeacher
    );

  return (
    <div className="space-y-6">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Teachers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage teacher profiles and their
            academic teaching assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Teacher
        </button>
      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ================================================= */}
      {/* FILTERS */}
      {/* ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              placeholder="Search teacher..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">
              All Status
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>

          <select
            value={employeeTypeFilter}
            onChange={(e) =>
              setEmployeeTypeFilter(
                e.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">
              All Employee Types
            </option>

            <option value="full_time">
              Full Time
            </option>

            <option value="part_time">
              Part Time
            </option>

            <option value="contract">
              Contract
            </option>
          </select>
        </div>
      </div>

      {/* ================================================= */}
      {/* TABLE */}
      {/* ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2
              className="animate-spin text-slate-500"
              size={28}
            />
          </div>
        ) : filteredTeachers.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <GraduationCap
              size={42}
              className="text-slate-300"
            />

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No teachers found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No teacher records match the
              current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Teacher
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Qualification
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee Type
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assignments
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTeachers.map(
                  (teacher) => {
                    const teacherAssignments =
                      getTeacherAssignments(
                        teacher
                      );

                    return (
                      <tr
                        key={teacher._id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      >
                        {/* TEACHER */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <GraduationCap
                                size={20}
                              />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {
                                  teacher.firstName
                                }{" "}
                                {
                                  teacher.lastName
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {teacher.userId ||
                                  "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-800">
                            {teacher.email ||
                              "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {teacher.phone ||
                              "—"}
                          </p>
                        </td>

                        {/* QUALIFICATION */}

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-800">
                            {teacher?.profile
                              ?.qualification ||
                              "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {teacher?.profile
                              ?.specialization ||
                              "—"}
                          </p>
                        </td>

                        {/* EMPLOYEE TYPE */}

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-700">
                            {employeeTypeLabels[
                              teacher?.profile
                                ?.employeeType
                            ] || "—"}
                          </span>
                        </td>

                        {/* ASSIGNMENTS */}

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              openViewModal(
                                teacher
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <BookOpen
                              size={15}
                            />

                            {
                              teacherAssignments.length
                            }{" "}
                            Assignment
                            {teacherAssignments.length !==
                            1
                              ? "s"
                              : ""}
                          </button>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              teacher.status ===
                              "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {statusLabels[
                              teacher.status
                            ] ||
                              teacher.status}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openViewModal(
                                  teacher
                                )
                              }
                              title="View"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  teacher
                                )
                              }
                              title="Edit"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                changeTeacherStatus(
                                  teacher
                                )
                              }
                              title={
                                teacher.status ===
                                "active"
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            >
                              {teacher.status ===
                              "active" ? (
                                <UserX
                                  size={16}
                                />
                              ) : (
                                <UserCheck
                                  size={16}
                                />
                              )}
                            </button>
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

      {/* ================================================= */}
      {/* CREATE / EDIT MODAL */}
      {/* ================================================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTeacher
                    ? "Edit Teacher"
                    : "Add Teacher"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Teacher profile information
                  only. Academic assignments are
                  managed through Schedules.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {/* PERSONAL */}

              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    label={
                      editingTeacher
                        ? "Password (leave blank to keep current)"
                        : "Password"
                    }
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!editingTeacher}
                  />
                </div>
              </div>

              {/* PROFESSIONAL */}

              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                  Professional Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Qualification"
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                  />

                  <Input
                    label="Specialization"
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                  />

                  <Input
                    label="Joining Date"
                    name="joiningDate"
                    type="date"
                    value={form.joiningDate}
                    onChange={handleChange}
                  />

                  <Select
                    label="Employee Type"
                    name="employeeType"
                    value={form.employeeType}
                    onChange={handleChange}
                    options={[
                      {
                        value:
                          "full_time",
                        label:
                          "Full Time",
                      },
                      {
                        value:
                          "part_time",
                        label:
                          "Part Time",
                      },
                      {
                        value:
                          "contract",
                        label:
                          "Contract",
                      },
                    ]}
                  />

                  <Select
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    options={[
                      {
                        value:
                          "active",
                        label:
                          "Active",
                      },
                      {
                        value:
                          "inactive",
                        label:
                          "Inactive",
                      },
                    ]}
                  />
                </div>
              </div>

              {/* ASSIGNMENT INFO */}

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <strong>
                  Academic assignment:
                </strong>{" "}
                Program → Academic Session →
                Class → Section → Subject →
                Teacher → Room will be managed
                from the Schedule module.
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingTeacher
                    ? "Update Teacher"
                    : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* VIEW TEACHER + ASSIGNMENTS */}
      {/* ================================================= */}

      {showViewModal &&
        selectedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {
                      selectedTeacher.firstName
                    }{" "}
                    {
                      selectedTeacher.lastName
                    }
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Teacher profile and teaching
                    assignments
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeViewModal
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* PROFILE */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InfoCard
                    icon={
                      <GraduationCap
                        size={18}
                      />
                    }
                    label="Qualification"
                    value={
                      selectedTeacher
                        ?.profile
                        ?.qualification ||
                      "—"
                    }
                  />

                  <InfoCard
                    icon={
                      <BookOpen
                        size={18}
                      />
                    }
                    label="Specialization"
                    value={
                      selectedTeacher
                        ?.profile
                        ?.specialization ||
                      "—"
                    }
                  />

                  <InfoCard
                    icon={
                      <School
                        size={18}
                      />
                    }
                    label="Employee Type"
                    value={
                      employeeTypeLabels[
                        selectedTeacher
                          ?.profile
                          ?.employeeType
                      ] || "—"
                    }
                  />
                </div>

                {/* ASSIGNMENTS */}

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Teaching Assignments
                      </h3>

                      <p className="text-sm text-slate-500">
                        Actual academic
                        assignments linked to
                        this teacher.
                      </p>
                    </div>

                    {assignmentLoading && (
                      <Loader2
                        size={18}
                        className="animate-spin text-slate-500"
                      />
                    )}
                  </div>

                  {assignmentError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {assignmentError}
                    </div>
                  )}

                  {selectedTeacherAssignments.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
                      <BookOpen
                        size={34}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold text-slate-800">
                        No teaching
                        assignments
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        This teacher has not
                        been assigned to any
                        class yet.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Program
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Session
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Class
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Section
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Subject
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                              Room
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedTeacherAssignments.map(
                            (
                              assignment
                            ) => (
                              <tr
                                key={
                                  assignment._id
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="px-4 py-3 text-sm text-slate-800">
                                  {assignment
                                    ?.program
                                    ?.name ||
                                    "—"}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-800">
                                  {assignment
                                    ?.academicSession
                                    ?.name ||
                                    "—"}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-800">
                                  {assignment
                                    ?.class
                                    ?.name ||
                                    "—"}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-800">
                                  {assignment
                                    ?.section
                                    ?.name ||
                                    "—"}
                                </td>

                                <td className="px-4 py-3 text-sm text-slate-800">
                                  {assignment
                                    ?.subject
                                    ?.name ||
                                    "—"}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                                    <DoorOpen
                                      size={
                                        15
                                      }
                                    />

                                    {assignment.room ||
                                      "—"}
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// =====================================================
// INPUT COMPONENT
// =====================================================

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

// =====================================================
// SELECT COMPONENT
// =====================================================

function Select({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
    </label>
  );
}

// =====================================================
// INFO CARD
// =====================================================

function InfoCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}