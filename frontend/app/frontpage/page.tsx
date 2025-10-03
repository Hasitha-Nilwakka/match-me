"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, profileApi, recommendationsApi, connectionsApi } from "../../lib/api";
import ProfileModal from "../../components/ProfileModal";
import DataModeToggle from "../../components/DataModeToggle";
import Navigation from "../../components/Navigation";
import { useDataMode } from "../../context/DataModeContext";


interface Recommendation {
  id: number;
  score: number;
  profilePictureURL?: string;
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
  const mode = "real" as const;
  
  // Debug: Log mode changes
  useEffect(() => {
    console.log('🔄 MODE CHANGED TO:', mode);
    console.log('🔄 localStorage value:', localStorage.getItem('MM_DATA_MODE'));
  }, [mode]);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentRecommendationIndex, setCurrentRecommendationIndex] = useState(0);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedProfileInitial, setSelectedProfileInitial] = useState<Profile | null>(null);
  // Get current recommendation
  const currentRec = recommendations[currentRecommendationIndex];

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    try {
      const currentUser = authApi.getCurrentUser();
      if (currentUser) {
        setUserProfile(prev => ({
          ...prev,
          email: currentUser.email
        }));
      }
      
      // Try to load profile data
      try {
        const profile = await profileApi.getMyProfile();
        setUserProfile(prev => ({
          ...prev,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
        }));
        
        // Only load recommendations if profile is complete
        if (profile.firstName && profile.firstName.trim()) {
          loadRecommendations();
        } else {
          console.log('Profile incomplete, skipping recommendations');
        }
      } catch {
        console.log('No profile data found yet');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
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
  }, [isAuthenticated, userProfile]);


  // Load recommendations
  const loadRecommendations = async () => {
    try {
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FrontPage] User not authenticated, skipping recommendations load');
        setRecommendations([]);
        return;
      }

      setIsLoadingRecommendations(true);
      console.log('Loading recommendations in mode:', mode);
      console.log('Mode type:', typeof mode, 'Mode value:', mode);
      
      let recData: { recommendations: { id: number; score: number }[] };
      try {
        recData = await recommendationsApi.getRecommendations();
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setRecommendations([]);
        setCurrentRecommendationIndex(0);
        return;
      }
    
    // Check if we have any recommendations to process
    if (!recData.recommendations || recData.recommendations.length === 0) {
      console.log('No recommendations found, setting empty array');
      setRecommendations([]);
      setCurrentRecommendationIndex(0);
      return;
    }
    
    // Get detailed user info for each recommendation
    const detailedRecs = await Promise.all(
      recData.recommendations.map(async (rec: {id: number; score: number}) => {
          try {
            let userInfo, userProfile, userBio;
            
            {
              console.log(`🔴 REAL USER DETAILS for user ${rec.id}`);
              console.log(`Fetching real user details for user ${rec.id}`);
              try {
                // Use proper API functions instead of direct fetch calls
                [userInfo, userProfile, userBio] = await Promise.all([
                  authApi.getUserById(String(rec.id)).catch(() => null), // Gracefully handle user fetch failures
                  profileApi.getUserProfile(String(rec.id)).catch(() => null), // Gracefully handle profile fetch failures
                  profileApi.getUserBio(String(rec.id)).catch(() => null) // Gracefully handle bio fetch failures
                ]);
                console.log(`Successfully fetched details for user ${rec.id}:`, { userInfo, userProfile, userBio });
                
                // Handle cases where API calls returned null (due to errors)
                if (!userInfo) {
                  userInfo = { id: rec.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true };
                }
                if (!userProfile) {
                  userProfile = { firstName: "Error", lastName: `User ${rec.id}`, aboutMe: "Failed to load profile", gender: "N/A", status: "error" };
                }
                if (!userBio) {
                  userBio = { interests: [], hobbies: [], musicGenres: [], movieGenres: [], foodPreferences: [], travelTypes: [], languages: [] };
                }
              } catch (fetchError) {
                console.error(`Failed to fetch details for user ${rec.id}:`, fetchError);
                // Fallback to mock data if real fetch fails
                userInfo = { id: rec.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isActive: true };
                userProfile = { firstName: "Error", lastName: `User ${rec.id}`, aboutMe: "Failed to load profile", gender: "N/A", status: "error" };
                userBio = { interests: [], hobbies: [], musicGenres: [], movieGenres: [], foodPreferences: [], travelTypes: [], languages: [] };
              }
            }
            
            console.log(`Profile picture URL for user ${rec.id}:`, userProfile?.profilePictureURL);
            return {
              ...rec,
              userInfo,
              profile: userProfile,
              bio: userBio,
              profilePictureURL: userProfile?.profilePictureURL || '/sitefiles/default-profile-picture.png'
            };
          } catch (error) {
            console.error(`Error loading details for user ${rec.id}:`, error);
            return rec;
          }
        })
      );
      
      setRecommendations(detailedRecs);
      setCurrentRecommendationIndex(0);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Don't show error to user if profile is incomplete - this is expected
      if (error instanceof Error) {
        if (error.message.includes('Profile must be completed')) {
          console.log('Profile incomplete, skipping recommendations');
        } else if (error.message.includes('401')) {
          console.log('Authentication error - user may need to log in again');
        } else {
          console.error('Unexpected error loading recommendations:', error.message);
        }
      }
      // Keep empty array if loading fails
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Handle like/connect button
  const handleLike = async () => {
    const currentRec = recommendations[currentRecommendationIndex];
    if (!currentRec) return;

    try {
      await recommendationsApi.likeRecommendation(currentRec.id.toString());
      console.log('Liked user:', currentRec.id);
      
      // Move to next recommendation
      handleNext();
    } catch (error) {
      console.error('Error liking recommendation:', error);
      alert('Failed to send connection request. Please try again.');
    }
  };

  // Handle dismiss button
  const handleDismiss = async () => {
    const currentRec = recommendations[currentRecommendationIndex];
    if (!currentRec) return;

    try {
      await recommendationsApi.dismissRecommendation(currentRec.id.toString());
      console.log('Dismissed user:', currentRec.id);
      
      // Move to next recommendation
      handleNext();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      alert('Failed to dismiss recommendation. Please try again.');
    }
  };

  // Navigate to next recommendation
  const handleNext = () => {
    if (currentRecommendationIndex < recommendations.length - 1) {
      setCurrentRecommendationIndex(prev => prev + 1);
    } else {
      // Load more recommendations or show end message
      loadRecommendations();
    }
  };

  // Navigate to previous recommendation
  const handlePrevious = () => {
    if (currentRecommendationIndex > 0) {
      setCurrentRecommendationIndex(prev => prev - 1);
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
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Your Recommendations
            </h1>
            <p className="text-lg text-gray-600">
              Discover potential matches based on your preferences
            </p>
            {isLoadingRecommendations && (
              <div className="flex items-center justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Loading recommendations...</span>
              </div>
            )}
          </div>

          {/* Recommendation Card / Empty State */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto w-full">
            
            {/* Profile Picture Section (hidden when no recs) */}
            <div className="relative">
              {recommendations.length > 0 ? (
                <div className="h-64 sm:h-80 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  {(() => {
                    console.log('Current rec profile picture URL:', currentRec?.profilePictureURL);
                    console.log('Current rec profile picture starts with /:', currentRec?.profilePictureURL?.startsWith('/'));
                    
                    // Use the same logic as profile page for handling different URL formats
                    const profilePicSrc = currentRec?.profilePictureURL && currentRec.profilePictureURL.startsWith('http')
                      ? currentRec.profilePictureURL
                      : currentRec?.profilePictureURL && currentRec.profilePictureURL.startsWith('/uploads')
                      ? `http://localhost:8080${currentRec.profilePictureURL}`
                      : currentRec?.profilePictureURL && currentRec.profilePictureURL.startsWith('/')
                      ? currentRec.profilePictureURL
                      : "/sitefiles/default-profile-picture.png";
                    
                    console.log('Final profile picture src:', profilePicSrc);
                    
                    return (
                      <Image
                        src={profilePicSrc}
                        alt="Recommendation Profile"
                        width={200}
                        height={200}
                        className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-8 border-white shadow-2xl object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.log('Image failed to load, falling back to default');
                          target.src = "/sitefiles/default-profile-picture.png";
                        }}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="h-40 sm:h-48 bg-gray-50 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="text-gray-500 mb-2">No recommendations right now</div>
                    <div className="text-sm text-gray-500">Try updating your profile, preferences, or check back later.</div>
                  </div>
                </div>
              )}
              
              {/* Online Status */}
              {recommendations.length > 0 && (
                <div className="absolute top-6 right-6">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    Online
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-4 sm:p-8">
              <div className="text-center mb-6">
                {recommendations.length > 0 && recommendations[currentRecommendationIndex] ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {recommendations[currentRecommendationIndex].profile?.firstName} {recommendations[currentRecommendationIndex].profile?.lastName}
                    </h2>
                    <p className="text-gray-600 mb-1">
                      {recommendations[currentRecommendationIndex].profile?.aboutMe || 'No bio available'}
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                      {recommendations[currentRecommendationIndex].profile?.gender && (
                        <span>{recommendations[currentRecommendationIndex].profile.gender}</span>
                      )}
                      {recommendations[currentRecommendationIndex].profile?.status && (
                        <span>• {recommendations[currentRecommendationIndex].profile.status}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {userProfile.firstName && userProfile.lastName 
                        ? `Welcome ${userProfile.firstName}!` 
                        : 'Welcome to Match-Me!'
                      }
                    </h2>
                    <p className="text-gray-600 mb-1">
                      {recommendations.length === 0 && !isLoadingRecommendations
                        ? 'No recommendations available. Complete your profile to get matches!'
                        : 'Complete your profile to see recommendations'
                      }
                    </p>
                    <p className="text-gray-500 text-sm">{userProfile.email}</p>
                  </>
                )}
              </div>

              {/* Top 5 Match Criteria */}
              {(() => {
                const currentRec = recommendations[currentRecommendationIndex];
                if (!currentRec || currentRecommendationIndex >= recommendations.length) return null;
                
                return (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Why you might match:</h3>
                    <div className="space-y-3">
                    {/* Overall Match Score */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border-2 border-green-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-800 font-medium">Overall Match Score</span>
                      </div>
                      <span className="text-green-600 font-bold text-lg">
                        {Math.round(currentRec.score || 85)}%
                      </span>
                    </div>

                    {/* Shared Interests */}
                    {currentRec.bio?.interests && currentRec.bio.interests.length > 0 && (
                      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-800 font-medium">
                            Shared Interest: {currentRec.bio?.interests?.[0]}
                          </span>
                        </div>
                        <span className="text-blue-600 font-semibold">95%</span>
                      </div>
                    )}

                    {/* Shared Hobbies */}
                    {currentRec.bio?.hobbies && currentRec.bio.hobbies.length > 0 && (
                      <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-800 font-medium">
                            Shared Hobby: {currentRec.bio?.hobbies?.[0]}
                          </span>
                        </div>
                        <span className="text-purple-600 font-semibold">88%</span>
                      </div>
                    )}

                    {/* Music Compatibility */}
                    {currentRec.bio?.musicGenres && currentRec.bio.musicGenres.length > 0 && (
                      <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-800 font-medium">
                            Music: {currentRec.bio?.musicGenres?.[0]}
                          </span>
                        </div>
                        <span className="text-orange-600 font-semibold">82%</span>
                      </div>
                    )}

                    {/* Location Compatibility */}
                    <div className="flex items-center justify-between bg-pink-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-800 font-medium">Location Compatibility</span>
                      </div>
                      <span className="text-pink-600 font-semibold">90%</span>
                    </div>
                  </div>
                  </div>
                );
              })()}

              {/* Action Buttons or Empty Actions */}
              {recommendations.length > 0 ? (
                <div className="flex space-x-4 mb-6">
                  <button 
                    onClick={handleLike}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Connect
                  </button>
                  <button 
                    onClick={handleDismiss}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Link href="/profile" className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition">
                    Complete Your Profile
                  </Link>
                  <button onClick={loadRecommendations} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold transition">
                    Refresh Recommendations
                  </button>
                </div>
              )}

              {/* View Profile Button */}
              {recommendations.length > 0 && (
                <button
                  onClick={() => {
                    const currentRec = recommendations[currentRecommendationIndex];
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
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Recommendation</div>
                  <div className="font-semibold text-gray-800">
                    {recommendations.length > 0 ? `${currentRecommendationIndex + 1} of ${recommendations.length}` : '0 of 0'}
                  </div>
                </div>
                
                <button 
                  onClick={handleNext}
                  disabled={currentRecommendationIndex >= recommendations.length - 1}
                  className="flex items-center text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition"
                >
                  Next
                  <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
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
