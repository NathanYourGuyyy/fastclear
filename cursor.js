(function () {
  var supportsCustomCursor = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  );
  if (!supportsCustomCursor.matches) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  var dot = document.createElement('div');
  var ring = document.createElement('div');
  var x = 0;
  var y = 0;
  var ringX = 0;
  var ringY = 0;
  var scale = 1;
  var targetScale = 1;
  var hovering = false;
  var pressed = false;
  var hasPosition = false;

  dot.className = 'custom-cursor-dot';
  ring.className = 'custom-cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  root.appendChild(dot);
  root.appendChild(ring);
  root.classList.add('custom-cursor-active');

  function isInteractive(target) {
    return target instanceof Element && Boolean(
      target.closest('a, button, input, textarea, select, [role="button"]')
    );
  }

  function setPosition(element, left, top, size) {
    element.style.transform =
      'translate3d(' + left + 'px, ' + top + 'px, 0) translate(-50%, -50%) scale(' + size + ')';
  }

  function animate() {
    if (hasPosition) {
      var easing = reduceMotion.matches ? 1 : 0.15;
      ringX += (x - ringX) * easing;
      ringY += (y - ringY) * easing;
      scale += (targetScale - scale) * (reduceMotion.matches ? 1 : 0.2);
      setPosition(ring, ringX, ringY, scale);
    }
    requestAnimationFrame(animate);
  }

  document.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse') return;

    x = event.clientX;
    y = event.clientY;
    if (!hasPosition) {
      ringX = x;
      ringY = y;
      hasPosition = true;
    }

    setPosition(dot, x, y, 1);
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');

    hovering = isInteractive(event.target);
    ring.classList.toggle('is-hovering', hovering);
    targetScale = pressed ? 0.7 : hovering ? 1.6 : 1;
  });

  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'mouse') return;

    pressed = true;
    targetScale = 0.7;
    if (reduceMotion.matches) return;

    var ripple = document.createElement('div');
    ripple.className = 'custom-cursor-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    setPosition(ripple, event.clientX, event.clientY, 1);
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', function () {
      ripple.remove();
    }, { once: true });
  });

  document.addEventListener('pointerup', function (event) {
    if (event.pointerType !== 'mouse') return;

    pressed = false;
    targetScale = hovering ? 1.6 : 1;
  });

  document.addEventListener('pointerover', function (event) {
    if (event.pointerType === 'mouse') {
      hovering = isInteractive(event.target);
      ring.classList.toggle('is-hovering', hovering);
      targetScale = pressed ? 0.7 : hovering ? 1.6 : 1;
    }
  });

  window.addEventListener('pointerout', function (event) {
    if (event.pointerType === 'mouse' && event.relatedTarget === null) {
      dot.classList.remove('is-visible');
      ring.classList.remove('is-visible');
    }
  });

  window.addEventListener('pointerover', function (event) {
    if (event.pointerType === 'mouse' && hasPosition) {
      dot.classList.add('is-visible');
      ring.classList.add('is-visible');
    }
  });

  requestAnimationFrame(animate);
})();
