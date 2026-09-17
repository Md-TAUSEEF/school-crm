import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  CalendarDays,
  BookOpen,
  UserRound,
  DoorOpen,
} from "lucide-react";

import { api } from "../../services/api";

// =====================================================
// INITIAL FORM
// =====================================================

const initialForm = {
  program: "",
  academicSession: "",
  class: "",
  section: "",
  subject: "",
  instructor: "",
  room: "",
  status: "active",
  notes: "",
};

// =====================================================
// HELPERS
// =====================================================

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const getName = (item) => {
  if (!item) return "";

  return (
    item.name ||
    item.title ||
    item.className ||
    item.sectionName ||
    item.subjectName ||
    ""
  );
};

const getTeacherName = (teacher) => {
  if (!teacher) return "";

  const fullName = [
    teacher.firstName,
    teacher.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    teacher.name ||
    teacher.userId ||
    ""
  );
};

// =====================================================
// COMPONENT
// =====================================================

export default function Schedule() {
  // ===================================================
  // DATA
  // ===================================================

  const [schedules, setSchedules] = useState([]);

  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] = useState(initialForm);

  // ===================================================
  // FILTERS
  // ===================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ===================================================
  // LOADING
  // ===================================================

  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ===================================================
  // ERROR
  // ===================================================

  const [error, setError] = useState("");

  // ===================================================
  // MODAL
  // ===================================================

  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // =====================================================
  // FETCH LOOKUPS
  // =====================================================

  const fetchLookups = async () => {
    try {
      setLookupLoading(true);
      setError("");

      console.log("🔥 FETCH LOOKUPS STARTED");

      const [
        programsResponse,
        sessionsResponse,
        classesResponse,
        sectionsResponse,
        subjectsResponse,
        teachersResponse,
      ] = await Promise.all([
        api.get("/programs", {
          params: {
            page: 1,
            limit: 1000,
          },
        }),

        api.get("/academic-sessions", {
          params: {
            page: 1,
            limit: 1000,
          },
        }),

        api.get("/classes", {
          params: {
            page: 1,
            limit: 1000,
          },
        }),

        api.get("/sections", {
          params: {
            page: 1,
            limit: 1000,
          },
        }),

        api.get("/subjects", {
          params: {
            page: 1,
            limit: 1000,
          },
        }),

        api.get("/teachers", {
          params: {
            page: 1,
            limit: 100,
            status: "active",
          },
        }),
      ]);

      // =================================================
      // RAW RESPONSES
      // =================================================

      console.log(
        "🔥 PROGRAMS API:",
        programsResponse?.data
      );

      console.log(
        "🔥 SESSIONS API:",
        sessionsResponse?.data
      );

      console.log(
        "🔥 CLASSES API:",
        classesResponse?.data
      );

      console.log(
        "🔥 SECTIONS API:",
        sectionsResponse?.data
      );

      console.log(
        "🔥 SUBJECTS API:",
        subjectsResponse?.data
      );

      console.log(
        "🔥 TEACHERS API:",
        teachersResponse?.data
      );

      // =================================================
      // PROGRAMS
      // =================================================

      const programsData =
        programsResponse?.data || {};

      const programItems = Array.isArray(
        programsData
      )
        ? programsData
        : programsData.programs ||
          programsData.items ||
          programsData.data?.programs ||
          programsData.data?.items ||
          [];

      // =================================================
      // ACADEMIC SESSIONS
      // =================================================

      const sessionsData =
        sessionsResponse?.data || {};

      const sessionItems = Array.isArray(
        sessionsData
      )
        ? sessionsData
        : sessionsData.sessions ||
          sessionsData.items ||
          sessionsData.data?.sessions ||
          sessionsData.data?.items ||
          [];

      // =================================================
      // CLASSES
      // =================================================

      const classesData =
        classesResponse?.data || {};

      const classItems = Array.isArray(
        classesData
      )
        ? classesData
        : classesData.classes ||
          classesData.items ||
          classesData.data?.classes ||
          classesData.data?.items ||
          [];

      // =================================================
      // SECTIONS
      // =================================================

      const sectionsData =
        sectionsResponse?.data || {};

      const sectionItems = Array.isArray(
        sectionsData
      )
        ? sectionsData
        : sectionsData.sections ||
          sectionsData.items ||
          sectionsData.data?.sections ||
          sectionsData.data?.items ||
          [];

      // =================================================
      // SUBJECTS
      // =================================================

      const subjectsData =
        subjectsResponse?.data || {};

      const subjectItems = Array.isArray(
        subjectsData
      )
        ? subjectsData
        : subjectsData.subjects ||
          subjectsData.items ||
          subjectsData.data?.subjects ||
          subjectsData.data?.items ||
          [];

      // =================================================
      // TEACHERS
      // =================================================

      const teachersData =
        teachersResponse?.data || {};

      const teacherItems = Array.isArray(
        teachersData
      )
        ? teachersData
        : teachersData.teachers ||
          teachersData.items ||
          teachersData.data?.teachers ||
          teachersData.data?.items ||
          [];

      // =================================================
      // FINAL DEBUG
      // =================================================

      console.log(
        "🔥 FINAL PROGRAMS:",
        programItems
      );

      console.log(
        "🔥 FINAL SESSIONS:",
        sessionItems
      );

      console.log(
        "🔥 FINAL CLASSES:",
        classItems
      );

      console.log(
        "🔥 FINAL SECTIONS:",
        sectionItems
      );

      console.log(
        "🔥 FINAL SUBJECTS:",
        subjectItems
      );

      console.log(
        "🔥 FINAL TEACHERS:",
        teacherItems
      );

      // =================================================
      // SET STATE
      // =================================================

      setPrograms(programItems);
      setSessions(sessionItems);
      setClasses(classItems);
      setSections(sectionItems);
      setSubjects(subjectItems);
      setTeachers(teacherItems);
    } catch (err) {
      console.error(
        "❌ Schedule lookup error:",
        err
      );

      console.error(
        "❌ Lookup API error:",
        err?.response?.data
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load academic options."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  // =====================================================
  // FETCH SCHEDULES
  // =====================================================

  const fetchSchedules = async () => {
    try {
      setLoading(true);

      console.log(
        "🔥 FETCH SCHEDULES STARTED"
      );

      const response = await api.get(
        "/schedules",
        {
          params: {
            page: 1,
            limit: 1000,
          },
        }
      );

      console.log(
        "🔥 RAW SCHEDULE RESPONSE:",
        response?.data
      );

      const data =
        response?.data || {};

      const scheduleItems =
        data.schedules ||
        data.items ||
        data.data?.schedules ||
        data.data?.items ||
        [];

      console.log(
        "🔥 FINAL SCHEDULES:",
        scheduleItems
      );

      setSchedules(
        Array.isArray(scheduleItems)
          ? scheduleItems
          : []
      );
    } catch (err) {
      console.error(
        "❌ Schedule fetch error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load teaching assignments."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchLookups();
    fetchSchedules();
  }, []);

  // =====================================================
  // FILTER CLASSES
  // Program + Academic Session
  // =====================================================

  const filteredClasses = useMemo(() => {
    if (
      !form.program ||
      !form.academicSession
    ) {
      return [];
    }

    return classes.filter((item) => {
      const programId = getId(
        item.program
      );

      const sessionId = getId(
        item.academicSession
      );

      return (
        programId ===
          String(form.program) &&
        sessionId ===
          String(form.academicSession)
      );
    });
  }, [
    classes,
    form.program,
    form.academicSession,
  ]);

  // =====================================================
  // FILTER SECTIONS
  // Class + Academic Session
  // =====================================================

  const filteredSections = useMemo(() => {
    if (
      !form.academicSession ||
      !form.class
    ) {
      return [];
    }

    return sections.filter((item) => {
      const sessionId = getId(
        item.academicSession
      );

      const classId = getId(
        item.class
      );

      return (
        sessionId ===
          String(form.academicSession) &&
        classId === String(form.class)
      );
    });
  }, [
    sections,
    form.academicSession,
    form.class,
  ]);

  // =====================================================
  // FILTER SUBJECTS
  // Program + Session + Class + Section
  // =====================================================

  const filteredSubjects = useMemo(() => {
    if (
      !form.program ||
      !form.academicSession ||
      !form.class ||
      !form.section
    ) {
      return [];
    }

    return subjects.filter((item) => {
      const programId = getId(
        item.program
      );

      const sessionId = getId(
        item.academicSession
      );

      const classId = getId(
        item.class
      );

      const sectionId = getId(
        item.section
      );

      return (
        programId ===
          String(form.program) &&
        sessionId ===
          String(form.academicSession) &&
        classId === String(form.class) &&
        sectionId === String(form.section)
      );
    });
  }, [
    subjects,
    form.program,
    form.academicSession,
    form.class,
    form.section,
  ]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // PROGRAM CHANGE
  // =====================================================

  const handleProgramChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm((previous) => ({
      ...previous,
      program: value,
      academicSession: "",
      class: "",
      section: "",
      subject: "",
    }));
  };

  // =====================================================
  // SESSION CHANGE
  // =====================================================

  const handleSessionChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm((previous) => ({
      ...previous,
      academicSession: value,
      class: "",
      section: "",
      subject: "",
    }));
  };

  // =====================================================
  // CLASS CHANGE
  // =====================================================

  const handleClassChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm((previous) => ({
      ...previous,
      class: value,
      section: "",
      subject: "",
    }));
  };

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  const handleSectionChange = (
    event
  ) => {
    const value =
      event.target.value;

    setForm((previous) => ({
      ...previous,
      section: value,
      subject: "",
    }));
  };

  // =====================================================
  // CREATE MODAL
  // =====================================================

  const openCreateModal = () => {
    setEditingSchedule(null);

    setForm({
      ...initialForm,
    });

    setError("");
    setShowModal(true);
  };

  // =====================================================
  // EDIT MODAL
  // =====================================================

  const openEditModal = (
    schedule
  ) => {
    setEditingSchedule(schedule);

    setForm({
      program: getId(
        schedule?.program
      ),

      academicSession: getId(
        schedule?.academicSession
      ),

      class: getId(
        schedule?.class
      ),

      section: getId(
        schedule?.section
      ),

      subject: getId(
        schedule?.subject
      ),

      instructor: getId(
        schedule?.instructor
      ),

      room:
        schedule?.room || "",

      status:
        schedule?.status ||
        "active",

      notes:
        schedule?.notes || "",
    });

    setError("");
    setShowModal(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    setEditingSchedule(null);

    setForm({
      ...initialForm,
    });

    setError("");
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    if (!form.program) {
      return "Please select a program.";
    }

    if (!form.academicSession) {
      return "Please select an academic session.";
    }

    if (!form.class) {
      return "Please select a class.";
    }

    if (!form.section) {
      return "Please select a section.";
    }

    if (!form.subject) {
      return "Please select a subject.";
    }

    if (!form.instructor) {
      return "Please select a teacher.";
    }

    return "";
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

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
        program: form.program,
        academicSession:
          form.academicSession,
        class: form.class,
        section: form.section,
        subject: form.subject,
        instructor: form.instructor,
        room: form.room.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };

      console.log(
        "🔥 SCHEDULE PAYLOAD:",
        payload
      );

      if (editingSchedule) {
        await api.put(
          `/schedules/${editingSchedule._id}`,
          payload
        );
      } else {
        await api.post(
          "/schedules",
          payload
        );
      }

      closeModal();

      await fetchSchedules();
    } catch (err) {
      console.error(
        "❌ Schedule save error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to save teaching assignment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteSchedule = async (
    schedule
  ) => {
    const subjectName =
      getName(schedule?.subject) ||
      "this subject";

    const confirmed =
      window.confirm(
        `Delete teaching assignment for ${subjectName}?`
      );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(
        `/schedules/${schedule._id}`
      );

      await fetchSchedules();
    } catch (err) {
      console.error(
        "❌ Schedule delete error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to delete teaching assignment."
      );
    }
  };

  // =====================================================
  // FILTER SCHEDULES
  // =====================================================

  const filteredSchedules =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return schedules.filter(
        (schedule) => {
          const searchableText = [
            getName(
              schedule?.program
            ),
            getName(
              schedule?.academicSession
            ),
            getName(
              schedule?.class
            ),
            getName(
              schedule?.section
            ),
            getName(
              schedule?.subject
            ),
            getTeacherName(
              schedule?.instructor
            ),
            schedule?.room,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !search ||
            searchableText.includes(
              search
            );

          const matchesStatus =
            !statusFilter ||
            schedule?.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      schedules,
      searchTerm,
      statusFilter,
    ]);

  // =====================================================
  // SELECTED VALUES
  // =====================================================

  const selectedProgram =
    programs.find(
      (item) =>
        String(item._id) ===
        String(form.program)
    );

  const selectedSession =
    sessions.find(
      (item) =>
        String(item._id) ===
        String(
          form.academicSession
        )
    );

  const selectedClass =
    classes.find(
      (item) =>
        String(item._id) ===
        String(form.class)
    );

  const selectedSection =
    sections.find(
      (item) =>
        String(item._id) ===
        String(form.section)
    );

  const selectedSubject =
    subjects.find(
      (item) =>
        String(item._id) ===
        String(form.subject)
    );

  const selectedTeacher =
    teachers.find(
      (item) =>
        String(item._id) ===
        String(form.instructor)
    );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CalendarDays size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Teaching Assignments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Program → Academic Session →
              Class → Section → Subject →
              Teacher → Room
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Assignment
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search program, class, subject or teacher..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-10 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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

            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <Loader2
              size={30}
              className="animate-spin text-slate-500"
            />
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
            <CalendarDays
              size={44}
              className="text-slate-300"
            />

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No teaching assignments yet
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create an assignment to connect
              Program, Academic Session, Class,
              Section, Subject and Teacher.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={17} />
              Add Assignment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  {[
                    "Program",
                    "Academic Session",
                    "Class",
                    "Section",
                    "Subject",
                    "Teacher",
                    "Room",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSchedules.map(
                  (schedule) => (
                    <tr
                      key={schedule._id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">
                          {getName(
                            schedule.program
                          ) || "—"}
                        </div>

                        {schedule?.program?.code && (
                          <div className="text-xs text-slate-400">
                            {schedule.program.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">
                          {getName(
                            schedule.academicSession
                          ) || "—"}
                        </div>

                        {schedule?.academicSession?.code && (
                          <div className="text-xs text-slate-400">
                            {schedule.academicSession.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-800">
                          {getName(
                            schedule.class
                          ) || "—"}
                        </div>

                        {schedule?.class?.code && (
                          <div className="text-xs text-slate-400">
                            {schedule.class.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">
                          {getName(
                            schedule.section
                          ) || "—"}
                        </div>

                        {schedule?.section?.code && (
                          <div className="text-xs text-slate-400">
                            {schedule.section.code}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <BookOpen
                            size={16}
                            className="text-slate-400"
                          />

                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {getName(
                                schedule.subject
                              ) || "—"}
                            </div>

                            {schedule?.subject?.code && (
                              <div className="text-xs text-slate-400">
                                {schedule.subject.code}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <UserRound
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="text-sm text-slate-700">
                            {getTeacherName(
                              schedule.instructor
                            ) || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <DoorOpen
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="text-sm text-slate-700">
                            {schedule.room ||
                              schedule?.section
                                ?.roomNumber ||
                              "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            schedule.status ===
                            "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : schedule.status ===
                                "cancelled"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {schedule.status || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                schedule
                              )
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSchedule(
                                schedule
                              )
                            }
                            className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
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

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingSchedule
                    ? "Edit Teaching Assignment"
                    : "Add Teaching Assignment"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Program → Session → Class →
                  Section → Subject → Teacher
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

            {lookupLoading ? (
              <div className="flex min-h-[350px] items-center justify-center">
                <Loader2
                  size={30}
                  className="animate-spin text-slate-500"
                />
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-6 p-6"
              >
                {/* ACADEMIC */}

                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Academic Assignment
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label="Program"
                      name="program"
                      value={form.program}
                      onChange={
                        handleProgramChange
                      }
                      options={programs.map(
                        (item) => ({
                          value: item._id,
                          label: `${getName(
                            item
                          )}${
                            item.code
                              ? ` (${item.code})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        programs.length
                          ? "Select Program"
                          : "No programs found"
                      }
                    />

                    <Select
                      label="Academic Session"
                      name="academicSession"
                      value={
                        form.academicSession
                      }
                      onChange={
                        handleSessionChange
                      }
                      options={sessions.map(
                        (item) => ({
                          value: item._id,
                          label: `${getName(
                            item
                          )}${
                            item.code
                              ? ` (${item.code})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        sessions.length
                          ? "Select Academic Session"
                          : "No academic sessions found"
                      }
                    />

                    <Select
                      label="Class"
                      name="class"
                      value={form.class}
                      onChange={
                        handleClassChange
                      }
                      disabled={
                        !form.program ||
                        !form.academicSession
                      }
                      options={filteredClasses.map(
                        (item) => ({
                          value: item._id,
                          label: `${getName(
                            item
                          )}${
                            item.code
                              ? ` (${item.code})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        !form.program ||
                        !form.academicSession
                          ? "Select Program & Session first"
                          : filteredClasses.length
                          ? "Select Class"
                          : "No classes found"
                      }
                    />

                    <Select
                      label="Section"
                      name="section"
                      value={form.section}
                      onChange={
                        handleSectionChange
                      }
                      disabled={!form.class}
                      options={filteredSections.map(
                        (item) => ({
                          value: item._id,
                          label: `${getName(
                            item
                          )}${
                            item.code
                              ? ` (${item.code})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        !form.class
                          ? "Select Class first"
                          : filteredSections.length
                          ? "Select Section"
                          : "No sections found"
                      }
                    />

                    <Select
                      label="Subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      disabled={!form.section}
                      options={filteredSubjects.map(
                        (item) => ({
                          value: item._id,
                          label: `${getName(
                            item
                          )}${
                            item.code
                              ? ` (${item.code})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        !form.section
                          ? "Select Section first"
                          : filteredSubjects.length
                          ? "Select Subject"
                          : "No subjects found"
                      }
                    />
                  </div>
                </div>

                {/* TEACHING */}

                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Teaching Assignment
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label="Teacher"
                      name="instructor"
                      value={
                        form.instructor
                      }
                      onChange={handleChange}
                      options={teachers.map(
                        (teacher) => ({
                          value:
                            teacher._id,
                          label: `${getTeacherName(
                            teacher
                          )}${
                            teacher.userId
                              ? ` (${teacher.userId})`
                              : ""
                          }`,
                        })
                      )}
                      placeholder={
                        teachers.length
                          ? "Select Teacher"
                          : "No active teachers found"
                      }
                    />

                    <Input
                      label="Room"
                      name="room"
                      value={form.room}
                      onChange={handleChange}
                      placeholder="e.g. Training Hall 1"
                    />

                    <Select
                      label="Status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
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
                          value: "cancelled",
                          label: "Cancelled",
                        },
                      ]}
                    />

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Notes
                      </span>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Optional notes..."
                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />
                    </label>
                  </div>
                </div>

                {/* SUMMARY */}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="mb-3 text-sm font-bold text-slate-800">
                    Assignment Summary
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <SummaryItem
                      value={getName(
                        selectedProgram
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={getName(
                        selectedSession
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={getName(
                        selectedClass
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={getName(
                        selectedSection
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={getName(
                        selectedSubject
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={getTeacherName(
                        selectedTeacher
                      )}
                    />

                    <Arrow />

                    <SummaryItem
                      value={form.room}
                    />
                  </div>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting && (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    {editingSchedule
                      ? "Update Assignment"
                      : "Create Assignment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// SELECT
// =====================================================

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {label !== "Status" && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={label !== "Status"}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">
          {placeholder ||
            `Select ${label}`}
        </option>

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
// INPUT
// =====================================================

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

// =====================================================
// SUMMARY ITEM
// =====================================================

function SummaryItem({ value }) {
  return (
    <span
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        value
          ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
          : "bg-slate-200 text-slate-400"
      }`}
    >
      {value || "Not selected"}
    </span>
  );
}

// =====================================================
// ARROW
// =====================================================

function Arrow() {
  return (
    <span className="font-bold text-slate-300">
      →
    </span>
  );
}