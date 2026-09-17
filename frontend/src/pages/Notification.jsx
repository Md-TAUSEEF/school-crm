import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, getMessage } from "../services/api";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const NotificationContext = createContext(null);

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

  const loadNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/notifications?limit=100"
        );

      const responseData =
        response?.data?.data || {};

      const notificationData =
        Array.isArray(responseData.items)
          ? responseData.items
          : [];

      /*
       * Backend ka unreadCount use karo.
       * Agar backend count nahi bhej raha,
       * to current notifications se calculate karo.
       */
      const backendUnreadCount =
        responseData.unreadCount;

      const calculatedUnreadCount =
        notificationData.filter(
          (notification) =>
            notification?.isRead === false
        ).length;

      const finalUnreadCount =
        backendUnreadCount !== undefined &&
        backendUnreadCount !== null
          ? Number(backendUnreadCount) || 0
          : calculatedUnreadCount;

      setNotifications(notificationData);

      setUnreadCount(finalUnreadCount);
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

      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Login ke baad notifications load karo.
   *
   * user ID dependency rakhi hai taaki logout/login
   * ke baad new authenticated user ka count reload ho.
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

  /*
   * Real-time Socket.IO notification
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

      setNotifications((current) => {
        const exists = current.some(
          (item) =>
            String(item._id) ===
            String(notification._id)
        );

        if (exists) {
          return current;
        }

        return [
          notification,
          ...current,
        ];
      });

      /*
       * Sirf unread notification ka count increase karo.
       */
      if (!notification.isRead) {
        setUnreadCount(
          (count) => count + 1
        );
      }
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

  /*
   * Mark single notification as read
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

      setNotifications((current) =>
        current.map((notification) => {
          if (
            String(notification._id) !==
            String(notificationId)
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
        })
      );

      if (wasUnread) {
        setUnreadCount((count) =>
          Math.max(0, count - 1)
        );
      }

      return {
        success: true,
        data: updatedNotification,
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

  /*
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await api.put(
        "/notifications/read-all"
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt:
            notification.readAt ||
            new Date().toISOString(),
        }))
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

export default NotificationProvider;