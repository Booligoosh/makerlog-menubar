const dotenv = require('dotenv').config();
const electron = require('electron')
const Menu = electron.Menu;
const Tray = electron.Tray;
const BrowserWindow = electron.BrowserWindow;
const Notification = electron.Notification;
const globalShortcut = electron.globalShortcut;
const systemPreferences = electron.systemPreferences;
const ipcMain = electron.ipcMain;
const session = electron.session;
const path = require('path');
const app = electron.app;
const nativeImage = require('electron').nativeImage;
const storage = require('electron-json-storage');

const indexURL = process.env['MAKERLOG_MENUBAR_CONTEXT'] == 'DEV' ? `file://${__dirname}/index.html` : 'https://makerlog-menubar-app.netlify.com';
const timePickerURL = process.env['MAKERLOG_MENUBAR_CONTEXT'] == 'DEV' ? `file://${__dirname}/timepicker.html` : 'https://makerlog-menubar-app.netlify.com/timepicker';

global.fontSize = 16*1.5;

if (process.platform == "darwin") {
    global.darkMode = (systemPreferences.isDarkMode() === true);
    systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => darkModeChange());
}

function calculateVibrancy() {
    return global.darkMode ? 'dark' : 'light';
}

var mb = {};
var timePickerWindow = null;

global.appVersion = electron.app.getVersion();

function darkModeChange() {
    console.log('CHANGE!');
    global.darkMode = (systemPreferences.isDarkMode() === true);
    mb.window.setVibrancy(calculateVibrancy());
    mb.window.webContents.send('darkModeChange', '');
    timePickerWindow.webContents.send('darkModeChange', '');
}

global.toggleMenubar = function() {
    if(mb.window.isVisible()) {
        mb.window.hide();
    } else {
        global.openMenubar();
    }
}

global.openMenubar = function() {
    mb.window.webContents.send('focusContent', '');
    mb.window.show();
}

global.storeToken = function(token) {
    global.token = token;
}
global.storeAppHref = function(appHref) {
    global.appHref = appHref;
}
global.redirectToApp = function() {
    mb.window.loadURL(global.appHref);
}
global.goFullscreen = function() {
    mb.window.setMinimumSize(480, 640);
    mb.window.setMaximumSize(99999, 640);
    var [width, height] = mb.window.getSize();
    mb.window.setSize(width, 640);
}
global.goNormalSize = function() {
    mb.window.setMinimumSize(global.fontSize*28, global.fontSize*3);
    mb.window.setMaximumSize(99999, global.fontSize*3);
    var [width, height] = mb.window.getSize();
    mb.window.setSize(width, global.fontSize*3);
}
global.setFontSize = function(fontSize) {
    global.fontSize = fontSize*1.5;
    global.goNormalSize();
}
global.openExternalURL = function(url) {
    electron.shell.openExternal(url);
}
global.openTimePicker = function() {
    timePickerWindow.show();
}
global.closeTimePicker = function() {
    timePickerWindow.hide();
    timePickerWindow.webContents.reload();
}

storage.has('streakNotificationsOn', function(error, hasKey) {
    if (error) throw error;
    
    if (!hasKey) {
        storage.set('streakNotificationsOn', true);
    }
});

storage.has('streakNotificationsTime', function(error, hasKey) {
    if (error) throw error;
    
    if (!hasKey) {
        storage.set('streakNotificationsTime', '21:00');
    }
});

global.reloadMainWindow = function() {
    mb.window.webContents.reload();
}

global.setStreak = function(n) {
    console.log('SETTING STREAK', n);
    var item = getContextMenuItemByMyId('streak');
    item.label = `🔥  ${n} day streak`;
    item.visible = true;
}
global.setDoneToday = function(n) {
    console.log('SETTING DONE TODAY', n);
    var item = getContextMenuItemByMyId('doneToday');
    item.label = `📅  ${n} tasks done today`;
    item.visible = true;
}
global.setMakerScore = function(n) {
    console.log('SETTING MAKER SCORE', n);
    var item = getContextMenuItemByMyId('makerScore');
    item.label = `🏆  Maker Score: ${n}`;
    item.visible = true;
}
global.setTDA = function(n) {
    console.log('SETTING TDA', n);
    var item = getContextMenuItemByMyId('tda');
    item.label = `🏁  ${n} average tasks per day`;
    item.visible = true;
}
global.setRemainingTasks = function(n) {
    console.log('SETTING REMAINING TASKS', n);
    var item = getContextMenuItemByMyId('remainingTasks');
    item.label = `🕑  ${n} tasks remaining`;
    item.visible = true;
}
global.setRestDays = function(n) {
    console.log('SETTING REST DAYS', n);
    var item = getContextMenuItemByMyId('restDays');
    item.label = `☀️  ${n} rest days`;
    item.visible = true;
}
global.setUser = function(username, dataURL) {
    console.log('SETTING USER', username);
    var item = getContextMenuItemByMyId('user');
    item.label = ` Signed in as @${username}`;
    var size = 20;
    item.icon = nativeImage.createFromDataURL(dataURL).resize({width: size, height: size});
    item.visible = true;
    globalUsername = username;
    
}
global.setHeatmap = function(dataURL) {
    console.log('SETTING HEATMAP', dataURL);
    var item = getContextMenuItemByMyId('heatmap');
    item.icon = nativeImage.createFromDataURL(dataURL).resize({width: 250});
    item.visible = true;    
}

var globalUsername = '';

function getContextMenuItemByMyId(myId) {
    return contextMenuTemplate[contextMenuTemplate.map(item => item.myId).indexOf(myId)];
}

var contextMenuTemplate = [
    { label: `Makerlog Menubar v${global.appVersion}`, enabled: false },
    { type: `separator` },
    { myId: `user`, label: '', visible: false, click: () => global.openExternalURL(`https://getmakerlog.com/@${globalUsername}`)},
    { type: `separator` },
    { myId: `heatmap`, label: '', visible: false, click: () => global.openExternalURL(`https://getmakerlog.com/@${globalUsername}`)},
    { type: `separator` },
    { myId: `makerScore`, label: '', enabled: false, visible: false },
    { myId: `streak`, label: '', enabled: false, visible: false },
    { myId: `doneToday`, label: '', enabled: false, visible: false },
    { myId: `tda`, label: '', enabled: false, visible: false },
    { myId: `remainingTasks`, label: '', visible: false, click: () => global.openExternalURL('https://getmakerlog.com/tasks/list')},
    { myId: `restDays`, label: '', visible: false, click: () => global.openExternalURL('https://getmakerlog.com/streak')},
    { type: `separator` },
    { label: `Increase font size`, accelerator: `CmdOrCtrl+Plus`, click: () => mb.window.webContents.send('zoomIn', '')},
    { label: `Decrease font size`, accelerator: `CmdOrCtrl+-`, click: () => mb.window.webContents.send('zoomOut', '')},
    { type: `separator` },
    { label: `Streak notification settings`, click: () => global.openTimePicker()},
    { type: `separator` },
    { label: `Toggle day progress bar`, accelerator: `CmdOrCtrl+P`, click: () => mb.window.webContents.send('toggleProgressBar', '') },
    { label: `View keyboard shortcuts`, accelerator: `CmdOrCtrl+K`, click: () => global.openExternalURL('https://menubar.getmakerlog.com/keyboard-shortcuts') },
    { label: `Quit`, accelerator: `CmdOrCtrl+Q`, click: () => app.quit() }
];

app.on('ready', function ready () {
    console.log('app is ready')
    // your app code here
    
    var iconPath = path.join(__dirname, `Icon${process.platform == 'darwin' ? 'Template' : ''}.${process.platform == 'win32' ? 'ico' : 'png'}`);
    
    mb.tray = new Tray(iconPath);
    mb.tray.on('click', clicked);
    mb.tray.on('double-click', clicked);
    mb.tray.on('right-click', rightClicked);
    mb.tray.setToolTip('Makerlog Menubar');
    
    mb.window = new BrowserWindow({
        frame: false,
        height: global.fontSize*3,
        width: 1366,
        alwaysOnTop: true,
        movable: false,
        preloadWindow: true,
        skipTaskbar: false,
        vibrancy: calculateVibrancy(),
        webPreferences: {
            nodeIntegration: false,
            preload: path.resolve(__dirname, 'preload.js')
        }
    });
    
    app.dock.hide();
    mb.window.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true});
    mb.window.setFullScreenable(false);
    
    mb.window.loadURL(indexURL);
    
    setPosition();
    
    mb.window.on('resize', function (event) {
        setPosition();
        // Center window when resizing horizontally
    });

    mb.window.on('show', function (event) {
        setPosition();
        // Override menubar library positioning
    });

    mb.window.on('ready-to-show', function (event) {
        setPosition();
        // Override menubar library positioning
    });
    
    timePickerWindow = new BrowserWindow({
        frame: false,
        height: 250,
        width: 400,
        alwaysOnTop: true,
        preloadWindow: true,
        skipTaskbar: false,
        vibrancy: calculateVibrancy(),
        webPreferences: {
            nodeIntegration: false,
            preload: path.resolve(__dirname, 'preload.js')
        }
    });
    timePickerWindow.hide();
    timePickerWindow.loadURL(timePickerURL);
        
    // Global keyboard shortcuts
    globalShortcut.register('Shift+CmdOrCtrl+M', function () {
        //console.log('Shift+CmdOrCtrl+M is pressed');
        global.toggleMenubar();
    });
    
    // Security measure from https://electronjs.org/docs/tutorial/security#6-define-a-content-security-policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["script-src 'self' 'unsafe-eval' https://makerlog-menubar-app.netlify.com/ https://getmakerlog.com https://api.getmakerlog.com https://api.github.com"]
        }
      })
    })
    
    // Allow basic keyboard shortcuts – code from https://pracucci.com/atom-electron-enable-copy-and-paste.html
    var template = [{
        label: "Application",
        submenu: [
            { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            { label: "Inspect", accelerator: "Alt+CmdOrCtrl+I", click: function() { mb.window.openDevTools(); timePickerWindow.openDevTools() }},
            { label: "Hide", accelerator: "Esc", click: function() { mb.window.hide(); }},
            { label: "Reload", accelerator: "CmdOrCtrl+R", click: function() { mb.window.webContents.reload(); }},
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]}, {
            label: '',
            submenu: contextMenuTemplate // So the keyboard shortcuts work
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
})

function clicked(e) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
        return rightClicked();
    }
    if (mb.window && mb.window.isVisible()) {
        return hideWindow()
    }
    global.openMenubar();
}

function showWindow () {
    mb.window.show()
}

function hideWindow () {
    mb.window.hide()
}

function rightClicked (e) {
    mb.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
}

function setPosition () {
    var screenDimensions = electron.screen.getPrimaryDisplay().workAreaSize;
    var menuBarHeight = /*electron.screen.getMenuBarHeight()*/22;
    var [width, height] = mb.window.getSize();
    var [x, y] = mb.window.getPosition();
    mb.window.setPosition(Math.round((screenDimensions.width - width) / 2), menuBarHeight);
}