"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, profileApi, referenceApi, externalApi } from "../../lib/api";
import Navigation from "../../components/Navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab] = useState("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deleteProfileData, setDeleteProfileData] = useState({
    password: '',
    confirmText: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    status: '',
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
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [availableFoodPreferences, setAvailableFoodPreferences] = useState<string[]>([]);
  const [availableMusicGenres, setAvailableMusicGenres] = useState<string[]>([]);
  const [availableMovieGenres, setAvailableMovieGenres] = useState<string[]>([]);
  const [availableTravelTypes, setAvailableTravelTypes] = useState<string[]>([]);
  const [countries, setCountries] = useState<{ name: string; code: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [cities, setCities] = useState<{ name: string; population?: number }[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [locationData, setLocationData] = useState({
    city: '',
    country: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  // Biographical data selections
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedFoodPreferences, setSelectedFoodPreferences] = useState<string[]>([]);
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);
  const [selectedMovieGenres, setSelectedMovieGenres] = useState<string[]>([]);
  const [selectedTravelTypes, setSelectedTravelTypes] = useState<string[]>([]);
  
  // Seeking preferences and priority levels
  const [seekingPreferences, setSeekingPreferences] = useState({
    gender: '',
    status: '',
    locationPreference: '',
    ethnicity: '',
    religion: '',
  });
  const [searchRadius, setSearchRadius] = useState(50); // Default 50km radius
  
  // Multiple selection seeking preferences
  const [seekingInterests, setSeekingInterests] = useState<string[]>([]);
  const [seekingHobbies, setSeekingHobbies] = useState<string[]>([]);
  const [seekingFoodPreferences, setSeekingFoodPreferences] = useState<string[]>([]);
  const [seekingMusicGenres, setSeekingMusicGenres] = useState<string[]>([]);
  const [seekingMovieGenres, setSeekingMovieGenres] = useState<string[]>([]);
  const [seekingTravelTypes, setSeekingTravelTypes] = useState<string[]>([]);
  const [seekingLanguages, setSeekingLanguages] = useState<string[]>([]);
  const [seekingGender, setSeekingGender] = useState<string[]>([]);
  
  const [priorityLevels, setPriorityLevels] = useState({
    gender: 2,
    status: 2,
    locationPreference: 2,
    languages: 2,
    interests: 2,
    hobbies: 2,
    foodPreferences: 2,
    musicGenres: 2,
    movieGenres: 2,
    travelTypes: 2,
    ethnicity: 2,
    religion: 2,
  });

  // Check authentication on page load
  useEffect(() => {
    console.log('Profile page - checking authentication...');
    console.log('Is authenticated:', authApi.isAuthenticated());
    console.log('Token exists:', !!localStorage.getItem('token'));
    console.log('User exists:', !!localStorage.getItem('user'));
    
    if (!authApi.isAuthenticated()) {
      console.log('Not authenticated, redirecting to home...');
      router.push('/');
    } else {
      console.log('Authenticated, loading profile data...');
      setIsAuthenticated(true);
      
      // Load countries first, then load profile data
      const initializeData = async () => {
        console.log('Starting initialization...');
        await loadCountries();
        console.log('Countries loaded, loading profile data...');
        loadProfileData();
        loadAvailableLanguages();
        loadAvailableHobbies();
        loadAvailableInterests();
        loadAvailableFoodPreferences();
        loadAvailableMusicGenres();
        loadAvailableMovieGenres();
        loadAvailableTravelTypes();
      };
      
      initializeData();
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

  // Load available interests from backend
  const loadAvailableInterests = async () => {
    try {
      const interests = await referenceApi.getInterests();
      setAvailableInterests(interests);
    } catch (error) {
      console.error('Error loading available interests:', error);
      setAvailableInterests([
        'Sports', 'Reading', 'Technology', 'Art', 'Music', 'Travel',
        'Photography', 'Cooking', 'Gaming', 'Gardening', 'Writing'
      ]);
    }
  };

  // Load available food preferences from backend
  const loadAvailableFoodPreferences = async () => {
    try {
      const foodPreferences = await referenceApi.getFoodPreferences();
      setAvailableFoodPreferences(foodPreferences);
    } catch (error) {
      console.error('Error loading available food preferences:', error);
      setAvailableFoodPreferences([
        'Italian', 'Asian', 'Vegetarian', 'Vegan', 'Mediterranean', 'Mexican',
        'American', 'Indian', 'Chinese', 'Japanese', 'Thai', 'French'
      ]);
    }
  };

  // Load available music genres from backend
  const loadAvailableMusicGenres = async () => {
    try {
      const musicGenres = await referenceApi.getMusicGenres();
      setAvailableMusicGenres(musicGenres);
    } catch (error) {
      console.error('Error loading available music genres:', error);
      setAvailableMusicGenres([
        'Rock', 'Jazz', 'Classical', 'Pop', 'Hip Hop', 'Electronic',
        'Country', 'R&B', 'Blues', 'Reggae', 'Folk', 'Alternative'
      ]);
    }
  };

  // Load available movie genres from backend
  const loadAvailableMovieGenres = async () => {
    try {
      const movieGenres = await referenceApi.getMovieGenres();
      setAvailableMovieGenres(movieGenres);
    } catch (error) {
      console.error('Error loading available movie genres:', error);
      setAvailableMovieGenres([
        'Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance',
        'Thriller', 'Adventure', 'Fantasy', 'Documentary', 'Animation', 'Crime'
      ]);
    }
  };

  // Load available travel types from backend
  const loadAvailableTravelTypes = async () => {
    try {
      const travelTypes = await referenceApi.getTravelTypes();
      setAvailableTravelTypes(travelTypes);
    } catch (error) {
      console.error('Error loading available travel types:', error);
      setAvailableTravelTypes([
        'Beaches', 'Mountains', 'Cities', 'Adventure', 'Cultural', 'Nature',
        'Historical', 'Relaxation', 'Wildlife', 'Food & Wine', 'Art & Museums', 'Nightlife'
      ]);
    }
  };

  // Load countries from external API
  const loadCountries = async () => {
    try {
      console.log('Loading countries...');
      const countriesData = await externalApi.getCountries();
      console.log('Loaded countries:', countriesData.length);
      console.log('First 10 countries:', countriesData.slice(0, 10).map(c => c.name));
      setCountries(countriesData);
      return countriesData;
    } catch (error) {
      console.error('Error loading countries:', error);
      return [];
    }
  };

  // Load cities for a specific country
  const loadCities = async (countryName: string) => {
    if (!countryName) {
      setCities([]);
      return;
    }

    setIsLoadingCities(true);
    setCitiesError('');
    
    try {
      // Ensure countries are loaded first
      let currentCountries = countries;
      if (currentCountries.length === 0) {
        const loadedCountries = await loadCountries();
        currentCountries = loadedCountries || countries;
      }

      // Find the country code for the selected country
      const country = currentCountries.find(c => c.name === countryName);
      
      if (!country) {
        // Try case-insensitive search
        const countryInsensitive = currentCountries.find(c => 
          c.name.toLowerCase() === countryName.toLowerCase()
        );
        
        if (countryInsensitive) {
          const citiesData = await externalApi.getCitiesByCountry(countryInsensitive.code);
          setCities(citiesData);
          return;
        }
        
        throw new Error(`Country "${countryName}" not found in available countries`);
      }

      const citiesData = await externalApi.getCitiesByCountry(country.code);
      setCities(citiesData);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCitiesError('Failed to load cities for this country');
      setCities([]);
    } finally {
      setIsLoadingCities(false);
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
          aboutMe: profile.aboutMe || '',
          ethnicity: profile.ethnicity || '',
          religion: profile.religion || '',
          profilePictureURL: profile.profilePictureURL || '/sitefiles/default-profile-picture.png',
          languages: profile.languages || [],
        });
        setSelectedLanguages(profile.languages || []);
      } catch {
        console.log('No existing profile found, starting fresh');
        // Profile doesn't exist yet, that's okay
      }

      // Try to load existing location data
      try {
        const location = await profileApi.getMyLocation();
        setLocationData({
          city: location.city || '',
          country: location.country || '',
          latitude: location.latitude || null,
          longitude: location.longitude || null,
        });
        setSelectedCountry(location.country || '');
        
        // Load cities for the existing country if it exists
        if (location.country) {
          loadCities(location.country);
        }
      } catch {
        console.log('No existing location found, starting fresh');
        // Location doesn't exist yet, that's okay
      }

      // Try to load existing biographical data
      try {
        const biographicalData = await profileApi.getBiographicalData();
        setSelectedInterests(biographicalData.interests || []);
        setSelectedHobbies(biographicalData.hobbies || []);
        setSelectedFoodPreferences(biographicalData.foodPreferences || []);
        setSelectedMusicGenres(biographicalData.musicGenres || []);
        setSelectedMovieGenres(biographicalData.movieGenres || []);
        setSelectedTravelTypes(biographicalData.travelTypes || []);
      } catch {
        console.log('No existing biographical data found, starting fresh');
        // Biographical data doesn't exist yet, that's okay
      }

      // Try to load existing seeking preferences
      try {
        console.log('Attempting to load seeking preferences...');
        const seekingData = await profileApi.getSeekingPreferences();
        console.log('Loaded seeking preferences:', seekingData);
        console.log('Multiple selection fields:', {
          interestsPreference: seekingData.interestsPreference,
          hobbiesPreference: seekingData.hobbiesPreference,
          foodPreferencesPreference: seekingData.foodPreferencesPreference,
          musicGenresPreference: seekingData.musicGenresPreference,
          movieGenresPreference: seekingData.movieGenresPreference,
          travelTypesPreference: seekingData.travelTypesPreference,
        });
        
        setSeekingPreferences({
          gender: seekingData.genderPreference || '',
          status: seekingData.statusPreference || '',
          locationPreference: seekingData.locationPreference || 'within_city',
          ethnicity: seekingData.ethnicityPreference || '',
          religion: seekingData.religionPreference || '',
        });
        
        // Load search radius if available
        if (seekingData.maxDistanceKm) {
          setSearchRadius(seekingData.maxDistanceKm);
        }
        
        // Load multiple selection seeking preferences with better error handling
        setSeekingInterests(Array.isArray(seekingData.interestsPreference) ? seekingData.interestsPreference : []);
        setSeekingHobbies(Array.isArray(seekingData.hobbiesPreference) ? seekingData.hobbiesPreference : []);
        setSeekingFoodPreferences(Array.isArray(seekingData.foodPreferencesPreference) ? seekingData.foodPreferencesPreference : []);
        setSeekingMusicGenres(Array.isArray(seekingData.musicGenresPreference) ? seekingData.musicGenresPreference : []);
        setSeekingMovieGenres(Array.isArray(seekingData.movieGenresPreference) ? seekingData.movieGenresPreference : []);
        setSeekingTravelTypes(Array.isArray(seekingData.travelTypesPreference) ? seekingData.travelTypesPreference : []);
        setSeekingLanguages(Array.isArray(seekingData.languagesPreference) ? seekingData.languagesPreference : []);
        // Load multi-gender (comma separated) into array; empty/Any => []
        if (seekingData.genderPreference) {
          const gp = String(seekingData.genderPreference)
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && s.toLowerCase() !== 'any');
          setSeekingGender(gp);
        } else {
          setSeekingGender([]);
        }
        
        setPriorityLevels({
          gender: seekingData.genderWeight || 2,
          status: seekingData.statusWeight || 2,
          locationPreference: seekingData.locationWeight || 2,
          languages: seekingData.languagesWeight || 2,
          interests: seekingData.interestsWeight || 2,
          hobbies: seekingData.hobbiesWeight || 2,
          foodPreferences: seekingData.foodPreferencesWeight || 2,
          musicGenres: seekingData.musicGenresWeight || 2,
          movieGenres: seekingData.movieGenresWeight || 2,
          travelTypes: seekingData.travelTypesWeight || 2,
          ethnicity: seekingData.ethnicityWeight || 2,
          religion: seekingData.religionWeight || 2,
        });
        
        console.log('Set seeking preferences state:', {
          gender: seekingData.genderPreference || '',
          status: seekingData.statusPreference || '',
          locationPreference: seekingData.locationPreference || 'within_city',
        });
      } catch (error) {
        console.log('No existing seeking preferences found, starting fresh');
        console.log('Error details:', error);
        // Initialize with empty arrays for multiple selections
        setSeekingInterests([]);
        setSeekingHobbies([]);
        setSeekingFoodPreferences([]);
        setSeekingMusicGenres([]);
        setSeekingMovieGenres([]);
        setSeekingTravelTypes([]);
        setSeekingLanguages([]);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
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
      country: countryName,
      city: '' // Reset city when country changes
    }));
    
    // Clear cities first to prevent contamination
    setCities([]);
    setCitiesError('');
    
    // Load cities for the selected country
    loadCities(countryName);
  };

  // Handle city input change
  const handleCityChange = (cityName: string) => {
    setLocationData(prev => ({
      ...prev,
      city: cityName
    }));
  };

  // Show beautiful success notification
  const showSuccessMessage = (message: string) => {
    setSaveMessage(message);
    setShowSuccessNotification(true);
    setTimeout(() => {
      setShowSuccessNotification(false);
      setTimeout(() => setSaveMessage(''), 300); // Clear message after animation
    }, 2000);
  };


  // Get current location using browser geolocation API
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Update location data with coordinates
      setLocationData(prev => ({
        ...prev,
        latitude,
        longitude
      }));

      // Try to reverse geocode to get city and country
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data.city && data.countryName) {
          setLocationData(prev => ({
            ...prev,
            city: data.city,
            country: data.countryName
          }));
          setSelectedCountry(data.countryName);
          
          // Load cities for the detected country
          loadCities(data.countryName);
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed, but coordinates are saved:', geocodeError);
        setLocationError('Location detected but city/country could not be determined automatically');
      }

    } catch (error: unknown) {
      console.error('Geolocation error:', error);
      const geolocationError = error as GeolocationPositionError;
      switch (geolocationError.code) {
        case geolocationError.PERMISSION_DENIED:
          setLocationError('Location access denied. Please enable location permissions in your browser.');
          break;
        case geolocationError.POSITION_UNAVAILABLE:
          setLocationError('Location information is unavailable.');
          break;
        case geolocationError.TIMEOUT:
          setLocationError('Location request timed out.');
          break;
        default:
          setLocationError('An unknown error occurred while retrieving location.');
          break;
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle biographical data selections
  const handleBiographicalToggle = (type: string, value: string) => {
    switch (type) {
      case 'interests':
        setSelectedInterests(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'hobbies':
        setSelectedHobbies(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'food':
        setSelectedFoodPreferences(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'music':
        setSelectedMusicGenres(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'movies':
        setSelectedMovieGenres(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'travel':
        setSelectedTravelTypes(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
    }
  };

  // Handle seeking preference multiple selections
  const handleSeekingToggle = (type: string, value: string) => {
    switch (type) {
      case 'seeking-interests':
        setSeekingInterests(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-hobbies':
        setSeekingHobbies(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-food':
        setSeekingFoodPreferences(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-music':
        setSeekingMusicGenres(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-movies':
        setSeekingMovieGenres(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-travel':
        setSeekingTravelTypes(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
      case 'seeking-languages':
        setSeekingLanguages(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
        break;
    }
  };

  // Handle seeking preference changes
  const handleSeekingPreferenceChange = (field: string, value: string) => {
    setSeekingPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle priority level changes
  const handlePriorityChange = (field: string, value: number) => {
    setPriorityLevels(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploadingPicture(true);
    console.log('Starting upload...');
    
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      if (!token) {
        setSaveError('Please log in to upload a profile picture');
        setTimeout(() => setSaveError(''), 5000);
        return;
      }

      const response = await fetch('http://localhost:8080/me/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload profile picture: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      // Update profile data with new picture URL
      setProfileData(prev => {
        console.log('Updating profile data with new URL:', result.profilePictureURL);
        return {
          ...prev,
          profilePictureURL: result.profilePictureURL
        };
      });

      // Show success message
      showSuccessMessage('Profile picture updated successfully! 📸');

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setSaveError(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    // Validate form
    if (!changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (changePasswordData.currentPassword === changePasswordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');

    try {
      const response = await fetch('http://localhost:8080/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      // Success - close modal and reset form
      setShowChangePasswordModal(false);
      setChangePasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      showSuccessMessage('Password changed successfully! 🔐');

    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Reset change password form
  const resetChangePasswordForm = () => {
    setChangePasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  // Handle delete profile
  const handleDeleteProfile = async () => {
    // Validate form
    if (!deleteProfileData.password) {
      setDeleteError('Password is required');
      return;
    }

    if (deleteProfileData.confirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setIsDeletingProfile(true);
    setDeleteError('');

    try {
      const response = await fetch('http://localhost:8080/me/delete-profile', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          password: deleteProfileData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete profile');
      }

      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      showSuccessMessage('Profile deleted successfully. Goodbye! 👋');

    } catch (error) {
      console.error('Error deleting profile:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete profile. Please try again.');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  // Reset delete profile form
  const resetDeleteProfileForm = () => {
    setDeleteProfileData({
      password: '',
      confirmText: ''
    });
    setDeleteError('');
  };

  // Save profile data
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Save profile data
      console.log('Saving profile data:', profileData);
      console.log('API URL being used:', process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.118:8080');
      await profileApi.updateMyProfile(profileData);
      console.log('Profile saved successfully');
      
      // Save location data if provided
      if (locationData.city || locationData.country || locationData.latitude || locationData.longitude) {
        try {
          // Only send non-empty values
          const locationToSave: { 
            city?: string; 
            country?: string; 
            latitude?: number; 
            longitude?: number; 
          } = {};
          if (locationData.city && locationData.city.trim()) {
            locationToSave.city = locationData.city.trim();
          }
          if (locationData.country && locationData.country.trim()) {
            locationToSave.country = locationData.country.trim();
          }
          if (locationData.latitude !== null) {
            locationToSave.latitude = locationData.latitude;
          }
          if (locationData.longitude !== null) {
            locationToSave.longitude = locationData.longitude;
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

      // Save biographical data
      try {
        const biographicalData = {
          interests: selectedInterests,
          hobbies: selectedHobbies,
          foodPreferences: selectedFoodPreferences,
          musicGenres: selectedMusicGenres,
          movieGenres: selectedMovieGenres,
          travelTypes: selectedTravelTypes,
        };
        
        console.log('Saving biographical data:', biographicalData);
        console.log('API URL for biographical data:', process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.118:8080');
        const response = await profileApi.updateBiographicalData(biographicalData);
        console.log('Biographical data saved successfully:', response);
      } catch (bioError) {
        console.error('Error saving biographical data:', bioError);
        const errorMessage = bioError instanceof Error ? bioError.message : 'Unknown error';
        console.error('Error details:', errorMessage);
        // Don't fail the entire save if biographical data fails
        alert('Profile saved, but there was an issue saving biographical data: ' + errorMessage);
      }

      // Save seeking preferences
      try {
        const seekingData = {
          genderPreference: (seekingGender.length > 0 ? seekingGender.join(',') : (seekingPreferences.gender || undefined)),
          statusPreference: seekingPreferences.status || undefined,
          relationshipPreference: undefined, // Removed from UI but keeping for API compatibility
          locationPreference: seekingPreferences.locationPreference || 'within_city',
          maxDistanceKm: seekingPreferences.locationPreference === 'define_radius' ? searchRadius : undefined,
          
          // Single preference values
          ethnicityPreference: seekingPreferences.ethnicity || undefined,
          religionPreference: seekingPreferences.religion || undefined,
          
          // Multiple preference values (what they're looking for)
          interestsPreference: seekingInterests,
          hobbiesPreference: seekingHobbies,
          foodPreferencesPreference: seekingFoodPreferences,
          musicGenresPreference: seekingMusicGenres,
          movieGenresPreference: seekingMovieGenres,
          travelTypesPreference: seekingTravelTypes,
          languagesPreference: seekingLanguages,
          
          // Weight values (priority levels)
          genderWeight: priorityLevels.gender,
          statusWeight: priorityLevels.status,
          relationshipWeight: 2, // Default value since removed from UI
          locationWeight: priorityLevels.locationPreference,
          languagesWeight: priorityLevels.languages,
          interestsWeight: priorityLevels.interests,
          hobbiesWeight: priorityLevels.hobbies,
          foodPreferencesWeight: priorityLevels.foodPreferences,
          musicGenresWeight: priorityLevels.musicGenres,
          movieGenresWeight: priorityLevels.movieGenres,
          travelTypesWeight: priorityLevels.travelTypes,
          ethnicityWeight: priorityLevels.ethnicity,
          religionWeight: priorityLevels.religion,
        };
        
        console.log('Saving seeking preferences:', seekingData);
        console.log('API URL for seeking preferences:', process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.118:8080');
        const response = await profileApi.updateSeekingPreferences(seekingData);
        console.log('Seeking preferences saved successfully:', response);
      } catch (seekingError) {
        console.error('Error saving seeking preferences:', seekingError);
        const errorMessage = seekingError instanceof Error ? seekingError.message : 'Unknown error';
        console.error('Error details:', errorMessage);
        // Don't fail the entire save if seeking preferences fail
        alert('Profile saved, but there was an issue saving seeking preferences: ' + errorMessage);
      }
      
      showSuccessMessage('Profile saved successfully! 🎉');
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
    <>
      {/* Custom CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        {/* Beautiful Success Notification */}
      {showSuccessNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`
            relative transform transition-all duration-300 ease-in-out
            ${showSuccessNotification 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-8 opacity-0 scale-95'
            }
          `}>
            <div className="bg-white rounded-2xl shadow-2xl border border-green-200 p-6 mx-4 max-w-sm w-full">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
                  <p className="text-sm text-gray-600 mt-1">{saveMessage}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{
                    animation: 'progress 2s linear forwards'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Menu */}
      <Navigation />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Section 1: Profile Picture & Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Information</h2>
              
              {/* Error Messages */}
              {saveError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {saveError}
                </div>
              )}
              
              {/* Profile Picture */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <Image
                    key={profileData.profilePictureURL || 'default'}
                    src={
                      profileData.profilePictureURL && profileData.profilePictureURL.startsWith('http')
                        ? profileData.profilePictureURL
                        : profileData.profilePictureURL && profileData.profilePictureURL.startsWith('/uploads')
                        ? `http://localhost:8080${profileData.profilePictureURL}`
                        : "/sitefiles/default-profile-picture.png"
                    }
                    alt="Profile Picture"
                    width={80}
                    height={80}
                    className="rounded-full border-4 border-white shadow-lg"
                  />
                  {/* Online/Offline Indicator */}
                  <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <input
                    type="file"
                    id="profilePictureInput"
                    accept="image/*"
                    onChange={(e) => {
                      console.log('File input changed:', e.target.files);
                      handleProfilePictureUpload(e);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="profilePictureInput"
                    className={`inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer ${
                      isUploadingPicture ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploadingPicture ? 'Uploading...' : 'Change Picture'}
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    {isUploadingPicture ? 'Please wait...' : 'Click to upload new photo (max 5MB)'}
                  </p>
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
                  <button 
                    onClick={() => setShowChangePasswordModal(true)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Change Password
                  </button>
                  <button 
                    onClick={() => setShowDeleteProfileModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Delete Profile
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
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
                    <option value="Non-binary">Non-binary</option>
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
                      {availableLanguages?.map((language) => (
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
                    {countries?.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <div className="space-y-2">
                    <select
                      value={locationData.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      disabled={!selectedCountry || isLoadingCities}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedCountry 
                          ? 'Select a country first' 
                          : isLoadingCities 
                            ? 'Loading cities...' 
                            : citiesError 
                              ? 'Error loading cities' 
                              : 'Select a city'
                        }
                      </option>
                      {cities.map((city) => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    {citiesError && (
                      <p className="text-sm text-red-600">{citiesError}</p>
                    )}
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      {isGettingLocation ? 'Getting Location...' : '📍 Use Current Location'}
                    </button>
                    {locationError && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                        {locationError}
                      </p>
                    )}
                    {locationData.latitude && locationData.longitude && (
                      <div className="text-xs text-gray-500 bg-green-50 p-2 rounded-md">
                        ✅ Location detected: {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ethnicity</label>
                  <select
                    value={profileData.ethnicity}
                    onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Ethnicity</option>
                    <option value="Asian">Asian</option>
                    <option value="African">African</option>
                    <option value="European">European</option>
                    <option value="Hispanic">Hispanic</option>
                    <option value="Middle Eastern">Middle Eastern</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <select
                    value={profileData.religion}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Religion</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Islam">Islam</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Judaism">Judaism</option>
                    <option value="Atheist">Atheist</option>
                    <option value="Agnostic">Agnostic</option>
                    <option value="Other">Other</option>
                  </select>
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
                  <div className="space-y-2">
                    {/* Selected Interests Display */}
                    {selectedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedInterests.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {interest}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('interests', interest)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Interest Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedInterests.includes(e.target.value)) {
                          handleBiographicalToggle('interests', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an interest to add</option>
                      {availableInterests?.map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select interests from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies</label>
                  <div className="space-y-2">
                    {/* Selected Hobbies Display */}
                    {selectedHobbies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedHobbies.map((hobby) => (
                          <span
                            key={hobby}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                          >
                            {hobby}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('hobbies', hobby)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Hobby Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedHobbies.includes(e.target.value)) {
                          handleBiographicalToggle('hobbies', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a hobby to add</option>
                      {availableHobbies?.map((hobby) => (
                        <option key={hobby} value={hobby}>
                          {hobby}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select hobbies from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Preferences</label>
                  <div className="space-y-2">
                    {/* Selected Food Preferences Display */}
                    {selectedFoodPreferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedFoodPreferences.map((food) => (
                          <span
                            key={food}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                          >
                            {food}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('food', food)}
                              className="ml-2 text-orange-600 hover:text-orange-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Food Preference Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedFoodPreferences.includes(e.target.value)) {
                          handleBiographicalToggle('food', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a food preference to add</option>
                      {availableFoodPreferences?.map((food) => (
                        <option key={food} value={food}>
                          {food}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select food preferences from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Music Preferences</label>
                  <div className="space-y-2">
                    {/* Selected Music Genres Display */}
                    {selectedMusicGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedMusicGenres.map((music) => (
                          <span
                            key={music}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                          >
                            {music}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('music', music)}
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Music Genre Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedMusicGenres.includes(e.target.value)) {
                          handleBiographicalToggle('music', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a music genre to add</option>
                      {availableMusicGenres?.map((music) => (
                        <option key={music} value={music}>
                          {music}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select music genres from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Movie Preferences</label>
                  <div className="space-y-2">
                    {/* Selected Movie Genres Display */}
                    {selectedMovieGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedMovieGenres.map((movie) => (
                          <span
                            key={movie}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                          >
                            {movie}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('movies', movie)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Movie Genre Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedMovieGenres.includes(e.target.value)) {
                          handleBiographicalToggle('movies', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a movie genre to add</option>
                      {availableMovieGenres?.map((movie) => (
                        <option key={movie} value={movie}>
                          {movie}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select movie genres from the dropdown to add them to your profile</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Preferences</label>
                  <div className="space-y-2">
                    {/* Selected Travel Types Display */}
                    {selectedTravelTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTravelTypes.map((travel) => (
                          <span
                            key={travel}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                          >
                            {travel}
                            <button
                              type="button"
                              onClick={() => handleBiographicalToggle('travel', travel)}
                              className="ml-2 text-teal-600 hover:text-teal-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Travel Type Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedTravelTypes.includes(e.target.value)) {
                          handleBiographicalToggle('travel', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a travel type to add</option>
                      {availableTravelTypes?.map((travel) => (
                        <option key={travel} value={travel}>
                          {travel}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select travel types from the dropdown to add them to your profile</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Who are you looking for */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Who are you looking for?</h2>
              
              <div className="space-y-6">
                {/* Gender - multi-select checkboxes, no priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Male','Female','Non-binary','Other'].map(val => (
                      <label key={val} className="flex items-center space-x-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          value={val}
                          checked={seekingGender.includes(val)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSeekingGender(prev => prev.includes(val) ? prev : [...prev, val]);
                            } else {
                              setSeekingGender(prev => prev.filter(v => v !== val));
                            }
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{val}</span>
                      </label>
                    ))}
                    <label className="flex items-center space-x-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={seekingGender.length === 0}
                        onChange={() => setSeekingGender([])}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Any</span>
                    </label>
                  </div>
                </div>

                {/* Location with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location Preference</label>
                  <select 
                    value={seekingPreferences.locationPreference}
                    onChange={(e) => handleSeekingPreferenceChange('locationPreference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exact_match">Exact match</option>
                    <option value="within_city">Within city or country</option>
                    <option value="within_region">Within region</option>
                    <option value="define_radius">Define radius</option>
                  </select>
                  {seekingPreferences.locationPreference === 'define_radius' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Radius: {searchRadius} km
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="200"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5 km</span>
                        <span>100 km</span>
                        <span>200 km</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        💡 Tip: Enable location services above to get accurate proximity-based recommendations
                      </p>
                    </div>
                  )}
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.locationPreference}
                      onChange={(e) => handlePriorityChange('locationPreference', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Status - selection boxes (radio), no priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Any', value: '' },
                      { label: 'Student', value: 'Student' },
                      { label: 'Employed', value: 'Employed' },
                      { label: 'Entrepreneur', value: 'Entrepreneur' },
                      { label: 'Unemployed', value: 'Unemployed' },
                      { label: 'Retired', value: 'Retired' },
                    ].map(opt => (
                      <label key={opt.value || 'any'} className="flex items-center space-x-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="seeking-status"
                          value={opt.value}
                          checked={(seekingPreferences.status || '') === opt.value}
                          onChange={() => handleSeekingPreferenceChange('status', opt.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                

                {/* Languages with Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <div className="space-y-2">
                    {/* Selected Seeking Languages Display */}
                    {seekingLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingLanguages.map((language) => (
                          <span
                            key={language}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                          >
                            {language}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-languages', language)}
                              className="ml-2 text-indigo-600 hover:text-indigo-800"
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
                        if (e.target.value && !seekingLanguages.includes(e.target.value)) {
                          handleSeekingToggle('seeking-languages', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a language to add</option>
                      {availableLanguages?.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select languages from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.languages}
                      onChange={(e) => handlePriorityChange('languages', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Interests Display */}
                    {seekingInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingInterests.map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {interest}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-interests', interest)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Interest Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingInterests.includes(e.target.value)) {
                          handleSeekingToggle('seeking-interests', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an interest to add</option>
                      {availableInterests?.map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select interests from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.interests}
                      onChange={(e) => handlePriorityChange('interests', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Hobbies Display */}
                    {seekingHobbies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingHobbies.map((hobby) => (
                          <span
                            key={hobby}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                          >
                            {hobby}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-hobbies', hobby)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Hobby Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingHobbies.includes(e.target.value)) {
                          handleSeekingToggle('seeking-hobbies', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a hobby to add</option>
                      {availableHobbies?.map((hobby) => (
                        <option key={hobby} value={hobby}>
                          {hobby}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select hobbies from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.hobbies}
                      onChange={(e) => handlePriorityChange('hobbies', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Food Preferences Display */}
                    {seekingFoodPreferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingFoodPreferences.map((food) => (
                          <span
                            key={food}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                          >
                            {food}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-food', food)}
                              className="ml-2 text-orange-600 hover:text-orange-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Food Preference Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingFoodPreferences.includes(e.target.value)) {
                          handleSeekingToggle('seeking-food', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a food preference to add</option>
                      {availableFoodPreferences?.map((food) => (
                        <option key={food} value={food}>
                          {food}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select food preferences from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.foodPreferences}
                      onChange={(e) => handlePriorityChange('foodPreferences', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Music Genres Display */}
                    {seekingMusicGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingMusicGenres.map((music) => (
                          <span
                            key={music}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                          >
                            {music}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-music', music)}
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Music Genre Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingMusicGenres.includes(e.target.value)) {
                          handleSeekingToggle('seeking-music', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a music genre to add</option>
                      {availableMusicGenres?.map((music) => (
                        <option key={music} value={music}>
                          {music}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select music genres from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.musicGenres}
                      onChange={(e) => handlePriorityChange('musicGenres', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Movie Genres Display */}
                    {seekingMovieGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingMovieGenres.map((movie) => (
                          <span
                            key={movie}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                          >
                            {movie}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-movies', movie)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Movie Genre Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingMovieGenres.includes(e.target.value)) {
                          handleSeekingToggle('seeking-movies', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a movie genre to add</option>
                      {availableMovieGenres?.map((movie) => (
                        <option key={movie} value={movie}>
                          {movie}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select movie genres from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.movieGenres}
                      onChange={(e) => handlePriorityChange('movieGenres', parseInt(e.target.value))}
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
                  <div className="space-y-2">
                    {/* Selected Seeking Travel Types Display */}
                    {seekingTravelTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {seekingTravelTypes.map((travel) => (
                          <span
                            key={travel}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                          >
                            {travel}
                            <button
                              type="button"
                              onClick={() => handleSeekingToggle('seeking-travel', travel)}
                              className="ml-2 text-teal-600 hover:text-teal-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Travel Type Selection Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !seekingTravelTypes.includes(e.target.value)) {
                          handleSeekingToggle('seeking-travel', e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a travel type to add</option>
                      {availableTravelTypes?.map((travel) => (
                        <option key={travel} value={travel}>
                          {travel}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Select travel types from the dropdown to add them to your preferences</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.travelTypes}
                      onChange={(e) => handlePriorityChange('travelTypes', parseInt(e.target.value))}
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
                  <select 
                    value={seekingPreferences.ethnicity}
                    onChange={(e) => handleSeekingPreferenceChange('ethnicity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Ethnicity</option>
                    <option value="Asian">Asian</option>
                    <option value="African">African</option>
                    <option value="European">European</option>
                    <option value="Hispanic">Hispanic</option>
                    <option value="Middle Eastern">Middle Eastern</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.ethnicity}
                      onChange={(e) => handlePriorityChange('ethnicity', parseInt(e.target.value))}
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
                  <select 
                    value={seekingPreferences.religion}
                    onChange={(e) => handleSeekingPreferenceChange('religion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Religion</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Islam">Islam</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Judaism">Judaism</option>
                    <option value="Atheist">Atheist</option>
                    <option value="Agnostic">Agnostic</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Priority</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={priorityLevels.religion}
                      onChange={(e) => handlePriorityChange('religion', parseInt(e.target.value))}
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={changePasswordData.currentPassword}
                  onChange={(e) => setChangePasswordData(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  resetChangePasswordForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isChangingPassword}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className={`flex-1 px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isChangingPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Modal */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Profile</h3>
            
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-semibold">⚠️ This action cannot be undone!</p>
              <p className="text-sm mt-1">
                Deleting your profile will permanently remove:
              </p>
              <ul className="text-sm mt-2 ml-4 list-disc">
                <li>Your profile and personal information</li>
                <li>All your connections and chats</li>
                <li>All your messages and data</li>
              </ul>
            </div>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={deleteProfileData.password}
                  onChange={(e) => setDeleteProfileData(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your password to confirm"
                />
              </div>

              {/* Confirmation Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteProfileData.confirmText}
                  onChange={(e) => setDeleteProfileData(prev => ({
                    ...prev,
                    confirmText: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type DELETE"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteProfileModal(false);
                  resetDeleteProfileForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={isDeletingProfile}
                className={`flex-1 px-4 py-2 text-white rounded-md ${
                  isDeletingProfile
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeletingProfile ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
