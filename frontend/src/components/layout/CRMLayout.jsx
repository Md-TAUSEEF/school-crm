import React, { useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  RefreshCcw,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UserPlus,
  X,
  Layers3,
  School,
  ListTree,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

const navigation = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    label: "Academy",
    items: [
      {
        label: "Students",
        path: "/students",
        icon: GraduationCap,
      },
      {
        label: "Parents",
        path: "/parents",
        icon: Users,
      },
      {
        label: "Admissions",
        path: "/admissions",
        icon: UserPlus,
      },
      {
        label: "Enrollments",
        path: "/enrollments",
        icon: ClipboardList,
      },
      {
        label: "Teachers",
        path: "/teachers",
        icon: UserRound,
      },
    ],
  },

  {
    label: "Academic Management",
    items: [
      {
        label: "Academic Section",
        icon: School,
        children: [
          {
            label: "Programs",
            path: "/programs",
            icon: Layers3,
          },
          {
            label: "Academic Sessions",
            path: "/academic-sessions",
            icon: CalendarDays,
          },
          {
            label: "Classes",
            path: "/classes",
            icon: School,
          },
          {
            label: "Sections",
            path: "/sections",
            icon: ListTree,
          },
          {
            label: "Subjects",
            path: "/subjects",
            icon: BookOpen,
          },
        ],
      },

      {
        label: "Schedules",
        path: "/schedules",
        icon: CalendarDays,
      },
      {
        label: "Attendance",
        path: "/attendance",
        icon: ClipboardCheck,
      },
      {
        label: "Progress",
        path: "/progress",
        icon: Activity,
      },
    ],
  },

  {
    label: "Finance",
    items: [
      {
        label: "Fee Structures",
        path: "/fee-structures",
        icon: Receipt,
      },
      {
        label: "Fee Assignments",
        path: "/fee-assignments",
        icon: FileText,
      },
      {
        label: "Payments",
        path: "/payments",
        icon: CircleDollarSign,
      },
      {
        label: "Memberships",
        path: "/memberships",
        icon: ShieldCheck,
      },
      {
        label: "Renewals",
        path: "/renewals",
        icon: RefreshCcw,
      },
    ],
  },

  {
    label: "Communication",
    items: [
      {
        label: "Queries",
        path: "/queries",
        icon: MessageSquare,
      },
      {
        label: "Trial Bookings",
        path: "/trials",
        icon: BookOpen,
      },
      {
        label: "Notifications",
        path: "/notifications",
        icon: Bell,
      },
    ],
  },

  {
    label: "System",
    items: [
      {
        label: "Audit Logs",
        path: "/audit-logs",
        icon: Settings,
      },
    ],
  },
];

const CRMLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);

  const [academicSectionOpen, setAcademicSectionOpen] =
    useState(true);

  const { user, logout } = useAuth();

  // Notification context
  const { unreadCount } = useNotifications();

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
          collapsed ? "w-[82px]" : "w-[270px]",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
              FS
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  Force Strike
                </p>

                <p className="truncate text-[11px] font-medium text-slate-400">
                  Academy CRM
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map((section) => (
            <div key={section.label} className="mb-6">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {section.label}
                </p>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  {/* Nested Academic Section */}
                  if (item.children) {
                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() =>
                            setAcademicSectionOpen(
                              (value) => !value
                            )
                          }
                          title={
                            collapsed
                              ? item.label
                              : undefined
                          }
                          className={[
                            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                            "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                            collapsed
                              ? "justify-center"
                              : "",
                          ].join(" ")}
                        >
                          <Icon
                            size={18}
                            className="shrink-0"
                          />

                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">
                                {item.label}
                              </span>

                              <ChevronDown
                                size={16}
                                className={[
                                  "transition-transform",
                                  academicSectionOpen
                                    ? "rotate-180"
                                    : "",
                                ].join(" ")}
                              />
                            </>
                          )}
                        </button>

                        {!collapsed &&
                          academicSectionOpen && (
                            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
                              {item.children.map(
                                (child) => {
                                  const ChildIcon =
                                    child.icon;

                                  return (
                                    <NavLink
                                      key={child.path}
                                      to={child.path}
                                      onClick={() =>
                                        setSidebarOpen(
                                          false
                                        )
                                      }
                                      className={({
                                        isActive,
                                      }) =>
                                        [
                                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                                          isActive
                                            ? "bg-slate-950 text-white shadow-sm"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
                                        ].join(" ")
                                      }
                                    >
                                      <ChildIcon
                                        size={16}
                                        className="shrink-0"
                                      />

                                      <span className="truncate">
                                        {child.label}
                                      </span>
                                    </NavLink>
                                  );
                                }
                              )}
                            </div>
                          )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() =>
                        setSidebarOpen(false)
                      }
                      title={
                        collapsed
                          ? item.label
                          : undefined
                      }
                      className={({ isActive }) =>
                        [
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                          collapsed
                            ? "justify-center"
                            : "",
                        ].join(" ")
                      }
                    >
                      <Icon
                        size={18}
                        className="shrink-0"
                      />

                      {!collapsed && (
                        <span className="truncate">
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Collapse */}
        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <button
            type="button"
            onClick={() =>
              setCollapsed((value) => !value)
            }
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={
              collapsed ? "Logout" : undefined
            }
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50",
              collapsed
                ? "justify-center"
                : "",
            ].join(" ")}
          >
            <LogOut size={18} />

            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        className={[
          "min-h-screen transition-all duration-300",
          collapsed
            ? "lg:pl-[82px]"
            : "lg:pl-[270px]",
        ].join(" ")}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="hidden text-xs font-medium text-slate-400 sm:block">
                Force Strike Martial Arts Academy
              </p>

              <p className="text-sm font-semibold text-slate-900">
                Academy Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Button */}
            <button
              type="button"
              onClick={() =>
                navigate("/notifications")
              }
              aria-label="Notifications"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
            >
              <Bell size={19} />

              {/* Unread Notification Badge */}
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            <div className="hidden h-9 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.firstName || "User"}{" "}
                  {user?.lastName || ""}
                </p>

                <p className="text-[11px] font-medium capitalize text-slate-400">
                  {user?.role || "user"}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                {(
                  user?.firstName?.[0] ||
                  "F"
                ).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;