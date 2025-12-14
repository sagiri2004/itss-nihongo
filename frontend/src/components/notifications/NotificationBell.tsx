import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { notificationService, type Notification } from '../../services/notificationService'
import './NotificationBell.css'

const NotificationBell = () => {
  const { token } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load unread count
  const loadUnreadCount = async () => {
    if (!token) return
    try {
      const count = await notificationService.getUnreadCount(token)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count', error)
    }
  }

  // Load notifications
  const loadNotifications = async () => {
    if (!token) return
    try {
      const notifs = await notificationService.getNotifications(token)
      setNotifications(notifs)
    } catch (error) {
      console.error('Failed to load notifications', error)
    }
  }

  // Initial load
  useEffect(() => {
    if (token) {
      loadUnreadCount()
      loadNotifications()
    }
  }, [token])

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    if (!token) return

    const interval = setInterval(() => {
      loadUnreadCount()
      // Only reload full notifications if dropdown is open
      if (isOpen) {
        loadNotifications()
      }
    }, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [token, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBellClick = () => {
    setIsOpen(!isOpen)
    if (!isOpen && token) {
      loadNotifications()
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!token) return

    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id, token)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Failed to mark notification as read', error)
      }
    }

    // Navigate to lecture if available
    if (notification.lecture_id) {
      window.location.href = `/app/lectures/${notification.lecture_id}`
    }

    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    if (!token) return
    try {
      await notificationService.markAllAsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read', error)
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleBellClick}
        aria-label="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-read"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-title">{notification.title}</div>
                    <div className="notification-item-message">{notification.message}</div>
                    {notification.lecture_title && (
                      <div className="notification-item-lecture">{notification.lecture_title}</div>
                    )}
                    <div className="notification-item-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && <div className="notification-item-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

