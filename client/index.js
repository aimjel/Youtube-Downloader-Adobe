const os = require("os");
const fs = require("fs");
const path = require("path");
const YTDlpWrap = require("yt-dlp-wrap").default;

const downloadRelease = require("download-github-release");

const ytdlpPath = `${os.homedir()}\\Documents\\YoutubeDownloader`;

// Define a function to filter releases.
function filterRelease(release) {
  // Filter out prereleases.
  return release.prerelease === false;
}

const ffmpegAsset = "ffmpeg-master-latest-win64-gpl-shared";
// Define a function to filter assets.
function filterAsset(asset) {
  console.log(asset);
  return asset.name === "yt-dlp.exe" || asset.name.startsWith(ffmpegAsset);
}

if (!fs.existsSync(ytdlpPath)) {
  fs.mkdirSync(ytdlpPath);
  resources = ["yt-dlp", "FFmpeg-Builds"];
  resources.forEach((repo) => {
    downloadRelease(
      "yt-dlp",
      repo,
      ytdlpPath,
      filterRelease,
      filterAsset,
      false
    )
      .then(function () {
        console.log("All done!");
      })
      .catch(function (err) {
        console.error(err.message);
      });
  });
}

const ytDlpWrap = new YTDlpWrap(`${ytdlpPath}\\yt-dlp.exe`);

const yts = require("yt-search");

/* 1) Create an instance of CSInterface. */
var csInterface = new CSInterface();

var searchBar = document.querySelector("#search-bar");

var audioOnly = document.querySelector("#audio-only");

var searchResults = document.querySelector("#search-results");

searchBar.addEventListener("keyup", async function (ev) {
  if (ev.key === "Enter") {
    //clears the search results for the next query
    searchResults.textContent = "";
    try {
      const r = await yts(ev.target.value);
      loadResults(r.videos);
    } catch (e) {
      console.log(e);
    }
  }
});

function loadResults(items) {
  for (let i = 0; i < items.length; i++) {
    const v = items[i];

    var result = createElement("div", { class: "result" });
    result.addEventListener("click", (ev) =>
      download(v.videoId, audioOnly.checked, v.title, ev)
    );

    //adds the youtube thumbnail
    result.appendChild(
      createElement("img", {
        src: `https://i.ytimg.com/vi/${v.videoId}/default.jpg`,
      })
    );

    var details = createElement("div", { class: "result-details" });

    details.appendChild(createElement("span", { textContent: v.title }));
    details.appendChild(
      createElement("span", {
        textContent: `${compactInteger(v.views)} - ${v.ago} - ${v.timestamp}`,
      })
    );
    details.appendChild(createElement("span", { textContent: v.author.name }));

    result.appendChild(details);
    searchResults.appendChild(result);
  }
}

function EscapeStringForJSX(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"')
}

//json object mapping video ids to their abort controller
var inProgress = {}
function download(id, audio, title, ev) {  
  if(inProgress.hasOwnProperty(id)){
    inProgress[id].abort()
    ev.currentTarget.style.backgroundImage.replace('lightgreen', "darkorange")
    delete inProgress[id]
    return
  }


  var fi = `${ytdlpPath}\\media\\${title}.${audio ? "m4a" : "mp4"}`;
  if (fs.existsSync(fi)) {
    console.log("importing", fi);
    ev.currentTarget.style.backgroundColor='green'
    csInterface.evalScript(`importDownload('${EscapeStringForJSX(fi)}')`);
    return;
  }

  let controller = new AbortController();
  inProgress[id] = controller
  var res = ev.currentTarget
  let ytDlpEventEmitter = ytDlpWrap
    .exec([
      id,
      "-S",
      "vcodec:h264,res,acodec:m4a",
      "-o",
      `${ytdlpPath}\\media\\%(title)s.%(ext)s`,
      "--ffmpeg-location",
      `${ytdlpPath}\\${ffmpegAsset}\\bin`,
    ],
    {shell:true},
    controller.signal)
    .on("progress", (progress) => {
      res.style.backgroundImage = `linear-gradient(to right, lightgreen ${progress.percent}%, transparent 0%)`;
      console.log(
        progress.percent,
        progress.totalSize,
        progress.currentSpeed,
        progress.eta
      );
    })
    .on("ytDlpEvent", (eventType, eventData) =>
      console.log(eventType, eventData)
    )
    .on("error", (error) => {
      console.error(error)
      delete inProgress[id]
    })
    .on("close", () =>
    {
      delete inProgress[id]
      res.style.background = ''
      res.style.backgroundColor = "green"
      console.log(EscapeStringForJSX(fi))
      csInterface.evalScript(`importDownload('${EscapeStringForJSX(fi)}')`)
    }
    );
}

function createElement(name, options) {
  let element = document.createElement(name);
  for (let key in options) {
    if (key === "textContent") {
      element.textContent = options[key];
    } else {
      element.setAttribute(key, options[key]);
    }
  }

  return element;
}

function compactInteger(v) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}
