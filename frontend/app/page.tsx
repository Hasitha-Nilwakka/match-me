"use client";
import { useState } from "react";

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen w-full">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Mobile Image */}
        <div 
          className="flex-1 relative overflow-hidden"
        >
          <img 
            src="/sitefiles/index-image-mobile.png" 
            alt="Mobile background"
            className="w-full h-full object-cover object-top"
          />
        </div>
        
        {/* Mobile Form Container */}
        <div className="bg-white/95 p-6 rounded-t-3xl shadow-2xl">
          <div className="max-w-sm mx-auto">
            {/* Mobile Login Form */}
            {isLogin && (
              <form className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  Login
                </h2>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="text-right">
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-800 underline">
                    Forgot password?
                  </a>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Login
                </button>
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Create new account
                  </button>
                </div>
              </form>
            )}

            {/* Mobile Register Form */}
            {!isLogin && (
              <form className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  Create Account
                </h2>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    placeholder="Create a password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create Account
                </button>
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Already have an account? Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen w-full bg-cover bg-center items-center justify-end"
           style={{ backgroundImage: "url('/sitefiles/index-image-web.png')" }}>
        {/* Desktop Form container */}
        <div className="bg-white/90 shadow-xl rounded-2xl w-full max-w-md p-6 mr-12">
          {/* Desktop Login Form */}
          {isLogin && (
            <form className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 text-left">
                Login
              </h2>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Password</label>
                <input
                  type="password"
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="Enter your password"
                />
              </div>
              <div className="text-right">
                <a href="#" className="text-sm text-blue-600 hover:text-blue-800 underline">
                  Forgot password?
                </a>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Login
              </button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Create new account
                </button>
              </div>
            </form>
          )}

          {/* Desktop Register Form */}
          {!isLogin && (
            <form className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 text-left">
                Create Account
              </h2>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Password</label>
                <input
                  type="password"
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="Create a password"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create Account
              </button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Already have an account? Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
