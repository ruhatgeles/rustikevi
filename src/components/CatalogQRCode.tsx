import { useEffect, useState } from 'react'

export function CatalogQRCode({ path = '/katalog', size = 176 }: { path?: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`)
  }, [path])

  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&color=3A2A1C&bgcolor=FAF6EE&data=${encodeURIComponent(url)}`
    : null

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-5 shadow-sm">
      <div
        className="flex items-center justify-center overflow-hidden rounded-xl bg-[var(--color-cream)]"
        style={{ width: size, height: size }}
      >
        {qrSrc && !imgError ? (
          <img
            src={qrSrc}
            alt="Dijital katalog QR kodu"
            width={size}
            height={size}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-[var(--color-cream-deep)]" />
        )}
      </div>
      <p className="max-w-[180px] text-center text-xs leading-relaxed text-[var(--color-ink)]/60">
        Telefonunuzla okutun, dijital katalog anında açılsın
      </p>
    </div>
  )
}
