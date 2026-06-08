import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Download, Image as ImageIcon } from 'lucide-react';

interface SchematicViewerProps {
  children: React.ReactNode;
  svgWidth: number;
  svgHeight: number;
  fileName?: string;
}

export const SchematicViewer: React.FC<SchematicViewerProps> = ({
  children,
  svgWidth,
  svgHeight,
  fileName = 'circuit-schematic',
}) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Calculate pan bounds dynamically based on zoom level
  const calculatePanBounds = useCallback((zoomLevel: number) => {
    const scale = zoomLevel / 100;
    const containerWidth = svgContainerRef.current?.clientWidth || 500;
    const containerHeight = svgContainerRef.current?.clientHeight || 500;
    
    const scaledWidth = svgWidth * scale;
    const scaledHeight = svgHeight * scale;
    
    // Allow panning to show all edges of the schematic
    const maxPanX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerHeight) / 2);
    
    return { maxPanX, maxPanY };
  }, [svgWidth, svgHeight]);

  // Reset view to original state
  const handleResetView = useCallback(() => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
  }, []);

  // Zoom in
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 20, 300));
  }, []);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 20, 50));
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!svgContainerRef.current) return;
      
      e.preventDefault();
      const delta = e.deltaY > 0 ? -20 : 20;
      setZoom((prev) => Math.max(50, Math.min(300, prev + delta)));
    },
    []
  );

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  }, [panX, panY]);

  // Pan move with improved bounds calculation
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanning) return;

      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;

      // Get dynamic bounds based on current zoom
      const { maxPanX, maxPanY } = calculatePanBounds(zoom);

      // Constrain pan within bounds
      setPanX(Math.max(-maxPanX, Math.min(maxPanX, newPanX)));
      setPanY(Math.max(-maxPanY, Math.min(maxPanY, newPanY)));
    },
    [isPanning, panStart, zoom, calculatePanBounds]
  );

  // Pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Add wheel listener
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Export as PNG
  const handleExportPNG = useCallback(async () => {
    if (!svgRef.current) return;

    try {
      const svg = svgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas size with high DPI for better quality
      const dpi = 2;
      canvas.width = svgWidth * dpi;
      canvas.height = svgHeight * dpi;
      ctx.scale(dpi, dpi);

      // Get SVG as string
      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        // Fill background with dark color to match theme
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        ctx.drawImage(img, 0, 0);

        // Download
        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${fileName}.png`;
          link.click();
          URL.revokeObjectURL(downloadUrl);
        }, 'image/png');

        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  }, [svgWidth, svgHeight, fileName]);

  // Export as SVG
  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;

    try {
      const svg = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.svg`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting SVG:', error);
    }
  }, [fileName]);

  return (
    <div
      ref={svgContainerRef}
      className="relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800"
      style={{ height: '500px', userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG Container with transform */}
      <div
        className="flex items-center justify-center w-full h-full"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100})`,
          transformOrigin: 'center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          cursor: isPanning ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: svgWidth,
            height: svgHeight,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {children}
        </svg>
      </div>

      {/* Control Panel - Top Right */}
      <div 
        className="absolute top-3 right-3 flex flex-col gap-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-lg"
        style={{ userSelect: 'none' }}
      >
        {/* Zoom Controls */}
        <div className="flex gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
            title="Zoom Out (−)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          {/* Zoom Percentage Display */}
          <div className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-800/50 rounded border border-gray-700 min-w-[3rem] text-center">
            {zoom}%
          </div>

          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-700" />

        {/* Reset Button */}
        <button
          onClick={handleResetView}
          className="px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors whitespace-nowrap"
          title="Reset View"
          aria-label="Reset View"
        >
          Reset
        </button>

        {/* Divider */}
        <div className="h-px bg-gray-700" />

        {/* Export Buttons */}
        <button
          onClick={handleExportPNG}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200 flex items-center gap-2"
          title="Download as PNG"
          aria-label="Download as PNG"
        >
          <ImageIcon size={16} />
          <span className="text-xs font-medium">PNG</span>
        </button>

        <button
          onClick={handleExportSVG}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200 flex items-center gap-2"
          title="Download as SVG"
          aria-label="Download as SVG"
        >
          <Download size={16} />
          <span className="text-xs font-medium">SVG</span>
        </button>
      </div>

      {/* Pan Hint */}
      {zoom > 100 && (
        <div 
          className="absolute bottom-3 left-3 text-xs text-gray-600 bg-gray-900/80 px-2 py-1 rounded border border-gray-700"
          style={{ userSelect: 'none' }}
        >
          Drag to pan
        </div>
      )}
    </div>
  );
};

export default SchematicViewer;
