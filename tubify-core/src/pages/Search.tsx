import { useState, useEffect } from "react"
import { TubifyTitle } from "@/components/ui/tubify-title"
import api, { AxiosError } from "@/lib/axios"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

// define interfaces for search results
interface UserSearchResult {
  id: number
  username: string
  profile_picture: string
}

interface PlaylistSearchResult {
  public_id: string
  name: string
  description?: string
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("")
  const [userResults, setUserResults] = useState<UserSearchResult[]>([])
  const [playlistResults, setPlaylistResults] = useState<PlaylistSearchResult[]>([])
  const [isAddingFriend, setIsAddingFriend] = useState<{ [key: number]: boolean }>({})

  const navigate = useNavigate()

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  useEffect(() => {
    if (searchQuery) {
      // run the queries when the searchQuery changes
      const fetchResults = async () => {
        try {
          const userResponse = await api.get<UserSearchResult[]>(`/api/search/users?query=${searchQuery}`)
          const playlistResponse = await api.get<PlaylistSearchResult[]>(`/api/search/playlists?query=${searchQuery}`)
          setUserResults(Array.isArray(userResponse.data) ? userResponse.data : [])
          setPlaylistResults(Array.isArray(playlistResponse.data) ? playlistResponse.data : [])
        } catch (error) {
          console.error("Error fetching search results:", error)
          setUserResults([])
          setPlaylistResults([])
        }
      }

      fetchResults()
    } else {
      setUserResults([])
      setPlaylistResults([])
    }
  }, [searchQuery])

  const handleAddFriend = async (username: string, userId: number) => {
    try {
      setIsAddingFriend(prev => ({ ...prev, [userId]: true }))
      await api.post(`/api/profile/add-friend/${username}`)
      toast.success("Friend request sent!")
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>
      if (axiosError.response?.data?.detail) {
        toast.error(axiosError.response.data.detail)
      } else {
        toast.error("Failed to send friend request")
      }
    } finally {
      setIsAddingFriend(prev => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <div className="overflow-hidden flex flex-col min-h-screen bg-neutral-800">
      <div className="absolute top-0 left-0">
        <TubifyTitle />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 mt-16 sm:mt-0">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full max-w-6xl px-4">
          {/* search input section - full width on mobile, 1/3 on desktop */}
          <div className="flex flex-col items-center gap-4 w-full sm:w-1/3 bg-neutral-700 border border-neutral-600 rounded-lg p-4 sm:p-6">
            <h2 className="text-white text-xl">Search</h2>
            <div className="w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Search users or playlists..."
                className="w-full p-3 rounded-md bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          {/* results section - full width on mobile, 2/3 on desktop */}
          <div className="flex flex-col gap-4 w-full sm:w-2/3 bg-neutral-700 border border-neutral-600 rounded-lg p-4 sm:p-6">
            <h2 className="text-white text-xl">results</h2>
            
            {/* users section */}
            {userResults.length > 0 && (
              <div className="w-full">
                <h3 className="text-white text-lg mb-4">users</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userResults.map((user) => (
                    <div 
                      key={user.id}
                      className="flex flex-col items-center gap-3 bg-slate-700 border border-neutral-600 rounded-lg hover:bg-slate-800 p-4 transition-[color,box-shadow,background-color,border-color] duration-200"
                    >
                      <div 
                        className="flex flex-col items-center gap-3 cursor-pointer w-full"
                        onClick={() => navigate(`/users/${user.username}`)}
                      >
                        <img
                          src={user.profile_picture}
                          alt={user.username}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                        />
                        <span className="text-white text-center font-medium truncate w-full">
                          {user.username}
                        </span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFriend(user.username, user.id);
                        }}
                        disabled={isAddingFriend[user.id]}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        {isAddingFriend[user.id] ? "Sending..." : "Add Friend"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* playlists section */}
            {playlistResults.length > 0 && (
              <div className="w-full mt-6">
                <h3 className="text-white text-lg mb-4">playlists</h3>
                <div className="grid grid-cols-1 gap-4">
                  {playlistResults.map((playlist) => (
                    <div
                      key={playlist.public_id}
                      className="flex flex-col gap-2 bg-slate-700 border border-neutral-600 rounded-lg hover:bg-slate-800 p-4 transition-[color,box-shadow,background-color,border-color] duration-200 cursor-pointer"
                      onClick={() => navigate(`/users/playlists/${playlist.public_id}`)}
                    >
                      <span className="text-white font-medium truncate">{playlist.name}</span>
                      {playlist.description && (
                        <p className="text-sm text-neutral-400 truncate">{playlist.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* no results message */}
            {searchQuery && !userResults.length && !playlistResults.length && (
              <div className="text-center text-neutral-400 py-8">
                no results found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}