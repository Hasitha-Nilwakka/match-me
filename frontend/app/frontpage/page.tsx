"use client";
import Image from "next/image";
import { useState } from "react";

export default function FrontPage() {
  const [activeTab, setActiveTab] = useState("frontpage");

  const handleLogout = () => {
    // Add logout functionality here
    console.log("Logout clicked");
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
  };

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
                <button
                  onClick={() => handleNavigation("frontpage")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "frontpage"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Front Page
                </button>
                <button
                  onClick={() => handleNavigation("profile")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => handleNavigation("connections")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "connections"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection List
                </button>
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
            <button
              onClick={() => handleNavigation("frontpage")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "frontpage"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Front Page
            </button>
            <button
              onClick={() => handleNavigation("profile")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "profile"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => handleNavigation("connections")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "connections"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection List
            </button>
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
          </div>

          {/* Recommendation Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto">
            
            {/* Profile Picture Section */}
            <div className="relative">
              <div className="h-80 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <Image
                  src="/sitefiles/default-profile-picture.png"
                  alt="Recommendation Profile"
                  width={200}
                  height={200}
                  className="rounded-full border-8 border-white shadow-2xl"
                />
              </div>
              
              {/* Online Status */}
              <div className="absolute top-6 right-6">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  Online
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sarah Johnson</h2>
                <p className="text-gray-600 mb-1">25 years old • Software Engineer</p>
                <p className="text-gray-500 text-sm">San Francisco, CA</p>
              </div>

              {/* Top 5 Match Criteria */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Why you might match:</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">Shared Interest: Technology</span>
                    </div>
                    <span className="text-green-600 font-semibold">95%</span>
                  </div>

                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">Music Preference: Rock</span>
                    </div>
                    <span className="text-blue-600 font-semibold">88%</span>
                  </div>

                  <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">Travel: Adventure</span>
                    </div>
                    <span className="text-purple-600 font-semibold">82%</span>
                  </div>

                  <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">Hobby: Photography</span>
                    </div>
                    <span className="text-orange-600 font-semibold">76%</span>
                  </div>

                  <div className="flex items-center justify-between bg-pink-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">Food: Italian</span>
                    </div>
                    <span className="text-pink-600 font-semibold">71%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mb-6">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Connect
                </button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold transition flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </button>
              </div>

              {/* View Full Profile Button */}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition mb-6">
                View Full Profile
              </button>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center">
                <button className="flex items-center text-gray-600 hover:text-gray-800 transition">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="text-center">
                  <div className="text-sm text-gray-500">Recommendation</div>
                  <div className="font-semibold text-gray-800">1 of 12</div>
                </div>
                
                <button className="flex items-center text-gray-600 hover:text-gray-800 transition">
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
