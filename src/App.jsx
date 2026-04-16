import { useState, useEffect, useCallback } from 'react'
import {
  fetchTasks,
  fetchTrashed,
  createTask,
  updateTask,
  moveToTrash,
  restoreTask,
  deletePermanent,
  createUser,
  loginUser,
  fetchCurrentUser,
  slackLogin,
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

  // ページ切り替え: login / register / main
  const [page, setPage] = useState('login')

  // 会員登録フォーム
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [registerUserType, setRegisterUserType] = useState('customer')
  const [registerSubmitting, setRegisterSubmitting] = useState(false)
  const [registerError, setRegisterError] = useState(null)

  // ログインフォーム
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginError, setLoginError] = useState(null)

  // 認証情報
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token') || null)
  const [currentUser, setCurrentUser] = useState(null)

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
    if (page === 'main') {
      loadAll()
    }
  }, [loadAll, page])

  // トークンがあれば現在のユーザー情報を取得し、自動ログイン
  useEffect(() => {
    const token = authToken || localStorage.getItem('token')
    if (!token || currentUser) return

    ;(async () => {
      try {
        const user = await fetchCurrentUser(token)
        setCurrentUser(user)
        setAuthToken(token)
        setPage('main')
      } catch (err) {
        console.error('現在のユーザー取得に失敗しました:', err)
        localStorage.removeItem('token')
        setAuthToken(null)
      }
    })()
  }, [authToken, currentUser])

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    setAuthToken(null)
    setCurrentUser(null)
    setPage('login')
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setRegisterError(null)
    if (!registerEmail.trim() || !registerName.trim() || !registerPassword.trim()) {
      setRegisterError('メールアドレス・名前・パスワードは必須です。')
      return
    }
    if (registerPassword !== registerPasswordConfirm) {
      setRegisterError('passwordが一致しません')
      return
    }
    setRegisterSubmitting(true)
    try {
      await createUser({
        email: registerEmail.trim(),
        name: registerName.trim(),
        password: registerPassword,
        user_type: registerUserType,
      })
      setPage('login')
      setRegisterEmail('')
      setRegisterName('')
      setRegisterPassword('')
      setRegisterPasswordConfirm('')
      setRegisterUserType('customer')
      alert('会員登録が完了しました。ログインしてください。')
    } catch (err) {
      const msg = err.message || ''
      const isDuplicate = /E11000|duplicate|重複/i.test(msg)
      setRegisterError(isDuplicate ? 'emailが重複しています。もう一度確認してください' : (msg || '会員登録に失敗しました。'))
    } finally {
      setRegisterSubmitting(false)
    }
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('メールアドレスとパスワードは必須です。')
      return
    }
    setLoginSubmitting(true)
    try {
      const result = await loginUser(loginEmail.trim(), loginPassword)
      if (result.token) {
        localStorage.setItem('token', result.token)
        setAuthToken(result.token)
      }
      setCurrentUser(result.user || null)
      setPage('main')
      setLoginPassword('')
      setLoginEmail('')
    } catch (err) {
      const msg = err.message || ''
      const isPasswordMismatch = /passwordが一致しません|401|認証|credentials/i.test(msg)
      setLoginError(isPasswordMismatch ? 'passwordが一致しません' : (msg || 'ログインに失敗しました。'))
    } finally {
      setLoginSubmitting(false)
    }
  }

  // Slack OAuth URL を生成（ボタン・案内リンクで共通利用）
  const getSlackAuthUrl = () => {
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID
    const redirectUri = import.meta.env.VITE_SLACK_REDIRECT_URI
    if (!clientId || !redirectUri) return null
    const state = 'slack'
    return `https://slack.com/openid/connect/authorize?client_id=${encodeURIComponent(
      clientId,
    )}&scope=openid,profile,email&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&state=${encodeURIComponent(state)}`
  }

  const handleSlackLogin = () => {
    const url = getSlackAuthUrl()
    if (!url) {
      alert('Slack ログインの設定が不足しています。VITE_SLACK_CLIENT_ID と VITE_SLACK_REDIRECT_URI を確認してください。')
      return
    }
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (!opened) window.location.href = url
  }

  // Slack OAuth コールバック処理（code パラメータがある場合）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || state !== 'slack' || authToken || currentUser) return

    ;(async () => {
      try {
        setLoginSubmitting(true)
        const result = await slackLogin(code)
        if (result.token) {
          localStorage.setItem('token', result.token)
          setAuthToken(result.token)
        }
        setCurrentUser(result.user || null)
        setPage('main')
        window.history.replaceState(null, '', window.location.pathname)
      } catch (err) {
        console.error('Slack ログインに失敗しました:', err)
        setLoginError('Slack ログインに失敗しました。')
      } finally {
        setLoginSubmitting(false)
      }
    })()
  }, [authToken, currentUser])

  // ログインページ
  if (page === 'login') {
    return (
      <div className="register-page">
        <header className="register-header">
          <div className="register-logo">My Todos</div>
          <p className="register-header-link">
            アカウントをお持ちでないですか？{' '}
            <button type="button" className="register-link-btn" onClick={() => setPage('register')}>
              会員登録
            </button>
          </p>
        </header>
        <div className="register-content">
          <h1 className="register-title">サインインするにはメールアドレスを入力してください</h1>
          <p className="register-subtitle">または、別の方法を選択してサインインしてください。</p>

          <form className="register-form" onSubmit={handleLoginSubmit}>
            <input
              type="email"
              className="register-input"
              placeholder="名前@work-email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              className="register-input"
              placeholder="パスワード"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
            />
            {loginError && <p className="register-error">{loginError}</p>}
            <button type="submit" className="register-btn-primary" disabled={loginSubmitting}>
              {loginSubmitting ? 'サインイン中...' : 'メールアドレスでサインインする'}
            </button>
          </form>

          <p className="register-divider">または次の方法でサインインする：</p>
          <div className="register-social">
            <button type="button" className="register-social-btn" onClick={handleSlackLogin}>
              Slack
            </button>
          </div>
          <div className="register-slack-fallback">
            <p className="register-slack-fallback-title">Slack で「このブラウザはサポートされていません」と出る場合</p>
            <ol className="register-slack-fallback-steps">
              <li>Chrome または Edge（最新版）を起動します。</li>
              <li>
                次のアドレスをコピーして、そのブラウザのアドレスバーに貼り付け、このアプリを開き直します：
                <br />
                <code className="register-slack-fallback-url">{window.location.origin}{window.location.pathname}</code>
              </li>
              <li>表示されたログイン画面で「Slack」をクリックします。</li>
            </ol>
            <p className="register-slack-fallback-link-desc">または、下のリンクを右クリック→「リンクのアドレスをコピー」し、Chrome または Edge のアドレスバーに貼り付けて開いてください。</p>
            {getSlackAuthUrl() && (
              <a
                href={getSlackAuthUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="register-slack-fallback-link"
              >
                Slack 認証ページを開く（Chrome/Edge で開いてください）
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 会員登録ページ
  if (page === 'register') {
    return (
      <div className="register-page">
        <header className="register-header">
          <div className="register-logo">My Todos</div>
          <p className="register-header-link">
            すでにアカウントをお持ちですか？{' '}
            <button type="button" className="register-link-btn" onClick={() => setPage('login')}>
              サインイン
            </button>
          </p>
        </header>
        <div className="register-content">
          <h1 className="register-title">会員登録するにはメールアドレスなどを入力してください</h1>
          <p className="register-subtitle">または、別の方法を選択して登録してください。</p>

          <form className="register-form" onSubmit={handleRegisterSubmit}>
            <input
              type="email"
              className="register-input"
              placeholder="名前@work-email.com"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="text"
              className="register-input"
              placeholder="名前"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              autoComplete="name"
            />
            <input
              type="password"
              className="register-input"
              placeholder="パスワード"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              className="register-input"
              placeholder="パスワード（確認）"
              value={registerPasswordConfirm}
              onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <label className="register-label">
              会員タイプ
              <select
                className="register-select"
                value={registerUserType}
                onChange={(e) => setRegisterUserType(e.target.value)}
              >
                <option value="customer">customer（一般会員）</option>
                <option value="admin">admin（管理者）</option>
              </select>
            </label>
            {registerError && <p className="register-error">{registerError}</p>}
            <button type="submit" className="register-btn-primary" disabled={registerSubmitting}>
              {registerSubmitting ? '登録中...' : '会員登録する'}
            </button>
          </form>

          <p className="register-divider">または次の方法で登録する：</p>
          <div className="register-social">
            <button type="button" className="register-social-btn" disabled>
              Google
            </button>
            <button type="button" className="register-social-btn" disabled>
              Apple
            </button>
          </div>
        </div>
      </div>
    )
  }

  // メイン（タスク管理）ページ
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
            <button type="button" className="btn-register" onClick={() => setPage('register')}>
              会員加入
            </button>
            <div className="user-profile">
              <span className="user-name">
                {currentUser?.name ? `${currentUser.name}様、こんにちは！` : 'ゲスト様、こんにちは！'}
              </span>
              {currentUser && (
                <button type="button" className="btn-register user-logout-button" onClick={handleLogout}>
                  ログアウト
                </button>
              )}
            </div>
            <div className="user-avatar">{(currentUser?.name || 'G').charAt(0).toUpperCase()}</div>
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
