'use client'

/**
 * QRScannerSection — Refactored live scanning with html5-qrcode
 *
 * Changes from original:
 *  - Removed: jsQR, requestAnimationFrame loop, canvas frame capture, <video>/<canvas> refs
 *  - Added:   Html5Qrcode (html5-qrcode) for live camera scanning
 *  - Kept:    isScanningLive, hasConfirmedCamera, setCameraError, processQRData, vibrate
 *  - Kept:    handleScanQR (image-upload scanning) — unchanged except jsQR still used there
 *  - Added:   Polished UI design for the scanner overlay
 *
 * Install: npm install html5-qrcode
 */

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import jsQR from 'jsqr'

// ─── Types ───────────────────────────────────────────────────────────────────

interface QRScannerSectionProps {
  isScanningLive: boolean
  hasConfirmedCamera: boolean
  setIsScanningLive: (v: boolean) => void
  setCameraError: (msg: string | null) => void
  processQRData: (data: string) => boolean
}

// ─── Live Scanner Hook ────────────────────────────────────────────────────────

function useLiveQRScanner({
  isScanningLive,
  hasConfirmedCamera,
  setIsScanningLive,
  setCameraError,
  processQRData,
}: QRScannerSectionProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerDivId = 'html5qr-scanner-region'

  useEffect(() => {
    if (!isScanningLive || !hasConfirmedCamera) return

    let stopped = false

    const start = async () => {
      setCameraError(null)
      try {
        const scanner = new Html5Qrcode(scannerDivId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (stopped) return
            stopped = true

            const success = processQRData(decodedText)
            if (success) {
              if (window.navigator.vibrate) window.navigator.vibrate(100)
            }

            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                scannerRef.current = null
                setIsScanningLive(false)
              })
          },
          () => {
            // scan failure per frame — intentionally ignored
          },
        )
      } catch (err: any) {
        console.error('Camera access error:', err)
        if (err?.name === 'NotAllowedError') {
          setCameraError('Bị từ chối: Hãy cho phép camera trong cài đặt trình duyệt để quét QR nhé!')
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setCameraError('Không tìm thấy camera: Hãy kiểm tra lại thiết bị của bạn nhé!')
        } else {
          setCameraError('Lỗi Camera: ' + (err?.message || 'Không rõ nguyên nhân.'))
        }
        setIsScanningLive(false)
      }
    }

    start()

    return () => {
      stopped = true
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null
          })
      }
    }
  }, [isScanningLive, hasConfirmedCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  return { scannerDivId }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QRScannerSection(props: QRScannerSectionProps) {
  const { isScanningLive, setIsScanningLive, setCameraError, processQRData } = props
  const { scannerDivId } = useLiveQRScanner(props)
  const [scanningQR, setScanningQR] = useState(false)

  // ── Image-upload scanning (unchanged logic, only jsQR used here) ────────────
  const handleScanQR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanningQR(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const analyze = (w: number, h: number, crop = false) => {
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return null
          if (crop) {
            const sourceSize = Math.min(img.width, img.height) * 0.8
            const sx = (img.width - sourceSize) / 2
            const sy = (img.height - sourceSize) / 2
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, w, h)
          } else {
            ctx.drawImage(img, 0, 0, w, h)
          }
          const imageData = ctx.getImageData(0, 0, w, h)
          return jsQR(imageData.data, w, h)
        }

        let w = img.width
        let h = img.height
        const MAX_1 = 800
        if (w > MAX_1 || h > MAX_1) {
          const r = Math.min(MAX_1 / w, MAX_1 / h)
          w *= r; h *= r
        }
        let code = analyze(Math.floor(w), Math.floor(h))
        if (!code) {
          const r2 = Math.min(450 / img.width, 450 / img.height)
          code = analyze(Math.floor(img.width * r2), Math.floor(img.height * r2))
        }
        if (!code) code = analyze(600, 600, true)

        if (code) {
          const success = processQRData(code.data)
          if (!success) alert('Nhận diện được mã nhưng không tìm thấy số tài khoản hợp lệ.')
          else alert('🛍️ Đã nhận diện được số tài khoản!')
        } else {
          alert('Không nhận diện được mã QR. Bạn hãy thử chụp lại rõ hơn nhé!')
        }
        setScanningQR(false)
      }
      img.onerror = () => setScanningQR(false)
      img.src = event.target?.result as string
    }
    reader.onerror = () => setScanningQR(false)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="qr-scanner-root">

      {/* ── Live Camera Modal ── */}
      {isScanningLive && (
        <div className="qr-overlay">
          <div className="qr-modal">
            {/* Header */}
            <div className="qr-header">
              <div className="qr-header-dot" />
              <span className="qr-header-title">Quét mã QR</span>
              <button
                className="qr-close-btn"
                onClick={() => setIsScanningLive(false)}
                aria-label="Đóng camera"
              >
                ✕
              </button>
            </div>

            {/* Viewfinder */}
            <div className="qr-viewfinder-wrap">
              {/* html5-qrcode mounts the video here */}
              <div id={scannerDivId} className="qr-video-region" />

              {/* Corner brackets overlay */}
              <div className="qr-brackets" aria-hidden="true">
                <span className="qr-corner qr-tl" />
                <span className="qr-corner qr-tr" />
                <span className="qr-corner qr-bl" />
                <span className="qr-corner qr-br" />
                <span className="qr-scan-line" />
              </div>
            </div>

            <p className="qr-hint">Đưa mã QR vào khung để quét tự động</p>
          </div>
        </div>
      )}

      {/* ── Upload Button ── */}
      <label className={`qr-upload-btn ${scanningQR ? 'qr-upload-btn--loading' : ''}`}>
        <input
          type="file"
          accept="image/*"
          onChange={handleScanQR}
          disabled={scanningQR}
          style={{ display: 'none' }}
        />
        {scanningQR ? (
          <>
            <span className="qr-spinner" />
            Đang xử lý…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h3M14 18h3M20 18v3M17 21h3" />
            </svg>
            Tải ảnh QR lên
          </>
        )}
      </label>

      {/* ─── Styles ────────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Overlay ── */
        .qr-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: qrFadeIn 0.2s ease;
        }
        @keyframes qrFadeIn { from { opacity:0 } to { opacity:1 } }

        /* ── Modal card ── */
        .qr-modal {
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          width: 100%;
          max-width: 360px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          animation: qrSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes qrSlideUp {
          from { transform: translateY(24px) scale(0.97); opacity:0 }
          to   { transform: translateY(0) scale(1); opacity:1 }
        }

        /* ── Header ── */
        .qr-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .qr-header-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: qrPulse 1.8s ease-in-out infinite;
        }
        @keyframes qrPulse {
          0%,100% { opacity:1; transform:scale(1) }
          50%      { opacity:0.5; transform:scale(1.3) }
        }
        .qr-header-title {
          flex: 1;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: -0.01em;
        }
        .qr-close-btn {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .qr-close-btn:hover {
          background: rgba(239,68,68,0.15);
          color: #f87171;
          border-color: rgba(239,68,68,0.3);
        }

        /* ── Viewfinder ── */
        .qr-viewfinder-wrap {
          position: relative;
          margin: 20px auto;
          width: 280px; height: 280px;
        }
        .qr-video-region {
          width: 280px !important;
          height: 280px !important;
          border-radius: 12px;
          overflow: hidden;
        }
        /* Override html5-qrcode internal styles */
        .qr-video-region video {
          width: 280px !important;
          height: 280px !important;
          object-fit: cover !important;
          border-radius: 12px !important;
        }
        .qr-video-region img { display: none !important; }

        /* ── Corner brackets ── */
        .qr-brackets {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .qr-corner {
          position: absolute;
          width: 28px; height: 28px;
          border-color: #22c55e;
          border-style: solid;
          border-width: 0;
        }
        .qr-tl { top:0; left:0;    border-top-width:3px; border-left-width:3px;  border-top-left-radius:10px }
        .qr-tr { top:0; right:0;   border-top-width:3px; border-right-width:3px; border-top-right-radius:10px }
        .qr-bl { bottom:0; left:0; border-bottom-width:3px; border-left-width:3px;  border-bottom-left-radius:10px }
        .qr-br { bottom:0; right:0;border-bottom-width:3px; border-right-width:3px; border-bottom-right-radius:10px }

        /* ── Scan line animation ── */
        .qr-scan-line {
          position: absolute;
          left: 8px; right: 8px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #22c55e, transparent);
          border-radius: 1px;
          animation: qrScanMove 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e80;
        }
        @keyframes qrScanMove {
          0%   { top: 8px;   opacity: 0 }
          10%  {             opacity: 1 }
          90%  {             opacity: 1 }
          100% { top: 264px; opacity: 0 }
        }

        /* ── Hint text ── */
        .qr-hint {
          text-align: center;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #64748b;
          padding: 0 20px 20px;
          line-height: 1.5;
        }

        /* ── Upload button ── */
        .qr-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          color: #cbd5e1;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          user-select: none;
        }
        .qr-upload-btn:hover {
          background: #1e293b;
          border-color: rgba(255,255,255,0.2);
          color: #f1f5f9;
        }
        .qr-upload-btn--loading {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Spinner ── */
        .qr-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: #22c55e;
          border-radius: 50%;
          animation: qrSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes qrSpin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
