import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "../../services/api";

const initialForm = {
  class: "",
  academicSession: "",
  name: "",
  code: "",
  capacity: "",
  roomNumber: "",
  status: "active",
};

const statusOptions = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
];

const Sections = () => {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);

  const [studentCounts, setStudentCounts] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editingSection, setEditingSection] = useState(null);
  const [sectionToDelete, setSectionToDelete] = useState(null);

  const [form, setForm] = useState(initialForm);

  // Student roster
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [sectionStudentCount, setSectionStudentCount] = useState(0);
  const [availableSeats, setAvailableSeats] = useState(null);

  const isRosterOpen = Boolean(selectedSection);

  // --------------------------------------------------
  // FETCH SECTIONS
  // --------------------------------------------------

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/sections");

      const sectionList = response?.data?.sections || [];

      setSections(sectionList);

      // Fetch active student count for every section.
      await fetchStudentCounts(sectionList);
    } catch (err) {
      console.error("Fetch sections error:", err);

      setError(err?.response?.data?.message || "Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH CLASS + SESSION
  // --------------------------------------------------

  const fetchDependencies = async () => {
    try {
      setLoadingDependencies(true);

      const [classesResponse, sessionsResponse] = await Promise.all([
        api.get("/classes"),
        api.get("/academic-sessions"),
      ]);

      setClasses(classesResponse?.data?.classes || []);

      setAcademicSessions(sessionsResponse?.data?.sessions || []);
    } catch (err) {
      console.error("Fetch section dependencies error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load classes or academic sessions",
      );
    } finally {
      setLoadingDependencies(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchSections();
  }, []);

  // --------------------------------------------------
  // ACTIVE STUDENT COUNTS
  // --------------------------------------------------

  const fetchStudentCounts = async (sectionList) => {
    if (!sectionList?.length) {
      setStudentCounts({});
      return;
    }

    try {
      const results = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const response = await api.get(`/sections/${section._id}/students`);

            return {
              id: section._id,
              count: response?.data?.count || 0,
            };
          } catch (error) {
            console.error(
              `Student count error for section ${section._id}:`,
              error,
            );

            return {
              id: section._id,
              count: 0,
            };
          }
        }),
      );

      const counts = {};

      results.forEach((item) => {
        counts[item.id] = item.count;
      });

      setStudentCounts(counts);
    } catch (err) {
      console.error("Fetch student counts error:", err);
    }
  };

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredSections = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return sections;
    }

    return sections.filter((section) => {
      return (
        section?.name?.toLowerCase().includes(search) ||
        section?.code?.toLowerCase().includes(search) ||
        section?.class?.name?.toLowerCase().includes(search) ||
        section?.class?.code?.toLowerCase().includes(search) ||
        section?.academicSession?.name?.toLowerCase().includes(search) ||
        section?.academicSession?.code?.toLowerCase().includes(search) ||
        section?.roomNumber?.toLowerCase().includes(search) ||
        section?.status?.toLowerCase().includes(search)
      );
    });
  }, [sections, searchTerm]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClasses = (status) => {
    if (status === "active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
  };

  const getStudentCount = (sectionId) => {
    return studentCounts[sectionId] || 0;
  };

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingSection(null);
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");

    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (section) => {
    setError("");
    setSuccess("");

    setEditingSection(section);

    setForm({
      class: section?.class?._id || section?.class || "",
      academicSession:
        section?.academicSession?._id || section?.academicSession || "",
      name: section?.name || "",
      code: section?.code || "",
      capacity:
        section?.capacity === null || section?.capacity === undefined
          ? ""
          : String(section.capacity),
      roomNumber: section?.roomNumber || "",
      status: section?.status || "active",
    });

    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (submitting) return;

    setIsFormOpen(false);
    resetForm();
    setError("");
  };

  // --------------------------------------------------
  // CREATE / UPDATE
  // --------------------------------------------------

  const validateForm = () => {
    if (!form.class) {
      return "Class is required";
    }

    if (!form.academicSession) {
      return "Academic session is required";
    }

    if (!form.name.trim()) {
      return "Section name is required";
    }

    if (!form.code.trim()) {
      return "Section code is required";
    }

    if (form.capacity !== "" && Number(form.capacity) < 1) {
      return "Capacity must be at least 1";
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
        class: form.class,
        academicSession: form.academicSession,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        roomNumber: form.roomNumber.trim(),
        status: form.status,
      };

      if (editingSection?._id) {
        const response = await api.put(
          `/sections/${editingSection._id}`,
          payload,
        );

        const updatedSection = response?.data?.section;

        setSections((prev) =>
          prev.map((item) =>
            item._id === editingSection._id ? updatedSection : item,
          ),
        );

        setSuccess(response?.data?.message || "Section updated successfully");
      } else {
        const response = await api.post("/sections", payload);

        const newSection = response?.data?.section;

        if (newSection) {
          setSections((prev) => [newSection, ...prev]);

          setStudentCounts((prev) => ({
            ...prev,
            [newSection._id]: 0,
          }));
        }

        setSuccess(response?.data?.message || "Section created successfully");
      }

      setIsFormOpen(false);
      resetForm();

      // Refresh counts from backend
      await fetchSections();
    } catch (err) {
      console.error("Save section error:", err);

      setError(err?.response?.data?.message || "Failed to save section");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const openDeleteModal = (section) => {
    setSectionToDelete(section);
    setIsDeleteOpen(true);
    setError("");
    setSuccess("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setIsDeleteOpen(false);
    setSectionToDelete(null);
  };

  const handleDelete = async () => {
    if (!sectionToDelete?._id) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const response = await api.delete(`/sections/${sectionToDelete._id}`);

      setSections((prev) =>
        prev.filter((item) => item._id !== sectionToDelete._id),
      );

      setStudentCounts((prev) => {
        const next = { ...prev };

        delete next[sectionToDelete._id];

        return next;
      });

      setIsDeleteOpen(false);
      setSectionToDelete(null);

      setSuccess(response?.data?.message || "Section deleted successfully");
    } catch (err) {
      console.error("Delete section error:", err);

      setError(err?.response?.data?.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // OPEN STUDENT ROSTER
  // --------------------------------------------------

  const openSectionStudents = async (section) => {
    try {
      setLoadingRoster(true);
      setError("");

      const response = await api.get(`/sections/${section._id}/students`);

      setSelectedSection(
        response?.data?.section || {
          id: section._id,
          name: section.name,
          code: section.code,
          capacity: section.capacity,
          roomNumber: section.roomNumber,
          status: section.status,
          class: section.class,
          academicSession: section.academicSession,
        },
      );

      setStudents(response?.data?.students || []);

      setSectionStudentCount(response?.data?.count || 0);

      setAvailableSeats(response?.data?.availableSeats ?? null);

      // Keep table count updated
      setStudentCounts((prev) => ({
        ...prev,
        [section._id]: response?.data?.count || 0,
      }));
    } catch (err) {
      console.error("Fetch section students error:", err);

      setError(
        err?.response?.data?.message || "Failed to fetch section students",
      );
    } finally {
      setLoadingRoster(false);
    }
  };

  const closeSectionStudents = () => {
    setSelectedSection(null);
    setStudents([]);
    setSectionStudentCount(0);
    setAvailableSeats(null);
  };

  // --------------------------------------------------
  // STUDENT ROSTER VIEW
  // --------------------------------------------------

  if (isRosterOpen) {
    return (
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={closeSectionStudents}
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {selectedSection.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Student roster for this section
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSectionStudents}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Sections
          </button>
        </div>

        {/* SECTION SUMMARY */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Section
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {selectedSection.name}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {selectedSection.code}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Class
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {selectedSection.class?.name || "-"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selectedSection.class?.code || "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Active Students
            </p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {sectionStudentCount}
            </p>

            {selectedSection.capacity !== null &&
              selectedSection.capacity !== undefined && (
                <p className="mt-1 text-xs text-slate-500">
                  Capacity: {selectedSection.capacity}
                </p>
              )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Available Seats
            </p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {availableSeats === null ? "Unlimited" : availableSeats}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selectedSection.roomNumber
                ? `Room ${selectedSection.roomNumber}`
                : "Room not assigned"}
            </p>
          </div>
        </div>

        {/* SESSION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Academic Session
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {selectedSection.academicSession?.name || "-"}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                selectedSection.status,
              )}`}
            >
              {selectedSection.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* STUDENT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loadingRoster ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                Loading students...
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Users size={27} />
              </div>

              <h3 className="text-base font-semibold text-slate-900">
                No active students
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                There are currently no students with an active membership and
                active enrollment in this section.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student ID
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Roll Number
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Program
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Membership
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Membership End
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((item) => (
                    <tr
                      key={item.membershipId || item.student?.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.student?.fullName || "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.student?.email || "-"}
                          </p>

                          {item.student?.phone && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.student.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item.student?.studentId || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.enrollment?.rollNumber || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {item.enrollment?.program?.name || "-"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.enrollment?.program?.code || ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {item.membership?.name || "-"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.membership?.code || ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(item.membership?.endDate)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // SECTION LIST
  // --------------------------------------------------

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sections</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage class sections and view active students assigned to each
            section.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={18} />
          New Section
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

      {/* SEARCH */}
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
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search sections..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredSections.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {sections.length}
            </span>{" "}
            sections
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading sections...
            </div>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Users size={26} />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              {searchTerm ? "No sections found" : "No sections yet"}
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              {searchTerm
                ? "Try changing your search keyword."
                : "Create a section under a class and academic session to get started."}
            </p>

            {!searchTerm && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus size={17} />
                Create Section
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Section
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Class
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Academic Session
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Capacity
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active Students
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
                {filteredSections.map((section) => {
                  const activeCount = getStudentCount(section._id);

                  return (
                    <tr
                      key={section._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* SECTION */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openSectionStudents(section)}
                          className="text-left"
                        >
                          <p className="font-semibold text-slate-900 hover:text-slate-600">
                            {section.name}
                          </p>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {section.code}
                          </p>
                        </button>
                      </td>

                      {/* CLASS */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {section.class?.name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {section.class?.code || ""}
                        </p>
                      </td>

                      {/* SESSION */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {section.academicSession?.name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {section.academicSession?.code || ""}
                        </p>
                      </td>

                      {/* CAPACITY */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {section.capacity ?? "Unlimited"}
                      </td>

                      {/* ACTIVE STUDENTS */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openSectionStudents(section)}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          <Users size={15} />

                          {activeCount}
                        </button>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            section.status,
                          )}`}
                        >
                          {section.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openSectionStudents(section)}
                            title="View students"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(section)}
                            title="Edit"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(section)}
                            title="Delete"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  {editingSection ? "Edit Section" : "New Section"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingSection
                    ? "Update section details."
                    : "Create a new section under a class."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loadingDependencies ? (
                <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                  <Loader2 size={19} className="mr-2 animate-spin" />
                  Loading classes and academic sessions...
                </div>
              ) : (
                <>
                  {/* CLASS + SESSION */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Class
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="class"
                        value={form.class}
                        onChange={handleFormChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="">Select class</option>

                        {classes.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                            {item.code ? ` (${item.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Academic Session
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="academicSession"
                        value={form.academicSession}
                        onChange={handleFormChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="">Select academic session</option>

                        {academicSessions.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                            {item.code ? ` (${item.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* NAME + CODE */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Section Name
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        placeholder="e.g. Morning Batch"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Section Code
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="text"
                        name="code"
                        value={form.code}
                        onChange={handleFormChange}
                        placeholder="e.g. MB"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  {/* CAPACITY + ROOM + STATUS */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Capacity
                      </label>

                      <input
                        type="number"
                        min="1"
                        name="capacity"
                        value={form.capacity}
                        onChange={handleFormChange}
                        placeholder="e.g. 30"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Room Number
                      </label>

                      <input
                        type="text"
                        name="roomNumber"
                        value={form.roomNumber}
                        onChange={handleFormChange}
                        placeholder="e.g. Room 101"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      />
                    </div>

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
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || loadingDependencies}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 size={17} className="animate-spin" />}

                  {editingSection ? "Update Section" : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Delete Section?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {sectionToDelete.name}
                </span>
                ?
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
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting && <Loader2 size={17} className="animate-spin" />}
                  Delete Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sections;
