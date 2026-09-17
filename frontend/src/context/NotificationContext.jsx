import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, getMessage } from "../services/api";
import { socket } from "../services/socket";
import { useAuth } from "./AuthContext";

const NotificationContext =
  createContext(null);

export const NotificationProvider = ({
  children,
}) => {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /**
   * Load notifications.
   */
  const loadNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        notificationsResponse,
        unreadResponse,
      ] = await Promise.all([
        api.get("/notifications"),
        api.get(
          "/notifications/unread-count"
        ),
      ]);

      const responseData =
        notificationsResponse?.data
          ?.data;

      /**
       * Backend response:
       *
       * data: {
       *   items: [],
       *   unreadCount: 0,
       *   pagination: {}
       * }
       */
      const notificationData =
        Array.isArray(responseData?.items)
          ? responseData.items
          : [];

      const unreadData =
        unreadResponse?.data?.data
          ?.unreadCount ??
        responseData?.unreadCount ??
        0;

      setNotifications(
        notificationData
      );

      setUnreadCount(
        Number(unreadData) || 0
      );
    } catch (err) {
      console.error(
        "Load notifications error:",
        err
      );

      setError(
        getMessage(
          err,
          "Unable to load notifications"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial load.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();
  }, [
    isAuthenticated,
    user?.id,
    user?._id,
  ]);

  /**
   * Real-time notification listener.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleNewNotification = (
      notification
    ) => {
      console.log(
        "Real-time notification received:",
        notification
      );

      if (!notification) {
        return;
      }

      setNotifications(
        (current) => {
          const exists =
            current.some(
              (item) =>
                String(item._id) ===
                String(
                  notification._id
                )
            );

          if (exists) {
            return current;
          }

          return [
            notification,
            ...current,
          ];
        }
      );

      setUnreadCount(
        (count) => count + 1
      );
    };

    socket.on(
      "notification:new",
      handleNewNotification
    );

    return () => {
      socket.off(
        "notification:new",
        handleNewNotification
      );
    };
  }, [isAuthenticated]);

  /**
   * Mark one notification as read.
   */
  const markAsRead = async (
    notificationId
  ) => {
    if (!notificationId) {
      return {
        success: false,
        message:
          "Notification ID is required",
      };
    }

    try {
      const response =
        await api.put(
          `/notifications/${notificationId}/read`
        );

      const updatedNotification =
        response?.data?.data ||
        response?.data?.notification ||
        null;

      let wasUnread = false;

      setNotifications(
        (current) =>
          current.map(
            (notification) => {
              if (
                String(
                  notification._id
                ) !==
                String(
                  notificationId
                )
              ) {
                return notification;
              }

              wasUnread =
                !notification.isRead;

              return (
                updatedNotification || {
                  ...notification,
                  isRead: true,
                  readAt:
                    new Date().toISOString(),
                }
              );
            }
          )
      );

      if (wasUnread) {
        setUnreadCount(
          (count) =>
            Math.max(0, count - 1)
        );
      }

      return {
        success: true,
        data:
          updatedNotification,
      };
    } catch (err) {
      console.error(
        "Mark notification as read error:",
        err
      );

      return {
        success: false,
        message: getMessage(
          err,
          "Unable to mark notification as read"
        ),
      };
    }
  };

  /**
   * Mark all notifications as read.
   */
  const markAllAsRead =
    async () => {
      try {
        await api.put(
          "/notifications/read-all"
        );

        setNotifications(
          (current) =>
            current.map(
              (notification) => ({
                ...notification,
                isRead: true,
                readAt:
                  notification.readAt ||
                  new Date().toISOString(),
              })
            )
        );

        setUnreadCount(0);

        return {
          success: true,
        };
      } catch (err) {
        console.error(
          "Mark all notifications as read error:",
          err
        );

        return {
          success: false,
          message: getMessage(
            err,
            "Unable to mark all notifications as read"
          ),
        };
      }
    };

  /**
   * Real refresh.
   */
  const refreshNotifications =
    async () => {
      await loadNotifications();
    };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(
    NotificationContext
  );

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
};