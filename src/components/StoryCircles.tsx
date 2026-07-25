import { useState } from 'react'
import stories from '@/data/stories'
import { StoryViewer } from './StoryViewer'

export function StoryCircles() {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  return (
    <>
      <section className="story-circles">
        <div className="story-circles__track">
          {stories.map((story, i) => (
            <button
              key={story.id}
              className="story-circles__item"
              onClick={() => setViewerIndex(i)}
              aria-label={`${story.title} hikayesini aç`}
            >
              <div
                className="story-circles__ring"
                style={{
                  background: `linear-gradient(135deg, ${story.ring[0]}, ${story.ring[1]})`,
                }}
              >
                <div className="story-circles__inner">
                  <span className="story-circles__letter">{story.title[0]}</span>
                </div>
              </div>
              <span className="story-circles__label">{story.title}</span>
            </button>
          ))}
        </div>
      </section>

      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  )
}
