import { useContext, useEffect, useState, useRef } from "react"
import { AuthContext } from "@/contexts/auth"
import { TubifyTitle } from "@/components/ui/tubify-title"
import api, { AxiosError } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, X, Check, Music, UserPlus, Bell, Users } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { Icons } from "@/components/icons"
import { useNavigate, useLoaderData } from "react-router-dom"
import { ProfileData } from "@/loaders/user-loaders"
import { LikedSongsSync } from "@/components/ui/liked-songs-sync"
import { Badge } from "@/components/ui/badge"
import useResizeObserver from "@react-hook/resize-observer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "username must be at least 3 characters")
    .max(50, "username must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "username can only contain letters, numbers, periods, underscores, and hyphens",
    ),
  bio: z.string().max(500, "bio must be less than 500 characters"),
})

interface Profile {
  user_name: string
  profile_picture: string
  bio: string
}

interface Friend {
  id: number
  username: string
  profile_picture: string
}

interface FriendRequest {
  sender_id: number
  receiver_id: number
  status: string
  username: string
}

export default function Profile() {
  const { isAuthenticated, logout } = useContext(AuthContext)
  const { profile, friends, friendRequests, isSpotifyConnected, likedSongs } =
    useLoaderData() as ProfileData
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<{
    username: string
    bio: string
  }>({
    username: profile?.user_name || "",
    bio: profile?.bio || "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const usernameCheckTimeout = useRef<NodeJS.Timeout>()
  const navigate = useNavigate()
  const [searchUsername, setSearchUsername] = useState("")
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [localFriends, setLocalFriends] = useState<Friend[]>(friends)
  const [localFriendRequests, setLocalFriendRequests] =
    useState<FriendRequest[]>(friendRequests)
  const friendsContainerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0 })
  
  useEffect(() => {
    if (friendsContainerRef.current) {
      setSize({ width: friendsContainerRef.current.offsetWidth })
    }
  }, [])
  
  useResizeObserver(friendsContainerRef, (entry) => {
    setSize({ width: entry.contentRect.width })
  })

  const handleAddFriend = async () => {
    try {
      setIsAddingFriend(true)
      await api.post(`/api/profile/add-friend/${searchUsername}`)
      toast.success("friend request sent!")

      // clear the search input
      setSearchUsername("")
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("failed to add friend:", error)
      }

      // display the specific error message from the backend
      const axiosError = error as AxiosError<{ detail: string }>
      if (axiosError.response?.data?.detail) {
        toast.error(axiosError.response.data.detail)
      } else {
        toast.error("failed to send friend request")
      }
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleAcceptFriendRequest = async (senderId: number) => {
    try {
      const response = await api.post(
        `/api/profile/accept-friend-request/${senderId}`,
      )
      toast.success("friend request accepted!")

      // get the accepted friend from the response
      const acceptedFriend = response.data

      // update local state
      setLocalFriends((prevFriends) => [...prevFriends, acceptedFriend])
      setLocalFriendRequests((prevRequests) =>
        prevRequests.filter((request) => request.sender_id !== senderId),
      )
    } catch (error) {
      console.error("failed to accept friend request:", error)

      // display the specific error message from the backend
      const axiosError = error as AxiosError<{ detail: string }>
      if (axiosError.response?.data?.detail) {
        toast.error(axiosError.response.data.detail)
      } else {
        toast.error("failed to accept friend request")
      }
    }
  }

  const handleRejectFriendRequest = async (senderId: number) => {
    try {
      await api.post(`/api/profile/reject-friend-request/${senderId}`)
      toast.success("friend request rejected")

      // update local state by removing the rejected request
      setLocalFriendRequests((prevRequests) =>
        prevRequests.filter((request) => request.sender_id !== senderId),
      )
    } catch (error) {
      console.error("failed to reject friend request:", error)

      // display the specific error message from the backend
      const axiosError = error as AxiosError<{ detail: string }>
      if (axiosError.response?.data?.detail) {
        toast.error(axiosError.response.data.detail)
      } else {
        toast.error("failed to reject friend request")
      }
    }
  }

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await api.post(`/api/profile/remove-friend/${friendId}`)
      toast.success("friend removed!")
      // update local friends state by filtering out the removed friend
      setLocalFriends((prevFriends) =>
        prevFriends.filter((friend) => friend.id !== friendId),
      )
    } catch (error) {
      console.error("failed to remove friend:", error)

      // display the specific error message from the backend
      const axiosError = error as AxiosError<{ detail: string }>
      if (axiosError.response?.data?.detail) {
        toast.error(axiosError.response.data.detail)
      } else {
        toast.error("failed to remove friend")
      }
    }
  }

  // username check effect
  useEffect(() => {
    if (!isEditing) return

    const username = editForm.username
    if (!username || username.length < 3 || username === profile?.user_name) {
      setUsernameError(null)
      return
    }

    // clear any existing timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current)
    }

    // set a new timeout to check username
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        setIsCheckingUsername(true)
        const response = await api.get(`/api/auth/check-username/${username}`)
        if (!response.data.available) {
          setUsernameError("this username is already taken")
        } else {
          setUsernameError(null)
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("failed to check username:", error)
        }
      } finally {
        setIsCheckingUsername(false)
      }
    }, 500) // debounce for 500ms

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current)
      }
    }
  }, [editForm.username, isEditing, profile?.user_name])

  const handleEdit = () => {
    if (!profile) return
    setEditForm({
      username: profile.user_name,
      bio: profile.bio,
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (profile) {
      setEditForm({
        username: profile.user_name,
        bio: profile.bio,
      })
    }
  }

  const handleSave = async () => {
    try {
      const validationResult = profileSchema.safeParse(editForm)
      if (!validationResult.success) {
        const error = validationResult.error.issues[0]
        toast.error(error.message)
        return
      }

      if (usernameError) {
        toast.error(usernameError)
        return
      }

      setIsSaving(true)
      await api.put("/api/profile", editForm)
      // update local profile state
      navigate(".", { replace: true }) // refresh the page to get updated data
      setIsEditing(false)
      toast.success("profile updated successfully")
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("failed to update profile:", error)
      }
      toast.error("failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    // clear all local storage
    localStorage.clear()

    await logout()
  }

  // redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth")
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) {
    return (
      <div className="overflow-hidden flex flex-col min-h-screen bg-linear-to-b from-slate-900 to-black">
        <div className="absolute top-0 left-0">
          <TubifyTitle />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="p-8 rounded-xl border border-slate-700 bg-slate-800/60 text-center">
            <p className="text-white text-lg">Please sign in to view your profile.</p>
            <Button className="mt-4" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="overflow-hidden flex flex-col min-h-screen bg-linear-to-b from-slate-900 to-black">
        <div className="absolute top-0 left-0">
          <TubifyTitle />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="p-8 rounded-xl border border-slate-700 bg-slate-800/60 text-center">
            <Icons.spinner className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-white">No profile data available.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scrollable-page bg-linear-to-b from-slate-900 to-black min-h-screen flex flex-col items-center">
      <div className="absolute top-0 left-0">
        <TubifyTitle />
      </div>
      
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 mx-auto">       
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {/* profile card */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col items-center relative">
            <Button
              onClick={handleEdit}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/10"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-4 border-2 border-slate-600 flex items-center justify-center flex-shrink-0">
              <img
                src={profile.profile_picture}
                alt={`${profile.user_name}'s profile`}
                className="w-full h-full object-cover"
              />
            </div>

            {isEditing ? (
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white">username</label>
                  <div className="relative">
                    <Input
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm({ ...editForm, username: e.target.value })
                      }
                      className={`bg-slate-700/50 border-slate-600 text-white ${usernameError ? "border-red-500" : ""}`}
                      placeholder="enter your username"
                    />
                    {isCheckingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Icons.spinner className="h-4 w-4 animate-spin text-white/50" />
                      </div>
                    )}
                  </div>
                  {usernameError && (
                    <p className="text-sm text-red-500">{usernameError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white">bio</label>
                  <div className="relative">
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white min-h-[100px] resize-none"
                      placeholder="tell us about yourself"
                      maxLength={500}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-white/50">
                      {editForm.bio.length}/500
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="spotify"
                    className="flex-1"
                  >
                    {isSaving ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={isSaving}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full h-full">
                <h2 className="text-white text-xl font-semibold">
                  {profile.user_name}
                </h2>
                <div className="text-slate-400 text-center mt-2 mb-6 break-words whitespace-pre-wrap max-w-full">
                  {profile.bio || "no bio yet"}
                </div>
                <div className="mt-auto w-full">
                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    className="w-full"
                  >
                    sign out
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* friends and connections */}
          <div className="md:col-span-2 space-y-5">
            {/* friend actions */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  connections
                </h2>
                
                {/* friend requests dropdown */}
                <div className="flex gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="relative bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        requests
                        {localFriendRequests.length > 0 && (
                          <Badge 
                            className="ml-2 bg-green-600 hover:bg-green-600"
                          >
                            {localFriendRequests.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>friend requests</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      
                      {localFriendRequests.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-slate-400">
                          no pending requests
                        </div>
                      ) : (
                        <DropdownMenuGroup className="max-h-60 overflow-y-auto">
                          {localFriendRequests.map((request) => (
                            <div key={request.sender_id} className="p-2">
                              <div className="flex items-center mb-2">
                                <span className="font-medium">{request.username}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAcceptFriendRequest(request.sender_id)}
                                  variant="spotify"
                                  size="sm"
                                  className="w-full"
                                >
                                  accept
                                </Button>
                                <Button
                                  onClick={() => handleRejectFriendRequest(request.sender_id)}
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                >
                                  reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </DropdownMenuGroup>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* add friend */}
                  <div className="flex items-center">
                    <Input
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="find by username"
                      className="bg-slate-700/50 border-slate-600 text-white h-9 w-44"
                    />
                    <Button
                      onClick={handleAddFriend}
                      disabled={isAddingFriend || !searchUsername}
                      variant="outline"
                      size="sm"
                      className="ml-2 bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                    >
                      {isAddingFriend ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* friends grid */}
              {localFriends.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <Users className="mx-auto h-10 w-10 opacity-50 mb-1" />
                  <p>you don't have any friends yet</p>
                  <p className="text-sm mt-1">search for users and add them as friends</p>
                </div>
              ) : (
                <div 
                  ref={friendsContainerRef} 
                  className="h-36 w-full"
                >
                  {size.width > 0 && (
                    <div className="h-36 w-full overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">
                        {localFriends.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex flex-col bg-slate-700/50 border border-slate-600 rounded-lg p-2 transition-colors hover:bg-slate-700"
                          >
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => navigate(`/users/${friend.username}`)}
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-slate-600">
                                <img
                                  src={friend.profile_picture}
                                  alt={friend.username}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="overflow-hidden">
                                <span className="text-white text-sm font-medium truncate block">
                                  {friend.username}
                                </span>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveFriend(friend.id)
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-5 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                >
                                  remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* spotify/music section */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white flex items-center mb-4">
                <Music className="w-5 h-5 mr-2" />
                music
              </h2>

              <div className="space-y-3">
                {isSpotifyConnected ? (
                  <>
                    <Button
                      onClick={() => navigate("/playlists")}
                      variant="spotify"
                      className="w-full flex items-center justify-center"
                    >
                      <Icons.spotify className="mr-2 h-4 w-4" />
                      my playlists
                    </Button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => navigate("/recently-played")}
                        variant="outline"
                        className="bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                      >
                        recently played tracks
                      </Button>
                      
                      <Button
                        onClick={() => navigate("/listening-habits")}
                        variant="outline"
                        className="bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                      >
                        <Icons.chartBarBig className="mr-2 h-4 w-4" />
                        listening habits
                      </Button>
                    </div>
                    
                    <div className="pt-3">
                      <LikedSongsSync
                        initialStatus={
                          profile && profile.user_name && likedSongs
                            ? {
                                syncStatus: likedSongs.syncStatus,
                                lastSynced: likedSongs.lastSynced,
                                count: likedSongs.count,
                              }
                            : undefined
                        }
                      />
                    </div>

                    {likedSongs && likedSongs.count > 0 && (
                      <Button
                        onClick={() => navigate("/liked-songs")}
                        variant="outline"
                        className="w-full mt-3 bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                      >
                        <Music className="mr-2 h-4 w-4" />
                        view liked songs
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    className="w-full flex cursor-not-allowed items-center justify-center bg-slate-700 hover:bg-slate-600"
                    onClick={() =>
                      toast.error("please connect spotify to access playlists")
                    }
                  >
                    <Icons.spotify className="mr-2 h-4 w-4" />
                    connect spotify to create playlists
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
