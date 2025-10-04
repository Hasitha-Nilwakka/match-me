"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { profileApi } from "../lib/api";

interface ProfileModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: Profile | null; // optional, for mock data usage
}

type Profile = {
  firstName?: string;
  lastName?: string;
  aboutMe?: string;
  gender?: string;
  status?: string;
  relationshipStatus?: string;
  ethnicity?: string;
  religion?: string;
  languages?: string[];
  hobbies?: string[];
  interests?: string[];
  foodPreferences?: string[];
  musicGenres?: string[];
  movieGenres?: string[];
  travelTypes?: string[];
  city?: string;
  country?: string;
  profilePictureURL?: string;
};

export default function ProfileModal({ userId, isOpen, onClose, initialProfile = null }: ProfileModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isOpen) return;
      // If initialProfile is provided (mock), use it and skip API
      if (initialProfile) {
        setProfile(initialProfile);
        return;
      }
      if (!userId) return;
      
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Please log in to view profiles");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch profile and biographical data
        const [profileData, bioData] = await Promise.all([
          profileApi.getUserProfile(String(userId)).catch(() => null), // Gracefully handle profile fetch failures
          profileApi.getUserBio(String(userId)).catch(() => null) // Gracefully handle bio fetch failures
        ]);
        
        // Handle cases where API calls returned null (due to errors)
        if (!profileData) {
          setError("Failed to load profile");
          return;
        }
        
        // Merge profile and biographical data
        const combinedProfile = {
          ...profileData,
          ...bioData,
        };
        
        setProfile(combinedProfile as Profile);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load profile";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [isOpen, userId, initialProfile]);

  // Close on ESC (hook always registered; only active when open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center text-red-600">{error}</div>
            ) : profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Left - Picture */}
                <div className="sm:col-span-1">
                  <div className="flex flex-col items-center">
                    {(() => {
                      // Use the same logic as profile page for handling different URL formats
                      const profilePicSrc = profile.profilePictureURL && profile.profilePictureURL.startsWith('http')
                        ? profile.profilePictureURL
                        : profile.profilePictureURL && profile.profilePictureURL.startsWith('/uploads')
                        ? `http://192.168.101.115:8080${profile.profilePictureURL}`
                        : profile.profilePictureURL && profile.profilePictureURL.startsWith('/')
                        ? profile.profilePictureURL
                        : "/sitefiles/default-profile-picture.png";
                      
                      
                      return (
                        <Image
                          src={profilePicSrc}
                          alt={`${profile.firstName || ""} ${profile.lastName || ""}`}
                          width={160}
                          height={160}
                          className="rounded-full border-4 border-white shadow"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/sitefiles/default-profile-picture.png";
                          }}
                        />
                      );
                    })()}
                    <h4 className="mt-4 text-xl font-semibold text-gray-900">
                      {(profile.firstName || "").trim()} {(profile.lastName || "").trim()}
                    </h4>
                    {profile.city || profile.country ? (
                      <div className="mt-2 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-400">
                        Location not available
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - Details */}
                <div className="sm:col-span-2">
                  <div className="space-y-4">
                    {profile.aboutMe ? (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700">About</h5>
                        <p className="mt-1 text-gray-800 leading-relaxed">{profile.aboutMe}</p>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-4">
                      {profile?.gender ? (
                        <div>
                          <div className="text-sm text-gray-500">Gender</div>
                          <div className="text-gray-800">{profile?.gender}</div>
                        </div>
                      ) : null}
                      {profile?.status ? (
                        <div>
                          <div className="text-sm text-gray-500">Status</div>
                          <div className="text-gray-800">{profile?.status}</div>
                        </div>
                      ) : null}
                      {profile?.relationshipStatus ? (
                        <div>
                          <div className="text-sm text-gray-500">Relationship</div>
                          <div className="text-gray-800">{profile?.relationshipStatus}</div>
                        </div>
                      ) : null}
        <div>
          <div className="text-sm text-gray-500">Location</div>
          <div className="text-gray-800">
            {(profile?.city || profile?.country) ? 
              [profile?.city, profile?.country].filter(Boolean).join(", ") : 
              "Not specified"
            }
          </div>
        </div>
                    </div>

                    {/* Additional profile info */}
                    <div className="grid grid-cols-2 gap-4">
                      {profile?.ethnicity ? (
                        <div>
                          <div className="text-sm text-gray-500">Ethnicity</div>
                          <div className="text-gray-800">{profile?.ethnicity}</div>
                        </div>
                      ) : null}
                      {profile?.religion ? (
                        <div>
                          <div className="text-sm text-gray-500">Religion</div>
                          <div className="text-gray-800">{profile?.religion}</div>
                        </div>
                      ) : null}
                    </div>

                    {/* Bio lists if present */}
                    {((profile?.hobbies?.length ?? 0) > 0 || (profile?.interests?.length ?? 0) > 0 || 
                      (profile?.languages?.length ?? 0) > 0 || (profile?.foodPreferences?.length ?? 0) > 0 ||
                      (profile?.musicGenres?.length ?? 0) > 0 || (profile?.movieGenres?.length ?? 0) > 0 ||
                      (profile?.travelTypes?.length ?? 0) > 0) ? (
                      <div className="grid grid-cols-2 gap-4">
                        {(profile?.hobbies?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Hobbies</div>
                            <div className="text-gray-800">{profile?.hobbies?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.interests?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Interests</div>
                            <div className="text-gray-800">{profile?.interests?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.languages?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Languages</div>
                            <div className="text-gray-800">{profile?.languages?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.foodPreferences?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Food Preferences</div>
                            <div className="text-gray-800">{profile?.foodPreferences?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.musicGenres?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Music Genres</div>
                            <div className="text-gray-800">{profile?.musicGenres?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.movieGenres?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Movie Genres</div>
                            <div className="text-gray-800">{profile?.movieGenres?.join(", ")}</div>
                          </div>
                        ) : null}
                        {(profile?.travelTypes?.length ?? 0) > 0 ? (
                          <div>
                            <div className="text-sm text-gray-500">Travel Types</div>
                            <div className="text-gray-800">{profile?.travelTypes?.join(", ")}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600 py-12">No profile found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


