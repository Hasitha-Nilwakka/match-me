"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "../../lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
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
                <button
                  onClick={() => handleNavigation("requests")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection Requests
                </button>
                <button
                  onClick={() => handleNavigation("chat")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "chat"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Chat
                </button>
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
            <button
              onClick={() => handleNavigation("requests")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
            </button>
            <button
              onClick={() => handleNavigation("chat")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "chat"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Chat
            </button>
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
                  value="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Student</option>
                    <option>Employed</option>
                    <option>Entrepreneur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <input
                    type="text"
                    placeholder="English, Spanish, French..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ethnicity</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                    <option>Photography</option>
                    <option>Cooking</option>
                    <option>Gaming</option>
                    <option>Gardening</option>
                    <option>Painting</option>
                    <option>Writing</option>
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
                    <option>Photography</option>
                    <option>Cooking</option>
                    <option>Gaming</option>
                    <option>Gardening</option>
                    <option>Painting</option>
                    <option>Writing</option>
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
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium">
              Save Profile
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
