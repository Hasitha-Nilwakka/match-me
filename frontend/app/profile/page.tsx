"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, profileApi, referenceApi, externalApi } from "../../lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    status: '',
    relationshipStatus: '',
    aboutMe: '',
    ethnicity: '',
    religion: '',
    profilePictureURL: '',
    languages: [] as string[],
  });
  const [userEmail, setUserEmail] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [countries, setCountries] = useState<{ name: string; code: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [locationData, setLocationData] = useState({
    city: '',
    country: '',
  });

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadProfileData();
      loadAvailableLanguages();
      loadAvailableHobbies();
      loadCountries();
    }
  }, [router]);

  // Load available languages from backend
  const loadAvailableLanguages = async () => {
    try {
      const languages = await referenceApi.getLanguages();
      setAvailableLanguages(languages);
    } catch (error) {
      console.error('Error loading available languages:', error);
      // Fallback to hardcoded languages if API fails
      setAvailableLanguages([
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
        'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi'
      ]);
    }
  };

  // Load available hobbies from backend
  const loadAvailableHobbies = async () => {
    try {
      const hobbies = await referenceApi.getHobbies();
      setAvailableHobbies(hobbies);
    } catch (error) {
      console.error('Error loading available hobbies:', error);
      // Fallback to hardcoded hobbies if API fails
      setAvailableHobbies([
        'Photography', 'Cooking', 'Gaming', 'Gardening', 'Painting', 'Writing',
        'Reading', 'Sports', 'Music', 'Travel', 'Art', 'Technology'
      ]);
    }
  };

  // Load countries from external API
  const loadCountries = async () => {
    try {
      const countriesData = await externalApi.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };


  // Load profile data
  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const currentUser = authApi.getCurrentUser();
      if (currentUser) {
        setUserEmail(currentUser.email);
      }
      
      // Try to load existing profile data
      try {
        const profile = await profileApi.getMyProfile();
        setProfileData({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          gender: profile.gender || '',
          status: profile.status || '',
          relationshipStatus: profile.relationshipStatus || '',
          aboutMe: profile.aboutMe || '',
          ethnicity: profile.ethnicity || '',
          religion: profile.religion || '',
          profilePictureURL: profile.profilePictureURL || '',
          languages: profile.languages || [],
        });
        setSelectedLanguages(profile.languages || []);
      } catch (error) {
        console.log('No existing profile found, starting fresh');
        // Profile doesn't exist yet, that's okay
      }

      // Try to load existing location data
      try {
        const location = await profileApi.getMyLocation();
        setLocationData({
          city: location.city || '',
          country: location.country || '',
        });
        setSelectedCountry(location.country || '');
      } catch (error) {
        console.log('No existing location found, starting fresh');
        // Location doesn't exist yet, that's okay
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };


  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle language selection
  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev => {
      const newLanguages = prev.includes(language) 
        ? prev.filter(lang => lang !== language)
        : [...prev, language];
      
      setProfileData(prevProfile => ({
        ...prevProfile,
        languages: newLanguages
      }));
      
      return newLanguages;
    });
  };

  // Handle country selection
  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    setLocationData(prev => ({
      ...prev,
      country: countryName
    }));
  };

  // Handle city input change
  const handleCityChange = (cityName: string) => {
    setLocationData(prev => ({
      ...prev,
      city: cityName
    }));
  };

  // Save profile data
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Save profile data
      await profileApi.updateMyProfile(profileData);
      
      // Save location data if provided
      if (locationData.city || locationData.country) {
        try {
          // Only send non-empty values
          const locationToSave: { city?: string; country?: string } = {};
          if (locationData.city && locationData.city.trim()) {
            locationToSave.city = locationData.city.trim();
          }
          if (locationData.country && locationData.country.trim()) {
            locationToSave.country = locationData.country.trim();
          }
          
          console.log('Saving location data:', locationToSave);
          await profileApi.updateMyLocation(locationToSave);
          console.log('Location saved successfully');
        } catch (locationError) {
          console.error('Error saving location:', locationError);
          // Don't fail the entire save if location fails
          alert('Profile saved, but there was an issue saving location data.');
        }
      } else {
        console.log('No location data to save');
      }
      
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
      {/* Top Navigation Menu */}
      <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Image
                src="/sitefiles/site-logo-web.png"
                alt="Site Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </div>

            {/* Navigation Items */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/frontpage"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "frontpage"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Front Page
                </Link>
                <Link
                  href="/connectionlist"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "connections"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection List
                </Link>
                <Link
                  href="/connectionrequests"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection Requests
                </Link>
              </div>
            </div>

            {/* Logout Button */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Log out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            <Link
              href="/frontpage"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "frontpage"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Front Page
            </Link>
            <Link
              href="/connectionlist"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "connections"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection List
            </Link>
            <Link
              href="/connectionrequests"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Section 1: Profile Picture & Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Information</h2>
              
              {/* Profile Picture */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <Image
                    src="/sitefiles/default-profile-picture.png"
                    alt="Profile Picture"
                    width={80}
                    height={80}
                    className="rounded-full border-4 border-white shadow-lg"
                  />
                  {/* Online/Offline Indicator */}
                  <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Change Picture
                  </button>
                  <p className="text-sm text-gray-500 mt-1">Click to upload new photo</p>
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="flex space-x-2">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm">
                    Change Password
                  </button>
                  <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm">
                    Reset Password
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 mt-6">
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Start a Chat
                </button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Remove Connection
                </button>
              </div>
            </div>

            {/* Section 2: About Me */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">About Me</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select 
                    value={profileData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={profileData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="Student">Student</option>
                    <option value="Employed">Employed</option>
                    <option value="Entrepreneur">Entrepreneur</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Status</label>
                  <select 
                    value={profileData.relationshipStatus}
                    onChange={(e) => handleInputChange('relationshipStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Relationship Status</option>
                    <option value="Single">Single</option>
                    <option value="In a relationship">In a relationship</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <div className="space-y-2">
                    {/* Selected Languages Display */}
                    {selectedLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLanguages.map((language) => (
                          <span
                            key={language}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {language}
                            <button
                              type="button"
                              onClick={() => handleLanguageToggle(language)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Language Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedLanguages.includes(e.target.value)) {
                          handleLanguageToggle(e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a language to add</option>
                      {availableLanguages.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select languages from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={locationData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    placeholder="Enter your city"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ethnicity</label>
                  <input
                    type="text"
                    value={profileData.ethnicity}
                    onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your ethnicity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <input
                    type="text"
                    value={profileData.religion}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your religion"
                  />
                </div>
              </div>
              
              {/* About Me */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
                <textarea
                  value={profileData.aboutMe}
                  onChange={(e) => handleInputChange('aboutMe', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

          </div>

          {/* Additional sections below the 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            
            {/* Section 3: Biographical Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Biographical Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Interest</option>
                    <option>Sports</option>
                    <option>Reading</option>
                    <option>Technology</option>
                    <option>Art</option>
                    <option>Music</option>
                    <option>Travel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Hobby</option>
                    {availableHobbies.map((hobby) => (
                      <option key={hobby} value={hobby}>
                        {hobby}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Food Preference</option>
                    <option>Italian</option>
                    <option>Asian</option>
                    <option>Vegetarian</option>
                    <option>Vegan</option>
                    <option>Mediterranean</option>
                    <option>Mexican</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Music Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Music Genre</option>
                    <option>Rock</option>
                    <option>Jazz</option>
                    <option>Classical</option>
                    <option>Pop</option>
                    <option>Hip Hop</option>
                    <option>Electronic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Movie Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Movie Genre</option>
                    <option>Action</option>
                    <option>Drama</option>
                    <option>Comedy</option>
                    <option>Horror</option>
                    <option>Sci-Fi</option>
                    <option>Romance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Travel Type</option>
                    <option>Beaches</option>
                    <option>Mountains</option>
                    <option>Cities</option>
                    <option>Adventure</option>
                    <option>Cultural</option>
                    <option>Nature</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Who are you looking for */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Who are you looking for?</h2>
              
              <div className="space-y-6">
                {/* Gender with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Any</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Status with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Any</option>
                    <option>Student</option>
                    <option>Employed</option>
                    <option>Entrepreneur</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Relationship Status with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Any</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Location with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location Preference</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Exact match</option>
                    <option>Within city or country</option>
                    <option>Within region</option>
                    <option>Define radius</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Languages with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Language</option>
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Italian</option>
                    <option>Portuguese</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Interests with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Interest</option>
                    <option>Sports</option>
                    <option>Reading</option>
                    <option>Technology</option>
                    <option>Art</option>
                    <option>Music</option>
                    <option>Travel</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Hobbies with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Hobby</option>
                    {availableHobbies.map((hobby) => (
                      <option key={hobby} value={hobby}>
                        {hobby}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Food Preferences with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Food Preference</option>
                    <option>Italian</option>
                    <option>Asian</option>
                    <option>Vegetarian</option>
                    <option>Vegan</option>
                    <option>Mediterranean</option>
                    <option>Mexican</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Music Preferences with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Music Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Music Genre</option>
                    <option>Rock</option>
                    <option>Jazz</option>
                    <option>Classical</option>
                    <option>Pop</option>
                    <option>Hip Hop</option>
                    <option>Electronic</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Movie Preferences with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Movie Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Movie Genre</option>
                    <option>Action</option>
                    <option>Drama</option>
                    <option>Comedy</option>
                    <option>Horror</option>
                    <option>Sci-Fi</option>
                    <option>Romance</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Travel Preferences with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Preferences</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Travel Type</option>
                    <option>Beaches</option>
                    <option>Mountains</option>
                    <option>Cities</option>
                    <option>Adventure</option>
                    <option>Cultural</option>
                    <option>Nature</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Ethnicity with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ethnicity</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Ethnicity</option>
                    <option>Asian</option>
                    <option>African</option>
                    <option>European</option>
                    <option>Hispanic</option>
                    <option>Middle Eastern</option>
                    <option>Mixed</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Religion with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Select Religion</option>
                    <option>Christianity</option>
                    <option>Islam</option>
                    <option>Hinduism</option>
                    <option>Buddhism</option>
                    <option>Judaism</option>
                    <option>Atheist</option>
                    <option>Agnostic</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      defaultValue="2"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-center">
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className={`px-8 py-3 rounded-md text-lg font-medium transition ${
                isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
