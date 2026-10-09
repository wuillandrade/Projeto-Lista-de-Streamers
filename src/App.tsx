import { useEffect, useState } from 'react'
import './App.css'

const STREAMERS_API = 'https://api.chess.com/pub/streamers'

type Streamer = {
  username: string
  avatar: string | null
  watchUrl: string
  platform: string
}

type LivePlatform = {
  type: string
  is_live: boolean
  channel_url?: string
  stream_url?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function parseStreamer(value: unknown): Streamer | null {
  if (!isRecord(value) || typeof value.username !== 'string' || !value.username) {
    return null
  }

  const platforms: LivePlatform[] = Array.isArray(value.platforms)
    ? value.platforms.flatMap((platform): LivePlatform[] => {
        if (
          !isRecord(platform) ||
          typeof platform.type !== 'string' ||
          typeof platform.is_live !== 'boolean'
        ) {
          return []
        }

        return [
          {
            type: platform.type,
            is_live: platform.is_live,
            channel_url:
              typeof platform.channel_url === 'string'
                ? platform.channel_url
                : undefined,
            stream_url:
              typeof platform.stream_url === 'string'
                ? platform.stream_url
                : undefined,
          },
        ]
      })
    : []

  const livePlatforms = platforms.filter((platform) => platform.is_live)
  const preferredPlatform =
    livePlatforms.find((platform) => platform.type.toLowerCase() === 'twitch') ??
    livePlatforms[0]
  const fallbackUrl =
    value.is_live === true ? getSafeUrl(value.twitch_url) : null
  const watchUrl =
    getSafeUrl(preferredPlatform?.channel_url) ??
    getSafeUrl(preferredPlatform?.stream_url) ??
    fallbackUrl

  if (!watchUrl || (value.is_live !== true && livePlatforms.length === 0)) {
    return null
  }

  return {
    username: value.username,
    avatar: getSafeUrl(value.avatar),
    watchUrl,
    platform: preferredPlatform?.type ?? 'Twitch',
  }
}

async function fetchLiveStreamers(signal: AbortSignal): Promise<Streamer[]> {
  const response = await fetch(STREAMERS_API, { signal })
  if (!response.ok) {
    throw new Error(`A API respondeu com o status ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.streamers)) {
    throw new Error('A resposta da API está em um formato inesperado.')
  }

  return payload.streamers
    .map(parseStreamer)
    .filter((streamer): streamer is Streamer => streamer !== null)
}

function StreamerCard({ streamer }: { streamer: Streamer }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const initials = streamer.username.slice(0, 2).toUpperCase()
  const platformName =
    streamer.platform.toLowerCase() === 'youtube' ? 'YouTube' : 'Twitch'

  return (
    <article className="streamer-card">
      <div className="card-topline">
        <span className="live-badge">
          <span className="live-dot" aria-hidden="true" />
          AO VIVO
        </span>
        <span className="platform-label">{platformName}</span>
      </div>

      <div className="streamer-info">
        <div className="avatar-wrap">
          {streamer.avatar && !avatarFailed ? (
            <img
              className="streamer-avatar"
              src={streamer.avatar}
              alt={`Foto de perfil de ${streamer.username}`}
              loading="lazy"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span className="avatar-fallback" aria-hidden="true">
              {initials}
            </span>
          )}
          <span className="avatar-live-ring" aria-hidden="true" />
        </div>

        <div className="streamer-details">
          <span className="streamer-eyebrow">Criador Chess.com</span>
          <h2>{streamer.username}</h2>
          <p>Está transmitindo agora</p>
        </div>
      </div>

      <a
        className="watch-link"
        href={streamer.watchUrl}
        target="_blank"
        rel="noreferrer"
      >
        Assistir na {platformName}
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5.5 14.5 14 6m0 0H7m7 0v7" />
        </svg>
      </a>
    </article>
  )
}

function App() {
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStreamers() {
      setIsLoading(true)
      setError(null)

      try {
        const liveStreamers = await fetchLiveStreamers(controller.signal)
        setStreamers(liveStreamers)
        setLastUpdated(new Date())
      } catch (fetchError) {
        if (controller.signal.aborted) return

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Não foi possível carregar os streamers.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadStreamers()
    return () => controller.abort()
  }, [refreshKey])

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredStreamers = streamers.filter((streamer) =>
    streamer.username.toLocaleLowerCase().includes(normalizedSearch),
  )
  const formattedUpdate = lastUpdated
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(lastUpdated)
    : null

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Xeque ao vivo, início">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path d="M13 7h14v4h-3v5l7 15H9l7-15v-5h-3z" />
              <path d="M13 25h14" />
            </svg>
          </span>
          <span className="brand-name">xeque<span>.live</span></span>
        </a>
        <span className="header-note">
          <span className="header-live-dot" aria-hidden="true" />
          A comunidade está no ar
        </span>
      </header>

      <section className="directory" aria-labelledby="page-title">
        <div className="intro">
          <div className="section-kicker">
            <span className="kicker-line" />
            CENTRAL DE TRANSMISSÕES
          </div>
          <h1 id="page-title">
            Xadrez ao vivo.
            <br />
            <span>Sem perder um lance.</span>
          </h1>
          <p className="intro-copy">
            Encontre quem está transmitindo agora e acompanhe a próxima jogada.
          </p>
        </div>

        <div className="directory-toolbar">
          <div className="directory-heading">
            <div>
              <span className="toolbar-overline">CHESS.COM STREAMERS</span>
              <h2>Transmissões ao vivo</h2>
            </div>
            {!isLoading && !error && (
              <span className="streamer-count" aria-label={`${streamers.length} ao vivo`}>
                <span className="count-dot" aria-hidden="true" />
                {streamers.length} no ar
              </span>
            )}
          </div>

          <div className="toolbar-controls">
            <label className="search-field">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="8.8" cy="8.8" r="5.8" />
                <path d="m13.2 13.2 4 4" />
              </svg>
              <span className="visually-hidden">Buscar streamer</span>
              <input
                type="search"
                placeholder="Buscar streamer..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  className="clear-search"
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </label>
            <button
              className="refresh-button"
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={isLoading}
              aria-label="Atualizar lista de streamers"
              title="Atualizar lista"
            >
              <svg
                className={isLoading ? 'is-spinning' : ''}
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M16.5 8A6.8 6.8 0 0 0 4.4 5.5L3 7m0 0V3.5M3 7h3.5M3.5 12a6.8 6.8 0 0 0 12.1 2.5L17 13m0 0v3.5M17 13h-3.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="results-meta" aria-live="polite">
          <span>
            {isLoading
              ? 'Buscando transmissões...'
              : error
                ? 'Não foi possível atualizar a lista'
                : `Mostrando ${filteredStreamers.length} de ${streamers.length} streamers`}
          </span>
          {formattedUpdate && !isLoading && !error && (
            <span>Atualizado às {formattedUpdate}</span>
          )}
        </div>

        {error ? (
          <div className="state-panel error-panel" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <h2>Ops, não conseguimos carregar as transmissões.</h2>
            <p>{error} Confira sua conexão e tente novamente.</p>
            <button
              className="retry-button"
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div className="state-panel loading-panel" role="status">
            <span className="loader" aria-hidden="true" />
            <p>Encontrando partidas e criadores ao vivo...</p>
          </div>
        ) : filteredStreamers.length > 0 ? (
          <div className="streamer-grid">
            {filteredStreamers.map((streamer) => (
              <StreamerCard key={streamer.username} streamer={streamer} />
            ))}
          </div>
        ) : (
          <div className="state-panel empty-panel" role="status">
            <span className="empty-piece" aria-hidden="true">♘</span>
            <h2>
              {streamers.length === 0
                ? 'Nenhum streamer ao vivo por enquanto.'
                : 'Nenhum streamer encontrado.'}
            </h2>
            <p>
              {streamers.length === 0
                ? 'Volte em alguns minutos para conferir as próximas transmissões.'
                : `Não encontramos resultados para “${search.trim()}”. Tente outro nome.`}
            </p>
            {streamers.length > 0 && (
              <button
                className="text-button"
                type="button"
                onClick={() => setSearch('')}
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Feito para quem pensa várias jogadas à frente.</span>
        <span>Dados fornecidos por Chess.com</span>
      </footer>
    </main>
  )
}

export default App
