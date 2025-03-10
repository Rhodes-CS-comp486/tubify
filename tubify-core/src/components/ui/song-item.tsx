import { Button } from "@/components/ui/button"
import { Music, Play } from "lucide-react"

// song type
interface Song {
  id: number
  spotify_id: string
  name: string
  artist: string
  album?: string
  duration_ms?: number
  preview_url?: string
  album_art_url?: string
  created_at: string
}

// format duration from ms to mm:ss
const formatDuration = (ms: number | undefined) => {
  if (!ms) return "--:--"
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

interface SongItemProps {
  song: Song
  index: number
  playlistPublicId: string
}

export function SongItem({ song, index }: SongItemProps) {

  return (
    <div className="grid grid-cols-12 gap-4 rounded-md p-2 text-sm hover:bg-slate-900">
      <div className="col-span-1 flex items-center text-slate-400">
        {index + 1}
      </div>
      <div className="col-span-5 flex items-center gap-3">
        {song.album_art_url ? (
          <img
            src={song.album_art_url}
            alt={song.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-800">
            <Music className="h-5 w-5 text-slate-600" />
          </div>
        )}
        <div className="truncate">
          <div className="font-medium text-white">{song.name}</div>
          {song.album && (
            <div className="truncate text-xs text-slate-500">
              {song.album}
            </div>
          )}
        </div>
      </div>
      <div className="col-span-3 flex items-center text-slate-300">
        {song.artist}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2 text-slate-400">
        {song.preview_url && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full hover:bg-green-900/30 hover:text-green-500"
            onClick={(e) => {
              e.stopPropagation()
              window.open(song.preview_url, "_blank")
            }}
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
        <span>{formatDuration(song.duration_ms)}</span>
      </div>
    </div>
  )
} 