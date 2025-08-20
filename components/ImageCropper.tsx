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
      
      // Calculate zoom to show the entire image initially (no cropping)
      const containerWidth = 400 // Fixed container size
      const containerHeight = containerWidth / aspectRatio
      
      // Determine if image is portrait or landscape
      const imageAspectRatio = img.naturalWidth / img.naturalHeight
      const isPortrait = imageAspectRatio < 1
      const isLandscape = imageAspectRatio > 1.5
      
      // Calculate what zoom level is needed to fit the entire image in the container
      const scaleToFitWidth = containerWidth / img.naturalWidth
      const scaleToFitHeight = containerHeight / img.naturalHeight
      
      let initialZoom
      
      if (isPortrait) {
        // For portrait images, use a more generous zoom to show more of the image
        // This helps with portrait photos where you want to see the full person
        initialZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9
      } else if (isLandscape) {
        // For landscape images, use standard zoom
        initialZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.75
      } else {
        // For square-ish images, use moderate zoom
        initialZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.8
      }
      
      // Ensure reasonable zoom range
      setZoom(Math.max(0.1, Math.min(2.0, initialZoom)))
      
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
    setZoom(prev => Math.max(0.1, prev / 1.2))
    setShowInstructions(false)
  }

  const handleReset = () => {
    const container = containerRef.current
    if (!container) return
    
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    
    // Calculate zoom to fit entire image with generous padding
    const scaleToFitWidth = containerWidth / imageSize.width
    const scaleToFitHeight = containerHeight / imageSize.height
    const resetZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.75
    
    setZoom(Math.max(0.1, Math.min(1.0, resetZoom)))
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
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta))
    
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

    const img = new Image()
    img.onload = () => {
      const container = containerRef.current
      if (!container) return

      // SMART CROPPING: Better handling for different image orientations
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      
      // Calculate how the image fits in the container
      const imageDisplayWidth = imageSize.width * zoom
      const imageDisplayHeight = imageSize.height * zoom
      
      // Image position in container (centered + position offset)
      const imageX = (containerWidth - imageDisplayWidth) / 2 + position.x
      const imageY = (containerHeight - imageDisplayHeight) / 2 + position.y
      
      // Determine image orientation for smart cropping
      const imageAspectRatio = imageSize.width / imageSize.height
      const isPortrait = imageAspectRatio < 1
      
      let sourceX, sourceY, sourceWidth, sourceHeight
      
      if (imageDisplayWidth <= containerWidth && imageDisplayHeight <= containerHeight) {
        // Image fits entirely - use the whole image
        sourceX = 0
        sourceY = 0
        sourceWidth = imageSize.width
        sourceHeight = imageSize.height
      } else {
        // Image is larger than container - crop to visible area with smart padding
        let padding = 20 // base padding in pixels
        
        // For portrait images, use more generous padding to preserve more of the subject
        if (isPortrait) {
          padding = Math.min(40, imageDisplayWidth * 0.1) // Up to 10% of image width
        }
        
        const visibleLeft = Math.max(0, -imageX - padding)
        const visibleTop = Math.max(0, -imageY - padding)
        const visibleRight = Math.min(imageDisplayWidth, containerWidth - imageX + padding)
        const visibleBottom = Math.min(imageDisplayHeight, containerHeight - imageY + padding)
        
        const visibleWidth = visibleRight - visibleLeft
        const visibleHeight = visibleBottom - visibleTop
        
        // Convert to source image coordinates
        sourceX = Math.max(0, (visibleLeft / zoom))
        sourceY = Math.max(0, (visibleTop / zoom))
        sourceWidth = Math.min(imageSize.width - sourceX, (visibleWidth / zoom))
        sourceHeight = Math.min(imageSize.height - sourceY, (visibleHeight / zoom))
        
        // For portrait images, ensure we don't crop too aggressively from the sides
        if (isPortrait && sourceWidth < imageSize.width * 0.8) {
          const centerX = imageSize.width / 2
          const halfWidth = (imageSize.width * 0.8) / 2
          sourceX = Math.max(0, centerX - halfWidth)
          sourceWidth = Math.min(imageSize.width - sourceX, imageSize.width * 0.8)
        }
      }

      // Calculate the actual aspect ratio of the cropped area
      const croppedAspectRatio = sourceWidth / sourceHeight
      
      // Set canvas size to preserve the cropped aspect ratio at high quality
      const maxDimension = Math.max(outputWidth, outputHeight)
      if (croppedAspectRatio > 1) {
        // Landscape: width is the limiting factor
        canvas.width = maxDimension
        canvas.height = Math.round(maxDimension / croppedAspectRatio)
      } else {
        // Portrait/Square: height is the limiting factor
        canvas.height = maxDimension
        canvas.width = Math.round(maxDimension * croppedAspectRatio)
      }

      // Fill background (in case of any gaps)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the cropped portion maintaining its aspect ratio
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle (what's visible)
        0, 0, canvas.width, canvas.height // Destination rectangle (maintains aspect ratio)
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
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
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Instructions */}
          {showInstructions && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
              <Info size={16} className="text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">Perfect for Portrait Photos!</p>
                <p>• Drag to move and position your image</p>
                <p>• Use mouse wheel or zoom controls to get the perfect size</p>
                <p>• Whatever you see in the preview will be saved - Instagram-style!</p>
              </div>
            </div>
          )}

          {/* Crop Area */}
          <div className="relative">
            <div 
              ref={containerRef}
              className="relative w-full mx-auto overflow-hidden bg-slate-100 rounded-lg border-2 border-slate-300"
              style={{ 
                width: '400px',
                height: `${400 / aspectRatio}px`
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
                  disabled={zoom <= 0.1}
                >
                  <ZoomOut size={16} className="text-slate-600" />
                </button>
                <div className="relative w-32">
                  <input
                    type="range"
                    min="0.1"
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
                    style={{ width: `${((zoom - 0.1) / 2.9) * 100}%` }}
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
              <p>💡 <strong>Portrait Tip:</strong> Position the main subject (face/person) in the center</p>
              <p>• Drag image to move • Mouse wheel to zoom • Smart cropping preserves important details</p>
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