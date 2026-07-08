import React, { useState, useRef, useEffect } from 'react';
import Mermaid from '@theme-original/Mermaid';

export default function MermaidWrapper(props) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [optimalHeight, setOptimalHeight] = useState(250); // Fallback height
  const dragStart = useRef({ x: 0, y: 0 });
  const hasInitializedScale = useRef(false);
  const maxZoomScale = Math.max(4, fitScale * 8);

  // Reset function
  const handleReset = () => {
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom In / Out handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, maxZoomScale));
  };
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, fitScale));
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale(prev => {
      const nextScale = prev + direction * zoomFactor;
      return Math.max(fitScale, Math.min(nextScale, maxZoomScale));
    });
  };

  const handleOpenLargeView = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    const popup = window.open('', '_blank', 'width=1200,height=900');
    if (!popup) return;
    popup.opener = null;

    const clonedSvg = svg.cloneNode(true);
    const viewBox = clonedSvg.getAttribute('viewBox');
    const [, , vbWidth = 1200, vbHeight = 800] = viewBox
      ? viewBox.split(/\s+/).map(Number)
      : [0, 0, 1200, 800];
    clonedSvg.setAttribute('width', String(vbWidth));
    clonedSvg.setAttribute('height', String(vbHeight));
    clonedSvg.style.width = `${vbWidth}px`;
    clonedSvg.style.height = `${vbHeight}px`;
    clonedSvg.style.maxWidth = 'none';

    popup.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>Mermaid Diagram</title>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: #f8fafc;
        overflow: hidden;
      }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .toolbar {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 10;
        display: flex;
        gap: 6px;
        padding: 6px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
        backdrop-filter: blur(6px);
      }
      button {
        width: 34px;
        height: 34px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        color: #4f46e5;
        font-size: 17px;
        font-weight: 800;
        cursor: pointer;
      }
      button:hover {
        background: #eef2ff;
      }
      .viewer {
        box-sizing: border-box;
        width: 100vw;
        height: 100vh;
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
        overflow: hidden;
      }
      .viewer.dragging {
        cursor: grabbing;
      }
      .canvas {
        transform-origin: center center;
        will-change: transform;
      }
      svg {
        max-width: none;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="toolbar" aria-label="Mermaid 확대 축소 도구">
      <button id="zoom-in" title="확대" type="button">+</button>
      <button id="zoom-out" title="축소" type="button">−</button>
      <button id="reset" title="화면에 맞춤" type="button">↺</button>
    </div>
    <div id="viewer" class="viewer">
      <div id="canvas" class="canvas">${clonedSvg.outerHTML}</div>
    </div>
    <script>
      const viewer = document.getElementById('viewer');
      const canvas = document.getElementById('canvas');
      const sourceWidth = ${JSON.stringify(vbWidth || 1200)};
      const sourceHeight = ${JSON.stringify(vbHeight || 800)};
      let fitScale = 1;
      let scale = 1;
      let x = 0;
      let y = 0;
      let dragging = false;
      let dragStartX = 0;
      let dragStartY = 0;

      function calculateFitScale() {
        const availableWidth = Math.max(window.innerWidth - 48, 320);
        const availableHeight = Math.max(window.innerHeight - 48, 240);
        fitScale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight, 1.6);
      }

      function applyTransform() {
        canvas.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
      }

      function resetView() {
        calculateFitScale();
        scale = fitScale;
        x = 0;
        y = 0;
        applyTransform();
      }

      function zoom(delta) {
        const maxScale = Math.max(5, fitScale * 10);
        scale = Math.max(fitScale * 0.4, Math.min(scale + delta, maxScale));
        applyTransform();
      }

      document.getElementById('zoom-in').addEventListener('click', () => zoom(0.2));
      document.getElementById('zoom-out').addEventListener('click', () => zoom(-0.2));
      document.getElementById('reset').addEventListener('click', resetView);

      viewer.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoom(event.deltaY < 0 ? 0.12 : -0.12);
      }, { passive: false });

      viewer.addEventListener('mousedown', (event) => {
        if (event.button !== 0 || event.target.tagName === 'BUTTON') return;
        dragging = true;
        viewer.classList.add('dragging');
        dragStartX = event.clientX - x;
        dragStartY = event.clientY - y;
      });

      window.addEventListener('mousemove', (event) => {
        if (!dragging) return;
        x = event.clientX - dragStartX;
        y = event.clientY - dragStartY;
        applyTransform();
      });

      window.addEventListener('mouseup', () => {
        dragging = false;
        viewer.classList.remove('dragging');
      });

      window.addEventListener('resize', resetView);
      resetView();
    </script>
  </body>
</html>`);
    popup.document.close();
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e) => {
    // Left click only
    if (e.button !== 0) return;
    
    // Check if the user is clicking a button to prevent drag triggering
    if (e.target.tagName === 'BUTTON') return;
    
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Prevent default scroll behavior inside the container when wheeling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', preventDefault, { passive: false });
    return () => {
      container.removeEventListener('wheel', preventDefault);
    };
  }, []);

  // Dynamically calculate the optimal height based on SVG viewBox aspect ratio
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const svg = container.querySelector('svg');
      if (!svg) return;

      const viewBox = svg.getAttribute('viewBox');
      const containerWidth = container.clientWidth || 800;
      const viewportWidth = Math.max(containerWidth - 24, 240);

      if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4) {
          const vbWidth = parts[2];
          const vbHeight = parts[3];

          if (!vbWidth || !vbHeight) return;

          svg.setAttribute('width', String(vbWidth));
          svg.setAttribute('height', String(vbHeight));
          svg.style.width = `${vbWidth}px`;
          svg.style.height = `${vbHeight}px`;
          svg.style.maxWidth = 'none';

          const maxViewportHeight = 620;
          const nextFitScale = Math.min(
            viewportWidth / vbWidth,
            maxViewportHeight / vbHeight,
            1.8
          );
          const calculatedHeight = Math.max(320, Math.min(vbHeight * nextFitScale + 48, 720));

          setFitScale(nextFitScale);
          setOptimalHeight(calculatedHeight);

          if (!hasInitializedScale.current) {
            hasInitializedScale.current = true;
            setScale(nextFitScale);
            setPosition({ x: 0, y: 0 });
          } else {
            setScale(prev => Math.max(prev, nextFitScale));
          }
        }
      } else {
        const rect = svg.getBoundingClientRect();
        if (rect.height > 0) {
          setOptimalHeight(Math.max(180, Math.min(rect.height, 650)));
        }
      }
    };

    // Calculate immediately and also observe DOM updates (Mermaid renders asynchronously)
    updateSize();

    const observer = new MutationObserver(updateSize);
    observer.observe(container, { childList: true, subtree: true });

    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        border: '1px solid var(--ifm-color-emphasis-200)',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '1.5rem 0',
        padding: '28px 10px 10px 10px',
        backgroundColor: 'var(--ifm-background-surface-color)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      {/* Zoom Control Buttons */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        display: 'flex',
        gap: '5px',
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(4px)',
        padding: '4px',
        borderRadius: '6px',
      }}>
        <button 
          onClick={handleZoomIn}
          style={buttonStyle}
          title="확대"
          type="button"
        >
          ➕
        </button>
        <button 
          onClick={handleZoomOut}
          style={buttonStyle}
          title="축소"
          type="button"
        >
          ➖
        </button>
        <button 
          onClick={handleReset}
          style={buttonStyle}
          title="초기화"
          type="button"
        >
          🔄
        </button>
        <button
          onClick={handleOpenLargeView}
          style={buttonStyle}
          title="새 창에서 크게 보기"
          type="button"
        >
          ⛶
        </button>
      </div>

      {/* SVG Container with dynamic height */}
      <div 
        className="mermaid-zoom-content"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: `${optimalHeight}px`,
          width: '100%'
        }}
        onWheel={handleWheel}
      >
        <Mermaid {...props} />
      </div>
    </div>
  );
}

const buttonStyle = {
  background: 'var(--ifm-background-color)',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: '4px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  transition: 'all 0.2s'
};
