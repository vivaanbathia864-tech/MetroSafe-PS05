(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const form = byId('event-form');
  const inputs = {
    name: byId('event-name'), venue: byId('event-venue'), attendance: byId('attendance'),
    share: byId('metro-share'), end: byId('event-end'), surgeMinute: byId('surge-minute'),
  };
  const limits = {
    horizon: 120,
    gateCapacityPerMinute: 58,
    maximumGates: 8,
    stairCapacityPerMinute: 220,
    concourseCapacity: 850,
    platformCapacity: 1200,
    forecourtCapacity: 1800,
    trainCapacity: 650,
    baseHeadway: 6,
  };
  const languages = ['en', 'hi', 'gu'];
  let simulation = null;
  let currentMinute = 0;
  let activeLanguage = 'en';
  let surgeEnabled = false;
  let playback = null;
  let chartHover = -1;

  const fmt = (number) => Math.round(number || 0).toLocaleString('en-IN');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const gaussian = (x, mean, sigma) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
  const sum = (array) => array.reduce((acc, item) => acc + item, 0);

  function absoluteTime(offset) {
    const [hour, minute] = (inputs.end.value || '22:00').split(':').map(Number);
    const total = ((hour * 60 + minute + offset) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function distribute(total, weights) {
    if (!weights.length || total <= 0) return weights.map(() => 0);
    const denominator = sum(weights) || weights.length;
    const exact = weights.map((weight) => (total * (weight || 1)) / denominator);
    const result = exact.map(Math.floor);
    let remainder = total - sum(result);
    const fractions = exact.map((value, index) => ({ index, fraction: value - result[index] }))
      .sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < remainder; i++) result[fractions[i % fractions.length].index] += 1;
    return result;
  }

  function createArrivalProfile(riders, withSurge, surgeStart) {
    const horizon = limits.horizon;
    const weights = Array.from({ length: horizon }, (_, minute) =>
      0.50 * gaussian(minute, 24, 15) +
      0.34 * gaussian(minute, 48, 18) +
      0.16 * gaussian(minute, 76, 15));
    const base = distribute(riders, weights);
    if (!withSurge || riders <= 0) return { arrivals: base, surgeCount: 0, surgeStart };

    const pulseStart = clamp(surgeStart, 8, 100);
    const future = Array.from({ length: horizon - pulseStart - 10 }, (_, i) => pulseStart + 10 + i);
    const available = sum(future.map((minute) => base[minute]));
    const shifted = Math.min(Math.round(riders * 0.22), available);
    if (shifted <= 0) return { arrivals: base, surgeCount: 0, surgeStart: pulseStart };

    const removed = distribute(shifted, future.map((minute) => base[minute]));
    removed.forEach((count, index) => { base[future[index]] -= count; });
    const pulseWeights = [0.65, 0.78, 0.95, 1.1, 1.18, 1.18, 1.12, 1.0, 0.88, 0.76];
    const pulse = distribute(shifted, pulseWeights);
    pulse.forEach((count, index) => { base[pulseStart + index] += count; });
    return { arrivals: base, surgeCount: shifted, surgeStart: pulseStart };
  }

  function chooseHeadway(peak) {
    if (peak >= 300) return 3;
    if (peak >= 175) return 4;
    return limits.baseHeadway;
  }

  function createSimulation() {
    const attendance = clamp(Number(inputs.attendance.value) || 0, 100, 150000);
    const metroShare = clamp(Number(inputs.share.value) || 0, 1, 100);
    inputs.attendance.value = attendance;
    inputs.share.value = metroShare;
    const riders = Math.round(attendance * metroShare / 100);
    const surgeStart = Number(inputs.surgeMinute.value) || 20;
    const profile = createArrivalProfile(riders, surgeEnabled, surgeStart);
    const arrivals = profile.arrivals;
    const rollingPeak = arrivals.reduce((peak, _, minute) => {
      const fiveMinuteRate = sum(arrivals.slice(minute, minute + 5)) / Math.min(5, limits.horizon - minute);
      return Math.max(peak, fiveMinuteRate);
    }, 0);
    const headway = chooseHeadway(rollingPeak);
    const gatePlan = clamp(Math.ceil(rollingPeak / limits.gateCapacityPerMinute), 2, limits.maximumGates);

    let forecourt = 0, concourse = 0, platform1 = 0, platform2 = 0;
    let maxForecourt = 0, maxConcourse = 0, maxPlatform = 0;
    const rows = [];
    let boarded = 0;
    let trains = 0;
    for (let minute = 0; minute < limits.horizon; minute++) {
      const peopleArriving = arrivals[minute];
      forecourt += peopleArriving;
      const shortForecast = Math.max(...arrivals.slice(minute, Math.min(minute + 4, limits.horizon)));
      const gatesOpen = clamp(Math.ceil((shortForecast + Math.min(forecourt, 160) * 0.12) / limits.gateCapacityPerMinute), 2, limits.maximumGates);
      const gateFlow = Math.min(forecourt, gatesOpen * limits.gateCapacityPerMinute);
      forecourt -= gateFlow;
      concourse += gateFlow;
      const stairFlow = Math.min(concourse, limits.stairCapacityPerMinute);
      concourse -= stairFlow;
      const platformFlow = stairFlow;
      platform1 += platformFlow * 0.52;
      platform2 += platformFlow - platformFlow * 0.52;

      const trainArrives = minute % headway === 0;
      let boardings = 0;
      if (trainArrives) {
        trains += 1;
        boardings = Math.min(platform1 + platform2, limits.trainCapacity);
        const ratio1 = (platform1 + platform2) ? platform1 / (platform1 + platform2) : 0.5;
        platform1 -= boardings * ratio1;
        platform2 -= boardings * (1 - ratio1);
        boarded += boardings;
      }
      maxForecourt = Math.max(maxForecourt, forecourt);
      maxConcourse = Math.max(maxConcourse, concourse);
      maxPlatform = Math.max(maxPlatform, platform1 + platform2);
      rows.push({ minute, arrivals: peopleArriving, gatesOpen, gateFlow, forecourt, concourse, platform1, platform2, boardings, trainArrives });
    }

    const peakMinute = arrivals.indexOf(Math.max(...arrivals));
    let surgeClose = profile.surgeStart + 9;
    const congestion = Math.max(
      maxForecourt / limits.forecourtCapacity,
      maxConcourse / limits.concourseCapacity,
      maxPlatform / limits.platformCapacity,
    );
    simulation = {
      eventName: inputs.name.value.trim() || 'Stadium event',
      venue: inputs.venue.value.trim() || 'Event venue',
      attendance, metroShare, riders, arrivals, rows, headway, gatePlan,
      peakRate: Math.max(...arrivals), rollingPeak, peakMinute, surgeStart: profile.surgeStart,
      surgeClose, surgeCount: profile.surgeCount, surgeEnabled, maxForecourt, maxConcourse,
      maxPlatform, boarded, remaining: Math.max(0, riders - boarded), trains, congestion,
      status: congestion >= 0.85 || rollingPeak > limits.maximumGates * limits.gateCapacityPerMinute ? 'critical'
        : congestion >= 0.5 || rollingPeak > 150 ? 'busy' : 'low',
      limits,
    };
    return simulation;
  }

  function fmtOffset(minute) {
    if (minute < 0) return `T${minute} min`;
    return `+${minute} min`;
  }

  function makeActionPlan(plan) {
    const { peakMinute, gatePlan, headway, surgeEnabled, surgeStart, maxForecourt, maxPlatform } = plan;
    const peakPrep = Math.max(0, peakMinute - 10);
    const actions = [
      { minute: -15, title: 'Brief the station team', detail: 'Assign a station lead, crowd marshals, security/police liaison and control-room contact. Confirm radio checks and keep entry/exit routes distinct.' },
      { minute: -5, title: 'Prepare the station before release', detail: `Set up for ${gatePlan} open ticket gates (of ${limits.maximumGates} demo gates). Keep all stair and lift landings clear; verify CCTV and passenger announcements.` },
      { minute: peakPrep, title: 'Stage the peak response', detail: `Position marshals at the forecourt and ticketing approach. Keep the designated outside holding area ready; meter entries to the rate station staff can safely accept.` },
    ];
    if (headway < limits.baseHeadway) actions.push({ minute: peakPrep, title: `Request event headway: ${headway} minutes`, detail: `Coordinate an additional service with train control from the peak window. This prototype assumes ${limits.trainCapacity} boarding spaces per train; confirm rolling-stock and timetable availability.` });
    else actions.push({ minute: peakPrep, title: 'Confirm train-service readiness', detail: 'Ask train control to monitor the event window and confirm the response path if platform queues begin to grow.' });
    if (surgeEnabled) actions.push({ minute: surgeStart, title: 'SURGE: meter the release', detail: `A sudden wave of ${fmt(plan.surgeCount)} modeled riders begins. Hold only in the designated forecourt, send passengers in controlled groups, and keep stairs, lifts, gate throats and platform edges clear.` });
    if (maxForecourt > 250) actions.push({ minute: Math.max(0, peakMinute - 2), urgent: maxForecourt > limits.forecourtCapacity * 0.75, title: 'Use the external holding area', detail: `Forecast peak outside queue is ${fmt(maxForecourt)}. Coordinate with venue staff to meter the walk-up flow; do not move a waiting queue onto stairs or platforms.` });
    if (maxPlatform > 450) actions.push({ minute: peakMinute, urgent: maxPlatform > limits.platformCapacity * 0.7, title: 'Protect platform capacity', detail: `Forecast peak modeled platform load is ${fmt(maxPlatform)}. Use the event train plan and pause/meter station entry if station control observes crowding beyond approved limits.` });
    actions.push({ minute: 25, title: 'Reassess with live observations', detail: 'Compare this forecast with staff reports and CCTV. Update the plan if the actual release curve, service pattern or station conditions differ.' });
    actions.push({ minute: limits.horizon, title: 'Stand down in stages', detail: 'Return gates and train frequency to normal only when the station lead confirms queues have cleared. Record actual counts and any intervention for the next event.' });
    const unique = new Map();
    actions.sort((a, b) => a.minute - b.minute).forEach((action) => {
      const key = `${action.minute}:${action.title}`;
      unique.set(key, action);
    });
    return [...unique.values()];
  }

  function setResponse(plan) {
    byId('response-caption').textContent = plan.surgeEnabled ? 'Sudden-release scenario · plan recalculated' : 'Baseline event forecast';
    byId('peak-rate').textContent = fmt(plan.rollingPeak);
    byId('riders-stat').textContent = fmt(plan.riders);
    byId('gate-recommendation').textContent = `${plan.gatePlan} of ${limits.maximumGates} gates`;
    const gatePeak = plan.rollingPeak > limits.maximumGates * limits.gateCapacityPerMinute
      ? `At least ${limits.maximumGates} open; demand exceeds demo gate capacity.`
      : `Open before peak at ${absoluteTime(Math.max(0, plan.peakMinute - 10))}; 58 people/min/gate assumed.`;
    byId('gate-detail').textContent = gatePeak;
    byId('train-recommendation').textContent = plan.headway < limits.baseHeadway ? `Add trains · ${plan.headway}-min headway` : 'Maintain 6-min headway';
    const extraCount = Math.max(0, Math.floor(limits.horizon / plan.headway) - Math.floor(limits.horizon / limits.baseHeadway));
    byId('train-detail').textContent = plan.headway < limits.baseHeadway
      ? `Request about ${extraCount} extra services in the 2-hour window.`
      : 'Keep event standby capacity available for dispatch.';
    byId('hold-recommendation').textContent = 'External forecourt only';
    byId('hold-detail').textContent = `Peak modeled queue ${fmt(plan.maxForecourt)} / ${fmt(limits.forecourtCapacity)} demo spaces. Meter access if pressure rises.`;
    const status = byId('density-status');
    status.classList.toggle('busy', plan.status === 'busy');
    status.classList.toggle('critical', plan.status === 'critical');
    status.querySelector('b').textContent = plan.status === 'critical' ? 'CAPACITY ALERT' : plan.status === 'busy' ? 'BUSY · MONITOR' : 'LOW DENSITY';
    byId('density-status').title = `Peak modeled zone load ratio: ${Math.round(plan.congestion * 100)}% of prototype thresholds`;
  }

  function actionTextForCurrentMinute(row) {
    const currentActions = [];
    if (row.gatesOpen >= limits.maximumGates) currentActions.push('all demo ticket gates open');
    else currentActions.push(`${row.gatesOpen} demo ticket gates open`);
    if (row.forecourt > 250) currentActions.push('meter entry at external holding area');
    if (row.trainArrives) currentActions.push(`train boards up to ${fmt(limits.trainCapacity)} modeled riders`);
    return currentActions.join(' · ');
  }

  function renderActions(plan) {
    const root = byId('action-plan');
    root.innerHTML = '';
    makeActionPlan(plan).forEach((action) => {
      const item = document.createElement('li');
      if (action.urgent) item.classList.add('urgent');
      const time = document.createElement('span'); time.className = 'action-time';
      time.textContent = `${absoluteTime(action.minute)} · ${fmtOffset(action.minute)}`;
      const text = document.createElement('div'); text.className = 'action-copy';
      text.innerHTML = `<b>${escapeHtml(action.title)}</b><br>${escapeHtml(action.detail)}`;
      item.append(time, text); root.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function makeAnnouncement(plan, language) {
    const gateCount = plan.gatePlan;
    const headway = plan.headway;
    const surge = plan.surgeEnabled;
    const messages = {
      en: `The ${plan.eventName} at ${plan.venue} has ended. Please use the ${gateCount} open ticket gates and follow staff directions to the marked outside waiting area if asked. Keep all stairs, lifts and platform edges clear. ${surge ? 'Please move in an orderly way; do not rush.' : ''} Event trains are planned every ${headway} minutes.`,
      hi: `${plan.venue} में कार्यक्रम समाप्त हो गया है। कृपया खुले ${gateCount} टिकट गेटों का उपयोग करें। आवश्यकता होने पर कर्मचारियों के निर्देशानुसार बाहर के चिह्नित प्रतीक्षा क्षेत्र में रुकें। सीढ़ियों, लिफ्ट और प्लेटफ़ॉर्म के किनारे खाली रखें। ${surge ? 'कृपया व्यवस्थित रूप से चलें, धक्का न दें।' : ''} विशेष ट्रेनें हर ${headway} मिनट पर नियोजित हैं।`,
      gu: `${plan.venue} ખાતે કાર્યક્રમ પૂર્ણ થયો છે. કૃપા કરીને ખુલ્લા ${gateCount} ટિકિટ ગેટનો ઉપયોગ કરો. જરૂર પડે તો કર્મચારીઓના સૂચન મુજબ બહારના નિર્ધારિત રાહ વિસ્તારનો ઉપયોગ કરો. સીડીઓ, લિફ્ટ અને પ્લેટફોર્મની કિનારી ખુલ્લી રાખો. ${surge ? 'કૃપા કરીને શાંતિથી આગળ વધો અને ધક્કામુક્કી ન કરો.' : ''} વિશેષ ટ્રેન દર ${headway} મિનિટે આયોજનમાં છે.`,
    };
    return messages[language] || messages.en;
  }

  function showAnnouncement() {
    document.querySelectorAll('.language-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.lang === activeLanguage));
    byId('announcement-text').textContent = makeAnnouncement(simulation, activeLanguage);
  }

  function renderMinuteLog(plan) {
    const body = byId('minute-log');
    if (!body) return;
    body.innerHTML = plan.rows.map((row) => `<tr data-minute="${row.minute}"><td>${absoluteTime(row.minute)}</td><td>+${row.minute}</td><td>${fmt(row.arrivals)}</td><td>${row.gatesOpen}/${limits.maximumGates}</td><td>${fmt(row.forecourt)}</td><td>${fmt(row.concourse)}</td><td>${fmt(row.platform1 + row.platform2)}</td><td>${row.trainArrives ? fmt(row.boardings) : '—'}</td><td>${escapeHtml(actionTextForCurrentMinute(row))}</td></tr>`).join('');
  }

  function drawChart() {
    const canvas = byId('arrival-chart');
    if (!canvas || !simulation) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const width = bounds.width, height = bounds.height;
    const left = 31, right = 8, top = 8, bottom = 22;
    const chartW = width - left - right, chartH = height - top - bottom;
    const maxValue = Math.max(10, ...simulation.arrivals) * 1.12;
    ctx.clearRect(0, 0, width, height);
    ctx.font = '8px Segoe UI, Arial';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
      const y = top + chartH * i / 3;
      ctx.strokeStyle = '#e9efed'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
      ctx.fillStyle = '#8a979d'; ctx.textAlign = 'right'; ctx.fillText(fmt(maxValue * (1 - i / 3)), left - 5, y);
    }
    const barW = chartW / simulation.arrivals.length;
    simulation.arrivals.forEach((value, minute) => {
      const barH = value / maxValue * chartH;
      const isSurge = simulation.surgeEnabled && minute >= simulation.surgeStart && minute <= simulation.surgeClose;
      ctx.fillStyle = isSurge ? '#e7a332' : '#426ee0';
      ctx.globalAlpha = minute === currentMinute ? 1 : 0.78;
      ctx.fillRect(left + minute * barW + 0.35, top + chartH - barH, Math.max(1.1, barW - 0.7), barH);
    });
    ctx.globalAlpha = 1;
    const markerX = left + currentMinute * barW + barW / 2;
    ctx.strokeStyle = '#203a4b'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(markerX, top); ctx.lineTo(markerX, top + chartH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#77868b'; ctx.textAlign = 'center';
    [0, 30, 60, 90, 120].forEach((minute) => ctx.fillText(`+${minute}m`, left + minute / 120 * chartW, height - 8));
    canvas.title = `Minute ${currentMinute}: ${fmt(simulation.arrivals[currentMinute])} expected arrivals`;
  }

  function updateAt(minute) {
    if (!simulation) return;
    currentMinute = clamp(Math.round(minute), 0, limits.horizon - 1);
    const row = simulation.rows[Math.min(currentMinute, limits.horizon - 1)];
    byId('minute-slider').value = currentMinute;
    byId('minute-label').textContent = `+${currentMinute} min`;
    byId('current-clock').textContent = absoluteTime(currentMinute);
    const maximumNow = Math.max(row.forecourt / limits.forecourtCapacity, row.concourse / limits.concourseCapacity, (row.platform1 + row.platform2) / limits.platformCapacity);
    const currentStatus = maximumNow >= .8 ? 'critical' : maximumNow >= .5 ? 'busy' : 'low';
    const badge = byId('density-status');
    badge.classList.toggle('busy', currentStatus === 'busy'); badge.classList.toggle('critical', currentStatus === 'critical');
    badge.querySelector('b').textContent = currentStatus === 'critical' ? 'CAPACITY ALERT' : currentStatus === 'busy' ? 'BUSY · MONITOR' : 'LOW DENSITY';
    if (window.MetroSafeMap) window.MetroSafeMap.setCrowdLoad({
      forecourt: row.forecourt, forecourtCapacity: limits.forecourtCapacity,
      concourse: row.concourse, concourseCapacity: limits.concourseCapacity,
      platform1: row.platform1, platform2: row.platform2, platformCapacity: limits.platformCapacity,
    });
    document.querySelectorAll('#minute-log tr').forEach((tr) => tr.classList.toggle('current-minute', Number(tr.dataset.minute) === currentMinute));
    drawChart();
  }

  function updateRiderEstimate() {
    const riders = Math.round((Number(inputs.attendance.value) || 0) * clamp(Number(inputs.share.value) || 0, 0, 100) / 100);
    byId('rider-estimate').textContent = fmt(riders);
  }

  function buildMethodGuide() {
    const sections = [
      ['1. Demand inputs', `<p><code>attendance × metro share</code> estimates the metro-bound crowd. For this one-station demo, every metro-bound rider is assigned to the modeled station; this is intentionally conservative and must be replaced by a station-specific share before any pilot.</p>`],
      ['2. Minute arrivals', `<p>The 120-minute baseline uses a normalized three-wave release curve (early, main and late departures). Every simulated minute sums to the estimated rider total. Surge mode moves 22% of riders from later minutes into one 10-minute pulse; it does not add attendees.</p>`],
      ['3. Queue and capacity model', `<p>Each minute adds arrivals to the outside forecourt queue. Ticket gates admit up to 58 people/minute/gate (2-8 demo gates); up to 220 people/minute can move through stairs; each modeled train boards up to 650. Concourse, platform and holding thresholds are demo placeholders, not official capacity values.</p>`],
      ['4. Recommendations', `<p>The largest 5-minute arrival rate sets a suggested event headway: 6 minutes below 175 people/minute, 4 minutes from 175, and 3 minutes from 300. Gates scale with peak rate. The runbook adds staff, holding and train actions around the predicted peak and surge time.</p>`],
      ['5. 3D crowd layer', `<p>The timeline slider selects a simulated minute. Forecourt, concourse and both platform floor patches change from green to amber to red at 50% and 80% of prototype thresholds. The map shows density zones, not individual people or sensor measurements.</p>`],
      ['6. Safety and limits', `<p>Never stage a queue on stairs, lifts, fare-gate throats or platform edges. A real operator must approve access control, holding location, capacity thresholds and train changes. This prototype has no live feeds, measured circulation geometry, crowd-dynamics validation or dispatch authority.</p><p>These blocked points reflect the Indian Metro Railway Disaster Management Manual's discussion of crowd-risk areas (entry/exit points, fare-gate areas, stairs/lifts and platforms). Its procedures are not a substitute for GMRC rules.</p>`],
    ];
    byId('method-content').innerHTML = sections.map(([title, body]) => `<section><h3>${title}</h3>${body}</section>`).join('');
  }

  function regenerate() {
    simulation = createSimulation();
    currentMinute = 0;
    updateRiderEstimate();
    byId('chart-riders').textContent = fmt(simulation.riders);
    byId('peak-time-label').textContent = `Peak window: ${absoluteTime(simulation.peakMinute)} · minute ${simulation.peakMinute}`;
    setResponse(simulation);
    renderActions(simulation);
    renderMinuteLog(simulation);
    showAnnouncement();
    updateAt(0);
    byId('surge-button').textContent = surgeEnabled ? 'Restore baseline plan' : 'Test 10-minute surge';
    byId('surge-button').classList.toggle('surge-active', surgeEnabled);
    byId('surge-minute-value').textContent = `+${inputs.surgeMinute.value} min`;
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); stopPlayback(); regenerate(); });
  [inputs.attendance, inputs.share].forEach((input) => input.addEventListener('input', updateRiderEstimate));
  inputs.surgeMinute.addEventListener('input', () => {
    byId('surge-minute-value').textContent = `+${inputs.surgeMinute.value} min`;
    if (surgeEnabled) regenerate();
  });
  byId('surge-button').addEventListener('click', () => { stopPlayback(); surgeEnabled = !surgeEnabled; regenerate(); });
  byId('minute-slider').addEventListener('input', (event) => updateAt(Number(event.target.value)));
  document.querySelector('.guide-more').addEventListener('click', () => { byId('simulation-method').open = true; });
  document.querySelectorAll('.language-tab').forEach((tab) => tab.addEventListener('click', () => { activeLanguage = tab.dataset.lang; showAnnouncement(); }));
  byId('copy-announcement').addEventListener('click', async () => {
    const text = byId('announcement-text').textContent;
    try {
      await navigator.clipboard.writeText(text);
      byId('copy-announcement').innerHTML = 'Copied <span>✓</span>';
    } catch {
      const temporary = document.createElement('textarea'); temporary.value = text; document.body.appendChild(temporary); temporary.select();
      const copied = document.execCommand('copy'); temporary.remove();
      byId('copy-announcement').innerHTML = copied ? 'Copied <span>✓</span>' : 'Select text to copy';
    }
    setTimeout(() => { byId('copy-announcement').innerHTML = 'Copy announcement <span>▢</span>'; }, 1600);
  });
  byId('play-button').addEventListener('click', () => {
    if (playback) { stopPlayback(); return; }
    byId('play-button').textContent = '❚❚';
    playback = window.setInterval(() => {
      if (currentMinute >= limits.horizon - 1) { stopPlayback(); return; }
      updateAt(currentMinute + 1);
    }, 120);
  });
  function stopPlayback() {
    if (playback) window.clearInterval(playback);
    playback = null;
    const playButton = byId('play-button');
    if (playButton) playButton.textContent = '▶';
  }
  byId('arrival-chart').addEventListener('click', (event) => {
    if (!simulation) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const left = 31, right = 8;
    const ratio = clamp((event.clientX - rect.left - left) / (rect.width - left - right), 0, 1);
    updateAt(Math.round(ratio * limits.horizon));
  });
  byId('arrival-chart').addEventListener('mousemove', (event) => {
    if (!simulation) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left - 31) / (rect.width - 39), 0, 1);
    chartHover = Math.round(ratio * (limits.horizon - 1));
    event.currentTarget.title = `+${chartHover} min · ${fmt(simulation.arrivals[chartHover])} expected arrivals`;
  });
  window.addEventListener('resize', drawChart);

  buildMethodGuide();
  updateRiderEstimate();
  regenerate();
})();
