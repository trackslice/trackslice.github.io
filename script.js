
let audioContext, audioBuffer, sourceNode, gainNode;
let isPlaying = false;
let sourceStartTime = 0;
let updateInterval;

const startSlider = document.getElementById("startSlider");
const endSlider = document.getElementById("endSlider");
const startInput = document.getElementById("startTime");
const endInput = document.getElementById("endTime");
const info = document.getElementById("info");
const startMarkerEl = document.getElementById("startMarker");
const liveTimeEl = document.getElementById("liveTime");
const endMarkerEl = document.getElementById("endMarker");

let isLooping = false;
let loopBtn = document.getElementById("loopBtn");

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('audioFile');

// --- DROPZONE / CLICK ---
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
});
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) loadAudio(e.dataTransfer.files[0]);
});


fileInput.addEventListener('change', e => {
  if (e.target.files.length) loadAudio(e.target.files[0]);
});

// --- LOAD AUDIO FUNCTION ---
async function loadAudio(file){
  if(!file) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());

  const duration = audioBuffer.duration;
  info.textContent = `${file.name} -- [ ${formatTime(duration)} ]`;

  // Configure sliders
  startSlider.max = endSlider.max = duration;
  startSlider.value = startInput.value = 0;
  endSlider.value = endInput.value = duration.toFixed(2);

  // Reset markers / live
  startMarkerEl.textContent = liveTimeEl.textContent = "00:00:00";
  endMarkerEl.textContent = formatTime(duration);
  
  // Update slice duration
  updateSliceDuration();
}

// --- FORMAT TIME ---
function formatTime(seconds){
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  const s = Math.floor(seconds%60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// --- SYNC SLIDERS & INPUTS ---
function updateStart(value){
  startSlider.value = startInput.value = value;
  startMarkerEl.textContent = formatTime(value);
  if(!isPlaying) liveTimeEl.textContent = startMarkerEl.textContent;
}

function updateEnd(value){
  endSlider.value = endInput.value = value;
  endMarkerEl.textContent = formatTime(value);
}

startSlider.addEventListener("input", e => updateStart(parseFloat(e.target.value)));
startInput.addEventListener("input", e => updateStart(parseFloat(e.target.value)));
endSlider.addEventListener("input", e => updateEnd(parseFloat(e.target.value)));
endInput.addEventListener("input", e => updateEnd(parseFloat(e.target.value)));

// --- PLAYBACK ---
function playFromStart(){
  if(!audioBuffer) return;
  stopAudio();

  const start = parseFloat(startInput.value);
  const end = parseFloat(endInput.value);
  const duration = Math.max(0, end-start);

  gainNode = audioContext.createGain();
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(gainNode).connect(audioContext.destination);

  const fadeTime = 0.5;
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeTime);
  gainNode.gain.setValueAtTime(1, audioContext.currentTime + duration - fadeTime);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  if(audioContext.state === 'suspended') audioContext.resume();
  sourceNode.start(0, start, duration);

  isPlaying = true;
  sourceStartTime = audioContext.currentTime - start;

  updateInterval = setInterval(()=>{
    const t = audioContext.currentTime - sourceStartTime;
    liveTimeEl.textContent = formatTime(Math.min(end, t));
  }, 100);

  sourceNode.onended = () => {
    isPlaying = false;
    clearInterval(updateInterval);
    liveTimeEl.textContent = startMarkerEl.textContent;

    if (isLooping) {
      // restart playback after a short pause
      setTimeout(() => playFromStart(), 100);
    }
  };

}

function stopAudio(){
  if(sourceNode){
    try{ sourceNode.stop(); }catch{}
    sourceNode.disconnect();
    gainNode.disconnect();
    sourceNode = gainNode = null;
  }
  isPlaying = false;
  clearInterval(updateInterval);
  liveTimeEl.textContent = startMarkerEl.textContent;
}

// Shift+Space snippet playback
function playFromEndSnippet(){
  if(!audioBuffer) return;
  stopAudio();

  const end = parseFloat(endInput.value);
  const snippetDuration = 5;
  const snippetStart = Math.max(0, end - snippetDuration);
  const duration = Math.min(snippetDuration, end - snippetStart);

  if(duration <= 0) return;

  gainNode = audioContext.createGain();
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(gainNode).connect(audioContext.destination);

  const fadeTime = 0.5;
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeTime);
  gainNode.gain.setValueAtTime(1, audioContext.currentTime + duration - fadeTime);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  if(audioContext.state === 'suspended') audioContext.resume();
  sourceNode.start(0, snippetStart, duration);

  isPlaying = true;
  sourceStartTime = audioContext.currentTime - snippetStart;

  updateInterval = setInterval(()=>{
    const t = audioContext.currentTime - sourceStartTime;
    liveTimeEl.textContent = formatTime(Math.min(end, t));
  }, 100);

  sourceNode.onended = () => {
    isPlaying = false;
    clearInterval(updateInterval);
    liveTimeEl.textContent = startMarkerEl.textContent;

    if (isLooping) {
      // restart playback after a short pause
      setTimeout(() => playFromStart(), 100);
    }
  };

}


function updateSliceDuration(){
  const start = parseFloat(startInput.value) || 0;
  const end = parseFloat(endInput.value) || 0;
  const duration = Math.max(0, end - start);
  document.getElementById('sliceDuration').textContent = ` ${duration.toFixed(2)}s`;
}

// Call this whenever start/end sliders or inputs change
[startSlider, startInput, endSlider, endInput].forEach(el=>{
  el.addEventListener('input', updateSliceDuration);
  el.addEventListener('change', updateSliceDuration);
});

// Initialize on load
updateSliceDuration();


// --- EXPORT WAV ---
function exportWav(){
  if(!audioBuffer) return alert("Load a file first!");

  const start = parseFloat(startInput.value);
  const end = parseFloat(endInput.value);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(end * sampleRate);
  const length = endSample - startSample;

  const buffer = new ArrayBuffer(44 + length*2);
  const view = new DataView(buffer);

  function writeString(view, offset, str){
    for(let i=0;i<str.length;i++) view.setUint8(offset+i,str.charCodeAt(i));
  }

  writeString(view,0,'RIFF');
  view.setUint32(4,36+length*2,true);
  writeString(view,8,'WAVE');
  writeString(view,12,'fmt ');
  view.setUint32(16,16,true);
  view.setUint16(20,1,true);
  view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);
  view.setUint16(34,16,true);
  writeString(view,36,'data');
  view.setUint32(40,length*2,true);

  const fadeSamples = Math.floor(Math.min(0.5,length/audioBuffer.sampleRate/2)*audioBuffer.sampleRate);
  const channelData = audioBuffer.getChannelData(0).slice(startSample, endSample);
  for(let i=0;i<length;i++){
    let gain = 1;
    if(i<fadeSamples) gain = i/fadeSamples;
    else if(i>=length-fadeSamples) gain = (length-i)/fadeSamples;
    let s = Math.max(-1, Math.min(1, channelData[i]*gain));
    view.setInt16(44+i*2, s<0?s*0x8000:s*0x7FFF,true);
  }

  const blob = new Blob([view],{type:'audio/wav'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'slice.wav';
  a.click();
}

const loopContainer = document.getElementById("loopBtn");
const loopToggleBtn = loopContainer.querySelector("button");

loopContainer.addEventListener("click", () => {
  isLooping = !isLooping;

  // Update inner button label
  loopToggleBtn.textContent = isLooping ? "ON" : "OFF";

  // Visual feedback on container
  loopContainer.classList.toggle("bg-transparent", isLooping);
  loopContainer.classList.toggle("bg-transparent", !isLooping);
});


document.getElementById("exportBtn").addEventListener("click", exportWav);

document.addEventListener("keydown", (e)=>{
  if(e.code === "Space"){
    e.preventDefault();
    if(e.shiftKey) playFromEndSnippet();
    else isPlaying ? stopAudio() : playFromStart();
  }
});
