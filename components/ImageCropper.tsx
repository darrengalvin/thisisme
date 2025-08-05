'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Move, ZoomIn, ZoomOut, RefreshCw, Check, Info } from 'lucide-react'

interface ImageCropperProps {
  imageUrl: string
  onCropComplete: (croppedImage: File | null) => void
  onCancel: () => void
  aspectRatio?: number // width/height ratio
  outputWidth?: number
  outputHeight?: number
  title?: string
}

export default function ImageCropper({
  imageUrl,
  onCropComplete,
  onCancel,
  aspectRatio = 280 / 192, // Default to chapter header ratio
  outputWidth = 280,
  outputHeight = 192,
  title = "Adjust your image"
}: ImageCropperProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [showInstructions, setShowInstructions] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cropMode, setCropMode] = useState(false) // Toggle between simple and crop mode - ALWAYS starts in Simple mode
  const [cropArea, setCropArea] = useState({ x: 50, y: 50, width: 300, height: 300 / aspectRatio })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, cropArea: { x: 0, y: 0, width: 0, height: 0 } })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Calculate initial zoom and crop area
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      
      // Calculate zoom to show full image initially
      const containerWidth = 400 // Fixed container size
      const containerHeight = containerWidth / aspectRatio
      
      const imgAspect = img.naturalWidth / img.naturalHeight
      const containerAspect = aspectRatio
      
      let initialZoom = 1
      if (imgAspect > containerAspect) {
        // Image is wider - fit to height
        initialZoom = containerHeight / img.naturalHeight
      } else {
        // Image is taller - fit to width
        initialZoom = containerWidth / img.naturalWidth
      }
      
      // Ensure minimum zoom of 0.3 for better cropping
      initialZoom = Math.max(0.3, initialZoom)
      setZoom(initialZoom)
      
      // Initialize crop area to be centered and reasonably sized
      const cropWidth = Math.min(300, containerWidth * 0.8)
      const cropHeight = cropWidth / aspectRatio
      setCropArea({
        x: (containerWidth - cropWidth) / 2,
        y: (containerHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      })
    }
    img.src = imageUrl
  }, [imageUrl, aspectRatio])

  // Hide instructions after first interaction
  useEffect(() => {
    if (showInstructions) {
      const timer = setTimeout(() => setShowInstructions(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showInstructions])

  // Simple mode - drag image directly
  const handleSimpleMouseDown = (e: React.MouseEvent) => {
    if (cropMode) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    })
    setShowInstructions(false)
  }

  const handleSimpleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || cropMode) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Get container dimensions
    const container = containerRef.current
    if (!container) return
    
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    
    // Calculate image dimensions
    const imageWidth = imageSize.width * zoom
    const imageHeight = imageSize.height * zoom
    
    // Calculate boundaries
    const maxX = Math.max(0, (imageWidth - containerWidth) / 2)
    const maxY = Math.max(0, (imageHeight - containerHeight) / 2)
    
    setPosition({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev * 1.2))
    setShowInstructions(false)
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.3, prev / 1.2))
    setShowInstructions(false)
  }

  const handleReset = () => {
    const container = containerRef.current
    if (!container) return
    
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    
    const imgAspect = imageSize.width / imageSize.height
    const containerAspect = aspectRatio
    
    let resetZoom
    if (imgAspect > containerAspect) {
      resetZoom = containerWidth / imageSize.width
    } else {
      resetZoom = containerHeight / imageSize.height
    }
    
    setZoom(Math.max(0.3, resetZoom))
    setPosition({ x: 0, y: 0 })
    
    // Reset crop area
    const cropWidth = Math.min(300, containerWidth * 0.8)
    const cropHeight = cropWidth / aspectRatio
    setCropArea({
      x: (containerWidth - cropWidth) / 2,
      y: (containerHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    })
  }

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    const zoomFactor = 0.1
    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor // Invert for natural zoom direction
    const newZoom = Math.max(0.3, Math.min(3, zoom + delta))
    
    setZoom(newZoom)
    setShowInstructions(false)
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsProcessing(false)
      return
    }

    canvas.width = outputWidth
    canvas.height = outputHeight

    const img = new Image()
    img.onload = () => {
      const container = containerRef.current
      if (!container) return

      // Fill background
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // SIMPLE MODE: Use the entire container as the crop area (like Instagram)
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      
      // Calculate how the image fits in the container
      const imageDisplayWidth = imageSize.width * zoom
      const imageDisplayHeight = imageSize.height * zoom
      
      // Image position in container (centered + position offset)
      const imageX = (containerWidth - imageDisplayWidth) / 2 + position.x
      const imageY = (containerHeight - imageDisplayHeight) / 2 + position.y
      
      // Calculate what portion of the image is visible in the container
      const visibleLeft = Math.max(0, -imageX)
      const visibleTop = Math.max(0, -imageY)
      const visibleRight = Math.min(imageDisplayWidth, containerWidth - imageX)
      const visibleBottom = Math.min(imageDisplayHeight, containerHeight - imageY)
      
      const visibleWidth = visibleRight - visibleLeft
      const visibleHeight = visibleBottom - visibleTop
      
      // Convert to source image coordinates
      const sourceX = (visibleLeft / zoom)
      const sourceY = (visibleTop / zoom)
      const sourceWidth = (visibleWidth / zoom)
      const sourceHeight = (visibleHeight / zoom)

      // Draw the visible portion of the image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
        0, 0, canvas.width, canvas.height // Destination rectangle (stretched to fill)
      )

      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'adjusted-image.jpg', { type: 'image/jpeg' })
          onCropComplete(file)
        }
        setIsProcessing(false)
      }, 'image/jpeg', 0.9)
    }
    
    img.src = imageUrl
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          {showInstructions && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
              <Info size={16} className="text-green-600 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>Simple Mode:</strong> Just drag to move and zoom the image - whatever you see will be saved. Pure Instagram-style positioning!
              </p>
            </div>
          )}

          {/* Crop Area */}
          <div className="relative">
            <div 
              ref={containerRef}
              className="relative w-full mx-auto overflow-hidden bg-slate-100 rounded-lg border-2 border-slate-300"
              style={{ 
                maxWidth: '400px',
                aspectRatio: aspectRatio
              }}
              onMouseMove={handleSimpleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            >
              {/* Background Image */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Full image"
                className="absolute top-1/2 left-1/2 select-none opacity-50"
                style={{
                  width: `${imageSize.width * zoom}px`,
                  height: `${imageSize.height * zoom}px`,
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                draggable={false}
              />

              {/* Simple mode drag overlay */}
              <div 
                className="absolute inset-0 cursor-move"
                onMouseDown={handleSimpleMouseDown}
              >
                {!isDragging && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="bg-white/90 rounded-full p-3 shadow-lg">
                      <Move size={20} className="text-slate-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview label */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded">
              ✨ Position & Zoom
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700">Zoom:</span>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  disabled={zoom <= 0.3}
                >
                  <ZoomOut size={16} className="text-slate-600" />
                </button>
                <div className="relative w-32">
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => {
                      setZoom(parseFloat(e.target.value))
                      setShowInstructions(false)
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div 
                    className="absolute top-0 left-0 h-2 bg-slate-600 rounded-lg pointer-events-none"
                    style={{ width: `${((zoom - 0.3) / 2.7) * 100}%` }}
                  />
                </div>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  disabled={zoom >= 3}
                >
                  <ZoomIn size={16} className="text-slate-600" />
                </button>
                <span className="text-sm text-slate-600 w-12 text-right">{Math.round(zoom * 100)}%</span>
              </div>
              
              <button
                onClick={handleReset}
                className="flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
            </div>

            {/* Tips */}
            <div className="text-xs text-green-600 text-center space-y-1">
              <p>• Drag image to move • Mouse wheel to zoom</p>
              <p>• Instagram-style: whatever you see gets saved!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Save Position</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}