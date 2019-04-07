var getGlobal = window.Bridge.getGlobal;
var ipcRenderer = window.Bridge.ipcRenderer;
var storage = window.Bridge.storage;
var openExternalURL = getGlobal('openExternalURL');

window.addEventListener('DOMContentLoaded', function(){
    updateDarkMode();
    storage.getMany(['streakNotificationsOn', 'streakNotificationsTime'], function(err, data) {
        if(err) { throw err }
        
        console.log(data);
        document.querySelector('input[type="checkbox"]').checked = data.streakNotificationsOn;
        document.querySelector('input[type="time"]').value = data.streakNotificationsTime;
    });
    
    document.querySelector('#cancel').addEventListener('click', function(e) {
        getGlobal('closeTimePicker')();
    });
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        var notificationsOn = document.querySelector('input[type="checkbox"]').checked;
        var notificationsTime = document.querySelector('input[type="time"]').value;
        
        storage.set('streakNotificationsOn', notificationsOn);
        storage.set('streakNotificationsTime', notificationsTime);
        getGlobal('reloadMainWindow')();
        
        getGlobal('closeTimePicker')();
    })
});

ipcRenderer.on('darkModeChange', (event, arg) => {
    updateDarkMode();
})

function updateDarkMode() {
    if(getGlobal('darkMode')) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}