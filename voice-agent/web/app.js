const state = {
  recording: false,
  mediaRecorder: null,
  mediaStream: null,
  audioChunks: [],
  recognition: null,
  transcript: "",
  finalTranscript: "",
  interimTranscript: "",
  lastInterimLogAt: 0,
  startedAt: 0,
  micPermissionGranted: false,
  turnCount: 0,
  livekitRoom: null,
  livekitConnected: false,
  livekitMicActive: false,
  rmccData: null,
  rmccMode: "unknown"
};

const mockData = {
  projects: [],
  overdueTasks: [],
  money: [],
  ideas: ["Footer assistant bar for RMCC, disabled by default."]
};

const butlerIntros = [
  "Certainly.",
  "Very good.",
  "Right then.",
  "Of course.",
  "Naturally."
];

const els = {
  messages: document.getElementById("messages"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("chatInput"),
  pttButton: document.getElementById("pttButton"),
  releaseMicButton: document.getElementById("releaseMicButton"),
  micHelp: document.getElementById("micHelp"),
  spokenRepliesToggle: document.getElementById("spokenRepliesToggle"),
  alwaysOnToggle: document.getElementById("alwaysOnToggle"),
  footerAssistant: document.getElementById("footerAssistant"),
  footerFocusButton: document.getElementById("footerFocusButton"),
  debugLog: document.getElementById("debugLog"),
  textStatus: document.getElementById("textStatus"),
  micStatus: document.getElementById("micStatus"),
  livekitStatus: document.getElementById("livekitStatus"),
  livekitCheckButton: document.getElementById("livekitCheckButton"),
  livekitConnectButton: document.getElementById("livekitConnectButton"),
  livekitDisconnectButton: document.getElementById("livekitDisconnectButton"),
  remoteAudio: document.getElementById("remoteAudio"),
  focusPrimary: document.getElementById("focusPrimary"),
  metricProjects: document.getElementById("metricProjects"),
  metricTasks: document.getElementById("metricTasks"),
  metricStale: document.getElementById("metricStale"),
  metricMoney: document.getElementById("metricMoney")
};

function boot() {
  addAssistant({
    text: "Good morning Steve. RMCC Voice Agent is ready as a standalone prototype. Text chat works here; the proper LiveKit voice backend lives in /agent.",
    items: ["Try: What should I focus on today?", "Try: What money is outstanding?", "Try: add idea weekly roundup"]
  });
  loadRmccData();
  logDebug("microphone permission state: checking");
  checkMicPermission();

  els.form.addEventListener("submit", handleTextSubmit);
  els.pttButton.addEventListener("click", togglePushToTalk);
  els.releaseMicButton.addEventListener("click", releaseMicrophone);
  els.alwaysOnToggle.addEventListener("change", toggleFooterMode);
  els.footerFocusButton.addEventListener("click", () => handleUserText("What should I focus on today?"));
  els.livekitCheckButton.addEventListener("click", checkLiveKitSetup);
  els.livekitConnectButton.addEventListener("click", connectLiveKit);
  els.livekitDisconnectButton.addEventListener("click", disconnectLiveKit);
  els.metricProjects.addEventListener("click", () => showMetricDetails("projects"));
  els.metricTasks.addEventListener("click", () => showMetricDetails("tasks"));
  els.metricStale.addEventListener("click", () => showMetricDetails("stale"));
  els.metricMoney.addEventListener("click", () => showMetricDetails("money"));
}
async function loadRmccData() {
  try {
    const response = await fetch("/api/rmcc/summary");
    const data = await response.json();
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || "RMCC summary endpoint unavailable");
      error.mode = data.mode || "real";
      throw error;
    }

    state.rmccData = data;
    state.rmccMode = data.mode || "mock";
    applyRmccData(data);
    updateOverview(data);
    logDebug(`RMCC ${state.rmccMode} data loaded from protected local API`);
  } catch (error) {
    state.rmccData = null;
    state.rmccMode = error.mode || "mock";
    if (state.rmccMode === "real") {
      updateOverview(null, "Live RMCC data is unavailable. Check the protected MCP connection.");
      logDebug(`errors: live RMCC read failed: ${error.message}`, true);
    } else {
      seedFallbackMockData();
      updateOverview(null);
      logDebug(`errors: RMCC mock data load failed: ${error.message}`, true);
    }
  }
}

function seedFallbackMockData() {
  if (mockData.projects.length) return;

  mockData.projects = [
    { name: "Queen Bee", stale: false, summary: "Launch funnel and campaign plan.", priority: "high" },
    { name: "Race Media Command Centre", stale: false, summary: "Operations hub and future API source.", priority: "critical" },
    { name: "Legit Raffles", stale: false, summary: "Standalone landing page and conversion route.", priority: "high" },
    { name: "Creator Retainers", stale: true, summary: "Recurring client offer and follow-up system.", priority: "medium" },
    { name: "Shorts Engine", stale: true, summary: "Repeatable short-form video workflow.", priority: "medium" }
  ];
  mockData.overdueTasks = [
    "Queen Bee: Choose hero direction",
    "Race Media Command Centre: Audit outstanding money view",
    "Creator Retainers: Draft package menu",
    "Shorts Engine: Choose first repeatable template"
  ];
  mockData.money = [
    "Acme Fitness: £1,250 overdue",
    "Northern Autos: £780 due Friday",
    "Bee Founders Club: £420 due today"
  ];
}

function applyRmccData(data) {
  const staleIds = new Set((data.staleProjects || []).map((project) => project.id));
  mockData.projects = (data.activeProjects || []).map((project) => ({
    name: project.name,
    stale: staleIds.has(project.id),
    summary: project.summary,
    priority: project.priority
  }));
  mockData.overdueTasks = (data.overdueTasks || []).map((task) => `${task.project}: ${task.title}`);
  mockData.money = ((data.outstandingMoney && data.outstandingMoney.items) || []).map(
    (item) => `${item.client}: ${item.formattedAmount} ${item.due}`
  );
  mockData.ideas = (data.ideas || []).map((idea) => idea.text);
}

function updateOverview(data, unavailableMessage = "Mock data offline; using local fallback.") {
  if (!data) {
    els.focusPrimary.textContent = unavailableMessage;
    setMetric(els.metricProjects, mockData.projects.length);
    setMetric(els.metricTasks, mockData.overdueTasks.length);
    setMetric(els.metricStale, mockData.projects.filter((project) => project.stale).length);
    setMetric(els.metricMoney, "Mock");
    return;
  }

  els.focusPrimary.textContent = data.focus.primary;
  setMetric(els.metricProjects, data.totals.activeProjects);
  setMetric(els.metricTasks, data.totals.overdueTasks);
  setMetric(els.metricStale, data.totals.staleProjects);
  setMetric(els.metricMoney, data.totals.formattedOutstandingMoney);
}

function setMetric(button, value) {
  button.querySelector("strong").textContent = String(value);
}

function showMetricDetails(type) {
  const data = state.rmccData;
  if (!data) seedFallbackMockData();
  const sourceLabel = state.rmccMode === "real" ? "live RMCC" : "mock RMCC";

  if (type === "projects") {
    handleSystemSummary({
      text: `There are ${mockData.projects.length} active projects in the current ${sourceLabel} view.`,
      items: mockData.projects.map((project) => `${project.name}: ${project.priority}. ${project.summary}`)
    });
    return;
  }

  if (type === "tasks") {
    handleSystemSummary({
      text: "These overdue tasks are currently pulling focus.",
      items: mockData.overdueTasks
    });
    return;
  }

  if (type === "stale") {
    const items = data
      ? data.staleProjects.map((project) => `${project.name}: ${project.reason}`)
      : mockData.projects.filter((project) => project.stale).map((project) => project.name);
    handleSystemSummary({
      text: "These projects have been too quiet.",
      items
    });
    return;
  }

  handleSystemSummary({
    text: data
      ? `${data.outstandingMoney.formattedTotal} is outstanding in the current ${state.rmccMode === "real" ? "live RMCC" : "local fallback"} money view.`
      : "Outstanding money is available in the local fallback view.",
    items: mockData.money
  });
}

function handleSystemSummary(response) {
  addAssistant(response);
  els.textStatus.textContent = "Text: ready";
  logDebug("RMCC overview detail opened");
}

function handleTextSubmit(event) {
  event.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  els.input.value = "";
  handleUserText(text);
}

function handleUserText(text) {
  state.turnCount += 1;
  addMessage("user", "Steve", text);
  els.textStatus.textContent = "Text: thinking";
  const response = localAgentRespond(text);
  addAssistant(response);
  els.textStatus.textContent = "Text: ready";
  logDebug("agent response received");

  if (els.spokenRepliesToggle.checked) {
    speakResponse(response);
  }
}

async function togglePushToTalk() {
  if (state.livekitConnected) {
    await toggleLiveKitPushToTalk();
    return;
  }

  if (state.recording) {
    await stopRecording();
    return;
  }
  await startRecording();
}

async function toggleLiveKitPushToTalk() {
  if (state.livekitMicActive) {
    await stopLiveKitPushToTalk();
    return;
  }

  await startLiveKitPushToTalk();
}

async function startLiveKitPushToTalk() {
  if (!state.livekitRoom) return;

  try {
    await state.livekitRoom.localParticipant.setMicrophoneEnabled(true);
    state.livekitMicActive = true;
    state.recording = true;
    els.pttButton.textContent = "Stop talking";
    els.pttButton.classList.add("recording");
    els.micStatus.textContent = "Mic: live to agent";
    logDebug("LiveKit microphone enabled");
  } catch (error) {
    handleMicrophoneError(error);
    logDebug(`errors: LiveKit microphone ${error.message}`, true);
  }
}

async function stopLiveKitPushToTalk() {
  if (!state.livekitRoom) return;

  try {
    await state.livekitRoom.localParticipant.setMicrophoneEnabled(false);
  } catch (error) {
    logDebug(`errors: LiveKit microphone stop failed: ${error.message}`, true);
  }

  state.livekitMicActive = false;
  state.recording = false;
  els.pttButton.textContent = "Start talking";
  els.pttButton.classList.remove("recording");
  els.micStatus.textContent = "Mic: muted";
  logDebug("LiveKit microphone muted");
}

async function startRecording() {
  try {
    const stream = await getMicrophoneStream();
    setMicrophoneEnabled(true);
    state.mediaStream = stream;
    state.audioChunks = [];
    state.transcript = "";
    state.finalTranscript = "";
    state.interimTranscript = "";
    state.lastInterimLogAt = 0;
    state.startedAt = Date.now();
    state.mediaRecorder = new MediaRecorder(stream);

    state.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) state.audioChunks.push(event.data);
    });

    state.mediaRecorder.addEventListener("stop", () => {
      const duration = Math.round((Date.now() - state.startedAt) / 100) / 10;
      logDebug(`recording stopped: ${duration}s, chunks=${state.audioChunks.length}`);
      finishPushToTalk();
    });

    startSpeechRecognition();
    state.mediaRecorder.start(250);
    state.recording = true;
    els.pttButton.textContent = "Stop recording";
    els.pttButton.classList.add("recording");
    els.micStatus.textContent = "Mic: recording";
    logDebug("recording started");
  } catch (error) {
    handleMicrophoneError(error);
    els.micStatus.textContent = "Mic: error";
  }
}

async function getMicrophoneStream() {
  const existingTracks = state.mediaStream ? state.mediaStream.getAudioTracks() : [];
  const hasLiveTrack = existingTracks.some((track) => track.readyState === "live");

  if (state.mediaStream && hasLiveTrack) {
    logDebug("microphone permission state: using existing grant");
    return state.mediaStream;
  }

  logDebug("microphone permission state: requesting");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.mediaStream = stream;
  state.micPermissionGranted = true;
  setMicrophoneEnabled(false);
  logDebug("microphone permission state: granted and cached");

  stream.getAudioTracks().forEach((track) => {
    track.addEventListener("ended", () => {
      logDebug("microphone stream ended");
      state.mediaStream = null;
      state.micPermissionGranted = false;
      els.micStatus.textContent = "Mic: released";
    });
  });

  return stream;
}

async function stopRecording() {
  if (!state.recording) return;

  const elapsed = Date.now() - state.startedAt;
  if (elapsed < 750) {
    logDebug("recording stop delayed: minimum capture window");
    window.setTimeout(stopRecording, 750 - elapsed);
    return;
  }

  state.recording = false;
  els.pttButton.textContent = "Start recording";
  els.pttButton.classList.remove("recording");
  els.micStatus.textContent = "Mic: stopping";

  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (error) {
      logDebug(`errors: speech stop failed: ${error.message}`, true);
    }
  }

  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }

  setMicrophoneEnabled(false);
  logDebug("microphone stream retained for next push-to-talk");
}

function setMicrophoneEnabled(enabled) {
  if (!state.mediaStream) return;
  state.mediaStream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

function releaseMicrophone() {
  if (state.recording) {
    logDebug("release microphone requested while recording; stop recording first", true);
    return;
  }

  if (!state.mediaStream) {
    logDebug("microphone already released");
    return;
  }

  state.mediaStream.getTracks().forEach((track) => track.stop());
  state.mediaStream = null;
  state.micPermissionGranted = false;
  els.micStatus.textContent = "Mic: released";
  logDebug("microphone permission state: released manually");
}

function handleMicrophoneError(error) {
  const message = error && error.message ? error.message : "Unknown microphone error";
  const permissionDenied = error && (error.name === "NotAllowedError" || /permission denied/i.test(message));

  if (permissionDenied) {
    const helpText = "Microphone permission was denied by this browser. If you are using the in-app browser, open http://127.0.0.1:8790 in Chrome or Edge and allow microphone access there.";
    logDebug(`errors: microphone permission denied. ${helpText}`, true);
    showMicHelp(helpText);
    return;
  }

  logDebug(`errors: microphone ${message}`, true);
  showMicHelp(`Microphone error: ${message}`);
}

function showMicHelp(text) {
  els.micHelp.textContent = text;
  els.micHelp.hidden = false;
}

function startSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    logDebug("transcription unavailable: browser speech recognition missing", true);
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "en-GB";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.addEventListener("result", (event) => {
    let newFinal = "";
    let latestInterim = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        newFinal += ` ${text}`;
      } else {
        latestInterim += ` ${text}`;
      }
    }

    if (newFinal.trim()) {
      state.finalTranscript = normalizeTranscript(`${state.finalTranscript} ${newFinal}`);
      logDebug(`transcription final: ${state.finalTranscript}`);
    }

    state.interimTranscript = normalizeTranscript(latestInterim);
    state.transcript = normalizeTranscript(`${state.finalTranscript} ${state.interimTranscript}`);

    const now = Date.now();
    if (state.interimTranscript && now - state.lastInterimLogAt > 1000) {
      state.lastInterimLogAt = now;
      logDebug(`transcription interim: ${state.interimTranscript}`);
    }
  });

  recognition.addEventListener("error", (event) => {
    logDebug(`errors: transcription ${event.error}`, true);
  });

  recognition.addEventListener("end", () => {
    logDebug("transcription engine ended");
    if (state.recording) {
      window.setTimeout(() => {
        try {
          recognition.start();
          logDebug("transcription engine restarted");
        } catch (error) {
          logDebug(`errors: transcription restart failed: ${error.message}`, true);
        }
      }, 200);
    }
  });

  state.recognition = recognition;
  recognition.start();
}

function finishPushToTalk() {
  els.micStatus.textContent = "Mic: idle";
  const transcript = normalizeTranscript(state.transcript);
  if (transcript) {
    logDebug(`transcription received: ${transcript}`);
    handleUserText(transcript);
  } else {
    logDebug("transcription received: none");
    addAssistant({
      text: "I recorded the audio, but no transcript arrived. The debug log should show whether the browser speech engine ended early or refused permission."
    });
  }
}

function normalizeTranscript(text) {
  return text.replace(/\s+/g, " ").trim();
}

function localAgentRespond(rawText) {
  seedFallbackMockData();
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const intro = butlerIntros[state.turnCount % butlerIntros.length];

  if (lower.includes("are you there") || lower === "hello" || lower === "hi" || lower.includes("good morning")) {
    if (lower.includes("agenda") || lower.includes("today") || lower.includes("focus")) {
      return agendaResponse();
    }

    return {
      text: "Good morning Steve. I am here, upright, composed, and only mildly concerned by the project count.",
      items: ["Ask for today's agenda", "Ask what is overdue", "Ask what money is outstanding"]
    };
  }

  if (lower.includes("agenda") || lower.includes("plan my day")) {
    return agendaResponse();
  }

  if (lower.includes("focus") || lower.includes("today")) {
    if (state.rmccData) {
      return {
        text: `${intro} ${state.rmccData.focus.primary}`,
        items: state.rmccData.focus.nextSteps
      };
    }

    return {
      text: `${intro} today's sensible focus is Queen Bee first, money second, new ideas a distant third.`,
      items: ["Chase Acme Fitness", "Approve Queen Bee hero direction", "Finish the safe RMCC API action whitelist"]
    };
  }

  if (lower.includes("active project") || lower === "projects") {
    return {
      text: `You have ${mockData.projects.length} active projects, which is ambitious, optimistic, and bordering on reckless.`,
      items: mockData.projects.map((project) => `${project.name}: ${project.priority}. ${project.summary}`)
    };
  }

  if (lower.includes("stale")) {
    return {
      text: `${intro} these projects have been sitting a little too quietly.`,
      items: mockData.projects.filter((project) => project.stale).map((project) => project.name)
    };
  }

  if (lower.includes("overdue") || lower.includes("task")) {
    if (lower.startsWith("add task")) {
      return addTaskFromText(text);
    }

    return {
      text: `${intro} the overdue list is short enough to fix and long enough to be annoying.`,
      items: mockData.overdueTasks
    };
  }

  if (lower.includes("money") || lower.includes("owed") || lower.includes("outstanding")) {
    return {
      text: `${intro} your outstanding money deserves more attention than the next genius idea.`,
      items: mockData.money
    };
  }

  if (lower.startsWith("add idea")) {
    const idea = text.replace(/^add idea/i, "").trim();
    return { text: idea ? `I can prepare "${idea}" as a real RMCC idea, but writes require the connected LiveKit agent and your confirmation.` : "Give me the idea after 'add idea' and I shall prepare it for confirmation." };
  }

  if (lower.startsWith("add note")) {
    return addNoteFromText(text);
  }

  if (lower.includes("summary") || lower.includes("summarise") || lower.includes("summarize")) {
    return projectSummaryFromText(text);
  }

  if (lower.includes("what can you do") || lower.includes("help")) {
    return {
      text: state.rmccMode === "real" ? "I can read the live RMCC dashboard here. Task and project changes are prepared first and only written after your confirmation." : "I can read the local fallback data here. Connect the protected RMCC API and LiveKit agent for real dashboard actions.",
      items: [
        "Check today's agenda or focus",
        "List active, stale, or overdue work",
        "Summarise a project",
        "Prepare a confirmed idea, task, or project update",
        "Show outstanding money"
      ]
    };
  }

  return {
    text: `${intro} I can help with today's agenda, active projects, stale projects, overdue tasks, outstanding money, project summaries, or preparing a confirmed idea or task action. Try asking it plainly and I shall do my best not to become theatrical.`
  };
}

function agendaResponse() {
  return {
    text: "Good morning Steve. Here is the agenda: recover money, move Queen Bee forward, then tidy the RMCC action list. Starting another empire may wait until after lunch.",
    items: [
      "Money: chase Acme Fitness and check Bee Founders Club",
      "Queen Bee: approve the hero direction",
      "RMCC Voice Agent: keep the safe API boundary clean",
      "Avoid: opening a brand-new project before one of these moves"
    ]
  };
}

function addTaskFromText(text) {
  const match = text.match(/add task\s+(.+?)\s+(?:to|for|on)\s+(.+)$/i);
  if (!match) {
    return { text: "Use: add task [task] to [project]. I do adore a sentence with handles." };
  }

  return {
    text: `I can prepare task "${match[1].trim()}" for ${match[2].trim()}, but the browser fallback does not write records. Connect to LiveKit so the protected agent can show the change and ask for confirmation.`,
    items: ["No RMCC record was changed"]
  };
}

function addNoteFromText(text) {
  const match = text.match(/add note\s+(.+?)\s+(?:to|for|on)\s+(.+)$/i);
  if (!match) {
    return { text: "Use: add note [note] to [project]. The filing cabinet insists." };
  }

  return {
    text: `I can prepare that note for ${match[2].trim()}, but the browser fallback does not write records. Connect to LiveKit for the confirmed project update flow.`,
    items: ["No RMCC record was changed"]
  };
}

function projectSummaryFromText(text) {
  const lower = text.toLowerCase();
  const project = mockData.projects.find((item) => lower.includes(item.name.toLowerCase()));

  if (!project) {
    return {
      text: "Tell me which project to summarise and I shall be concise, which is a gift in modern software.",
      items: mockData.projects.map((item) => item.name)
    };
  }

  return {
    text: `${project.name} is ${project.priority} priority. ${project.summary}`,
    items: project.stale
      ? ["Status: stale", "Recommendation: give it one defined next action or park it"]
      : ["Status: active", "Recommendation: keep it moving before adding more scope"]
  };
}

function addAssistant(response) {
  addMessage("assistant", "RMCC Voice Agent", response.text, response.items || []);
}

function addMessage(type, speaker, text, items = []) {
  const node = document.createElement("article");
  node.className = `message ${type}`;

  const label = document.createElement("strong");
  label.textContent = speaker;
  node.appendChild(label);

  const content = document.createElement("div");
  content.textContent = text;
  node.appendChild(content);

  if (items.length) {
    const list = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    node.appendChild(list);
  }

  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
}

function speakResponse(response) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    logDebug("errors: TTS unavailable in this browser", true);
    return;
  }

  logDebug("TTS started");
  const utterance = new SpeechSynthesisUtterance([response.text, ...(response.items || [])].join(". "));
  utterance.lang = "en-GB";
  utterance.rate = 0.86;
  utterance.pitch = 0.85;
  utterance.addEventListener("end", () => logDebug("TTS completed"));
  utterance.addEventListener("error", (event) => logDebug(`errors: TTS ${event.error}`, true));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function checkMicPermission() {
  if (!navigator.permissions || !navigator.permissions.query) {
    logDebug("microphone permission state: browser does not expose permission query");
    return;
  }

  try {
    const permission = await navigator.permissions.query({ name: "microphone" });
    logDebug(`microphone permission state: ${permission.state}`);
    permission.addEventListener("change", () => {
      logDebug(`microphone permission state: ${permission.state}`);
    });
  } catch (error) {
    logDebug(`microphone permission state: unavailable (${error.message})`);
  }
}

function toggleFooterMode() {
  els.footerAssistant.hidden = !els.alwaysOnToggle.checked;
  logDebug(`always-on footer scaffold: ${els.alwaysOnToggle.checked ? "enabled, not listening" : "disabled"}`);
}

async function connectLiveKit() {
  if (state.livekitConnected) return;

  if (!window.LivekitClient || !window.LivekitClient.Room) {
    els.livekitStatus.textContent = "LiveKit: SDK missing";
    logDebug("errors: LiveKit browser SDK was not loaded", true);
    return;
  }

  try {
    els.livekitStatus.textContent = "LiveKit: getting token";
    logDebug("LiveKit token request started");

    const detailsResponse = await fetch("/api/livekit-token?room=rmcc-voice-agent-local&identity=steve-local&name=Steve");
    const details = await detailsResponse.json();

    if (!detailsResponse.ok || !details.token || !details.url) {
      throw new Error(details.error || "Token endpoint did not return connection details");
    }

    const { Room, RoomEvent, Track } = window.LivekitClient;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true
    });

    room.on(RoomEvent.Connected, () => {
      logDebug("LiveKit room connected");
    });

    room.on(RoomEvent.Disconnected, () => {
      logDebug("LiveKit room disconnected");
      updateLiveKitDisconnectedUi();
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const isAudio = track.kind === "audio" || (Track && Track.Kind && track.kind === Track.Kind.Audio);
      if (!isAudio || !track.attach) return;

      const audio = track.attach();
      audio.autoplay = true;
      audio.dataset.participant = participant.identity;
      els.remoteAudio.appendChild(audio);
      logDebug(`LiveKit audio subscribed: ${participant.identity}`);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (!track.detach) return;
      track.detach().forEach((element) => element.remove());
    });

    await room.connect(details.url, details.token);
    state.livekitRoom = room;
    state.livekitConnected = true;
    state.livekitMicActive = false;

    els.livekitStatus.textContent = "LiveKit: connected";
    els.livekitConnectButton.disabled = true;
    els.livekitDisconnectButton.disabled = false;
    els.pttButton.textContent = "Start talking";
    els.micStatus.textContent = "Mic: muted";
    addAssistant({
      text: "LiveKit is connected. Use push-to-talk when you want the real agent to hear you."
    });
  } catch (error) {
    els.livekitStatus.textContent = "LiveKit: error";
    logDebug(`errors: LiveKit connection ${error.message}`, true);
  }
}

async function disconnectLiveKit() {
  if (state.livekitMicActive) {
    await stopLiveKitPushToTalk();
  }

  if (state.livekitRoom) {
    state.livekitRoom.disconnect();
  }

  updateLiveKitDisconnectedUi();
}

function updateLiveKitDisconnectedUi() {
  state.livekitRoom = null;
  state.livekitConnected = false;
  state.livekitMicActive = false;
  state.recording = false;
  els.remoteAudio.replaceChildren();
  els.livekitStatus.textContent = "LiveKit: not connected";
  els.livekitConnectButton.disabled = false;
  els.livekitDisconnectButton.disabled = true;
  els.pttButton.textContent = "Start recording";
  els.pttButton.classList.remove("recording");
  els.micStatus.textContent = "Mic: idle";
}

async function checkLiveKitSetup() {
  try {
    const health = await fetch("/api/health");
    const token = await fetch("/api/livekit-token?room=rmcc-voice-agent-local&identity=steve-check&name=Steve");

    if (!health.ok || !token.ok) {
      throw new Error("Local token server is not ready");
    }

    els.livekitStatus.textContent = "LiveKit: token ready";
    logDebug("LiveKit setup check: token endpoint ready. Run the agent backend before connecting.");
  } catch (error) {
    els.livekitStatus.textContent = "LiveKit: token server missing";
    logDebug(`errors: LiveKit setup check ${error.message}`, true);
  }
}

function logDebug(message, isError = false) {
  const node = document.createElement("div");
  node.className = `debug-entry${isError ? " error" : ""}`;
  node.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  els.debugLog.appendChild(node);
  els.debugLog.scrollTop = els.debugLog.scrollHeight;
}

boot();
