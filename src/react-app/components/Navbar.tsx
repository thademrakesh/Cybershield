import { Shield } from 'lucide-react';
import { Link } from 'react-router';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-slate-950/90 backdrop-blur-sm border-b border-cyan-500/20 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CyberShield XAI
            </span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-gray-300 hover:text-cyan-400 transition-colors">
              About
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/login" 
              className="text-gray-300 hover:text-cyan-400 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
