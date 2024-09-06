const URL = 'https://teachablemachine.withgoogle.com/models/gVK9omNAQ/';
let model, webcam, ctx, labelContainer, maxPredictions;
let pomodoroInterval;
let isWorkTime = true;
let timeLeft = 25 * 60; // 25 minutes in seconds for work session

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';
    console.log("hello 123 test");
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true; 
    webcam = new tmPose.Webcam(200, 200, flip);
    await webcam.setup(); 
    webcam.play();
    window.requestAnimationFrame(loop);
}

async function loop(timestamp) {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[0].probability.toFixed(2);
        
        console.log(prediction[0].probability);
        if(prediction[0].probability >= 0.3){
            player.playVideo();
        } else player.pauseVideo();
    }
}

let player;

function loadVideo() {
const link = document.getElementById('youtubeLink').value;
const videoId = extractVideoId(link);

if (videoId) {
if (player) {
    player.loadVideoById(videoId);
} else {
    player = new YT.Player('player', {
        height: '315',
        width: '560',
        videoId: videoId,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange // Detect video play/pause state
        }
    });
}
} else {
alert("Please enter a valid YouTube link.");
}
}

function onPlayerReady(event) {
event.target.playVideo();
}

function onPlayerStateChange(event) {
if (event.data == YT.PlayerState.PLAYING) {
startPomodoro(); // Start Pomodoro when video plays
} else if (event.data == YT.PlayerState.PAUSED) {
pausePomodoro(); // Pause Pomodoro when video pauses
}
}

function playVideo() {
if (player) {
player.playVideo();
}
}

function pauseVideo() {
if (player) {
player.pauseVideo();
}
}

function extractVideoId(url) {
const regExp = /^.*(youtu.be\/|v\/|\/u\/\w\/|embed\/|watch\?v=|\&v=|youtube.com\/shorts\/)([^#\&\?]*).*/;
const match = url.match(regExp);

return (match && match[2].length === 11) ? match[2] : null;
}

// Pomodoro Timer functions
function startPomodoro() {
pomodoroInterval = setInterval(() => {
if (timeLeft > 0) {
    timeLeft--;
    displayTime();
} else {
    clearInterval(pomodoroInterval);
    isWorkTime = !isWorkTime;
    timeLeft = isWorkTime ? 25 * 60 : 5 * 60; 
    startPomodoro();
}
}, 1000);
}

function pausePomodoro() {
clearInterval(pomodoroInterval);
}

function displayTime() {
const minutes = Math.floor(timeLeft / 60);
const seconds = timeLeft % 60;
document.getElementById('pomodoro-timer').innerHTML = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}
