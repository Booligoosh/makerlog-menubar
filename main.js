const electron = require('electron')
const menubar = require('menubar')
const Menu = electron.Menu;
const globalShortcut = electron.globalShortcut;
const systemPreferences = electron.systemPreferences;
const ipcMain = electron.ipcMain;

var mb = menubar({
    height: 16*1.5*3,
    width: 1366,
    alwaysOnTop: true,
    resizable: false,
    preloadWindow: true,
    index: 'https://makerlog-menubar-app.netlify.com'
})

global.appVersion = electron.app.getVersion();

global.darkMode = (systemPreferences.isDarkMode() === true);
systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => darkModeChange());

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
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
    mb.window.setSize(width, height);
}
global.goNormalSize = function() {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
    mb.window.setSize(width, 16*1.5*3);
}

mb.on('ready', function ready () {
    console.log('app is ready')
    // your app code here

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