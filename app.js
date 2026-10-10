(() => {
  const viewer = document.querySelector('#viewer');
  const markerRoot = document.querySelector('#exit-markers');
  const loading = document.querySelector('#loading');
  const levelButtons = [...document.querySelectorAll('.level-option')];
  const exitButtons = [...document.querySelectorAll('.exit-option')];
  const exits = [
    { id: 'A', name: 'North west', pos: [-7.2, 8.65, -6.7] },
    { id: 'B', name: 'North east', pos: [7.2, 8.65, -6.7] },
    { id: 'C', name: 'South west', pos: [-7.2, 8.65, 6.7] },
    { id: 'D', name: 'South east', pos: [7.2, 8.65, 6.7] },
  ];
  const featureTags = [
    { label: 'STATION CANOPY', pos: [0, 10.15, 0], level: 'surface' },
    { label: 'FORECOURT HOLDING AREA', pos: [0, 8.55, 12], level: 'surface' },
    { label: 'TICKETING · FARE GATES', pos: [0, 5.9, -1.15], level: 'concourse' },
    { label: 'CONCOURSE QUEUE', pos: [0, 5.35, 6.2], level: 'concourse' },
    { label: 'STAIRS TO PLATFORM', pos: [-4.45, 3.0, 0.15], level: 'concourse' },
    { label: 'STAIRS TO PLATFORM', pos: [4.45, 3.0, 0.15], level: 'concourse' },
    { label: 'LIFT', pos: [-6.5, 5.85, 0], level: 'concourse' },
    { label: 'LIFT', pos: [6.5, 5.85, 0], level: 'concourse' },
    { label: 'WAITING AREA · PLATFORM 1', pos: [-5.05, 0.1, 6.2], level: 'platform' },
    { label: 'WAITING AREA · PLATFORM 2', pos: [5.05, 0.1, 6.2], level: 'platform' },
    { label: 'PLATFORM 1', pos: [-5.05, 0.2, -11.2], level: 'platform' },
    { label: 'PLATFORM 2', pos: [5.05, 0.2, -11.2], level: 'platform' },
    { label: 'TRACK 1', pos: [-1.67, -0.4, 10.5], level: 'platform' },
    { label: 'TRACK 2', pos: [1.67, -0.4, 10.5], level: 'platform' },
  ];
  const THREE = window.THREE;
  let renderer, scene, camera, root, groups, train, clock;
  let radius = 41, theta = Math.PI / 4, phi = 1.08;
  let target = THREE ? new THREE.Vector3(0, 3.8, 0) : null;
  let pointer = null, activeLevel = 'all', selectedExit = null;
  const markers = new Map();
  let featureElements = [];
  let crowdSurfaces = null;
  const mats = {};

  if (!THREE) {
    loading.textContent = 'The bundled 3D library is missing. Keep the vendor folder beside index.html and reload.';
    return;
  }

  const material = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04, ...opts });
  mats.concrete = material('#aab8bc');
  mats.concreteDark = material('#7e9098');
  mats.platform = material('#315a75');
  mats.platformTop = material('#adc4d0');
  mats.concourse = material('#aa8754');
  mats.concourseTop = material('#e8d8b9');
  mats.gold = material('#d98622');
  mats.goldLight = material('#ffc653');
  mats.track = material('#26343b');
  mats.rail = material('#9faeb0', { metalness: 0.68, roughness: 0.34 });
  mats.white = material('#e9eff0');
  mats.glass = material('#65b7c2', { transparent: true, opacity: 0.38, roughness: 0.25, metalness: 0.1 });
  mats.train = material('#e9f3f0');
  mats.blue = material('#557aed');
  mats.dark = material('#40515a');
  mats.ground = material('#cbd6d0');
  mats.surface = material('#788995', { transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });

  function box(parent, x, y, z, w, h, d, mat, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, x, y, z, r, h, mat, sides = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function groupAt(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3f0');
    scene.fog = new THREE.Fog('#edf3f0', 62, 125);
    const aspect = viewer.clientWidth / viewer.clientHeight;
    camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 180);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    viewer.insertBefore(renderer.domElement, markerRoot);

    scene.add(new THREE.HemisphereLight('#ffffff', '#71858b', 1.0));
    const sun = new THREE.DirectionalLight('#fff4df', 1.25);
    sun.position.set(-18, 32, 22); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#c9d8ff', 0.32); fill.position.set(22, 12, -22); scene.add(fill);

    root = new THREE.Group(); scene.add(root);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 80), mats.ground);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2.65; ground.receiveShadow = true; root.add(ground);
    const pad = box(root, 0, -2.43, 0, 28, 0.24, 39, mats.white, { cast: false });
    pad.material = material('#eaf0ed');
    // Platform level: twin side platforms, twin tracks, columns and a train.
    const platform = new THREE.Group(); root.add(platform);
    box(platform, -5.05, -0.76, 0, 3.8, 0.52, 28, mats.platform);
    box(platform, 5.05, -0.76, 0, 3.8, 0.52, 28, mats.platform);
    box(platform, -5.05, -0.475, 0, 3.55, 0.055, 27.7, mats.platformTop, { cast: false });
    box(platform, 5.05, -0.475, 0, 3.55, 0.055, 27.7, mats.platformTop, { cast: false });
    for (const side of [-1, 1]) {
      box(platform, side * 3.12, -0.43, 0, 0.2, 0.05, 27.7, mats.goldLight, { cast: false });
      box(platform, side * 1.67, -1.1, 0, 0.72, 0.55, 28, mats.track);
      for (const rx of [side * 1.94, side * 1.40]) box(platform, rx, -0.79, 0, 0.08, 0.14, 27.8, mats.rail, { cast: false });
    }
    for (let z = -12.8; z <= 12.8; z += 1.15) for (const x of [-1.94, -1.4, 1.4, 1.94]) box(platform, x, -0.94, z, 0.12, 0.12, 0.77, mats.concreteDark, { cast: false });
    for (const z of [-10, -5, 0, 5, 10]) {
      for (const x of [-6.65, 6.65]) {
        cylinder(platform, x, 0.35, z, 0.2, 1.65, mats.white);
        cylinder(platform, x, 1.22, z, 0.27, 0.1, mats.goldLight);
      }
      for (const x of [-5.9, 5.9]) {
        box(platform, x, -0.05, z + 1.35, 1.15, 0.13, 0.42, mats.dark);
        box(platform, x, 0.05, z + 1.35, 1.05, 0.08, 0.37, mats.concreteDark);
      }
    }
    // Arrival information signs along each platform.
    for (const [x, z, label] of [[-5.05, -8.2, '1'], [5.05, 8.2, '2']]) {
      box(platform, x, 1.4, z, 0.12, 0.92, 0.1, mats.dark);
      box(platform, x, 1.94, z, 1.05, 0.48, 0.12, mats.blue);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.33, 0.02), material('#dce6ff', { emissive: '#263f95', emissiveIntensity: 0.28 }));
      sign.position.set(x, 1.94, z + 0.075); platform.add(sign);
    }
    train = groupAt(platform, 1.4, 0, -6);
    box(train, 0, 0.65, 0, 1.28, 1.26, 7.8, mats.train);
    box(train, 0, 1.3, 0, 1.12, 0.15, 7.6, mats.blue);
    box(train, 0, 0.23, 0, 1.32, 0.18, 7.2, mats.dark);
    for (const side of [-1, 1]) {
      box(train, side * 0.654, 0.8, 0, 0.025, 0.55, 6.2, mats.glass, { cast: false });
      for (let z = -2.6; z <= 2.61; z += 1.3) cylinder(train, side * 0.5, 0.08, z, 0.18, 0.12, mats.dark, 10).rotation.z = Math.PI / 2;
    }
    // Concourse level and circulation core.
    const concourse = new THREE.Group(); root.add(concourse);
    box(concourse, 0, 4.1, 0, 16.5, 0.46, 19, mats.concourse);
    box(concourse, 0, 4.35, 0, 16.1, 0.06, 18.6, mats.concourseTop, { cast: false });
    for (const x of [-7.95, 7.95]) box(concourse, x, 5.08, 0, 0.36, 1.55, 18.3, mats.concrete);
    for (const z of [-9.1, 9.1]) box(concourse, 0, 5.08, z, 16, 1.55, 0.36, mats.concrete);
    for (const x of [-6.5, 6.5]) for (const z of [-7.2, 0, 7.2]) {
      cylinder(concourse, x, 5.05, z, 0.24, 1.4, mats.white);
      cylinder(concourse, x, 5.78, z, 0.31, 0.11, mats.goldLight);
    }
    // Ticket hall / fare gates.
    box(concourse, 0, 4.9, -1.15, 6.2, 0.95, 3.0, material('#edf4f0'));
    box(concourse, 0, 5.42, -1.15, 6.5, 0.11, 3.2, mats.concourse);
    for (let x = -2.3; x <= 2.31; x += 1.15) {
      box(concourse, x, 4.78, 1.7, 0.22, 0.82, 0.62, mats.dark);
      box(concourse, x, 5.22, 1.7, 0.1, 0.035, 0.42, mats.goldLight, { cast: false });
    }
    // Clearly visible accessible lifts at both station levels.
    for (const x of [-6.5, 6.5]) {
      box(concourse, x, 5.06, 0, 1.35, 1.45, 1.55, mats.glass, { cast: false });
      box(concourse, x, 4.82, 0, 0.94, 0.82, 1.08, material('#28a7b4'));
      box(concourse, x, 5.06, 0.8, 0.74, 1.08, 0.06, mats.blue, { cast: false });
      box(platform, x, 0.25, 0, 1.35, 1.45, 1.55, mats.glass, { cast: false });
      box(platform, x, 0.02, 0, 0.94, 0.82, 1.08, material('#28a7b4'));
      box(platform, x, 0.25, 0.8, 0.74, 1.08, 0.06, mats.blue, { cast: false });
    }
    // Open stair cores from the concourse to both side platforms.
    for (const side of [-1, 1]) {
      const x = side * 4.45;
      box(concourse, x, 2.26, 0.15, 2.0, 0.12, 5.2, mats.goldLight);
      for (let i = 0; i < 12; i++) box(concourse, x, 1.22 + i * 0.17, -2.25 + i * 0.4, 1.75, 0.09, 0.36, i % 2 ? mats.gold : mats.goldLight);
      for (const dx of [-0.96, 0.96]) cylinder(concourse, x + dx, 2.0, 0.15, 0.045, 2.4, mats.dark, 8);
    }
    // Surface access and station canopy. An intentionally open top keeps the model readable.
    const surface = new THREE.Group(); root.add(surface);
    const road = box(surface, 0, 8.1, 0, 28, 0.34, 36, mats.surface, { cast: false });
    road.material.side = THREE.DoubleSide;
    for (const z of [-16, 16]) {
      box(surface, 0, 8.3, z, 29, 0.04, 0.12, mats.goldLight, { cast: false });
      for (let x = -12; x <= 12; x += 2) box(surface, x, 8.32, z, 0.08, 0.05, 0.38, mats.white, { cast: false });
    }
    box(surface, 0, 9.35, 0, 9.4, 0.25, 7.6, mats.concreteDark);
    for (const x of [-4.3, 4.3]) for (const z of [-3.4, 3.4]) box(surface, x, 8.83, z, 0.22, 0.88, 0.22, mats.dark);
    const canopy = box(surface, 0, 9.89, 0, 10, 0.18, 8.2, mats.white);
    canopy.material = material('#f8fbf8', { transparent: true, opacity: 0.78 });
    for (const side of [-1, 1]) box(surface, side * 5.05, 9.53, 0, 0.15, 0.68, 8, mats.glass, { cast: false });
    // Four stair runs link the surface entrances to the concourse level.
    const stairData = exits;
    stairData.forEach((exit) => {
      const [x, , z] = exit.pos;
      box(surface, x, 6.19, z, 2.25, 0.12, 3.2, mats.goldLight);
      for (let i = 0; i < 12; i++) {
        const t = i / 11;
        box(surface, x, 4.65 + t * 3.1, z + (z < 0 ? 1 : -1) * (1.32 - t * 2.64), 1.95, 0.095, 0.26, i % 2 ? mats.gold : mats.goldLight);
      }
      for (const dx of [-1.08, 1.08]) cylinder(surface, x + dx, 6.0, z, 0.04, 3.7, mats.dark, 8);
      // Exit landing surrounds its stair opening.
      box(surface, x, 8.35, z, 2.9, 0.1, 3.7, mats.concreteDark, { cast: false });
      box(surface, x, 8.42, z, 2.48, 0.09, 3.24, mats.goldLight, { cast: false });
      box(surface, x, 8.5, z, 2.15, 0.1, 2.9, mats.dark, { cast: false });
      // Keep the nearest overlying street deck open above the stairwell.
      const cut = box(surface, x, 8.57, z, 2.05, 0.07, 2.8, mats.ground, { cast: false });
      cut.material = material('#edf3f0', { transparent: true, opacity: 0.05, side: THREE.DoubleSide });
    });
    // Visual level plates create a clear exploded axonometric reading.
    for (const [y, width, depth, mat] of [[3.82, 17, 19.5, mats.concreteDark], [-1.04, 12.8, 29, mats.concreteDark]]) {
      const rim = box(root, 0, y, 0, width, 0.12, depth, mat, { cast: false });
      rim.material = material(mat.color, { transparent: true, opacity: 0.12, depthWrite: false });
    }
    // Tiny entry pavilions sit beside each clearly marked exit.
    exits.forEach((exit) => {
      const [x, , z] = exit.pos;
      const sign = box(surface, x, 9.03, z + (z < 0 ? -1.75 : 1.75), 1.05, 0.12, 0.16, mats.blue);
      const light = new THREE.PointLight('#87a3ff', 0.3, 4); light.position.set(x, 9.7, z); surface.add(light);
    });

    const heatSurfaceMaterial = () => new THREE.MeshBasicMaterial({
      color: '#38a875', transparent: true, opacity: 0.58, depthWrite: false,
      side: THREE.DoubleSide,
    });
    crowdSurfaces = {
      forecourt: box(surface, 0, 8.31, 12, 13, 0.035, 5, heatSurfaceMaterial(), { cast: false }),
      concourse: box(concourse, 0, 4.405, 6.2, 9.2, 0.025, 4.4, heatSurfaceMaterial(), { cast: false }),
      platform1: box(platform, -5.05, -0.43, 0, 3.35, 0.025, 21, heatSurfaceMaterial(), { cast: false }),
      platform2: box(platform, 5.05, -0.43, 0, 3.35, 0.025, 21, heatSurfaceMaterial(), { cast: false }),
    };

    groups = { surface, concourse, platform };
    exits.forEach((exit) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'exit-marker'; button.dataset.exit = exit.id;
      button.setAttribute('aria-label', `Exit ${exit.id}, ${exit.name}`);
      button.innerHTML = `<span class="marker-pin"><span>${exit.id}</span></span><span class="marker-label">EXIT ${exit.id}</span>`;
      button.addEventListener('click', () => selectExit(exit.id));
      markerRoot.appendChild(button); markers.set(exit.id, button);
    });
    featureElements = featureTags.map((feature) => {
      const label = document.createElement('span');
      label.className = `feature-marker ${feature.level}-tag${feature.label === 'LIFT' ? ' lift-tag' : ''}`;
      label.textContent = feature.label;
      markerRoot.appendChild(label);
      return { ...feature, element: label };
    });
    clock = new THREE.Clock();
    setCamera();
    loading.classList.add('hidden');
    animate();
  } catch (error) {
    console.error('MetroSafe model failed:', error);
    loading.textContent = 'This device could not start the 3D view. Try a browser with WebGL enabled.';
  }

  function setCamera() {
    if (!camera) return;
    const sinPhi = Math.sin(phi);
    camera.position.set(
      target.x + radius * sinPhi * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sinPhi * Math.cos(theta),
    );
    camera.lookAt(target);
  }

  function updateMarkers() {
    if (!camera) return;
    const w = viewer.clientWidth, h = viewer.clientHeight;
    exits.forEach((exit) => {
      const el = markers.get(exit.id);
      const v = new THREE.Vector3(...exit.pos).project(camera);
      const visible = v.z > -1 && v.z < 1;
      el.style.display = visible ? 'flex' : 'none';
      if (visible) {
        el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
        el.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      }
    });
    featureElements.forEach((feature) => {
      const el = feature.element;
      const v = new THREE.Vector3(...feature.pos).project(camera);
      const onActiveLevel = activeLevel === 'all' || activeLevel === feature.level;
      const visible = onActiveLevel && v.z > -1 && v.z < 1;
      el.style.display = visible ? 'block' : 'none';
      if (visible) {
        el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
        el.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      }
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer) return;
    const elapsed = clock.getElapsedTime();
    if (train) train.position.z = -6 + Math.sin(elapsed * 0.22) * 5.6;
    renderer.render(scene, camera);
    updateMarkers();
  }

  function showLevel(level) {
    activeLevel = level;
    levelButtons.forEach((btn) => btn.classList.toggle('selected', btn.dataset.level === level));
    if (!groups) return;
    if (level === 'all') {
      groups.surface.visible = groups.concourse.visible = groups.platform.visible = true;
      target.set(0, 3.8, 0); radius = 41; theta = Math.PI / 4; phi = 1.08;
    } else {
      groups.surface.visible = level === 'surface';
      groups.concourse.visible = level === 'concourse';
      groups.platform.visible = level === 'platform';
      target.set(0, level === 'surface' ? 8.8 : level === 'concourse' ? 4.5 : 0, 0);
      radius = level === 'surface' ? 27 : 25; theta = Math.PI / 4; phi = 0.86;
    }
    selectedExit = null;
    syncExitSelection(); setCamera();
  }
  function selectExit(id) {
    const exit = exits.find((item) => item.id === id);
    if (!exit) return;
    selectedExit = id;
    showLevel('all');
    selectedExit = id;
    target.set(exit.pos[0] * 0.48, 5.4, exit.pos[2] * 0.58);
    radius = 24; theta = exit.pos[0] < 0 ? -0.55 : 0.55; phi = 0.94;
    setCamera(); syncExitSelection();
  }
  function syncExitSelection() {
    exitButtons.forEach((btn) => btn.classList.toggle('selected', btn.dataset.exit === selectedExit));
    markers.forEach((btn, id) => btn.classList.toggle('selected', id === selectedExit));
  }

  levelButtons.forEach((button) => button.addEventListener('click', () => showLevel(button.dataset.level)));
  exitButtons.forEach((button) => button.addEventListener('click', () => selectExit(button.dataset.exit)));
  document.querySelector('#reset-view').addEventListener('click', () => showLevel(activeLevel === 'all' ? 'all' : activeLevel));
  viewer.addEventListener('pointerdown', (event) => { pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; viewer.setPointerCapture(event.pointerId); });
  viewer.addEventListener('pointermove', (event) => {
    if (!pointer || !camera || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    theta -= dx * 0.008; phi = Math.max(0.28, Math.min(1.48, phi + dy * 0.006)); setCamera();
  });
  const releasePointer = () => { pointer = null; };
  viewer.addEventListener('pointerup', releasePointer); viewer.addEventListener('pointercancel', releasePointer);
  viewer.addEventListener('wheel', (event) => { event.preventDefault(); radius = Math.max(17, Math.min(72, radius + event.deltaY * 0.035)); setCamera(); }, { passive: false });
  window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = viewer.clientWidth / viewer.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  });
  window.MetroSafeMap = {
    setCrowdLoad(loads) {
      if (!crowdSurfaces) return;
      const zones = {
        forecourt: [loads.forecourt || 0, loads.forecourtCapacity || 1],
        concourse: [loads.concourse || 0, loads.concourseCapacity || 1],
        platform1: [loads.platform1 || 0, loads.platformCapacity || 1],
        platform2: [loads.platform2 || 0, loads.platformCapacity || 1],
      };
      Object.entries(zones).forEach(([name, [count, capacity]]) => {
        const ratio = count / capacity;
        const color = ratio >= 0.8 ? '#d94f49' : ratio >= 0.5 ? '#e9a332' : '#38a875';
        crowdSurfaces[name].material.color.set(color);
      });
    },
  };
})();




