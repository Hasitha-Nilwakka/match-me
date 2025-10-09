"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, profileApi, recommendationsApi, getApiUrl } from "../../lib/api";
import ProfileModal from "../../components/ProfileModal";
import Navigation from "../../components/Navigation";
import { useDataMode } from "../../context/DataModeContext";

interface Recommendation {
  id: number;
  score: number;
  profilePictureURL?: string;
  isOnline?: boolean;
  lastSeen?: string;
  normalizedScore?: number;
  band?: string;
  userInfo?: {
    id: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };
  profile?: {
    firstName: string;
    lastName: string;
    aboutMe?: string;
    gender?: string;
    status?: string;
    city?: string;
    country?: string;
  };
  bio?: {
    interests: string[];
    hobbies: string[];
    musicGenres: string[];
    movieGenres: string[];
    foodPreferences: string[];
    travelTypes: string[];
    languages: string[];
  };
}

export default function FrontPage() {
  const { mode } = useDataMode();

  // Debug: Log mode changes
  useEffect(() => {
    console.log("🔄 MODE CHANGED TO:", mode);
    console.log("🔄 localStorage value:", localStorage.getItem("MM_DATA_MODE"));
  }, [mode]);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [myBio, setMyBio] = useState<{
    interests: string[];
    hobbies: string[];
    musicGenres: string[];
    movieGenres: string[];
    foodPreferences: string[];
    travelTypes: string[];
    languages: string[];
  }>({ interests: [], hobbies: [], musicGenres: [], movieGenres: [], foodPreferences: [], travelTypes: [], languages: [] });
  const [mySeeking, setMySeeking] = useState<{
    genderPreference?: string;
    statusPreference?: string;
    genderWeight: number;
    statusWeight: number;
    relationshipWeight: number;
    locationWeight: number;
    languagesWeight: number;
    interestsWeight: number;
    hobbiesWeight: number;
    foodPreferencesWeight: number;
    musicGenresWeight: number;
    movieGenresWeight: number;
    travelTypesWeight: number;
    ethnicityWeight: number;
    religionWeight: number;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentRecommendationIndex, setCurrentRecommendationIndex] =
    useState(0);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  // Get current recommendation
  const currentRec = recommendations[currentRecommendationIndex];

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    try {
      const currentUser = authApi.getCurrentUser();
      if (currentUser) {
        setUserProfile((prev) => ({
          ...prev,
          email: currentUser.email,
        }));
      }

      // Try to load profile data
      try {
        const profile = await profileApi.getMyProfile();
        setUserProfile((prev) => ({
          ...prev,
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
        }));
        // Load my biographical data for sub-scores
        try {
          const bio = await profileApi.getBiographicalData();
          setMyBio({
            interests: bio?.interests || [],
            hobbies: bio?.hobbies || [],
            musicGenres: bio?.musicGenres || [],
            movieGenres: bio?.movieGenres || [],
            foodPreferences: bio?.foodPreferences || [],
            travelTypes: bio?.travelTypes || [],
            languages: bio?.languages || [],
          });
        } catch (e) {
          console.warn(
            "Failed to load my biographical data for sub-scores:",
            e
          );
        }

        // Load seeking preferences for normalization
        try {
          const seekingData = await profileApi.getSeekingPreferences();
          setMySeeking({
            genderPreference: seekingData.genderPreference,
            statusPreference: seekingData.statusPreference,
            genderWeight: seekingData.genderWeight || 0,
            statusWeight: seekingData.statusWeight || 0,
            relationshipWeight: seekingData.relationshipWeight || 0,
            locationWeight: seekingData.locationWeight || 0,
            languagesWeight: seekingData.languagesWeight || 3,
            interestsWeight: seekingData.interestsWeight || 2,
            hobbiesWeight: seekingData.hobbiesWeight || 2,
            foodPreferencesWeight: seekingData.foodPreferencesWeight || 1,
            musicGenresWeight: seekingData.musicGenresWeight || 1,
            movieGenresWeight: seekingData.movieGenresWeight || 1,
            travelTypesWeight: seekingData.travelTypesWeight || 2,
            ethnicityWeight: seekingData.ethnicityWeight || 1,
            religionWeight: seekingData.religionWeight || 1,
          });
        } catch (e) {
          console.warn(
            "Failed to load seeking preferences for normalization:",
            e
          );
        }
        
        // Only load recommendations if profile is complete
        if (profile.firstName && profile.firstName.trim()) {
          // Load recommendations will be called by useEffect after component mounts
          console.log("Profile complete, recommendations will be loaded");
        } else {
          console.log("Profile incomplete, skipping recommendations");
        }
      } catch {
        console.log("No profile data found yet");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Overall normalization utilities (Option C) ---
  const computeMaxPossible = useCallback((): number => {
    // Backend default weights when seeking preferences are not set
    const defaultWeights = {
      hobbiesWeight: 2,
      interestsWeight: 2,
      musicGenresWeight: 1,
      movieGenresWeight: 1,
      foodPreferencesWeight: 1,
      travelTypesWeight: 2,
      languagesWeight: 3,
      ethnicityWeight: 1,
      religionWeight: 1,
      genderWeight: 0,
      statusWeight: 0,
    } as const;

    const s = mySeeking || {
      genderPreference: undefined,
      statusPreference: undefined,
      genderWeight: 0,
      statusWeight: defaultWeights.statusWeight,
      relationshipWeight: 0,
      locationWeight: 0,
      languagesWeight: defaultWeights.languagesWeight,
      interestsWeight: defaultWeights.interestsWeight,
      hobbiesWeight: defaultWeights.hobbiesWeight,
      foodPreferencesWeight: defaultWeights.foodPreferencesWeight,
      musicGenresWeight: defaultWeights.musicGenresWeight,
      movieGenresWeight: defaultWeights.movieGenresWeight,
      travelTypesWeight: defaultWeights.travelTypesWeight,
      ethnicityWeight: defaultWeights.ethnicityWeight,
      religionWeight: defaultWeights.religionWeight,
    };
    const isUnsetPref = (v?: string) => {
      if (!v) return true;
      const trimmed = v.trim();
      if (trimmed.length === 0) return true;
      const lower = trimmed.toLowerCase();
      return lower === 'any' || lower.startsWith('select');
    };
    // Multi-valued: countUserItems * weight
    let max = 0;
    max += (myBio.hobbies.length) * (s.hobbiesWeight || defaultWeights.hobbiesWeight);
    max += (myBio.interests.length) * (s.interestsWeight || defaultWeights.interestsWeight);
    max += (myBio.musicGenres.length) * (s.musicGenresWeight || defaultWeights.musicGenresWeight);
    max += (myBio.movieGenres.length) * (s.movieGenresWeight || defaultWeights.movieGenresWeight);
    max += (myBio.foodPreferences.length) * (s.foodPreferencesWeight || defaultWeights.foodPreferencesWeight);
    max += (myBio.travelTypes.length) * (s.travelTypesWeight || defaultWeights.travelTypesWeight);
    max += (myBio.languages.length) * (s.languagesWeight || defaultWeights.languagesWeight);
    // Exact/binary categories: always contribute their weight to denominator (per backend logic)
    max += (s.ethnicityWeight || defaultWeights.ethnicityWeight);
    max += (s.religionWeight || defaultWeights.religionWeight);
    // Gender/status only if preference set
    // Gender is not part of denominator; it is a hard filter only
    if (!isUnsetPref(s.statusPreference)) max += (s.statusWeight || 0);
    return max;
  }, [mySeeking, myBio]);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    try {
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem("token");
      if (!token) {
        console.log(
          "[FrontPage] User not authenticated, skipping recommendations load"
        );
        setRecommendations([]);
        return;
      }

      setIsLoadingRecommendations(true);
      console.log("Loading recommendations in mode:", mode);
      console.log("Mode type:", typeof mode, "Mode value:", mode);

      let recData: { recommendations: { id: number; score: number }[] };
      try {
        recData = await recommendationsApi.getRecommendations();
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
        setRecommendations([]);
        setCurrentRecommendationIndex(0);
        return;
      }

      // Check if we have any recommendations to process
      if (!recData.recommendations || recData.recommendations.length === 0) {
        console.log("No recommendations found, setting empty array");
        setRecommendations([]);
        setCurrentRecommendationIndex(0);
        return;
      }

      // Get detailed user info for each recommendation
      const detailedRecs = await Promise.all(
        recData.recommendations.map(
          async (rec: { id: number; score: number }) => {
            try {
              let userInfo, userProfile, userBio, onlineStatus;

              {
                console.log(`🔴 REAL USER DETAILS for user ${rec.id}`);
                console.log(`Fetching real user details for user ${rec.id}`);
                try {
                  // Use proper API functions instead of direct fetch calls
                  [userInfo, userProfile, userBio, onlineStatus] =
                    await Promise.all([
                      authApi.getUserById(String(rec.id)).catch(() => null), // Gracefully handle user fetch failures
                      profileApi
                        .getUserProfile(String(rec.id))
                        .catch(() => null), // Gracefully handle profile fetch failures
                      profileApi.getUserBio(String(rec.id)).catch(() => null), // Gracefully handle bio fetch failures
                      authApi
                        .getUserOnlineStatus(String(rec.id))
                        .catch(() => null), // Gracefully handle online status fetch failures
                    ]);
                  console.log(
                    `Successfully fetched details for user ${rec.id}:`,
                    { userInfo, userProfile, userBio, onlineStatus }
                  );

                  // Handle cases where API calls returned null (due to errors)
                  if (!userInfo) {
                    userInfo = {
                      id: rec.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      isActive: true,
                    };
                  }
                  if (!userProfile) {
                    userProfile = {
                      firstName: "Error",
                      lastName: `User ${rec.id}`,
                      aboutMe: "Failed to load profile",
                      gender: "N/A",
                      status: "error",
                    };
                  }
                  if (!userBio) {
                    userBio = {
                      interests: [],
                      hobbies: [],
                      musicGenres: [],
                      movieGenres: [],
                      foodPreferences: [],
                      travelTypes: [],
                      languages: [],
                    };
                  }
                  if (!onlineStatus) {
                    onlineStatus = {
                      userId: rec.id,
                      isOnline: false,
                      lastSeen: new Date().toISOString(),
                    };
                  }
                } catch (fetchError) {
                  console.error(
                    `Failed to fetch details for user ${rec.id}:`,
                    fetchError
                  );
                  // Fallback to mock data if real fetch fails
                  userInfo = {
                    id: rec.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isActive: true,
                  };
                  userProfile = {
                    firstName: "Error",
                    lastName: `User ${rec.id}`,
                    aboutMe: "Failed to load profile",
                    gender: "N/A",
                    status: "error",
                  };
                  userBio = {
                    interests: [],
                    hobbies: [],
                    musicGenres: [],
                    movieGenres: [],
                    foodPreferences: [],
                    travelTypes: [],
                    languages: [],
                  };
                  onlineStatus = {
                    userId: rec.id,
                    isOnline: false,
                    lastSeen: new Date().toISOString(),
                  };
                }
              }

              console.log(
                `Profile picture URL for user ${rec.id}:`,
                userProfile?.profilePictureURL
              );
              console.log(`Online status for user ${rec.id}:`, onlineStatus);
              return {
                ...rec,
                userInfo,
                profile: userProfile,
                bio: userBio,
                profilePictureURL:
                  userProfile?.profilePictureURL ||
                  "/sitefiles/default-profile-picture.png",
                isOnline: onlineStatus?.isOnline || false,
                lastSeen: onlineStatus?.lastSeen,
              };
            } catch (error) {
              console.error(`Error loading details for user ${rec.id}:`, error);
              return rec;
            }
          }
        )
      );
      
      // Attach verbal bands immediately based on current prefs
      try {
        const maxPossible = computeMaxPossible();
        if (maxPossible && Number.isFinite(maxPossible)) {
          const withBands = detailedRecs.map((rec) => {
            if (typeof rec.score !== 'number') return rec;
            const normalized = Math.max(0, Math.min(100, Math.round((rec.score / maxPossible) * 100)));
            return { ...rec, normalizedScore: normalized, band: verbalBand(normalized) } as Recommendation;
          });
          // Hide recommendations below 'Fair' (normalized < 60)
          const filtered = withBands.filter(r => (r as Recommendation).normalizedScore !== undefined && (r as Recommendation).normalizedScore! >= 60);
          setRecommendations(filtered as Recommendation[]);
        } else {
          setRecommendations(detailedRecs);
        }
      } catch {
        setRecommendations(detailedRecs);
      }
      setCurrentRecommendationIndex(0);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      // Don't show error to user if profile is incomplete - this is expected
      if (error instanceof Error) {
        if (error.message.includes("Profile must be completed")) {
          console.log("Profile incomplete, skipping recommendations");
        } else if (error.message.includes("401")) {
          console.log("Authentication error - user may need to log in again");
        } else {
          console.error(
            "Unexpected error loading recommendations:",
            error.message
          );
        }
      }
      // Keep empty array if loading fails
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [mode, computeMaxPossible]);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
      loadUserProfile();
      // Only load recommendations after profile is loaded
      // loadRecommendations will be called from loadUserProfile if profile is complete
    }
  }, [router, loadUserProfile]);

  // Reload recommendations when authenticated and profile available
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      loadRecommendations();
    }
  }, [isAuthenticated, userProfile, loadRecommendations]);

  // --- Sub-score utilities ---
  const normalize = (arr?: string[]): string[] =>
    Array.isArray(arr)
      ? arr.map((s) => (s || "").toLowerCase().trim()).filter(Boolean)
      : [];

  const overlapScore = (a?: string[], b?: string[]): number => {
    const A = new Set(normalize(a));
    const B = new Set(normalize(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    A.forEach((v) => {
      if (B.has(v)) inter += 1;
    });
    const union = new Set([...A, ...B]).size;
    const ratio = union === 0 ? 0 : inter / union;
    return Math.round(ratio * 100);
  };

  const buildCategoryScores = (rec: Recommendation | undefined) => {
    if (!rec) return [] as { key: string; label: string; score: number }[];
    const bio = rec.bio || {
      interests: [],
      hobbies: [],
      musicGenres: [],
      movieGenres: [],
      foodPreferences: [],
      travelTypes: [],
      languages: [],
    };
    const categories = [
      {
        key: "interests",
        label: "Shared Interests",
        score: overlapScore(myBio.interests, bio.interests),
      },
      {
        key: "hobbies",
        label: "Shared Hobbies",
        score: overlapScore(myBio.hobbies, bio.hobbies),
      },
      {
        key: "musicGenres",
        label: "Music Compatibility",
        score: overlapScore(myBio.musicGenres, bio.musicGenres),
      },
      {
        key: "movieGenres",
        label: "Movies Compatibility",
        score: overlapScore(myBio.movieGenres, bio.movieGenres),
      },
      {
        key: "foodPreferences",
        label: "Food Preferences",
        score: overlapScore(myBio.foodPreferences, bio.foodPreferences),
      },
      {
        key: "travelTypes",
        label: "Travel Preferences",
        score: overlapScore(myBio.travelTypes, bio.travelTypes),
      },
      {
        key: "languages",
        label: "Languages",
        score: overlapScore(myBio.languages, bio.languages),
      },
    ];
    const sorted = categories.sort((a, b) => b.score - a.score);
    const nonZero = sorted.filter((c) => c.score > 0).slice(0, 4);
    return nonZero.length > 0 ? nonZero : sorted.slice(0, 4);
  };


  const verbalBand = (norm: number): string => {
    if (norm >= 90) return 'Excellent';
    if (norm >= 80) return 'Great';
    if (norm >= 70) return 'Good';
    if (norm >= 60) return 'Fair';
    if (norm >= 50) return 'Limited';
    if (norm >= 35) return 'Low';
    return 'Poor';
  };

  // Re-normalize when seeking prefs arrive after recs
  // Guard against infinite loops by only setting state when values actually change
  useEffect(() => {
    if (!recommendations || recommendations.length === 0) return;
    const maxPossible = computeMaxPossible();
    if (!maxPossible) return;

    let changed = false;
    const renormRaw = recommendations.map((rec) => {
      if (typeof rec.score !== 'number') return rec;
      const normalized = Math.max(0, Math.min(100, Math.round((rec.score / maxPossible) * 100)));
      const band = verbalBand(normalized);
      if (rec.normalizedScore !== normalized || rec.band !== band) {
        changed = true;
        return { ...rec, normalizedScore: normalized, band } as Recommendation;
      }
      return rec;
    });

    // Apply visibility filter: hide below 'Fair' (< 60)
    const renorm = renormRaw.filter(r => (r as Recommendation).normalizedScore === undefined || (r as Recommendation).normalizedScore! >= 60);

    if (changed) setRecommendations(renorm as Recommendation[]);
  }, [recommendations, computeMaxPossible]);

  // Handle like/connect button
  const handleLike = async () => {
    const currentRec = recommendations[currentRecommendationIndex];
    if (!currentRec) return;

    try {
      await recommendationsApi.likeRecommendation(currentRec.id.toString(), connectionMessage);
      console.log("Liked user:", currentRec.id, "with message:", connectionMessage);

      // Clear message and move to next recommendation
      setConnectionMessage("");
      handleNext();
    } catch (error) {
      console.error("Error liking recommendation:", error);
      alert("Failed to send connection request. Please try again.");
    }
  };

  // Handle dismiss button
  const handleDismiss = async () => {
    const currentRec = recommendations[currentRecommendationIndex];
    if (!currentRec) return;

    try {
      await recommendationsApi.dismissRecommendation(currentRec.id.toString());
      console.log("Dismissed user:", currentRec.id);

      // Move to next recommendation
      handleNext();
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      alert("Failed to dismiss recommendation. Please try again.");
    }
  };

  // Navigate to next recommendation
  const handleNext = () => {
    if (currentRecommendationIndex < recommendations.length - 1) {
      setCurrentRecommendationIndex((prev) => prev + 1);
    } else {
      // Load more recommendations or show end message
      loadRecommendations();
    }
  };

  // Navigate to previous recommendation
  const handlePrevious = () => {
    if (currentRecommendationIndex > 0) {
      setCurrentRecommendationIndex((prev) => prev - 1);
    }
  };

  // Removed test online status utility

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Modal */}
      <ProfileModal
        userId={mode === "real" ? selectedUserId : null}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialProfile={null}
      />
      {/* Top Navigation Menu */}
      <Navigation />

      {/* Main Content Area - Recommendations Focus */}
      <main className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-6">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Your Recommendations
            </h1>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              Discover potential matches based on your preferences
            </p>
            {isLoadingRecommendations && (
              <div className="flex items-center justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">
                  Loading recommendations...
                </span>
              </div>
            )}
          </div>

          {/* Recommendation Card / Empty State */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto w-full mb-20 sm:mb-6">
            {/* Profile Picture Section (hidden when no recs) */}
            <div className="relative">
              {recommendations.length > 0 ? (
                <div className="h-72 sm:h-80 md:h-96 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center px-4">
                  {(() => {
                    console.log(
                      "Current rec profile picture URL:",
                      currentRec?.profilePictureURL
                    );
                    console.log(
                      "Current rec profile picture starts with /:",
                      currentRec?.profilePictureURL?.startsWith("/")
                    );

                    // Use the same logic as profile page for handling different URL formats
                    const profilePicSrc =
                      currentRec?.profilePictureURL &&
                      currentRec.profilePictureURL.startsWith("http")
                        ? currentRec.profilePictureURL
                        : currentRec?.profilePictureURL &&
                          currentRec.profilePictureURL.startsWith("/uploads")
                        ? `${getApiUrl()}${currentRec.profilePictureURL}`
                        : currentRec?.profilePictureURL &&
                          currentRec.profilePictureURL.startsWith("/")
                        ? currentRec.profilePictureURL
                        : "/sitefiles/default-profile-picture.png";

                    console.log("Final profile picture src:", profilePicSrc);

                    return (
                      <Image
                        src={profilePicSrc}
                        alt="Recommendation Profile"
                        width={300}
                        height={300}
                        className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full border-4 sm:border-6 md:border-8 border-white shadow-2xl object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.log(
                            "Image failed to load, falling back to default"
                          );
                          target.src = "/sitefiles/default-profile-picture.png";
                        }}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="h-40 sm:h-48 bg-gray-50 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="text-gray-500 mb-2">
                      No recommendations right now
                    </div>
                    <div className="text-sm text-gray-500">
                      Try updating your profile, preferences, or check back
                      later.
                    </div>
                  </div>
                </div>
              )}

              {/* Online Status */}
              {recommendations.length > 0 && currentRec && (
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                  <div
                    className={`${
                      currentRec.isOnline ? "bg-green-500" : "bg-gray-500"
                    } text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center`}
                  >
                    <div
                      className={`w-2 h-2 ${
                        currentRec.isOnline ? "bg-white" : "bg-gray-300"
                      } rounded-full mr-1 sm:mr-2`}
                    ></div>
                    <span className="hidden sm:inline">
                      {currentRec.isOnline ? "Online" : "Offline"}
                    </span>
                    <span className="sm:hidden">
                      {currentRec.isOnline ? "●" : "○"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-4 sm:p-8">
              <div className="text-center mb-6">
                {recommendations.length > 0 &&
                recommendations[currentRecommendationIndex] ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {
                        recommendations[currentRecommendationIndex].profile
                          ?.firstName
                      }{" "}
                      {
                        recommendations[currentRecommendationIndex].profile
                          ?.lastName
                      }
                    </h2>
                    <p className="text-gray-600 mb-1">
                      {recommendations[currentRecommendationIndex].profile
                        ?.aboutMe || "No bio available"}
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                      {recommendations[currentRecommendationIndex].profile?.gender && (
                        <span>{recommendations[currentRecommendationIndex].profile.gender}</span>
                      )}
                      {(() => {
                        const s = (recommendations[currentRecommendationIndex].profile?.status || '').trim();
                        const workStatuses = new Set(['Student','Employed','Entrepreneur','Unemployed','Retired']);
                        return workStatuses.has(s) ? (
                          <span>• {s}</span>
                        ) : null;
                      })()}
                      {(recommendations[currentRecommendationIndex].profile?.city || recommendations[currentRecommendationIndex].profile?.country) && (
                        <span>
                          • {[
                            recommendations[currentRecommendationIndex].profile?.city,
                            recommendations[currentRecommendationIndex].profile?.country
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {userProfile.firstName && userProfile.lastName
                        ? `Welcome ${userProfile.firstName}!`
                        : "Welcome to Match-Me!"}
                    </h2>
                    <p className="text-gray-600 mb-1">
                      {recommendations.length === 0 && !isLoadingRecommendations
                        ? "No recommendations available. Complete your profile to get matches!"
                        : "Complete your profile to see recommendations"}
                    </p>
                    <p className="text-gray-500 text-sm">{userProfile.email}</p>
                  </>
                )}
              </div>

              {/* Top 5 Match Criteria */}

              {(() => {
                const currentRec = recommendations[currentRecommendationIndex];
                if (
                  !currentRec ||
                  currentRecommendationIndex >= recommendations.length
                )
                  return null;

                return (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                      Why you might match:
                    </h3>
                    <div className="space-y-3">
                      {/* Overall Match Score */}
                      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border-2 border-green-200">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <span className="text-gray-800 font-medium">
                            Overall Match Score
                          </span>
                        </div>
                        <span className="text-green-600 font-bold text-lg">
                          {currentRec.band || '—'}
                        </span>
                      </div>

                      {/* Dynamic top category scores */}
                      {buildCategoryScores(currentRec).map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <span className="text-gray-800 font-medium">
                              {c.label}
                            </span>
                          </div>
                          <span className="text-gray-700 font-semibold">
                            {c.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Message Input */}
              {recommendations.length > 0 && (
                <div className="mb-4">
                  <label htmlFor="connectionMessage" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a message (optional)
                  </label>
                  <textarea
                    id="connectionMessage"
                    value={connectionMessage}
                    onChange={(e) => setConnectionMessage(e.target.value)}
                    placeholder="Say hello and let them know why you'd like to connect..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {connectionMessage.length}/500 characters
                  </div>
                </div>
              )}

              {/* Action Buttons or Empty Actions */}
              {recommendations.length > 0 ? (
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={handleLike}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    Connect
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Link
                    href="/profile"
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition"
                  >
                    Complete Your Profile
                  </Link>
                  <button
                    onClick={loadRecommendations}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold transition"
                  >
                    Refresh Recommendations
                  </button>
                </div>
              )}

              {/* View Profile Button */}
              {recommendations.length > 0 && (
                <button
                  onClick={() => {
                    const currentRec =
                      recommendations[currentRecommendationIndex];
                    if (!currentRec) return;
                    setSelectedUserId(currentRec.id);
                    setIsProfileOpen(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition mb-6"
                >
                  View Full Profile
                </button>
              )}

              {/* Navigation Controls */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentRecommendationIndex === 0}
                  className="flex items-center text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition"
                >
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous
                </button>

                <div className="text-center">
                  <div className="text-sm text-gray-500">Recommendation</div>
                  <div className="font-semibold text-gray-800">
                    {recommendations.length > 0
                      ? `${currentRecommendationIndex + 1} of ${
                          recommendations.length
                        }`
                      : "0 of 0"}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={
                    currentRecommendationIndex >= recommendations.length - 1
                  }
                  className="flex items-center text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition"
                >
                  Next
                  <svg
                    className="w-6 h-6 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
