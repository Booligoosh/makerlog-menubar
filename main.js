const electron = require('electron')
const menubar = require('menubar')
const Menu = electron.Menu;

var mb = menubar({
    height: 16*1.5*3,
    width: 1366,
    alwaysOnTop: true,
    resizable: false
})

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
            { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
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
})