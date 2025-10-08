"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, profileApi, getApiUrl } from "../lib/api";
import PendingRequestsIndicator from "./PendingRequestsIndicator";
import DataModeToggle from "./DataModeToggle";

interface UserProfile {
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoading(true);

        // Try to load profile data
        try {
          const profile = await profileApi.getMyProfile();
          setUserProfile({
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            profilePictureURL:
              profile.profilePictureURL ||
              "/sitefiles/default-profile-picture.png",
          });
        } catch {
          // console.log("No profile data found yet");
          setUserProfile({
            profilePictureURL: "/sitefiles/default-profile-picture.png",
          });
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // Handle navigation
  const handleNavigation = (tab: string) => {
    setIsMobileMenuOpen(false);
    switch (tab) {
      case "frontpage":
        router.push("/frontpage");
        break;
      case "profile":
        router.push("/profile");
        break;
      case "connections":
        router.push("/connectionlist");
        break;
      case "requests":
        router.push("/connectionrequests");
        break;
      default:
        break;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname === "/frontpage") return "frontpage";
    if (pathname === "/profile") return "profile";
    if (pathname === "/connectionlist") return "connections";
    if (pathname === "/connectionrequests") return "requests";
    return "";
  };

  const activeTab = getActiveTab();

  // Get display name
  const getDisplayName = () => {
    if (isLoading) return "Loading...";
    if (userProfile.firstName && userProfile.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    if (userProfile.firstName) {
      return userProfile.firstName;
    }
    return "Profile";
  };

  return (
    <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/frontpage" className="block">
              <Image
                src="/sitefiles/site-logo-web.png"
                alt="Site Logo"
                width={120}
                height={40}
                sizes="120px"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ width: 120, height: 40 }}
              />
            </Link>
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
                href="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === "profile"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                }`}
              >
                Profile
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
                className={`px-3 py-2 rounded-md text-sm font-medium transition relative ${
                  activeTab === "requests"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                }`}
              >
                Connection Requests
                <PendingRequestsIndicator className="absolute -top-1 -right-1" />
              </Link>
            </div>
          </div>

          {/* User Profile Section */}
          <div className="flex items-center space-x-4">
            {/* Data Mode Toggle (show on frontpage) */}
            {pathname === "/frontpage" && <DataModeToggle />}

            {/* Profile Photo and Name */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                {(() => {
                  // Use the same logic as other components for handling different URL formats
                  const profilePicSrc =
                    userProfile.profilePictureURL &&
                    userProfile.profilePictureURL.startsWith("http")
                      ? userProfile.profilePictureURL
                      : userProfile.profilePictureURL &&
                        userProfile.profilePictureURL.startsWith("/uploads")
                      ? `${getApiUrl().replace(/\/$/, "")}${userProfile.profilePictureURL}`
                      : userProfile.profilePictureURL &&
                        userProfile.profilePictureURL.startsWith("/")
                      ? userProfile.profilePictureURL
                      : "/sitefiles/default-profile-picture.png";

                  // console.log(
                  //   "[Navigation] Profile picture URL:",
                  //   userProfile.profilePictureURL
                  // );
                  // console.log(
                  //   "[Navigation] Final profile picture src:",
                  //   profilePicSrc
                  // );

                  return (
                    <Image
                      src={profilePicSrc}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                      style={{
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                        minHeight: "32px",
                        borderRadius: "50%",
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/sitefiles/default-profile-picture.png";
                      }}
                    />
                  );
                })()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {getDisplayName()}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition"
            >
              Logout
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg
                  className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
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
                {/* Close icon */}
                <svg
                  className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t">
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
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left relative ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
              <PendingRequestsIndicator className="absolute top-2 right-2" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
