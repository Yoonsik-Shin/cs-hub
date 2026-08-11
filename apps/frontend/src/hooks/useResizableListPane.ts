import { useState, type MouseEvent as ReactMouseEvent } from 'react';

export function useResizableListPane() {
  const [width, setWidth] = useState(300);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  const startResizing = (mouseDownEvent: ReactMouseEvent) => {
    mouseDownEvent.preventDefault();
    setResizing(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = width;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      setWidth(Math.max(300, Math.min(700, startWidth + mouseMoveEvent.clientX - startX)));
    };
    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { width, collapsed, resizing, setCollapsed, startResizing };
}
