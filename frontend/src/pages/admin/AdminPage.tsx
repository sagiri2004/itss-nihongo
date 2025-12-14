import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../context/LanguageContext'
import { adminService } from '../../services/adminService'
import type { UserProfile } from '../../types/auth'
import type { LectureSummary } from '../../types/lecture'
import '../../styles/history.css'

const AdminPage = () => {
  const { token, user } = useAuth()
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'users' | 'lectures' | 'export'>('users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [lectures, setLectures] = useState<LectureSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  const isAdmin = useMemo(() => {
    return user?.roles?.includes('ROLE_ADMIN') ?? false
  }, [user])

  useEffect(() => {
    if (!isAdmin || !token) {
      return
    }
    loadUsers()
  }, [isAdmin, token])

  useEffect(() => {
    if (!isAdmin || !token || activeTab !== 'lectures') {
      return
    }
    loadLectures()
  }, [isAdmin, token, activeTab, selectedStatus])

  const loadUsers = async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminService.listUsers(token)
      setUsers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLectures = async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const status = selectedStatus === 'ALL' ? undefined : selectedStatus
      const data = await adminService.listLectures(token, status)
      setLectures(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!token) return
    if (!window.confirm(t('admin.users.confirmDelete'))) return

    try {
      await adminService.deleteUser(userId, token)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message)
    }
  }

  const handleChangePassword = async (userId: number) => {
    if (!token) return
    if (!newPassword || newPassword.length < 6) {
      alert(t('admin.users.passwordMinLength'))
      return
    }

    try {
      await adminService.changeUserPassword(userId, newPassword, token)
      setEditingUserId(null)
      setNewPassword('')
      alert(t('admin.users.passwordChanged'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message)
    }
  }

  const handleExport = async (type: 'users' | 'lectures' | 'statistics', format: 'csv' | 'xlsx' | 'json') => {
    if (!token) return

    try {
      let blob: Blob
      let filename: string

      if (type === 'users') {
        blob = await adminService.exportUsers(format, token)
        filename = `users.${format}`
      } else if (type === 'lectures') {
        const status = selectedStatus === 'ALL' ? undefined : selectedStatus
        blob = await adminService.exportLectures(format, token, status)
        filename = `lectures.${format}`
      } else {
        blob = await adminService.exportStatistics(format, token)
        filename = `statistics.${format}`
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message)
    }
  }

  if (!isAdmin) {
    return (
      <>
        <section className="page-hero">
          <div>
            <p className="topbar__bread">{t('admin.breadcrumb')}</p>
            <h1>{t('admin.title')}</h1>
          </div>
        </section>
        <section className="history-wrapper">
          <div className="history-container">
            <div className="history-error">
              <p className="error-message">{t('admin.accessDenied')}</p>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <p className="topbar__bread">{t('admin.breadcrumb')}</p>
          <h1>{t('admin.title')}</h1>
        </div>
      </section>

      <section className="history-wrapper">
        <div className="history-container">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'users' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'users' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {t('admin.tabs.users')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lectures')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'lectures' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'lectures' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'lectures' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {t('admin.tabs.lectures')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'export' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'export' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'export' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {t('admin.tabs.export')}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="history-error" style={{ marginBottom: '2rem' }}>
              <p className="error-message">{error}</p>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>{t('admin.users.title')}</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadUsers}
                  disabled={isLoading}
                >
                  {t('admin.refresh')}
                </button>
              </div>

              {isLoading ? (
                <div className="history-loading">
                  <div className="spinner"></div>
                  <p>{t('common.loading')}</p>
                </div>
              ) : (
                <div className="history-timeline">
                  {users.map((user) => (
                    <div key={user.id} className="history-item">
                      <div className="history-timeline-line">
                        <div className="history-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                          👤
                        </div>
                      </div>
                      <div className="history-content">
                        <div className="history-header">
                          <h3 className="history-action">{user.username}</h3>
                          <span className="history-time">{dateFormatter.format(new Date(user.createdAt))}</span>
                        </div>
                        <div className="history-meta">
                          {user.roles.map((role) => (
                            <span key={role} className="meta-badge">
                              {role}
                            </span>
                          ))}
                          <span className="meta-badge">ID: {user.id}</span>
                        </div>
                        <div className="lecture-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                          {editingUserId === user.id ? (
                            <>
                              <input
                                type="password"
                                placeholder={t('admin.users.newPassword')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                              />
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleChangePassword(user.id)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('admin.users.save')}
                              </button>
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => {
                                  setEditingUserId(null)
                                  setNewPassword('')
                                }}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('admin.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setEditingUserId(user.id)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('admin.users.changePassword')}
                              </button>
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => handleDeleteUser(user.id)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                              >
                                {t('admin.users.delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lectures Tab */}
          {activeTab === 'lectures' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>{t('admin.lectures.title')}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  >
                    <option value="ALL">{t('admin.lectures.filter.all')}</option>
                    <option value="INFO_INPUT">{t('myLectures.status.INFO_INPUT')}</option>
                    <option value="SLIDE_UPLOAD">{t('myLectures.status.SLIDE_UPLOAD')}</option>
                    <option value="RECORDING">{t('myLectures.status.RECORDING')}</option>
                    <option value="COMPLETED">{t('myLectures.status.COMPLETED')}</option>
                  </select>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadLectures}
                    disabled={isLoading}
                  >
                    {t('admin.refresh')}
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="history-loading">
                  <div className="spinner"></div>
                  <p>{t('common.loading')}</p>
                </div>
              ) : (
                <div className="history-results-count" style={{ marginBottom: '1rem' }}>
                  {t('admin.lectures.count').replace('{count}', String(lectures.length))}
                </div>
              )}

              {!isLoading && lectures.length > 0 && (
                <div className="history-timeline">
                  {lectures.map((lecture) => (
                    <div key={lecture.id} className="history-item">
                      <div className="history-timeline-line">
                        <div className="history-icon" style={{ backgroundColor: 'var(--color-info)' }}>
                          📚
                        </div>
                      </div>
                      <div className="history-content">
                        <div className="history-header">
                          <h3 className="history-action">{lecture.title}</h3>
                          <span className="history-time">{dateFormatter.format(new Date(lecture.createdAt))}</span>
                        </div>
                        {lecture.description && (
                          <p className="history-description">{lecture.description}</p>
                        )}
                        <div className="history-meta">
                          <span className="meta-badge">
                            {t(`myLectures.status.${lecture.status}`)}
                          </span>
                          {lecture.slideDeck && (
                            <span className="meta-badge">
                              {lecture.slideDeck.pageCount} {t('myLectures.slides')}
                            </span>
                          )}
                          <span className="meta-badge">ID: {lecture.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>{t('admin.export.title')}</h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Export Users */}
                <div style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{t('admin.export.users')}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('users', 'csv')}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('users', 'xlsx')}
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('users', 'json')}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* Export Lectures */}
                <div style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{t('admin.export.lectures')}</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    >
                      <option value="ALL">{t('admin.lectures.filter.all')}</option>
                      <option value="INFO_INPUT">{t('myLectures.status.INFO_INPUT')}</option>
                      <option value="SLIDE_UPLOAD">{t('myLectures.status.SLIDE_UPLOAD')}</option>
                      <option value="RECORDING">{t('myLectures.status.RECORDING')}</option>
                      <option value="COMPLETED">{t('myLectures.status.COMPLETED')}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('lectures', 'csv')}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('lectures', 'xlsx')}
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('lectures', 'json')}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* Export Statistics */}
                <div style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>{t('admin.export.statistics')}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('statistics', 'json')}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleExport('statistics', 'csv')}
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default AdminPage

