import React, { useState, useEffect, useRef } from 'react'
import './VideoPortal.css'

export default function VideoPortal({ onEnter, userName = 'Usuario' }) {
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoaded = () => setVideoLoaded(true)

    if (video.readyState >= 3) {
      onLoaded()
    } else {
      video.addEventListener('loadeddata', onLoaded)
    }

    const fallback = setTimeout(() => setVideoLoaded(true), 4000)

    video.play().catch(() => {})

    return () => {
      video.removeEventListener('loadeddata', onLoaded)
      clearTimeout(fallback)
    }
  }, [])

  const handleEnterClick = () => {
    if (isEntering) return
    setIsEntering(true)
    if (videoRef.current) {
      videoRef.current.style.opacity = '0'
    }
    setTimeout(() => onEnter(), 1500)
  }

  return (
    <div className="video-portal-container">
      <video
        ref={videoRef}
        className="video-background"
        loop
        muted
        playsInline
        preload="auto"
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%230A0618' width='1920' height='1080'/%3E%3C/svg%3E"
      >
        <source src="/08.mp4" type="video/mp4" />
      </video>

      <div className="video-overlay" />

      {!videoLoaded && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">Bienvenido a Resilio Life</p>
          <p className="loading-username">{userName}</p>
        </div>
      )}

      {videoLoaded && !isEntering && (
        <div className="portal-content">
          <div className="portal-logo" onClick={handleEnterClick}>
            <div className="logo-container">
              <img
                src="/logoresilio.png"
                alt="Resilio Life"
                className="logo-image"
              />
            </div>
            <div className="enter-text">Toca para ingresar</div>
          </div>

          <div className="portal-footer">RESILIO LIFE</div>
        </div>
      )}

      {isEntering && <div className="transition-overlay" />}
    </div>
  )
}
