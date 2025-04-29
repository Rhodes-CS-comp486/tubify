from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from auth import get_current_user, User
from database import database
import urllib.parse
import re
import os
from dotenv import load_dotenv


class SongReview(BaseModel):
    id: int
    user_id: int
    song_id: str
    rating: int = Field(..., ge=1, le=5)  # Rating between 1 and 5
    review_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AlbumReview(BaseModel):
    id: int
    user_id: int
    album_id: str
    rating: int = Field(..., ge=1, le=5)  # Rating between 1 and 5
    review_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


router = APIRouter(prefix="/api/reviews", tags=["reviews"])


# Add a song review
@router.post("/songs", response_model=SongReview)
async def add_song_review(
    song_id: str,
    rating: int,
    review_text: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    try:
        review_id = await database.execute(
            """
            INSERT INTO song_reviews (user_id, song_id, rating, review_text)
            VALUES (:user_id, :song_id, :rating, :review_text)
            RETURNING id
            """,
            {
                "user_id": user.id,
                "song_id": song_id,
                "rating": rating,
                "review_text": review_text,
            },
        )
        return {
            "id": review_id,
            "user_id": user.id,
            "song_id": song_id,
            "rating": rating,
            "review_text": review_text,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to add song review")


# Add an album review
@router.post("/albums", response_model=AlbumReview)
async def add_album_review(
    album_id: str,
    rating: int,
    review_text: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    try:
        review_id = await database.execute(
            """
            INSERT INTO album_reviews (user_id, album_id, rating, review_text)
            VALUES (:user_id, :album_id, :rating, :review_text)
            RETURNING id
            """,
            {
                "user_id": user.id,
                "album_id": album_id,
                "rating": rating,
                "review_text": review_text,
            },
        )
        return {
            "id": review_id,
            "user_id": user.id,
            "album_id": album_id,
            "rating": rating,
            "review_text": review_text,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to add album review")


# Get reviews for a specific user
@router.get("/user/{username}", response_model=List[SongReview])
async def get_user_reviews(username: str):
    user = await database.fetch_one(
        "SELECT id FROM users WHERE username = :username", {"username": username}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    song_reviews = await database.fetch_all(
        """
        SELECT * FROM song_reviews WHERE user_id = :user_id
        """,
        {"user_id": user["id"]},
    )

    album_reviews = await database.fetch_all(
        """
        SELECT * FROM album_reviews WHERE user_id = :user_id
        """,
        {"user_id": user["id"]},
    )

    return {"song_reviews": song_reviews, "album_reviews": album_reviews}


# Get all reviews (for the public reviews page)
@router.get("/", response_model=List[SongReview])
async def get_all_reviews():
    song_reviews = await database.fetch_all("SELECT * FROM song_reviews")
    album_reviews = await database.fetch_all("SELECT * FROM album_reviews")
    return {"song_reviews": song_reviews, "album_reviews": album_reviews}


# Get all reviews for a specific song
@router.get("/songs/{song_id}", response_model=List[SongReview])
async def get_song_reviews(song_id: str):
    try:
        song_reviews = await database.fetch_all(
            """
            SELECT * FROM song_reviews
            WHERE song_id = :song_id
            ORDER BY created_at DESC
            """,
            {"song_id": song_id},
        )
        return [dict(review) for review in song_reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch song reviews")


# Get all reviews for a specific album
@router.get("/albums/{album_id}", response_model=List[AlbumReview])
async def get_album_reviews(album_id: str):
    try:
        album_reviews = await database.fetch_all(
            """
            SELECT * FROM album_reviews
            WHERE album_id = :album_id
            ORDER BY created_at DESC
            """,
            {"album_id": album_id},
        )
        return [dict(review) for review in album_reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch album reviews")


# Get top albums (sorted by rating)
@router.get("/top_albums", response_model=List[AlbumReview])
async def get_top_albums():
    try:
        top_albums = await database.fetch_all(
            """
            SELECT album_id, AVG(rating) as average_rating
            FROM album_reviews
            GROUP BY album_id
            ORDER BY average_rating DESC
            LIMIT 10
            """
        )
        return [dict(album) for album in top_albums]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch top albums")
