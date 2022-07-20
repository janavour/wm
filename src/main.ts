import { app, BrowserWindow, ipcMain, webContents } from 'electron'
import { setWallpaper } from 'wallpaper'

const fs = require('fs')

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit()
}

let mainWindow: BrowserWindow
let wallpaperChangeTime: number // In seconds
let randomOrder: boolean

let wallpaperInterval: NodeJS.Timer


const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1000,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false
    },
    frame: false,
  })

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
}

app.on('ready', () => {
  ipcMain.on('open-browser-window', handleOpenBrowserWindow)
  ipcMain.on('minimize', () => mainWindow.minimize())
  ipcMain.on('maximize-or-restore', () => {
    mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize()
  })
  ipcMain.on('set-wallpaper-change-time', (event: any, time: number) => {
    wallpaperChangeTime = time
    clearInterval(wallpaperInterval)
    wallpaperInterval = setInterval(setRandomWallpaper, wallpaperChangeTime * 1000)
  })
  ipcMain.handle('get-picture-list', handleGetPictureList)
  ipcMain.handle('get-pictures-path', handleGetPicturesPath)

  if (wallpaperChangeTime !== undefined) {
    wallpaperInterval = setInterval(setRandomWallpaper, wallpaperChangeTime * 1000)
  }

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

/************************ HANDLE FUNCTIONS ************************/
function handleOpenBrowserWindow(event: any, url: string) {
  const win = new BrowserWindow({
    height: 700,
    width: 1000,
    autoHideMenuBar: true,
    // webPreferences: {
      // preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    // },
    // frame: false,
  })

  win.webContents.session.on('will-download', (event, item, webContents) => {
    console.log(item.getFilename(), app.getPath('pictures'))
    item.setSavePath(app.getPath('pictures') + '\\Wallpapers\\' + item.getFilename())

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused')
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`)
        }
      }
    })
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log('Download successfully')
      } else {
        console.log(`Download failed: ${state}`)
      }
    })
  })

  win.once('close', () => {
    mainWindow.reload()
  })

  win.loadURL(url);
}

function handleGetPictureList() {
  return fs.readdirSync(app.getPath('pictures') + '/wallpapers/')
}

function handleGetPicturesPath() {
  return app.getPath('pictures')
}

/************************ UTILS ************************/

function setRandomWallpaper() {
  const pictureList = handleGetPictureList()
  const selectedIndex = getRandomInt(0, pictureList.length)
  setWallpaper(handleGetPicturesPath() + '\\Wallpapers\\' + pictureList[selectedIndex])
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min // Maximum is not included, min is included
}