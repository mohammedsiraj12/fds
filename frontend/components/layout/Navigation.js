"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUser, logout, isAuthenticated } from "../../lib/auth";
import Button from "../ui/Button";
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  HomeIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  VideoCameraIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

const Navigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const userData = getUser();
      setUser(userData);
    }
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/");
  };

  const doctorNavItems = [
    { name: "Dashboard", href: "/doctor/dashboard", icon: HomeIcon },
    { name: "Consultations", href: "/doctor/consultations", icon: ChatBubbleLeftRightIcon },
    { name: "Video Rooms", href: "/video", icon: VideoCameraIcon },
    { name: "Appointments", href: "/doctor/appointments", icon: CalendarIcon },
    { name: "Patients", href: "/doctor/patients", icon: UserCircleIcon },
  ];

  const patientNavItems = [
    { name: "Dashboard", href: "/patient/dashboard", icon: HomeIcon },
    { name: "Ask Question", href: "/patient/consultation", icon: ChatBubbleLeftRightIcon },
    { name: "Video Rooms", href: "/video", icon: VideoCameraIcon },
    { name: "Appointments", href: "/patient/appointments", icon: CalendarIcon },
    { name: "Medical Records", href: "/patient/records", icon: DocumentTextIcon },
  ];

  const adminNavItems = [
    { name: "Admin Dashboard", href: "/admin/enhanced-dashboard", icon: HomeIcon },
    { name: "User Management", href: "/admin/enhanced-dashboard", icon: UserCircleIcon },
    { name: "Video Rooms", href: "/video", icon: VideoCameraIcon },
    { name: "Analytics", href: "/admin/enhanced-dashboard", icon: ChartBarIcon },
    { name: "Settings", href: "/admin/enhanced-dashboard", icon: Cog6ToothIcon },
  ];

  const getNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case "doctor":
        return doctorNavItems;
      case "admin":
        return adminNavItems;
      case "patient":
      default:
        return patientNavItems;
    }
  };

  const isActive = (href) => pathname.startsWith(href);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">
                MedConsult
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {getNavItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  Hello, {user.email?.split("@")[0]}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            {getNavItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            
            {user ? (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-3 py-2 text-sm text-gray-500">
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                <Link
                  href="/login"
                  className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
