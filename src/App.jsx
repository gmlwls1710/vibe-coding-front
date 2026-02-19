import { useState, useEffect, useCallback } from 'react'
import {
  fetchTasks,
  fetchTrashed,
  createTask,
  updateTask,
  moveToTrash,
  restoreTask,
  deletePermanent,
} from './api'
import './App.css'

function App() {
  const [ongoing, setOngoing] = useState([])
  const [completed, setCompleted] = useState([])
  const [trashed, setTrashed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasks, trashedList] = await Promise.all([fetchTasks(), fetchTrashed()])
      const active = Array.isArray(tasks) ? tasks : []
      const trashedData = Array.isArray(trashedList) ? trashedList : []
      setOngoing(active.filter((t) => !t.deletedAt && t.status !== 'DONE'))
      setCompleted(active.filter((t) => !t.deletedAt && t.status === 'DONE'))
      setTrashed(trashedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const openPanel = (task, isTrashed) => {
    setSelectedTask({ ...task, isTrashed })
    setEditTitle(task.title || '')
    setEditDesc(task.description || '')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelectedTask(null)
  }

  const handleAddTask = async () => {
    try {
      await createTask({ title: '新しいタスク', description: '説明を追加してください', status: 'PENDING' })
      loadAll()
    } catch (err) {
      alert('タスクの追加に失敗しました: ' + err.message)
    }
  }

  const handleToggleComplete = async (task) => {
    try {
      await updateTask(task._id, { status: task.status === 'DONE' ? 'PENDING' : 'DONE' })
      loadAll()
    } catch (err) {
      alert('更新に失敗しました: ' + err.message)
    }
  }

  const handleSave = async () => {
    if (!selectedTask || selectedTask.isTrashed) return
    try {
      await updateTask(selectedTask._id, { title: editTitle || '無題', description: editDesc })
      closePanel()
      loadAll()
    } catch (err) {
      alert('保存に失敗しました: ' + err.message)
    }
  }

  const handleMoveToTrash = async () => {
    if (!selectedTask || selectedTask.isTrashed) return
    try {
      await moveToTrash(selectedTask._id)
      closePanel()
      loadAll()
    } catch (err) {
      alert('ゴミ箱への移動に失敗しました: ' + err.message)
    }
  }

  const handleRestore = async () => {
    if (!selectedTask || !selectedTask.isTrashed) return
    try {
      await restoreTask(selectedTask._id)
      closePanel()
      loadAll()
    } catch (err) {
      alert('復元に失敗しました: ' + err.message)
    }
  }

  const handleDeletePermanent = async () => {
    if (!selectedTask || !confirm('このタスクを完全に削除しますか？')) return
    try {
      await deletePermanent(selectedTask._id)
      closePanel()
      loadAll()
    } catch (err) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  const handleDeleteFromNormal = async () => {
    if (!selectedTask || selectedTask.isTrashed) return
    if (!confirm('このタスクを完全に削除しますか？')) return
    try {
      await deletePermanent(selectedTask._id)
      closePanel()
      loadAll()
    } catch (err) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  return (
    <>
      <div className="sidebar-overlay" data-active={sidebarOpen} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <aside className="sidebar" data-open={sidebarOpen}>
        <div className="sidebar-header">
          <button type="button" className="hamburger-btn" aria-label="メニュー" onClick={() => setSidebarOpen((o) => !o)}>
            <span /><span /><span />
          </button>
          <h1 className="sidebar-title">tasks</h1>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item"><span className="nav-icon">🏠</span>Home</a>
          <a href="#" className="nav-item active"><span className="nav-icon">☑️</span>Todo</a>
          <a href="#" className="nav-item"><span className="nav-icon">📅</span>Reminder</a>
          <a href="#" className="nav-item"><span className="nav-icon">✏️</span>Notes</a>
        </nav>
        <div className="sidebar-footer">
          <a href="#" className="nav-item"><span className="nav-icon">⚙️</span>Settings</a>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="search" placeholder="Search" className="search-input" />
          </div>
          <div className="header-right">
            <div className="user-profile">
              <span className="user-name">User</span>
              <span className="dropdown-icon">▼</span>
            </div>
            <div className="user-avatar">U</div>
            <div className="filter-select"><span className="filter-text">This week</span><span className="dropdown-icon">▼</span></div>
          </div>
        </header>

        <h2 className="page-title">My Todos</h2>

        {error && <p className="error-msg">タスクの読み込みに失敗しました。バックエンド (localhost:5001) を確認してください。</p>}
        {loading && <p className="loading-msg">読み込み中...</p>}

        <div className="tasks-container">
          <section className="task-column" data-status="ongoing">
            <div className="column-header">
              <span className="indicator indicator-orange" />
              <h3 className="column-title">Ongoing</h3>
              <span className="task-count">{ongoing.length}</span>
            </div>
            <div className="task-cards">
              {ongoing.map((task) => (
                <article key={task._id} className="task-card" data-id={task._id}>
                  <div className="card-left">
                    <button type="button" className="checkbox unchecked" aria-label="完了" onClick={() => handleToggleComplete(task)} />
                    <div className="card-content">
                      <h4 className="card-title">{task.title}</h4>
                      {task.description && <p className="card-desc">{task.description}</p>}
                    </div>
                  </div>
                  <button type="button" className="card-menu" onClick={() => openPanel(task, false)}>⋮</button>
                </article>
              ))}
            </div>
          </section>

          <section className="task-column" data-status="completed">
            <div className="column-header">
              <span className="indicator indicator-green" />
              <h3 className="column-title">Completed</h3>
              <span className="task-count">{completed.length}</span>
            </div>
            <div className="task-cards">
              {completed.map((task) => (
                <article key={task._id} className="task-card completed" data-id={task._id}>
                  <div className="card-left">
                    <button type="button" className="checkbox checked" aria-label="未完了に戻す" onClick={() => handleToggleComplete(task)}>✓</button>
                    <div className="card-content">
                      <h4 className="card-title">{task.title}</h4>
                      {task.description && <p className="card-desc">{task.description}</p>}
                    </div>
                  </div>
                  <button type="button" className="card-menu" onClick={() => openPanel(task, false)}>⋮</button>
                </article>
              ))}
            </div>
          </section>

          <section className="task-column" data-status="trashed">
            <div className="column-header">
              <span className="indicator indicator-red" />
              <h3 className="column-title">Trashed</h3>
              <span className="task-count">{trashed.length}</span>
            </div>
            <div className="task-cards">
              {trashed.map((task) => (
                <article key={task._id} className="task-card trashed" data-id={task._id}>
                  <div className="card-left">
                    <span className="trash-indicator" />
                    <div className="card-content">
                      <h4 className="card-title">{task.title}</h4>
                      {task.description && <p className="card-desc">{task.description}</p>}
                    </div>
                  </div>
                  <button type="button" className="card-menu" onClick={() => openPanel(task, true)}>⋮</button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <button type="button" className="fab" aria-label="タスクを追加" onClick={handleAddTask}>
          <span className="fab-icon">+</span>
        </button>
      </main>

      <div className="card-menu-overlay" data-active={panelOpen} onClick={closePanel} aria-hidden="true" />
      <aside className="card-menu-panel" data-open={panelOpen}>
        <div className="card-menu-header">
          <h3 className="card-menu-title">{selectedTask?.isTrashed ? 'ゴミ箱のタスク' : 'タスクの操作'}</h3>
          <button type="button" className="card-menu-close" aria-label="閉じる" onClick={closePanel}>×</button>
        </div>
        <div className="card-menu-body">
          {selectedTask && (
            <>
              <div className="card-menu-preview">
                <span className="card-menu-id">#{String(selectedTask._id).slice(-6)}</span>
                <h4 className="card-menu-preview-title">{selectedTask.title}</h4>
              </div>
              {selectedTask.isTrashed ? (
                <div className="card-menu-content card-menu-content-trashed">
                  <p className="card-menu-trashed-desc">このタスクを復元するか、完全に削除しますか？</p>
                  <div className="card-menu-actions">
                    <button type="button" className="card-menu-btn card-menu-btn-primary" onClick={handleRestore}>Ongoingに戻す</button>
                    <button type="button" className="card-menu-btn card-menu-btn-danger" onClick={handleDeletePermanent}>削除</button>
                  </div>
                </div>
              ) : (
                <div className="card-menu-content card-menu-content-normal">
                  <div className="card-menu-edit">
                    <label htmlFor="cardMenuEditTitle">タイトル</label>
                    <input id="cardMenuEditTitle" type="text" className="card-menu-input" placeholder="タスクのタイトル" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <label htmlFor="cardMenuEditDesc">説明</label>
                    <textarea id="cardMenuEditDesc" className="card-menu-textarea" placeholder="タスクの説明" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </div>
                  <div className="card-menu-actions">
                    <button type="button" className="card-menu-btn card-menu-btn-primary" onClick={handleSave}>保存</button>
                    <button type="button" className="card-menu-btn card-menu-btn-warning" onClick={handleMoveToTrash}>ゴミ箱へ移動</button>
                    <button type="button" className="card-menu-btn card-menu-btn-danger" onClick={handleDeleteFromNormal}>削除</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}

export default App
