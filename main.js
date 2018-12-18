const electron = require('electron')
const menubar = require('menubar')

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
})

mb.on('after-create-window', function ready () {
  //mb.window.openDevTools();
})