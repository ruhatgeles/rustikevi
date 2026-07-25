import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Story } from '@/data/stories'

interface StoryViewerProps {
  stories: Story[]
  initialIndex: number
  onClose: () => void
}

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [storyIdx, setStoryIdx] = useState(initialIndex)
  const [slideIdx, setSlideIdx] = useState(0)
  const [paused, setPaused] = useState(false)
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

  // Auto-advance timer
  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(goNext, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [paused, duration, goNext, slideIdx, storyIdx])

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
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
    setPaused(true)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    setPaused(false)
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
      className="story-viewer"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
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
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="story-viewer__close"
            aria-label="Kapat"
          >
            <X size={24} />
          </button>
        </div>

        {/* Caption */}
        {slide.caption && (
          <div className="story-viewer__caption">
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
