const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion) {
  revealItems.forEach((el) => el.classList.add("in-view"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((el) => observer.observe(el));
}

const turntable = document.querySelector(".turntable");
const overlay = document.querySelector(".stage-overlay");
const hint = document.querySelector(".stage-hint");
const stageCanvas = document.querySelector(".stage-canvas");

if (turntable && overlay) {
  const frames = Array.from(turntable.querySelectorAll("img"));
  const frameCount = frames.length;
  let loaded = 0;
  let currentIndex = 0;
  let frameFloat = 0;
  let isDragging = false;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let autoDelayUntil = 0;
  const autoSpeed = reduceMotion ? 0 : 0.0006;

  const normalizeIndex = (value) => {
    const wrapped = ((value % frameCount) + frameCount) % frameCount;
    return wrapped;
  };

  const setFrame = (index) => {
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
    });
  };

  const updateFrameFromFloat = () => {
    const nextIndex = normalizeIndex(Math.round(frameFloat));
    if (nextIndex !== currentIndex) {
      currentIndex = nextIndex;
      setFrame(currentIndex);
    }
  };

  const getStep = () => {
    const width = turntable.clientWidth || 500;
    return Math.max(18, width / frameCount / 1.6);
  };

  const updateOverlay = () => {
    if (!overlay) return;
    if (loaded >= frameCount) {
      overlay.classList.add("is-loaded");
    } else {
      const loadingText = overlay.querySelector(".stage-loading-text");
      if (loadingText) {
        loadingText.textContent = `3D ვიზუალი იტვირთება... (${loaded}/${frameCount})`;
      }
    }
  };

  frames.forEach((frame) => {
    if (frame.complete) {
      loaded += 1;
    } else {
      frame.addEventListener("load", () => {
        loaded += 1;
        updateOverlay();
      });
    }
  });

  updateOverlay();

  const pointerDown = (event) => {
    isDragging = true;
    turntable.classList.add("is-dragging");
    lastX = event.clientX;
    lastTime = event.timeStamp || performance.now();
    velocity = 0;
    autoDelayUntil = performance.now() + 2500;
    turntable.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - lastX;
    const now = event.timeStamp || performance.now();
    const deltaTime = Math.max(10, now - lastTime);
    lastX = event.clientX;
    lastTime = now;

    const frameDelta = deltaX / getStep();
    frameFloat += frameDelta;
    updateFrameFromFloat();

    const instantVelocity = frameDelta / deltaTime;
    velocity = velocity * 0.7 + instantVelocity * 0.3;
  };

  const pointerUp = (event) => {
    if (!isDragging) return;
    isDragging = false;
    turntable.classList.remove("is-dragging");
    if (event && event.pointerId != null) {
      try {
        turntable.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore.
      }
    }
  };

  turntable.addEventListener("pointerdown", pointerDown);
  turntable.addEventListener("pointerup", pointerUp);
  turntable.addEventListener("pointercancel", pointerUp);
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", pointerUp);

  let lastTick = performance.now();
  const tick = (now) => {
    const delta = now - lastTick;
    lastTick = now;

    if (!isDragging) {
      if (Math.abs(velocity) > 0.0001 && !reduceMotion) {
        frameFloat += velocity * delta;
        velocity *= 0.92;
        updateFrameFromFloat();
        autoDelayUntil = now + 2000;
      } else if (!reduceMotion && now > autoDelayUntil && autoSpeed > 0) {
        frameFloat += autoSpeed * delta;
        updateFrameFromFloat();
      }
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

if (hint && stageCanvas) {
  stageCanvas.addEventListener(
    "pointerdown",
    () => {
      hint.classList.add("is-hidden");
    },
    { once: true }
  );

  stageCanvas.addEventListener("pointermove", (event) => {
    const rect = stageCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    stageCanvas.style.setProperty("--spot-x", `${x}%`);
    stageCanvas.style.setProperty("--spot-y", `${y}%`);
  });

  stageCanvas.addEventListener("pointerleave", () => {
    stageCanvas.style.setProperty("--spot-x", "35%");
    stageCanvas.style.setProperty("--spot-y", "22%");
  });
}
