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
  const [user, setUser] = useState<{
    id: number;
    email: string;
    isActive: boolean;
  } | null>(null);

  // Check for existing authentication on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch {
        // Invalid user data, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Logout function
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

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
    setFormData((prev) => ({
      ...prev,
      [id.replace("signup-", "").replace("login-", "")]: value,
    }));

    // Clear error when user starts typing
    if (
      errors[
        id.replace("signup-", "").replace("login-", "") as keyof FormErrors
      ]
    ) {
      setErrors((prev) => ({
        ...prev,
        [id.replace("signup-", "").replace("login-", "") as keyof FormErrors]:
          undefined,
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

      if (response.ok) {
        const data = await response.json();

        // Store token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Mark user as online after successful login (await to avoid navigation-cancel)
        console.log("[Login] Setting user online after login");
        try {
          await authApi.updateOnlineStatus(true);
          console.log("[Login] Successfully set user online after login");
        } catch (error) {
          console.error(
            "[Login] Failed to set user online after login:",
            error
          );
        }

        // Check if user has a profile to determine redirect destination
        try {
          const { profileApi } = await import("../lib/api");
          const profile = await profileApi.getMyProfile();

          // If user has no profile or profile is incomplete (no firstName), redirect to profile page
          if (!profile || !profile.firstName || !profile.firstName.trim()) {
            console.log(
              "[Login] User has no profile, redirecting to profile page"
            );
            router.push("/profile");
          } else {
            console.log("[Login] User has profile, redirecting to frontpage");
            router.push("/frontpage");
          }
        } catch (profileError) {
          // If profile check fails, assume no profile exists and redirect to profile page
          console.log(
            "[Login] Profile check failed, redirecting to profile page:",
            profileError
          );
          router.push("/profile");
        }

        console.log("Login successful:", data);
      } else {
        // Handle different HTTP status codes
        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          setErrors({
            general: "Invalid email or password. If you recently deleted your account, you'll need to create a new one.",
          });
        } else if (response.status === 400) {
          setErrors({
            general: data.error || "Invalid request. Please check your input.",
          });
        } else if (response.status >= 500) {
          setErrors({ general: "Server error. Please try again later." });
        } else {
          setErrors({
            general: data.error || "Login failed. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setErrors({
          general: "Network error. Please check your connection and try again.",
        });
      } else {
        setErrors({ general: "Login failed. Please try again." });
      }
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
      const response = await authApi.register(
        formData.email,
        formData.password
      );

      if (response.ok) {
        // After successful registration, automatically log in the user
        console.log(
          "[Registration] Registration successful, auto-logging in user"
        );

        try {
          // Auto-login after registration
          const loginResponse = await authApi.login(
            formData.email,
            formData.password
          );
          const loginData = await loginResponse.json();

          if (loginResponse.ok) {
            // Store token and user data
            localStorage.setItem("token", loginData.token);
            localStorage.setItem("user", JSON.stringify(loginData.user));

            // Mark user as online
            console.log("[Registration] Setting user online after auto-login");
            try {
              await authApi.updateOnlineStatus(true);
              console.log(
                "[Registration] Successfully set user online after auto-login"
              );
            } catch (error) {
              console.error(
                "[Registration] Failed to set user online after auto-login:",
                error
              );
            }

            // New users always go to profile page to set up their profile
            console.log("[Registration] New user, redirecting to profile page");
            router.push("/profile");

            console.log("Registration and auto-login successful:", loginData);
          } else {
            // If auto-login fails, show success message and switch to login form
            setSuccessMessage("Account created successfully! Please login.");
            setIsLogin(true);
            setFormData({ email: "", password: "" });
          }
        } catch (loginError) {
          // If auto-login fails, show success message and switch to login form
          console.error("[Registration] Auto-login failed:", loginError);
          setSuccessMessage("Account created successfully! Please login.");
          setIsLogin(true);
          setFormData({ email: "", password: "" });
        }
      } else {
        // Handle different HTTP status codes
        const data = await response.json().catch(() => ({}));

        if (response.status === 400) {
          setErrors({
            general: data.error || "Invalid request. Please check your input.",
          });
        } else if (response.status === 409) {
          setErrors({
            general:
              "Email already exists. Please use a different email or try logging in.",
          });
        } else if (response.status >= 500) {
          setErrors({ general: "Server error. Please try again later." });
        } else {
          setErrors({
            general: data.error || "Registration failed. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setErrors({
          general: "Network error. Please check your connection and try again.",
        });
      } else {
        setErrors({ general: "Registration failed. Please try again." });
      }
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
      {/* Full screen background image - hidden on mobile */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600">
        <Image
          src="/sitefiles/index-image-web.png"
          alt="Match Me"
          fill
          className="object-cover hidden sm:block"
          sizes="100vw"
          onError={(e) => console.log("Image failed to load:", e)}
        />
        {/* <div className="absolute inset-0 bg-black bg-opacity-20"></div> */}
      </div>

      {/* Login panel overlay - responsive positioning */}
      <div className="relative z-10 min-h-screen flex items-center justify-center sm:justify-end px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Form Container */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-lg shadow-2xl p-6 sm:p-8 border border-white/20 mx-2 sm:mx-0">
            {/* Mobile Logo Header - only visible on mobile */}
            <div className="text-center mb-6 sm:hidden">
              <Image
                src="/sitefiles/site-logo-web.png"
                alt="Match Me Logo"
                width={160}
                height={160}
                sizes="(max-width: 640px) 160px, 160px"
                className="mx-auto"
                onError={(e) => console.log("Logo failed to load:", e)}
              />
            </div>
            {isAuthenticated ? (
              /* Authenticated User Dashboard */
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Welcome back!
                  </h2>
                  <p className="text-gray-600">
                    You&apos;re successfully logged in
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">
                    User Information
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Email:</span> {user?.email}
                    </p>
                    <p>
                      <span className="font-medium">User ID:</span> {user?.id}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {user?.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-base font-medium"
                  >
                    Go to Profile
                  </button>

                  <button
                    onClick={() => router.push("/frontpage")}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 text-base font-medium"
                  >
                    Go to App
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 text-base font-medium"
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
                    <div className="mb-2">{errors.general}</div>
                    {errors.general.includes("deleted your account") && (
                      <div className="text-sm">
                        <button
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className="text-red-600 hover:text-red-800 underline font-medium"
                        >
                          Create a new account instead
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isLogin ? (
                  /* Login Form */
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6 text-center">
                      Login
                    </h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label
                          htmlFor="login-email"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="login-email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
                            errors.email ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter your email"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="login-password"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Password
                        </label>
                        <input
                          type="password"
                          id="login-password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
                            errors.password
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Enter your password"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
                      >
                        {isLoading ? "Logging in..." : "Login"}
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <a
                        href="#"
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Forgot password?
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Create Account Form */
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6 text-center">
                      Create Account
                    </h2>

                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label
                          htmlFor="signup-email"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="signup-email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base ${
                            errors.email ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter your email"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="signup-password"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Password
                        </label>
                        <input
                          type="password"
                          id="signup-password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base ${
                            errors.password
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Create a password (min 6 characters)"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
                      >
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Toggle between Login and Create Account */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    {isLogin
                      ? "Don't have an account? "
                      : "Already have an account? "}
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
