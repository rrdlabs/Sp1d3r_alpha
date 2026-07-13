import { useRef, useState, useCallback, useEffect } from "react"
import { Box, Button, Typography } from "@mui/material"

interface Props {
  onSignature: (dataUrl: string) => void
  width?: number
  height?: number
  existingImage?: string | null
}

export default function SignaturePad({ onSignature, width = 400, height = 150, existingImage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getPos = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    const pos = getPos(e)
    setDrawing(true)
    const ctx = canvas.getContext("2d")!
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const pos = getPos(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#e0e0e0"
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }, [drawing, getPos])

  const endDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current!
    canvas.releasePointerCapture(e.pointerId)
    setDrawing(false)
    const dataUrl = canvas.toDataURL("image/png")
    onSignature(dataUrl)
  }, [drawing, onSignature])

  const clear = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onSignature("")
  }, [onSignature])

  useEffect(() => {
    if (existingImage) {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext("2d")!
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setHasDrawn(true)
      }
      img.src = existingImage
    }
  }, [existingImage])

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        Draw your signature below.
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "rgba(0,0,0,0.3)",
          touchAction: "none",
          cursor: "crosshair",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: "100%", height: height, display: "block" }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
      </Box>
      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        <Button size="small" onClick={clear} disabled={!hasDrawn}>
          Clear
        </Button>
      </Box>
    </Box>
  )
}
