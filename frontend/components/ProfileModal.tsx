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
  languages?: string[];
  hobbies?: string[];
  interests?: string[];
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
      try {
        setIsLoading(true);
        setError(null);
        const data = await profileApi.getUserProfile(String(userId));
        setProfile(data as Profile);
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
                    <Image
                      src={profile.profilePictureURL && profile.profilePictureURL.trim() !== "" ? profile.profilePictureURL : "/sitefiles/default-profile-picture.png"}
                      alt={`${profile.firstName || ""} ${profile.lastName || ""}`}
                      width={160}
                      height={160}
                      className="rounded-full border-4 border-white shadow"
                    />
                    <h4 className="mt-4 text-xl font-semibold text-gray-900">
                      {(profile.firstName || "").trim()} {(profile.lastName || "").trim()}
                    </h4>
                    {profile.city || profile.country ? (
                      <p className="text-sm text-gray-500">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
                    ) : null}
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
                      {(profile?.languages?.length ?? 0) > 0 ? (
                        <div>
                          <div className="text-sm text-gray-500">Languages</div>
                          <div className="text-gray-800">{profile?.languages?.join(", ")}</div>
                        </div>
                      ) : null}
                    </div>

                    {/* Bio lists if present */}
                    {((profile?.hobbies?.length ?? 0) > 0 || (profile?.interests?.length ?? 0) > 0) ? (
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


