"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { authApi, connectionsApi } from "../lib/api";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  city?: string;
  country?: string;
}

interface UserSearchBoxProps {
  onUserSelect: (user: User) => void;
  onCreateChat: (userId: number) => void;
}

export default function UserSearchBox({ onUserSelect, onCreateChat }: UserSearchBoxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        // For now, we'll search through connections
        // In a real implementation, you'd have a dedicated user search API
        const response = await connectionsApi.getConnections();
        if (response.success && response.data) {
          const connections = response.data.connections || [];
          const filtered = connections.filter((conn: { firstName: string; lastName: string }) => {
            const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase());
          });
          setSearchResults(filtered.slice(0, 5)); // Limit to 5 results
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleUserSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleUserSelect = (user: User) => {
    onUserSelect(user);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      setShowResults(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a user to chat with..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
              setShowResults(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {isSearching ? "Searching..." : "No users found"}
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {user.profilePicture && user.profilePicture.startsWith('/') ? (
                      <Image
                        src={user.profilePicture}
                        alt={`${user.firstName} ${user.lastName}`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                        {user.profilePicture || '👤'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {(user.city || user.country) && (
                        <p className="text-sm text-gray-500 truncate">
                          {[user.city, user.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
