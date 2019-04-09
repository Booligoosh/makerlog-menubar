if(typeof require !== 'undefined') {
    var electron = require('electron');
    var getGlobal = electron.remote.getGlobal;
    var ipcRenderer = electron.ipcRenderer;
    var openExternalURL = electron.shell.openExternal;
    document.body.classList.add('no-preload');
} else {
    var getGlobal = window.Bridge.getGlobal;
    var ipcRenderer = window.Bridge.ipcRenderer;
    var storage = window.Bridge.storage;
    var openExternalURL = getGlobal('openExternalURL');
}

document.querySelector('html').style.fontSize = getGlobal('fontSize')/1.5;
getGlobal('goNormalSize')();

var client_id = '7JomVQ7FyglKL2PvIxCVS1rIo9kMQKcv78lk4vwM';
var tokenStore = getGlobal('token');
var token;
var refreshToken;
var doneToday = 0;
var streak = 0;
var userId = 0;

if(typeof tokenStore === 'undefined') {
    login();
} else {
    tokenStore = tokenStore.split('|');
    token = tokenStore[0];
    if(tokenStore.length >= 2) {
        refreshToken = tokenStore[1];
    }
    
    setInterval(refreshMakerlogToken, 59*60*1000); // Every 59 minutes
    checkForNewUpdate();
    //setInterval(checkForNewUpdate,10*60*1000); // Every 10 minutes
    fetchHashtags();
}

console.log(ipcRenderer.on);

ipcRenderer.on('toggleProgressBar', (event, arg) => {
    toggleProgressBar();
})

ipcRenderer.on('darkModeChange', (event, arg) => {
    data.darkMode = getGlobal('darkMode');
})

ipcRenderer.on('focusContent', (event, arg) => {
    document.querySelector('.content').focus();
})

ipcRenderer.on('zoomIn', (event, arg) => {
    zoomIn();
});

ipcRenderer.on('zoomOut', (event, arg) => {
    zoomOut();
});

ipcRenderer.on('resetZoom', (event, arg) => {
    resetZoom();
});

ipcRenderer.on('markTodoAsDone', (event, taskId) => {
    
    console.log('MARKING TODO AS DONE', taskId);
    
    myFetch(`https://api.getmakerlog.com/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            done: true,
            in_progress: false
        })
    }).then(r => console.log(r));
});

var data = {
    dragover: false,
    darkMode: getGlobal('darkMode'),
    taskComposer: {
        content: '',
        content_autocompleted: '',
        done: true,
        in_progress: false,
        processing: false,
        attachment: undefined,
        attachmentURL: undefined
    },
    hashtags: [],
    progressBar: {
        show: true,
        showTooltip: false,
        percentage: calculateDayProgress()
    },
    heatmap: {
        data: [],
        max: 0,
    }
}

if(localStorage.hideProgressBar === true || localStorage.hideProgressBar === 'true') {
    data.progressBar.show = false;
} else {
    localStorage.hideProgressBar = !data.progressBar.show;
}

var vm = new Vue({
    el: '#app',
    data: data
});
    
setInterval(updateDayProgress, 60*1000); // Every 60 seconds, because that's how long it takes for the percentage to change anyway: https://i.imgur.com/cP67s2L.png

function notifyAboutStreak(force = false) {
    if(doneToday == 0 || force) {
        var notification = new Notification(`Your ${streak} day streak is about to end!`, {
            body: `Click here to log a task and keep it up!`,
            silent: false,
            requireInteraction: true,
            sticky: true
        });
        notification.onclick = function(event) {
            getGlobal('openMenubar')();
        };
    }
}

function syncShadowContentScroll() {
    document.querySelector('.shadow-content').scrollLeft = document.querySelector('.content').scrollLeft;
}

function updateDayProgress() {
    data.progressBar.percentage = calculateDayProgress();
    console.log(data.progressBar.percentage);
    vm.$forceUpdate();
}

function calculateDayProgress() {
    return (((new Date().getHours() * 60) + new Date().getMinutes()) / 1440) * 100
    // Calculation identical to Sergio's: https://gitlab.com/makerlog/web/blob/173ca1fe22dad7672d60be51e948b19088b843bb/src/pages/StreamPage/components/DayProgressBar.js#L40
}

function toggleProgressBar () {
    console.log('Toggling progress bar!');
    data.progressBar.show = !data.progressBar.show;
    localStorage.hideProgressBar = !data.progressBar.show;
}

window.onkeydown = function(e){
    //console.log(e);
    
    if(e.keyCode == 68 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+D
        var dropdown = document.querySelector('.status');
        var options = Array.from(dropdown.options).map(o => o.getAttribute('value'));
        var newIndex = options.indexOf(dropdown.value) + 1;
        if(newIndex >= options.length) {
            newIndex = 0;
        }
        dropdown.value = options[newIndex];
        
        // From v-on:input attribute
        data.taskComposer.done = dropdown.value == 'done';
        data.taskComposer.in_progress = dropdown.value == 'in_progress'
    }
    if(e.keyCode == 82 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+R
        console.log('Reloading!');
        window.location.reload();
    }
    
    if(e.keyCode == 187 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+=
        zoomIn();
    }
    if(e.keyCode == 189 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+-
        zoomOut();
    }
    if(e.keyCode == 48 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+0
        resetZoom();
    }
}
    
var zoomStepSize = 2;
var setFontSize = getGlobal('setFontSize');

function zoomIn () {
    console.log('Zooming in!');
    var newFontSize = Number(getComputedStyle(document.querySelector('html')).fontSize.replace('px','')) + zoomStepSize;
    document.querySelector('html').style.fontSize = newFontSize;
    setFontSize(newFontSize);
    vm.$forceUpdate();
}

function zoomOut () {
    console.log('Zooming out!');
    var newFontSize = Number(getComputedStyle(document.querySelector('html')).fontSize.replace('px','')) - zoomStepSize;
    document.querySelector('html').style.fontSize = newFontSize;
    setFontSize(newFontSize);
    vm.$forceUpdate();
}

function resetZoom () {
    console.log('Resetting zoom!');
    var newFontSize = 16;
    document.querySelector('html').style.fontSize = newFontSize;
    setFontSize(newFontSize);
    vm.$forceUpdate();
}

window.addEventListener('paste', function(e){
    //console.log(e);
    
    var items = e.clipboardData.items;
    
    if (items) {
        // Loop through all items, looking for any kind of image
        for (var i = 0; i < items.length; i++) {
            console.log(items[i]);
            if (items[i].kind == 'file') {
                e.preventDefault();
                setAttachment(items[i].getAsFile());
            }
        }
    }
});

function dropEvent(e) {
    setAttachment(e.dataTransfer.files[0]);
}

function setAttachment(file) {
    data.taskComposer.attachment = file;
    getBase64(data.taskComposer.attachment)
        .then(result => data.taskComposer.attachmentURL = result)
}

function createTask(content, done, in_progress, attachment) {
    data.taskComposer.processing = true;

    var formData = new FormData();
    formData.append('content',content);
    formData.append('done',done);
    formData.append('in_progress',in_progress);
    if(typeof attachment !== 'undefined') {
        formData.append('attachment',attachment);
    }

    return myFetch('https://api.getmakerlog.com/tasks/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    }).then(r => {
        console.log(r);
        data.taskComposer.processing = false;
        data.taskComposer.content = '';
        document.querySelector('.content').value = '';
        data.taskComposer.content_autocompleted = '';
        data.taskComposer.attachment = undefined;
        data.taskComposer.attachmentURL = undefined;
        document.querySelector('.attachment').value = '';
        
        doneToday++;
        getGlobal('setDoneToday')(doneToday);
    })
}

function fetchHashtags() {
    return myFetch('https://api.getmakerlog.com/me/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(r => {
        console.log('ME', r);
        userId = r.id;
        myFetch(r.avatar).then(r => r.blob()).then(blob => {
            return new Promise(resolve => {
              let reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            }).then(dataURL => getGlobal('setUser')(r.username, dataURL));
        });
        
        getTodos();
        getHeatmap();
        
        return myFetch(`https://api.getmakerlog.com/users/${r.id}/stats/`)
    })
    .then(r => {
        data.hashtags = r.tasks_per_project.labels.filter(label => label != 'No project').sort((a,b) => r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(b)] - r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(a)]);
        
        console.log('STATS', r);
        streak = r.streak;
        getGlobal('setStreak')(streak);
        doneToday = r.done_today;
        getGlobal('setDoneToday')(doneToday);
        getGlobal('setMakerScore')(r.maker_score);
        getGlobal('setTDA')(r.tda);
        getGlobal('setRemainingTasks')(r.remaining_tasks);
        getGlobal('setRestDays')(r.rest_day_balance);
        
        storage.getMany(['streakNotificationsOn', 'streakNotificationsTime'], function(err, data){
            if(data.streakNotificationsOn === true) {
                var time = data.streakNotificationsTime;
                var hours = time.split(':')[0];
                var minutes = time.split(':')[1];
                var currentTime = new Date();
                var currentHours = currentTime.getHours();
                var currentMinutes = currentTime.getMinutes();
                var hoursUntilNotification = hours - currentHours;
                var minutesUntilNotification = minutes - currentMinutes;
                var timeoutMilliseconds = minutesUntilNotification*60*1000 + hoursUntilNotification*60*60*1000;
                console.log(`${hoursUntilNotification} hours and ${minutesUntilNotification} minutes until notification.`);

                if(hours >= 0) {
                    setTimeout(notifyAboutStreak, timeoutMilliseconds);
                }

            }
        });
    })
}

function getTodos() {
    myFetch(`https://api.getmakerlog.com/tasks/?user=${userId}&done=false`).then(r => {
        console.log('TODOS', r);
        getGlobal('setTodos')(r.results);
    });
}

function getHeatmap() {
    myFetch(`https://api.getmakerlog.com/users/${userId}/activity_graph/`).then(r => {
        console.log('HEATMAP', r);
        data.heatmap.data = r.data;
        vm.$forceUpdate();
        setTimeout(() => {
            document.querySelector('#heatmap .vch__months__labels__wrapper').style.display = 'none';
            document.querySelector('#heatmap .vch__days__labels__wrapper').style.display = 'none';
            document.querySelector('#heatmap .vch__legend__wrapper').style.display = 'none';
            document.querySelector('#heatmap .vch__year__wrapper').removeAttribute('transform')
            document.querySelector('#heatmap').setAttribute('viewBox', '0 0 647 83');
            svgElemToPngDataURL(document.querySelector('#heatmap')).then(dataURL => getGlobal('setHeatmap')(dataURL));
        }, 100);
    });
}

function autofillHashtag() {
    if((/#./).test(data.taskComposer.content)) {
        console.log('AUTOCOMPLETE');
        var fullTextWithSuggestion = data.taskComposer.content;
        var split = data.taskComposer.content.split('#');
        var hashtagText = split[split.length - 1];
        //console.log(hashtagText);
        var possibleHashtags = data.hashtags.filter(hashtag => hashtag.startsWith(hashtagText));
        //console.log(possibleHashtags);
        var bestSuggestion = possibleHashtags[0]; // Sorted by number of times used
        //console.log(bestSuggestion);
        fullTextWithSuggestion = split;
        fullTextWithSuggestion[split.length - 1] = bestSuggestion;
        fullTextWithSuggestion = fullTextWithSuggestion.join('#');
        data.taskComposer.content_autocompleted = fullTextWithSuggestion;
    } else if (data.taskComposer.content_autocompleted != '') {
        data.taskComposer.content_autocompleted = '';
    }

    //console.log(fullTextWithSuggestion);
}

function login() {
    document.body.innerHTML = '';

    var storeAppHref = getGlobal('storeAppHref');
    storeAppHref(window.location.href);
    getGlobal('goFullscreen')();

    window.location = `https://api.getmakerlog.com/oauth/authorize/?client_id=${client_id}&scope=user:read%20tasks:write&response_type=code`;
}

function refreshMakerlogToken(notify = false) {
    if(typeof refreshToken !== 'undefined' && refreshToken.length > 0) {
        return fetch('https://makerlog-menubar-cloud-functions.netlify.com/.netlify/functions/refreshMakerlogToken', {
            method: 'POST',
            body: JSON.stringify({refresh_token: refreshToken})
        }).then(r => r.json()).then(r => {
            token = r.access_token;
            refreshToken = r.refresh_token;
            getGlobal('storeToken')(`${token}|${refreshToken}`);
            if(notify) {
                alert('Failed. Please try that again!')
            }
            if(data.taskComposer.content.length == 0) {
                window.location.reload();
            }
        }, err => alert('Failed. Please try that again!'))
        .catch(r => alert('Failed. Please try that again!'))
    } else {
        login(); // Can't refresh so log in again
    }
}

function checkForNewUpdate() {
    return myFetch('https://api.github.com/repos/Booligoosh/makerlog-menubar/releases/latest')
    .then(latest => {
        var currentNum = Number(getGlobal('appVersion').replace(/\./g,''));
        var latestNum = Number(latest.tag_name.replace('v','').replace(/\./g,''));

        if(latestNum > currentNum) {
            if(typeof localStorage.lastUpdateNotificationTime == 'undefined' || Date.time() - Number(localStorage.lastUpdateNotificationTime) > 1000*60*60*24) { // 24 hours
                alert(`Please update to the latest version!\n${latest.name}\n\nYou can download it here:\nhttps://github.com/Booligoosh/makerlog-menubar/releases/tag/${latest.tag_name}`);
            }
        }
    })
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function svgElemToPngDataURL(svg) {
    return new Promise(resolve => {
        var svgData = new XMLSerializer().serializeToString(svg);
        var canvas = document.createElement("canvas");
        var svgSize = svg.getBoundingClientRect();
        canvas.width = svgSize.width * 3;
        canvas.height = svgSize.height * 3;
        canvas.style.width = svgSize.width;
        canvas.style.height = svgSize.height;
        var ctx = canvas.getContext("2d");

        var img = document.createElement("img");
        img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));

        img.onload = function () {
          ctx.drawImage(img, 0, 0);
          var canvasdata = canvas.toDataURL("image/png", 1);
          resolve(canvasdata)
        };
    })
}

function myFetch(input,init = {}) {
    return fetch(input,init)
    .then(r => {
        if(r.status === 403) {
            if(new URL(r.url).host.includes('getmakerlog')) { // NOT SECURE for validating but fine here
                // Makerlog credentials timed out
                refreshMakerlogToken(true);
            }
        } else {
            return r.headers.get('content-type').startsWith('application/json') ? r.json() : r;
        }
    }, err => {
        // No internet connection
    });
}

window.addEventListener('DOMContentLoaded', function(){vm.$forceUpdate()})