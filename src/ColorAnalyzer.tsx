import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Plus, X, Check } from "lucide-react";

interface ColorAnalyzerProps {
  initialImageUrl?: string;
  onColorsSelected?: (colors: string[]) => void;
  onClose?: () => void;
}

interface Selection {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColorInfo {
  hex: string;
  count: number;
  percentage: string;
}

const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ 
  initialImageUrl,
  onColorsSelected,
  onClose 
}) => {
  const [colors, setColors] = useState<ColorInfo[]>([]);
  const [selectedColors, setSelectedColors] = useState<ColorInfo[]>([]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [activeSelection, setActiveSelection] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getColorFromRGB = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Calculate color difference using weighted Euclidean distance
  interface ColorMap {
    [key: string]: number;
  }

  const getColorDistance = (color1: string, color2: string): number => {
    const [r1, g1, b1] = color1.split(',').map(Number);
    const [r2, g2, b2] = color2.split(',').map(Number);
    
    // Weights for RGB channels (human eye is more sensitive to green)
    const rw = 0.3;
    const gw = 0.59;
    const bw = 0.11;
    
    return Math.sqrt(
      rw * Math.pow(r1 - r2, 2) +
      gw * Math.pow(g1 - g2, 2) +
      bw * Math.pow(b1 - b2, 2)
    );
  };

  // Cluster similar colors together
  const clusterColors = (colorMap: ColorMap): ColorMap => {
    const threshold = 25; // Adjust this value to control similarity sensitivity
    const clusters: ColorMap = {};
    
    Object.entries(colorMap).forEach(([color, count]) => {
      let foundCluster = false;
      
      // Check if this color belongs to an existing cluster
      for (const [mainColor] of Object.entries(clusters)) {
        if (getColorDistance(color, mainColor) < threshold) {
          clusters[mainColor] += count;
          foundCluster = true;
          break;
        }
      }
      
      // If no similar cluster found, create new one
      if (!foundCluster) {
        clusters[color] = count;
      }
    });
    
    return clusters;
  };

  const analyzeSelections = useCallback(() => {
    if (!image || selections.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const colorMap: ColorMap = {};
    
    console.log('Starting color analysis', {
      selections: selections.length,
      canvasSize: { width: canvas.width, height: canvas.height }
    });
    
    // Analyze each selection area
    selections.forEach(selection => {
      console.log('Analyzing selection', {
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height
      });
      
      try {
        const imageData = ctx.getImageData(
          Math.round(selection.x),
          Math.round(selection.y),
          Math.round(selection.width),
          Math.round(selection.height)
        ).data;
        
        console.log('Got image data', {
          dataLength: imageData.length,
          expectedPixels: Math.round(selection.width) * Math.round(selection.height) * 4
        });
      
        // Sample pixels
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          
          const roundedR = Math.round(r / 10) * 10;
          const roundedG = Math.round(g / 10) * 10;
          const roundedB = Math.round(b / 10) * 10;
          
          const color = `${roundedR},${roundedG},${roundedB}`;
          colorMap[color] = (colorMap[color] || 0) + 1;
        }
      } catch (error) {
        console.error('Error analyzing selection:', error);
      }
    });
    
    // Cluster similar colors
    const clusteredColors = clusterColors(colorMap);
    
    // Calculate total pixels analyzed
    const totalPixels = selections.reduce((sum, sel) => 
      sum + (sel.width * sel.height), 0);
    
    // Convert clustered colors to sorted array
    const sortedColors = Object.entries(clusteredColors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Reduced from 15 to show more distinct colors
      .map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        return {
          hex: getColorFromRGB(r, g, b),
          count,
          percentage: ((count / totalPixels) * 100).toFixed(1)
        };
      });
    
    setColors(sortedColors);
  }, [image, selections]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (!result || typeof result !== 'string') return;

      const img = new Image();
      img.onload = () => {
        console.log('Image loaded', { 
          width: img.width, 
          height: img.height 
        });
        setImage(img);
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log('Canvas not found after image load');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.log('Could not get canvas context');
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        // Reset selections
        setSelections([]);
        setColors([]);
        setSelectedColors([]);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, []);

  const addNewSelection = useCallback(() => {
    console.log('addNewSelection called', { 
      hasImage: !!image, 
      hasCanvas: !!canvasRef.current,
      hasContainer: !!containerRef.current
    });
    
    if (!image || !canvasRef.current || !containerRef.current) {
      console.log('Early return: missing image, canvas, or container');
      return;
    }
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate scale factor between canvas and displayed size
    const scaleX = containerRect.width / canvas.width;
    const scaleY = containerRect.height / canvas.height;
    
    console.log('Dimensions', {
      canvas: { width: canvas.width, height: canvas.height },
      container: { width: containerRect.width, height: containerRect.height },
      scale: { x: scaleX, y: scaleY }
    });
    
    // Use container dimensions for initial box size (20% of container width)
    const boxSize = Math.min(containerRect.width * 0.2, containerRect.height * 0.2);
    
    const newSelection = {
      id: Date.now(),
      x: Math.max(0, (containerRect.width - boxSize) / 2) / scaleX,
      y: Math.max(0, (containerRect.height - boxSize) / 2) / scaleY,
      width: Math.min(boxSize / scaleX, canvas.width),
      height: Math.min(boxSize / scaleY, canvas.height)
    };
    
    console.log('New selection', newSelection);
    
    setSelections(prev => [...prev, newSelection]);
    setActiveSelection(newSelection.id);
  }, [image]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeSelection || !canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Get mouse coordinates in container space
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas space
    const canvasX = mouseX / scaleX;
    const canvasY = mouseY / scaleY;
    
    const selection = selections.find(s => s.id === activeSelection);
    if (!selection) return;
    
    // Check if clicking near the bottom-right corner (resize)
    if (
      Math.abs(canvasX - (selection.x + selection.width)) < 10 / scaleX &&
      Math.abs(canvasY - (selection.y + selection.height)) < 10 / scaleY
    ) {
      setIsResizing(true);
    } else if (
      canvasX >= selection.x &&
      canvasX <= selection.x + selection.width &&
      canvasY >= selection.y &&
      canvasY <= selection.y + selection.height
    ) {
      setIsDragging(true);
    }
    
    setDragStart({ x: canvasX, y: canvasY });
  }, [activeSelection, selections]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if ((!isDragging && !isResizing) || !activeSelection || !canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Get mouse coordinates in canvas space
    const canvasX = (e.clientX - rect.left) / scaleX;
    const canvasY = (e.clientY - rect.top) / scaleY;
    
    // Calculate delta in canvas space
    const dx = canvasX - dragStart.x;
    const dy = canvasY - dragStart.y;
    
    setSelections(prev => prev.map(sel => {
      if (sel.id !== activeSelection) return sel;
      
      if (isResizing) {
        return {
          ...sel,
          width: Math.max(20, Math.min(sel.width + dx, (canvasRef.current?.width ?? 0) - sel.x)),
          height: Math.max(20, Math.min(sel.height + dy, (canvasRef.current?.height ?? 0) - sel.y))
        };
      } else {
        return {
          ...sel,
          x: Math.max(0, Math.min(sel.x + dx, (canvasRef.current?.width ?? 0) - sel.width)),
          y: Math.max(0, Math.min(sel.y + dy, (canvasRef.current?.height ?? 0) - sel.height))
        };
      }
    }));
    
    setDragStart({ x: canvasX, y: canvasY });
  }, [isDragging, isResizing, activeSelection, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      analyzeSelections();
    }
    setIsDragging(false);
    setIsResizing(false);
  }, [isDragging, isResizing, analyzeSelections]);

  const removeSelection = useCallback((id: number) => {
    setSelections(prev => prev.filter(s => s.id !== id));
    if (activeSelection === id) {
      setActiveSelection(null);
    }
    analyzeSelections();
  }, [activeSelection, analyzeSelections]);

  const toggleColorSelection = useCallback((color: ColorInfo) => {
    setSelectedColors(prev => {
      const exists = prev.some(c => c.hex === color.hex);
      if (exists) {
        return prev.filter(c => c.hex !== color.hex);
      } else {
        return [...prev, color];
      }
    });
  }, []);

  // Load initial image if URL is provided
  useEffect(() => {
    if (initialImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";  // Enable CORS for external images
      img.onload = () => {
        console.log('Initial image loaded', { 
          width: img.width, 
          height: img.height 
        });
        setImage(img);
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log('Canvas not found after initial image load');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.log('Could not get canvas context for initial image');
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        // Reset selections
        setSelections([]);
        setColors([]);
        setSelectedColors([]);
      };
      img.src = initialImageUrl;
    }
  }, [initialImageUrl]);

  // Handle save colors
  const handleSaveColors = useCallback(() => {
    console.log('Saving colors', selectedColors);
    
    if (selectedColors.length === 0) {
      console.log('No colors selected');
      return;
    }
    
    if (onColorsSelected) {
      // Send selected colors to parent component
      onColorsSelected(selectedColors.map(c => c.hex));
      
      // If onClose is provided (we're in a popup), call it after saving
      if (onClose) {
        console.log('Closing color analyzer after saving');
        onClose();
      }
    } else {
      console.log('No onColorsSelected handler provided');
    }
  }, [selectedColors, onColorsSelected, onClose]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Select Product Colors</CardTitle>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!initialImageUrl && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          )}
          
          {image && (
            <button
              onClick={addNewSelection}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Selection Box
            </button>
          )}
          
          <div 
            ref={containerRef}
            className="relative border rounded overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="max-w-full" />
            {selections.map((selection) => {
              if (!canvasRef.current || !containerRef.current) {
                return null;
              }
              
              const containerRect = containerRef.current.getBoundingClientRect();
              const scaleX = containerRect.width / canvasRef.current.width;
              const scaleY = containerRect.height / canvasRef.current.height;
              
              return (
                <div
                  key={selection.id}
                  className={`absolute border-2 bg-opacity-20 cursor-move ${
                    activeSelection === selection.id ? 'border-blue-500 bg-blue-500' : 'border-gray-400 bg-gray-400'
                  }`}
                  style={{
                    left: selection.x * scaleX,
                    top: selection.y * scaleY,
                    width: selection.width * scaleX,
                    height: selection.height * scaleY
                  }}
                  onClick={() => setActiveSelection(selection.id)}
                >
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelection(selection.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {activeSelection === selection.id && (
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                      style={{
                        transform: 'translate(50%, 50%)'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Detected Colors</h3>
            <div className="grid grid-cols-3 gap-4">
              {colors.map((color, index) => (
                <button
                  key={index}
                  className={`flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 ${
                    selectedColors.some(c => c.hex === color.hex) ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => toggleColorSelection(color)}
                >
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-sm">{color.hex}</div>
                    <div className="text-sm text-gray-500">{color.percentage}%</div>
                  </div>
                  {selectedColors.some(c => c.hex === color.hex) && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
            
            {selectedColors.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Selected Colors</h3>
                <div className="p-4 bg-gray-50 rounded">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(selectedColors.map(c => c.hex), null, 2)}
                  </pre>
                </div>
                <button
                  onClick={handleSaveColors}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Colors
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorAnalyzer;