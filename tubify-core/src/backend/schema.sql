CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    oauth_provider VARCHAR(20),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);
CREATE TABLE IF NOT EXISTS spotify_credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    spotify_id VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_liked_songs_sync TIMESTAMP WITH TIME ZONE,
    liked_songs_sync_status VARCHAR(20) DEFAULT 'not_started',
    liked_songs_count INTEGER DEFAULT 0,
    UNIQUE(user_id)
);
CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    spotify_playlist_id VARCHAR(255),
    image_url TEXT,
    public_id VARCHAR(26) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT DEFAULT '',
    profile_picture TEXT DEFAULT 'https://ui-avatars.com/api/?name=User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS artists (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    popularity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS albums (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    release_date DATE NOT NULL,
    popularity INTEGER NOT NULL,
    album_type VARCHAR(50) NOT NULL,
    total_tracks INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS album_artists (
    album_id VARCHAR(255) REFERENCES albums(id) ON DELETE CASCADE,
    artist_id VARCHAR(255) REFERENCES artists(id) ON DELETE CASCADE,
    list_position INTEGER NOT NULL,
    PRIMARY KEY (album_id, artist_id)
);
CREATE TABLE IF NOT EXISTS songs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    album_id VARCHAR(255) REFERENCES albums(id) ON DELETE CASCADE,
    duration_ms INTEGER NOT NULL,
    spotify_uri TEXT NOT NULL,
    spotify_url TEXT NOT NULL,
    popularity INTEGER NOT NULL,
    explicit BOOLEAN DEFAULT FALSE,
    track_number INTEGER NOT NULL,
    disc_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS song_audio_features (
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE PRIMARY KEY,
    mfcc JSONB NOT NULL,
    chroma JSONB NOT NULL,
    spectral_contrast JSONB NOT NULL,
    tempo FLOAT,
    acousticness FLOAT,
    danceability FLOAT,
    energy FLOAT,
    loudness FLOAT,
    liveness FLOAT,
    valence FLOAT,
    speechiness FLOAT,
    instrumentalness FLOAT,
    mode INTEGER,
    key INTEGER,
    feature_vector FLOAT[] NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS song_lyrics (
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE PRIMARY KEY,
    lyrics TEXT NOT NULL,
    lyrics_embedding FLOAT[] NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS artist_genres (
    artist_id VARCHAR(255) REFERENCES artists(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, genre_id)
);
CREATE TABLE IF NOT EXISTS song_artists (
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE,
    artist_id VARCHAR(255) REFERENCES artists(id) ON DELETE CASCADE,
    list_position INTEGER NOT NULL,
    PRIMARY KEY (song_id, artist_id)
);
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, song_id)
);
CREATE TABLE IF NOT EXISTS user_liked_songs (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, song_id)
);
CREATE TABLE IF NOT EXISTS liked_songs_sync_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    progress FLOAT DEFAULT 0,
    songs_processed INTEGER DEFAULT 0,
    songs_total INTEGER DEFAULT 0,
    current_operation TEXT,
    phase INTEGER DEFAULT 1,
    total_phases INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS similarity_presentations (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metrics JSON
);
CREATE TABLE IF NOT EXISTS similarity_presentation_users (
    presentation_id INTEGER REFERENCES similarity_presentations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (presentation_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS song_youtube_videos (
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(255) NOT NULL,
    video_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (song_id, youtube_video_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    song_id VARCHAR NOT NULL REFERENCES songs(id),
    source TEXT,
    recommended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id SERIAL PRIMARY KEY,
    song_id VARCHAR NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked BOOLEAN NOT NULL,
    source VARCHAR(50),
    feedback_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(song_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_cluster_cache (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cluster_data JSONB NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS song_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id VARCHAR(255) REFERENCES songs(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id)
);

CREATE TABLE IF NOT EXISTS album_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    album_id VARCHAR(255) REFERENCES albums(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, album_id) 
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_spotify_credentials_user_id ON spotify_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_credentials_spotify_id ON spotify_credentials(spotify_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_user_id ON user_liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_song_id ON user_liked_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_liked_at ON user_liked_songs(user_id, liked_at);
CREATE INDEX IF NOT EXISTS idx_user_liked_songs_liked_at_desc ON user_liked_songs(user_id, liked_at DESC);
CREATE INDEX IF NOT EXISTS idx_liked_songs_sync_jobs_user_id ON liked_songs_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_sync_jobs_status ON liked_songs_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_similarity_presentations_creator_id ON similarity_presentations(creator_id);
CREATE INDEX IF NOT EXISTS idx_similarity_presentation_users_presentation_id ON similarity_presentation_users(presentation_id);
CREATE INDEX IF NOT EXISTS idx_similarity_presentation_users_user_id ON similarity_presentation_users(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON songs(album_id);
CREATE INDEX IF NOT EXISTS idx_song_artists_song_id ON song_artists(song_id);
CREATE INDEX IF NOT EXISTS idx_song_artists_artist_id ON song_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_song_artists_list_position ON song_artists(song_id, list_position);
CREATE INDEX IF NOT EXISTS idx_album_artists_album_id ON album_artists(album_id);
CREATE INDEX IF NOT EXISTS idx_album_artists_artist_id ON album_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_album_artists_list_position ON album_artists(album_id, list_position);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_artist_genres_artist_id ON artist_genres(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_genres_genre_id ON artist_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);
CREATE INDEX IF NOT EXISTS idx_songs_name ON songs(name);
CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity);
CREATE INDEX IF NOT EXISTS idx_songs_duration ON songs(duration_ms);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_liked_songs_sync_jobs_updated ON liked_songs_sync_jobs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotify_credentials_liked_songs ON spotify_credentials(user_id, liked_songs_sync_status, last_liked_songs_sync);
CREATE INDEX IF NOT EXISTS idx_genres_id_to_name ON genres(id);
CREATE INDEX IF NOT EXISTS idx_song_youtube_videos_video_type ON song_youtube_videos(video_type);
CREATE INDEX IF NOT EXISTS idx_song_audio_features_song_id ON song_audio_features(song_id);
CREATE INDEX IF NOT EXISTS idx_song_lyrics_song_id ON song_lyrics(song_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_song_id ON recommendations(song_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_song ON recommendations(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_time ON recommendations(user_id, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_song_id ON recommendation_feedback(song_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_time ON recommendation_feedback(user_id, feedback_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_compound ON recommendation_feedback(song_id, user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_liked ON recommendation_feedback(liked);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_song_user_liked ON recommendation_feedback(song_id, user_id, liked);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_liked_time ON recommendation_feedback(user_id, liked, feedback_at DESC);
