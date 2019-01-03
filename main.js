const electron = require('electron')
const menubar = require('menubar')
const Menu = electron.Menu;
const globalShortcut = electron.globalShortcut;
const systemPreferences = electron.systemPreferences;
const ipcMain = electron.ipcMain;
const session = electron.session;

global.fontSize = 16*1.5;

var mb = menubar({
    height: global.fontSize*3,
    width: 1366,
    alwaysOnTop: true,
    movable: false,
    preloadWindow: true,
    skipTaskbar: false,
    index: 'https://makerlog-menubar-app.netlify.com'
})

global.appVersion = electron.app.getVersion();


if (process.platform == "darwin") {
    global.darkMode = (systemPreferences.isDarkMode() === true);
    systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => darkModeChange());
}

function darkModeChange() {
    console.log('CHANGE!');
    global.darkMode = (systemPreferences.isDarkMode() === true);
    mb.window.webContents.send('darkModeChange', '');
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

mb.on('ready', function ready () {
    console.log('app is ready')
    // your app code here
    //

    iconPath = electron.app.getAppPath() + "/Icon.png";
    tray = new electron.Tray(iconPath);
    tray.setToolTip('Makerlog Menubar');
    tray.setHighlightMode('always');
    mb.tray = tray;

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
            { label: "Inspect", accelerator: "Alt+CmdOrCtrl+I", click: function() { mb.window.openDevTools(); }},
            { label: "Hide", accelerator: "Esc", click: function() { mb.window.hide(); }},
            { label: "Quit", accelerator: "CmdOrCtrl+Q", click: function() { mb.app.quit(); }}
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
        ]}
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
})

mb.on('after-create-window', function ready () {
    //mb.window.openDevTools();

    mb.window.on('resize', function (event) {
        var screenDimensions = electron.screen.getPrimaryDisplay().workAreaSize;
        var [width, height] = mb.window.getSize();
        var [x, y] = mb.window.getPosition();
        mb.window.setPosition(Math.round((screenDimensions.width - width) / 2), y);
        // Center window when resizing horizontally
    });

    // Global keyboard shortcuts
    globalShortcut.register('Shift+CmdOrCtrl+M', function () {
        //console.log('Shift+CmdOrCtrl+M is pressed');
        if(mb.window.isVisible()) {
            mb.window.hide();
        } else {
            mb.window.webContents.send('focusContent', '');
            mb.window.show();
        }
    })
})
