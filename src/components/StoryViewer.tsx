import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { Story } from '@/data/stories'

interface StoryViewerProps {
  stories: Story[]
  initialIndex: number
  onClose: () => void
}

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [storyIdx, setStoryIdx] = useState(initialIndex)
  const [slideIdx, setSlideIdx] = useState(0)
  // Basılı tutma (dokunma/fare) ile kullanıcı duraklatması ayrı tutulur
  const [holdPaused, setHoldPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const paused = holdPaused || userPaused || reducedMotion
  const dialogRef = useRef<HTMLDivElement>(null)
  const pauseBtnRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const story = stories[storyIdx]
  const slide = story.slides[slideIdx]
  const duration = slide.duration ?? 5000

  // Advance to next slide or next story
  const goNext = useCallback(() => {
    if (slideIdx < story.slides.length - 1) {
      setSlideIdx((s) => s + 1)
    } else if (storyIdx < stories.length - 1) {
      setStoryIdx((s) => s + 1)
      setSlideIdx(0)
    } else {
      onClose()
    }
  }, [slideIdx, storyIdx, story.slides.length, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1)
    } else if (storyIdx > 0) {
      setStoryIdx((s) => s - 1)
      const prevStory = stories[storyIdx - 1]
      setSlideIdx(prevStory.slides.length - 1)
    }
  }, [slideIdx, storyIdx, stories])

  // prefers-reduced-motion: otomatik ilerleme kapalı (manuel gezinme çalışır)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Odak yönetimi: açılınca diyalog içine al, kapanınca tetikleyen öğeye geri ver
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    pauseBtnRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  // Slayt değişince kalan süre sıfırlanır (zamanlayıcı efektinden önce çalışmalı)
  const remainingRef = useRef(duration)
  useEffect(() => {
    remainingRef.current = duration
  }, [duration, slideIdx, storyIdx])

  // Auto-advance timer — duraklatınca kalan süre korunur, ilerleme çubuğuyla senkron kalır
  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    timerRef.current = setTimeout(goNext, remainingRef.current)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt))
    }
  }, [paused, duration, goNext, slideIdx, storyIdx])

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      // Space: duraklat/devam (buton odaktaysa butonun kendi davranışı çalışır)
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        setUserPaused((v) => !v)
      }
      // Odak tuzağı: Tab diyalog dışına çıkmasın
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'))
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (!dialogRef.current.contains(active)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev])

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setHoldPaused(true)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    setHoldPaused(false)
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  // Click on left/right half
  const onAreaClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 3) goPrev()
    else if (x > (rect.width * 2) / 3) goNext()
  }

  return (
    <div
      ref={dialogRef}
      className="story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${story.title} hikayesi`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setHoldPaused(true)}
      onMouseUp={() => setHoldPaused(false)}
      onMouseLeave={() => setHoldPaused(false)}
    >
      {/* Background */}
      <div className="story-viewer__bg" style={{ background: slide.gradient }} />

      {/* Clickable area */}
      <div className="story-viewer__content" onClick={onAreaClick}>
        {/* Progress bars */}
        <div className="story-viewer__progress">
          {story.slides.map((_, i) => (
            <div key={i} className="story-viewer__progress-bar">
              <div
                className={`story-viewer__progress-fill ${
                  i < slideIdx ? 'story-viewer__progress-fill--done' : ''
                } ${i === slideIdx ? 'story-viewer__progress-fill--active' : ''}`}
                style={
                  i === slideIdx
                    ? { animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* Story header */}
        <div className="story-viewer__header">
          <div className="story-viewer__info">
            <div
              className="story-viewer__avatar"
              style={{ background: `linear-gradient(135deg, ${story.ring[0]}, ${story.ring[1]})` }}
            >
              <span>{story.title[0]}</span>
            </div>
            <span className="story-viewer__title">{story.title}</span>
          </div>
          <div className="flex items-center gap-1">
          <button
            ref={pauseBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // Azaltılmış hareket tercihinde otomatik ilerleme zaten kapalı; düğme yalnızca durumu gösterir
              if (!reducedMotion) setUserPaused((v) => !v)
            }}
            className="story-viewer__close"
            aria-label={
              reducedMotion
                ? 'Otomatik ilerleme kapalı (azaltılmış hareket tercihi)'
                : userPaused
                  ? 'Devam ettir'
                  : 'Duraklat'
            }
            aria-pressed={userPaused || reducedMotion}
            aria-disabled={reducedMotion || undefined}
            title={reducedMotion ? 'Otomatik ilerleme kapalı' : undefined}
          >
            {userPaused || reducedMotion ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="story-viewer__close"
            aria-label="Kapat"
          >
            <X size={24} />
          </button>
          </div>
        </div>

        {/* Caption */}
        {slide.caption && (
          <div className="story-viewer__caption" aria-live="polite">
            <p>{slide.caption}</p>
          </div>
        )}

        {/* Navigation hint arrows */}
        <div className="story-viewer__nav story-viewer__nav--left">
          {(slideIdx > 0 || storyIdx > 0) && <ChevronLeft size={28} />}
        </div>
        <div className="story-viewer__nav story-viewer__nav--right">
          <ChevronRight size={28} />
        </div>
      </div>
    </div>
  )
}
