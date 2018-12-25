var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;

document.querySelector('html').style.fontSize = electron.remote.getGlobal('fontSize')/1.5;
electron.remote.getGlobal('goNormalSize')();

var client_id = '7JomVQ7FyglKL2PvIxCVS1rIo9kMQKcv78lk4vwM';
var tokenStore = electron.remote.getGlobal('token');
var token;
var refreshToken;

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
    setInterval(checkForNewUpdate,10*60*1000); // Every 10 minutes
    fetchHashtags();
}

ipcRenderer.on('darkModeChange', (event, arg) => {
    data.darkMode = electron.remote.getGlobal('darkMode');
})

ipcRenderer.on('focusContent', (event, arg) => {
    document.querySelector('.content').focus();
})

var data = {
    dragover: false,
    darkMode: electron.remote.getGlobal('darkMode'),
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

window.onkeydown = function(e){
    //console.log(e);
    
    if(e.keyCode == 80 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+P
        console.log('Toggling progress bar!');
        data.progressBar.show = !data.progressBar.show;
        localStorage.hideProgressBar = !data.progressBar.show;
    }
    if(e.keyCode == 82 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+R
        console.log('Reloading!');
        window.location.reload();
    }
    
    var zoomStepSize = 2;
    var setFontSize = electron.remote.getGlobal('setFontSize');
    
    if(e.keyCode == 187 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+=
        console.log('Zooming in!');
        var newFontSize = Number(getComputedStyle(document.querySelector('html')).fontSize.replace('px','')) + zoomStepSize;
        document.querySelector('html').style.fontSize = newFontSize;
        setFontSize(newFontSize);
        vm.$forceUpdate();
    }
    if(e.keyCode == 189 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+-
        console.log('Zooming out!');
        var newFontSize = Number(getComputedStyle(document.querySelector('html')).fontSize.replace('px','')) - zoomStepSize;
        document.querySelector('html').style.fontSize = newFontSize;
        setFontSize(newFontSize);
        vm.$forceUpdate();
    }
    if(e.keyCode == 48 && (e.ctrlKey || e.metaKey)) { // aka CtrlOrCommand+0
        console.log('Resetting zoom!');
        var newFontSize = 16;
        document.querySelector('html').style.fontSize = newFontSize;
        setFontSize(newFontSize);
        vm.$forceUpdate();
    }
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
        document.querySelector('.attachment').files = new FileList();
    })
}

function fetchHashtags() {
    return myFetch('https://api.getmakerlog.com/me/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(r => myFetch(`https://api.getmakerlog.com/users/${r.id}/stats/`))
    .then(r => {
        data.hashtags = r.tasks_per_project.labels.filter(label => label != 'No project').sort((a,b) => r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(b)] - r.tasks_per_project.datasets[0].data[r.tasks_per_project.labels.indexOf(a)]);
    })
}

function autofillHashtag() {
    var fullTextWithSuggestion = data.taskComposer.content;
    if((/#./).test(data.taskComposer.content)) {
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
    }

    //console.log(fullTextWithSuggestion);
    data.taskComposer.content_autocompleted = fullTextWithSuggestion;
}

function login() {
    document.body.innerHTML = '';

    var storeAppHref = electron.remote.getGlobal('storeAppHref');
    storeAppHref(window.location.href);
    electron.remote.getGlobal('goFullscreen')();

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
            electron.remote.getGlobal('storeToken')(`${token}|${refreshToken}`);
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
        var currentNum = Number(electron.remote.getGlobal('appVersion').replace(/\./g,''));
        var latestNum = Number(latest.tag_name.replace('v','').replace(/\./g,''));

        if(latestNum > currentNum) {
            alert(`Please update to the latest version!\nYou can download it here:\n\nhttps://github.com/Booligoosh/makerlog-menubar/releases/tag/${latest.tag_name}`);
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

function myFetch(input,init = {}) {
    return fetch(input,init)
    .then(r => {
        if(r.status === 403) {
            // Credentials timed out
            refreshMakerlogToken(true);
        } else {
            return r.headers.get('content-type').startsWith('application/json') ? r.json() : r;
        }
    }, err => {
        // No internet connection
    });
}

window.addEventListener('DOMContentLoaded', function(){vm.$forceUpdate()})