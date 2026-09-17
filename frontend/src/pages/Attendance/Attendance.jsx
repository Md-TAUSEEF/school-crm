import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";

const initialForm = {
  academicSession: "",
  class: "",
  section: "",
  subject: "",
  date: new Date().toISOString().split("T")[0],
};

const ATTENDANCE_STATUSES = [
  {
    value: "present",
    label: "Present",
  },
  {
    value: "absent",
    label: "Absent",
  },
  {
    value: "late",
    label: "Late",
  },
  {
    value: "excused",
    label: "Excused",
  },
];

const getResponseData = (response) => {
  return response?.data || {};
};

const getList = (response, keys = []) => {
  const data = getResponseData(response);

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.items)) {
    return data.data.items;
  }

  return [];
};

const getStudentId = (student) => {
  return (
    student?._id ||
    student?.id ||
    student?.student?._id ||
    student?.student?.id
  );
};

const getStudentName = (student) => {
  const firstName =
    student?.firstName ||
    student?.student?.firstName ||
    "";

  const lastName =
    student?.lastName ||
    student?.student?.lastName ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return fullName || "Unnamed Student";
};

const getStudentUserId = (student) => {
  return (
    student?.userId ||
    student?.student?.userId ||
    ""
  );
};

const getClassName = (item) => {
  return (
    item?.name ||
    item?.title ||
    item?.className ||
    "Unnamed Class"
  );
};

const getSectionName = (item) => {
  return (
    item?.name ||
    item?.title ||
    item?.sectionName ||
    "Unnamed Section"
  );
};

const getSubjectName = (item) => {
  return (
    item?.name ||
    item?.title ||
    item?.subjectName ||
    "Unnamed Subject"
  );
};

const getSessionName = (item) => {
  return (
    item?.name ||
    item?.title ||
    item?.sessionName ||
    "Unnamed Session"
  );
};

const Attendance = () => {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [form, setForm] =
    useState(initialForm);

  const [attendance, setAttendance] =
    useState({});

  const [remarks, setRemarks] =
    useState({});

  const [searchTerm, setSearchTerm] =
    useState("");

  const [loadingSessions, setLoadingSessions] =
    useState(false);

  const [loadingClasses, setLoadingClasses] =
    useState(false);

  const [loadingSections, setLoadingSections] =
    useState(false);

  const [loadingSubjects, setLoadingSubjects] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [existingAttendance, setExistingAttendance] =
    useState({});

  const [loadingExistingAttendance, setLoadingExistingAttendance] =
    useState(false);

  // =====================================================
  // FETCH ACADEMIC SESSIONS
  // =====================================================

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      setError("");

      const response =
        await api.get(
          "/academic-sessions",
          {
            params: {
              page: 1,
              limit: 1000,
            },
          }
        );

      const items = getList(
        response,
        [
          "sessions",
          "academicSessions",
          "items",
        ]
      );

      setSessions(
        Array.isArray(items)
          ? items
          : []
      );
    } catch (err) {
      console.error(
        "Fetch sessions error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load academic sessions."
      );

      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // =====================================================
  // FETCH CLASSES
  // =====================================================

  const fetchClasses = async (
    sessionId
  ) => {
    if (!sessionId) {
      setClasses([]);
      return;
    }

    try {
      setLoadingClasses(true);
      setError("");

      const response =
        await api.get(
          "/classes",
          {
            params: {
              page: 1,
              limit: 1000,
              academicSession:
                sessionId,
            },
          }
        );

      const items = getList(
        response,
        [
          "classes",
          "items",
        ]
      );

      setClasses(
        Array.isArray(items)
          ? items
          : []
      );
    } catch (err) {
      console.error(
        "Fetch classes error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load classes."
      );

      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  // =====================================================
  // FETCH SECTIONS
  // =====================================================

  const fetchSections = async (
    sessionId,
    classId
  ) => {
    if (
      !sessionId ||
      !classId
    ) {
      setSections([]);
      return;
    }

    try {
      setLoadingSections(true);
      setError("");

      const response =
        await api.get(
          "/sections",
          {
            params: {
              page: 1,
              limit: 1000,
              academicSession:
                sessionId,
              class: classId,
            },
          }
        );

      const items = getList(
        response,
        [
          "sections",
          "items",
        ]
      );

      setSections(
        Array.isArray(items)
          ? items
          : []
      );
    } catch (err) {
      console.error(
        "Fetch sections error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load sections."
      );

      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  };

  // =====================================================
  // FETCH SUBJECTS
  // =====================================================

  const fetchSubjects = async (
    sessionId,
    classId,
    sectionId
  ) => {
    if (
      !sessionId ||
      !classId ||
      !sectionId
    ) {
      setSubjects([]);
      return;
    }

    try {
      setLoadingSubjects(true);
      setError("");

      const response =
        await api.get(
          "/subjects",
          {
            params: {
              page: 1,
              limit: 1000,
              academicSession:
                sessionId,
              class: classId,
              section: sectionId,
            },
          }
        );

      const items = getList(
        response,
        [
          "subjects",
          "items",
        ]
      );

      setSubjects(
        Array.isArray(items)
          ? items
          : []
      );
    } catch (err) {
      console.error(
        "Fetch subjects error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load subjects."
      );

      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // =====================================================
  // FETCH STUDENTS
  // =====================================================

  const fetchStudents = async (
    sessionId,
    classId,
    sectionId
  ) => {
    if (
      !sessionId ||
      !classId ||
      !sectionId
    ) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);
      setError("");

      const response =
        await api.get(
          `/attendance/section/${sectionId}/students`,
          {
            params: {
              academicSession:
                sessionId,
              class: classId,
            },
          }
        );

      const items = getList(
        response,
        [
          "students",
          "items",
        ]
      );

      setStudents(
        Array.isArray(items)
          ? items
          : []
      );
    } catch (err) {
      console.error(
        "Fetch attendance students error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load section students."
      );

      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchSessions();
  }, []);

  // =====================================================
  // SESSION CHANGE
  // =====================================================

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      class: "",
      section: "",
      subject: "",
    }));

    setClasses([]);
    setSections([]);
    setSubjects([]);
    setStudents([]);
    setAttendance({});
    setRemarks({});
    setExistingAttendance({});

    if (form.academicSession) {
      fetchClasses(
        form.academicSession
      );
    }
  }, [form.academicSession]);

  // =====================================================
  // CLASS CHANGE
  // =====================================================

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      section: "",
      subject: "",
    }));

    setSections([]);
    setSubjects([]);
    setStudents([]);
    setAttendance({});
    setRemarks({});
    setExistingAttendance({});

    if (
      form.academicSession &&
      form.class
    ) {
      fetchSections(
        form.academicSession,
        form.class
      );
    }
  }, [form.class]);

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      subject: "",
    }));

    setSubjects([]);
    setStudents([]);
    setAttendance({});
    setRemarks({});
    setExistingAttendance({});

    if (
      form.academicSession &&
      form.class &&
      form.section
    ) {
      fetchSubjects(
        form.academicSession,
        form.class,
        form.section
      );

      fetchStudents(
        form.academicSession,
        form.class,
        form.section
      );
    }
  }, [form.section]);

  // =====================================================
  // HANDLE FORM CHANGE
  // =====================================================

  const handleChange = (field, value) => {
    setError("");
    setSuccess("");

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =====================================================
  // MARK STATUS
  // =====================================================

  const handleStatusChange = (
    studentId,
    status
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    setError("");
    setSuccess("");
  };

  // =====================================================
  // REMARK CHANGE
  // =====================================================

  const handleRemarksChange = (
    studentId,
    value
  ) => {
    setRemarks((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  // =====================================================
  // MARK ALL PRESENT
  // =====================================================

  const markAllPresent = () => {
    const next = {};

    filteredStudents.forEach(
      (student) => {
        const id =
          getStudentId(student);

        if (id) {
          next[id] = "present";
        }
      }
    );

    setAttendance(next);
  };

  // =====================================================
  // MARK ALL ABSENT
  // =====================================================

  const markAllAbsent = () => {
    const next = {};

    filteredStudents.forEach(
      (student) => {
        const id =
          getStudentId(student);

        if (id) {
          next[id] = "absent";
        }
      }
    );

    setAttendance(next);
  };

  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      if (!term) {
        return students;
      }

      return students.filter(
        (student) => {
          const name =
            getStudentName(
              student
            ).toLowerCase();

          const userId =
            getStudentUserId(
              student
            ).toLowerCase();

          const email =
            (
              student?.email ||
              ""
            ).toLowerCase();

          return (
            name.includes(term) ||
            userId.includes(term) ||
            email.includes(term)
          );
        }
      );
    }, [
      students,
      searchTerm,
    ]);

  // =====================================================
  // COUNTS
  // =====================================================

  const attendanceCounts =
    useMemo(() => {
      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;
      let unmarked = 0;

      students.forEach(
        (student) => {
          const id =
            getStudentId(student);

          const status =
            attendance[id];

          if (!status) {
            unmarked++;
            return;
          }

          if (
            status === "present"
          ) {
            present++;
          }

          if (
            status === "absent"
          ) {
            absent++;
          }

          if (
            status === "late"
          ) {
            late++;
          }

          if (
            status === "excused"
          ) {
            excused++;
          }
        }
      );

      return {
        present,
        absent,
        late,
        excused,
        unmarked,
      };
    }, [
      students,
      attendance,
    ]);

  // =====================================================
  // FETCH EXISTING ATTENDANCE
  // =====================================================

  const fetchExistingAttendance =
    async () => {
      if (
        !form.academicSession ||
        !form.class ||
        !form.section ||
        !form.subject ||
        !form.date
      ) {
        setExistingAttendance({});
        return;
      }

      try {
        setLoadingExistingAttendance(
          true
        );

        const response =
          await api.get(
            "/attendance",
            {
              params: {
                academicSession:
                  form.academicSession,

                class:
                  form.class,

                section:
                  form.section,

                subject:
                  form.subject,

                date:
                  form.date,

                page: 1,
                limit: 1000,
              },
            }
          );

        const data =
          getResponseData(
            response
          );

        const records =
          Array.isArray(
            data?.data
          )
            ? data.data
            : Array.isArray(
                data?.attendance
              )
            ? data.attendance
            : Array.isArray(
                data?.items
              )
            ? data.items
            : [];

        const map = {};

        records.forEach(
          (record) => {
            const studentId =
              record?.student?._id ||
              record?.student?.id ||
              record?.student;

            if (studentId) {
              map[String(studentId)] =
                record;
            }
          }
        );

        setExistingAttendance(
          map
        );

        // Load existing status
        const nextAttendance = {};
        const nextRemarks = {};

        records.forEach(
          (record) => {
            const studentId =
              record?.student?._id ||
              record?.student?.id ||
              record?.student;

            if (studentId) {
              nextAttendance[
                String(studentId)
              ] = record.status;

              nextRemarks[
                String(studentId)
              ] =
                record.remarks || "";
            }
          }
        );

        setAttendance(
          nextAttendance
        );

        setRemarks(
          nextRemarks
        );
      } catch (err) {
        console.error(
          "Fetch existing attendance error:",
          err
        );

        setExistingAttendance({});
      } finally {
        setLoadingExistingAttendance(
          false
        );
      }
    };

  // =====================================================
  // LOAD EXISTING ATTENDANCE
  // =====================================================

  useEffect(() => {
    fetchExistingAttendance();
  }, [
    form.academicSession,
    form.class,
    form.section,
    form.subject,
    form.date,
  ]);

  // =====================================================
  // SAVE ATTENDANCE
  // =====================================================

  const handleSaveAttendance =
    async () => {
      try {
        setError("");
        setSuccess("");

        // ------------------------------------------------
        // REQUIRED SELECTION
        // ------------------------------------------------

        if (
          !form.academicSession ||
          !form.class ||
          !form.section ||
          !form.subject ||
          !form.date
        ) {
          setError(
            "Please select Academic Session, Class, Section, Subject and Date."
          );

          return;
        }

        if (!students.length) {
          setError(
            "No active students found in this section."
          );

          return;
        }

        // ------------------------------------------------
        // CHECK UNMARKED
        // ------------------------------------------------

        const unmarkedStudents =
          students.filter(
            (student) => {
              const id =
                getStudentId(
                  student
                );

              return (
                id &&
                !attendance[id]
              );
            }
          );

        if (
          unmarkedStudents.length >
          0
        ) {
          setError(
            `Please mark attendance for all students. ${unmarkedStudents.length} student(s) are still unmarked.`
          );

          return;
        }

        setSaving(true);

        // ------------------------------------------------
        // CREATE / UPDATE EACH STUDENT
        // ------------------------------------------------

        for (const student of students) {
          const studentId =
            getStudentId(student);

          if (!studentId) {
            continue;
          }

          const payload = {
            student:
              studentId,

            academicSession:
              form.academicSession,

            class:
              form.class,

            section:
              form.section,

            subject:
              form.subject,

            date:
              form.date,

            status:
              attendance[
                studentId
              ],

            remarks:
              remarks[
                studentId
              ] || "",
          };

          const existing =
            existingAttendance[
              String(studentId)
            ];

          if (existing?._id) {
            await api.put(
              `/attendance/${existing._id}`,
              {
                status:
                  payload.status,

                remarks:
                  payload.remarks,

                date:
                  payload.date,
              }
            );
          } else {
            await api.post(
              "/attendance",
              payload
            );
          }
        }

        setSuccess(
          "Attendance saved successfully."
        );

        await fetchExistingAttendance();
      } catch (err) {
        console.error(
          "Save attendance error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Failed to save attendance."
        );
      } finally {
        setSaving(false);
      }
    };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setError("");
    setSuccess("");

    if (
      form.academicSession &&
      form.class &&
      form.section
    ) {
      await fetchStudents(
        form.academicSession,
        form.class,
        form.section
      );
    }

    if (
      form.academicSession &&
      form.class &&
      form.section &&
      form.subject &&
      form.date
    ) {
      await fetchExistingAttendance();
    }
  };

  // =====================================================
  // SELECTED DATA
  // =====================================================

  const selectedSession =
    sessions.find(
      (item) =>
        String(item._id) ===
        String(form.academicSession)
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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ClipboardCheck
                size={22}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Mark and manage student attendance by subject.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            handleRefresh
          }
          disabled={
            loadingStudents ||
            loadingExistingAttendance
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              loadingStudents ||
              loadingExistingAttendance
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{success}</span>
        </div>
      )}

      {/* =================================================
          FILTER / SELECTION
      ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays
            size={19}
            className="text-slate-700"
          />

          <h2 className="font-semibold text-slate-900">
            Attendance Selection
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {/* SESSION */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Academic Session
            </label>

            <select
              value={
                form.academicSession
              }
              onChange={(e) =>
                handleChange(
                  "academicSession",
                  e.target.value
                )
              }
              disabled={
                loadingSessions
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
            >
              <option value="">
                {loadingSessions
                  ? "Loading sessions..."
                  : "Select session"}
              </option>

              {sessions.map(
                (session) => (
                  <option
                    key={session._id}
                    value={
                      session._id
                    }
                  >
                    {getSessionName(
                      session
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* CLASS */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Class
            </label>

            <select
              value={form.class}
              onChange={(e) =>
                handleChange(
                  "class",
                  e.target.value
                )
              }
              disabled={
                !form.academicSession ||
                loadingClasses
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
            >
              <option value="">
                {loadingClasses
                  ? "Loading classes..."
                  : "Select class"}
              </option>

              {classes.map(
                (item) => (
                  <option
                    key={item._id}
                    value={item._id}
                  >
                    {getClassName(
                      item
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* SECTION */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Section
            </label>

            <select
              value={form.section}
              onChange={(e) =>
                handleChange(
                  "section",
                  e.target.value
                )
              }
              disabled={
                !form.class ||
                loadingSections
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
            >
              <option value="">
                {loadingSections
                  ? "Loading sections..."
                  : "Select section"}
              </option>

              {sections.map(
                (item) => (
                  <option
                    key={item._id}
                    value={item._id}
                  >
                    {getSectionName(
                      item
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* SUBJECT */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>

            <select
              value={form.subject}
              onChange={(e) =>
                handleChange(
                  "subject",
                  e.target.value
                )
              }
              disabled={
                !form.section ||
                loadingSubjects
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
            >
              <option value="">
                {loadingSubjects
                  ? "Loading subjects..."
                  : "Select subject"}
              </option>

              {subjects.map(
                (item) => (
                  <option
                    key={item._id}
                    value={item._id}
                  >
                    {getSubjectName(
                      item
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* DATE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Attendance Date
            </label>

            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                handleChange(
                  "date",
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* SELECTED CONTEXT */}

        {(selectedSession ||
          selectedClass ||
          selectedSection ||
          selectedSubject) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {selectedSession && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                Session:{" "}
                {getSessionName(
                  selectedSession
                )}
              </span>
            )}

            {selectedClass && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                Class:{" "}
                {getClassName(
                  selectedClass
                )}
              </span>
            )}

            {selectedSection && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                Section:{" "}
                {getSectionName(
                  selectedSection
                )}
              </span>
            )}

            {selectedSubject && (
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                Subject:{" "}
                {getSubjectName(
                  selectedSubject
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* =================================================
          EMPTY STATE BEFORE SELECTION
      ================================================= */}

      {!form.section && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ClipboardCheck
            size={42}
            className="mx-auto text-slate-300"
          />

          <h3 className="mt-4 text-lg font-semibold text-slate-800">
            Select attendance context
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Select Academic Session, Class and
            Section to load the actual active
            students.
          </p>
        </div>
      )}

      {/* =================================================
          STUDENT ROSTER
      ================================================= */}

      {form.section && (
        <>
          {/* SUMMARY CARDS */}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Users size={17} />
                <span className="text-xs font-medium">
                  Students
                </span>
              </div>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {students.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="text-xs font-medium text-emerald-700">
                Present
              </span>

              <p className="mt-2 text-2xl font-bold text-emerald-800">
                {
                  attendanceCounts.present
                }
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <span className="text-xs font-medium text-red-700">
                Absent
              </span>

              <p className="mt-2 text-2xl font-bold text-red-800">
                {
                  attendanceCounts.absent
                }
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-xs font-medium text-amber-700">
                Late
              </span>

              <p className="mt-2 text-2xl font-bold text-amber-800">
                {
                  attendanceCounts.late
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-medium text-slate-600">
                Unmarked
              </span>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {
                  attendanceCounts.unmarked
                }
              </p>
            </div>
          </div>

          {/* ROSTER CARD */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* TOP BAR */}

            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Student Attendance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Only active enrolled and active
                  membership students are shown.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    markAllPresent
                  }
                  disabled={
                    !students.length
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={16} />
                  Mark All Present
                </button>

                <button
                  type="button"
                  onClick={
                    markAllAbsent
                  }
                  disabled={
                    !students.length
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} />
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* SEARCH */}

            <div className="border-b border-slate-100 p-5">
              <div className="relative max-w-md">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  placeholder="Search student name, ID or email..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* LOADING */}

            {loadingStudents && (
              <div className="flex items-center justify-center px-6 py-14">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />

                  Loading students...
                </div>
              </div>
            )}

            {/* EXISTING ATTENDANCE LOADING */}

            {!loadingStudents &&
              loadingExistingAttendance && (
                <div className="border-b border-blue-100 bg-blue-50 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Loading existing attendance...
                  </div>
                </div>
              )}

            {/* NO STUDENTS */}

            {!loadingStudents &&
              !students.length && (
                <div className="px-6 py-14 text-center">
                  <Users
                    size={40}
                    className="mx-auto text-slate-300"
                  />

                  <h3 className="mt-4 text-base font-semibold text-slate-800">
                    No active students found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    There are no students with an
                    active enrollment and active
                    membership in this section.
                  </p>
                </div>
              )}

            {/* TABLE */}

            {!loadingStudents &&
              students.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-[1050px] w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          #
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student ID
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Attendance
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map(
                        (
                          student,
                          index
                        ) => {
                          const studentId =
                            getStudentId(
                              student
                            );

                          const currentStatus =
                            attendance[
                              studentId
                            ] || "";

                          const existing =
                            existingAttendance[
                              String(
                                studentId
                              )
                            ];

                          return (
                            <tr
                              key={
                                studentId ||
                                index
                              }
                              className="transition hover:bg-slate-50/70"
                            >
                              {/* NUMBER */}

                              <td className="px-5 py-4 text-sm text-slate-500">
                                {index +
                                  1}
                              </td>

                              {/* STUDENT */}

                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {getStudentName(
                                      student
                                    )}
                                  </p>

                                  {student?.email && (
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {
                                        student.email
                                      }
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* ID */}

                              <td className="px-5 py-4">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  {getStudentUserId(
                                    student
                                  ) ||
                                    "—"}
                                </span>
                              </td>

                              {/* STATUS */}

                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {ATTENDANCE_STATUSES.map(
                                    (
                                      item
                                    ) => {
                                      const active =
                                        currentStatus ===
                                        item.value;

                                      return (
                                        <button
                                          key={
                                            item.value
                                          }
                                          type="button"
                                          onClick={() =>
                                            handleStatusChange(
                                              studentId,
                                              item.value
                                            )
                                          }
                                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                            active
                                              ? item.value ===
                                                "present"
                                                ? "border-emerald-600 bg-emerald-600 text-white"
                                                : item.value ===
                                                  "absent"
                                                ? "border-red-600 bg-red-600 text-white"
                                                : item.value ===
                                                  "late"
                                                ? "border-amber-500 bg-amber-500 text-white"
                                                : "border-slate-600 bg-slate-600 text-white"
                                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                          }`}
                                        >
                                          {item.label}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>

                                {existing?._id && (
                                  <p className="mt-2 text-[11px] font-medium text-blue-600">
                                    Existing attendance
                                  </p>
                                )}
                              </td>

                              {/* REMARKS */}

                              <td className="px-5 py-4">
                                <input
                                  type="text"
                                  value={
                                    remarks[
                                      studentId
                                    ] ||
                                    ""
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleRemarksChange(
                                      studentId,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional remarks"
                                  className="w-full min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>

                  {/* SEARCH EMPTY */}

                  {!filteredStudents.length && (
                    <div className="px-6 py-12 text-center">
                      <Search
                        size={34}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No students match your search.
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* SAVE BAR */}

            {students.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  {attendanceCounts.unmarked >
                  0 ? (
                    <>
                      <span className="font-semibold text-amber-700">
                        {
                          attendanceCounts.unmarked
                        }
                      </span>{" "}
                      student(s) still unmarked.
                    </>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      All students marked.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    handleSaveAttendance
                  }
                  disabled={
                    saving ||
                    loadingExistingAttendance ||
                    attendanceCounts.unmarked >
                      0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save
                        size={18}
                      />

                      Save Attendance
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;