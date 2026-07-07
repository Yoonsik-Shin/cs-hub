import React, { useState, useRef, useEffect } from 'react';
import Mermaid from '@theme-original/Mermaid';

export default function MermaidWrapper(props) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [optimalHeight, setOptimalHeight] = useState(250); // Fallback height
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset function
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom In / Out handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.15, 3));
  };
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.15, 0.5));
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale(prev => {
      const nextScale = prev + direction * zoomFactor;
      return Math.max(0.5, Math.min(nextScale, 3));
    });
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

      if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4) {
          const vbWidth = parts[2];
          const vbHeight = parts[3];

          // Calculate height proportional to the content's actual aspect ratio
          const scaleRatio = Math.min(containerWidth / vbWidth, 1);
          let calculatedHeight = vbHeight * scaleRatio;

          // Impose reasonable min/max viewport limits
          calculatedHeight = Math.max(180, Math.min(calculatedHeight, 650));
          setOptimalHeight(calculatedHeight);
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
      </div>

      {/* SVG Container with dynamic height */}
      <div 
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
