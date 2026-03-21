import { Shield, Brain, Zap, Lock, Globe, Database, Cpu, Activity, Mail, UserCheck } from 'lucide-react';
import { Link } from 'react-router';
import Footer from '../components/Footer';

export default function AboutPage() {
  const features = [
    {
      icon: <Brain className="w-6 h-6 text-cyan-400" />,
      title: "Explainable AI (XAI)",
      description: "Go beyond simple alerts. Our SHAP-based explanations provide human-readable reasoning for every detection, identifying the specific features that triggered the alarm."
    },
    {
      icon: <Zap className="w-6 h-6 text-purple-400" />,
      title: "Real-time Detection",
      description: "Monitor network traffic in real-time. Our system captures and analyzes packets as they arrive, providing sub-second latency for critical threat identification."
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      title: "Secure by Design",
      description: "Our platform features multi-factor authentication with OTP verification, role-based access control, and comprehensive audit logging to ensure your monitoring data stays secure."
    },
    {
      icon: <Globe className="w-6 h-6 text-blue-400" />,
      title: "Wide Protocol Support",
      description: "Analysis of common network protocols including TCP, UDP, ICMP, and HTTP, with support for legacy and modern communication standards."
    },
    {
      icon: <Database className="w-6 h-6 text-amber-400" />,
      title: "Historical Intelligence",
      description: "Comprehensive database of past threats and sessions allows for long-term trend analysis and forensic investigation into historical security events."
    },
    {
      icon: <Activity className="w-6 h-6 text-rose-400" />,
      title: "Real-time Visualizations",
      description: "Interactive dashboards and live metrics provide an immediate overview of network health and security posture through dynamic charts and alerts."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>Pioneering Explainable Cybersecurity</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Protecting the <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Digital Frontier</span>
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed mb-10">
              CyberShield XAI combines state-of-the-art machine learning with Explainable AI to provide transparent, trustworthy, and real-time network intrusion detection.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
                Get Started
              </Link>
              <Link to="/login" className="px-8 py-3 bg-slate-900 border border-slate-800 rounded-lg font-semibold hover:bg-slate-800 transition-all">
                Login to Console
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-slate-900 bg-slate-900/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">99.8%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">&lt;100ms</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">100+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Features</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">24/7</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <div className="space-y-4 text-gray-400 text-lg leading-relaxed">
                <p>
                  Traditional security systems often act as "black boxes," flagging threats without explaining why. This lack of transparency leads to alert fatigue and slower incident response times.
                </p>
                <p>
                  At CyberShield XAI, we believe that <span className="text-white font-medium">security intelligence should be understandable</span>. Our mission is to empower security analysts with tools that not only detect threats but also provide deep, explainable insights into network anomalies.
                </p>
                <p>
                  By bridging the gap between complex machine learning and human intuition, we're building a more secure and transparent digital world.
                </p>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-3xl"></div>
              <div className="relative bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="h-24 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700">
                      <Cpu className="w-8 h-8 text-cyan-400 opacity-50" />
                    </div>
                    <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700">
                      <Database className="w-8 h-8 text-purple-400 opacity-50" />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700">
                      <Activity className="w-8 h-8 text-emerald-400 opacity-50" />
                    </div>
                    <div className="h-24 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700">
                      <Lock className="w-8 h-8 text-blue-400 opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Core Technology</h2>
            <p className="text-gray-400">Powered by advanced machine learning models trained on the NSL-KDD dataset and enhanced with SHAP (SHapley Additive exPlanations) for model transparency.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full blur-3xl opacity-20"></div>
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-900 border-4 border-cyan-500/30 flex items-center justify-center relative">
                    <UserCheck className="w-16 h-16 md:w-24 md:h-24 text-cyan-400" />
                  </div>
                </div>
              </div>
              <div className="md:w-2/3">
                <h2 className="text-3xl font-bold mb-6">Enhanced Security Features</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Mail className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">OTP Verification</h4>
                      <p className="text-sm text-gray-400">Secure registration and password reset via 6-digit email codes.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Lock className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Role-Based Access</h4>
                      <p className="text-sm text-gray-400">Granular permissions for Admins and Analysts.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Shield className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Audit Logs</h4>
                      <p className="text-sm text-gray-400">Complete historical record of all system events and access.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Threat Alerts</h4>
                      <p className="text-sm text-gray-400">Multi-channel notifications via Email, Slack, and SMS.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8 tracking-tight">Ready to Secure Your Network?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-xl shadow-cyan-500/20">
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
