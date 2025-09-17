"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authApi } from "../lib/api";

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{id: number; email: string; isActive: boolean} | null>(null);

  // Check for existing authentication on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch {
        // Invalid user data, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Logout function
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    setIsAuthenticated(false);
    setUser(null);
    setFormData({ email: "", password: "" });
    setErrors({});
    setSuccessMessage("");
    setIsLogin(true);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id.replace('signup-', '').replace('login-', '')]: value
    }));
    
    // Clear error when user starts typing
    if (errors[id.replace('signup-', '').replace('login-', '') as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [id.replace('signup-', '').replace('login-', '') as keyof FormErrors]: undefined
      }));
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await authApi.login(formData.email, formData.password);
      
      const data = await response.json();
      
      if (response.ok) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to frontpage immediately (no state updates to avoid flash)
        router.push('/frontpage');
        
        console.log('Login successful:', data);
      } else {
        setErrors({ general: data.error || 'Login failed' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await authApi.register(formData.email, formData.password);
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Account created successfully! You can now login.');
        setIsLogin(true);
        setFormData({ email: "", password: "" });
      } else {
        setErrors({ general: data.error || 'Registration failed' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when switching between login/register
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({ email: "", password: "" });
    setErrors({});
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen relative">
      {/* Full screen background image */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600">
        <Image
          src="/sitefiles/index-image-web.png"
          alt="Match Me"
          fill
          className="object-cover"
          priority
          onError={(e) => console.log('Image failed to load:', e)}
        />
        {/* <div className="absolute inset-0 bg-black bg-opacity-20"></div> */}
      </div>

      {/* Login panel overlay on the right */}
      <div className="relative z-10 min-h-screen flex items-center justify-end px-8 py-12">
        <div className="w-full max-w-md">

          {/* Form Container */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border border-white/20">
            {isAuthenticated ? (
              /* Authenticated User Dashboard */
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back!</h2>
                  <p className="text-gray-600">You&apos;re successfully logged in</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Email:</span> {user?.email}</p>
                    <p><span className="font-medium">User ID:</span> {user?.id}</p>
                    <p><span className="font-medium">Status:</span> {user?.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {/* Add navigation to profile page */}}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                  >
                    Go to Profile
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              /* Login/Register Forms */
              <div>
                {/* Success Message */}
                {successMessage && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                    {successMessage}
                  </div>
                )}

                {/* General Error Message */}
                {errors.general && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    {errors.general}
                  </div>
                )}

                {isLogin ? (
              /* Login Form */
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Login</h2>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="login-email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="login-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </a>
                </div>
              </div>
            ) : (
              /* Create Account Form */
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Create Account</h2>
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="signup-email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="signup-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Create a password (min 6 characters)"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            )}

                {/* Toggle between Login and Create Account */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                      onClick={toggleForm}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      {isLogin ? "Create a new account" : "Login"}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
