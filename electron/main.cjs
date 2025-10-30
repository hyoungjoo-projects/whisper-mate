const { app, BrowserWindow, ipcMain, clipboard, Tray, Menu, globalShortcut } = require('electron')
const path = require('path')
const url = require('url')
// 개발 모드 감지 - NODE_ENV나 ELECTRON_IS_DEV로 확인
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1' || !app.isPackaged

let mainWindow
let tray

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
    // 아이콘은 선택사항이므로 에러가 나도 무시
    show: false,
  })

  const startUrl = isDev
    ? 'http://localhost:5173'
    : url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true,
      })

  console.log('isDev:', isDev)
  console.log('Loading URL:', startUrl)

  // 에러 및 디버깅 이벤트 핸들러 추가
  // 페이지 로드 실패 처리
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error('[Page Load Failed]', errorCode, errorDescription)
      console.error('Failed URL:', validatedURL || startUrl)
      // 에러 발생 시에도 윈도우 표시 (사용자가 문제를 볼 수 있도록)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // Renderer 프로세스 크래시 감지
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Renderer Process Crashed]', details.reason, details.exitCode)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
    // did-finish-load에서도 표시 (fallback)
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('Showing window from did-finish-load')
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Window를 로드한 후 표시
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      console.log('Window shown and focused')
      
      // DevTools는 사용자가 필요시에만 열도록 (F12 또는 Cmd+Option+I)
      // 자동으로 열면 일부 DevTools 내부 에러가 발생할 수 있음
      // if (isDev) {
      //   mainWindow.webContents.openDevTools()
      // }
    }
  })

  // ready-to-show가 발생하지 않을 경우를 대비한 fallback
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('Fallback: Showing window after delay (1.5 seconds)')
      mainWindow.show()
      mainWindow.focus()
    }
  }, 1500)

  mainWindow.loadURL(startUrl).catch((error) => {
    console.error('Error loading URL:', error)
    // 에러 발생 시에도 윈도우 표시
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 개발 모드에서 DevTools 단축키 활성화 및 콘솔 에러 로깅
  if (isDev) {
    // 페이지 콘솔 에러를 메인 프로세스로 전달
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) { // 0=debug, 1=info, 2=warning, 3=error
        console.log(`[Renderer ${level === 2 ? 'Warning' : 'Error'}]`, message, sourceId ? `(${sourceId}:${line})` : '')
      }
    })

    // render-process-gone 이벤트로 크래시 감지
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('[Renderer Process Crashed]', details.reason, details.exitCode)
    })

    // DevTools 단축키: F12 또는 Cmd+Option+I / Ctrl+Shift+I
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // F12 또는 Cmd+Option+I (macOS) / Ctrl+Shift+I (Windows/Linux)
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault()
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools()
        } else {
          mainWindow.webContents.openDevTools()
        }
      }
    })

    // 자동으로 DevTools 열기 (디버깅용 - 필요시 주석 해제)
    // setTimeout(() => {
    //   if (mainWindow && !mainWindow.isDestroyed()) {
    //     mainWindow.webContents.openDevTools()
    //   }
    // }, 2000)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('minimize', (event) => {
    if (process.platform === 'darwin') {
      // macOS에서는 minimize 대신 hide
      event.preventDefault()
      mainWindow.hide()
    }
  })

  createTray()
  registerShortcuts()
}

function createTray() {
  try {
    // Electron Tray는 SVG를 지원하지 않으므로, PNG나 네이티브 아이콘 형식이 필요합니다
    // macOS의 경우 ICNS, Windows는 ICO, Linux는 PNG를 권장합니다
    // 일단 아이콘이 없어도 앱은 정상 작동하도록 에러 처리만 추가
    const fs = require('fs')
    
    // PNG 아이콘 경로 우선 시도
    const pngIconPath = path.join(__dirname, '../public/icon.png')
    const icoIconPath = path.join(__dirname, '../public/icon.ico')
    
    let iconPath = null
    
    // 플랫폼별로 적절한 아이콘 파일 찾기
    if (fs.existsSync(pngIconPath)) {
      iconPath = pngIconPath
    } else if (fs.existsSync(icoIconPath)) {
      iconPath = icoIconPath
    }
    
    // 아이콘이 없으면 트레이를 생성하지 않음
    if (!iconPath) {
      console.log('Tray icon not found. System tray will not be created.')
      console.log('To enable system tray, add a PNG (for Linux/macOS) or ICO (for Windows) icon to public/icon.png or public/icon.ico')
      return
    }
    
    tray = new Tray(iconPath)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
          }
        },
      },
      {
        label: 'Start Recording',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('start-recording')
            mainWindow.show()
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        },
      },
    ])

    tray.setToolTip('Whisper Mate')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      }
    })
  } catch (error) {
    console.error('Failed to create system tray:', error.message)
    // 트레이 생성 실패해도 앱은 정상 작동
  }
}

function registerShortcuts() {
  // Global shortcut to start recording
  const ret = globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('start-recording')
      mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  if (!ret) {
    console.log('Global shortcut registration failed')
  }
}

// IPC handlers
ipcMain.handle('copy-to-clipboard', (_, text) => {
  clipboard.writeText(text)
  return true
})

app.whenReady().then(() => {
  console.log('Electron app ready')
  createWindow()
}).catch((error) => {
  console.error('Error in app.whenReady:', error)
})

// macOS에서 Dock 아이콘 클릭 처리
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

