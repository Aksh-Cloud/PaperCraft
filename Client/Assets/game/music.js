const musicStartDelayRange = { min: 10, max: 60 };
const musicBetweenDelay = { min: 60, max: 180 };

let isPlaying = false;
let musicPlayer = new Audio();

const songs = [
    "calm1",
    "calm2",
    "calm3",
    "hal1",
    "hal2",
    "hal3",
    "hal4",
    "nuance1",
    "nuance2",
    "piano1",
    "piano2",
    "piano3",
];

function playRandomSong() {
    let randomSongIndex = RandomRange(0, songs.length);
    let randomSongUrl = "Assets/audio/music/" + songs[randomSongIndex] + ".ogg";

    musicPlayer.src = randomSongUrl;
    const musicVol = (settings.musicVolume ?? 100) / 100;
    musicPlayer.volume = musicVol * 0.3;
    musicPlayer.play();

    isPlaying = true;

    musicPlayer.onended = () => {
        isPlaying = false;
        let delay =
            RandomRange(musicBetweenDelay.min, musicBetweenDelay.max) * 1000;
        setTimeout(playRandomSong, delay);
    };
}

function startMusic() {
    if (isPlaying) return;

    let startDelay =
        RandomRange(musicStartDelayRange.min, musicStartDelayRange.max) * 1000;
    setTimeout(playRandomSong, startDelay);
}

// FIND THIS at the bottom of music.js:
startMusic();

// CHANGE TO:
function startMusicAfterInteraction() {
    const start = () => {
        startMusic();
        document.removeEventListener("click", start);
        document.removeEventListener("keydown", start);
    };
    document.addEventListener("click", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
}

startMusicAfterInteraction();