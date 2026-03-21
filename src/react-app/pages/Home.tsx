import { Shield, Brain, AlertTriangle, BarChart3, Lock, Zap, Network, Eye } from 'lucide-react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Explainable Threat Intelligence
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Real-time network traffic analysis powered by XGBoost and Explainable AI. 
                Detect, classify, and understand cyber threats with unprecedented clarity.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="/signup" 
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 font-semibold"
                >
                  Get Started
                </a>
                <a 
                  href="/about" 
                  className="px-8 py-3 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all font-semibold"
                >
                  Learn More
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl"></div>
              <div className="relative bg-slate-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                    <Shield className="w-8 h-8 text-cyan-400 mb-2" />
                    <div className="text-2xl font-bold text-white">98.5%</div>
                    <div className="text-sm text-gray-400">Detection Rate</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                    <Brain className="w-8 h-8 text-purple-400 mb-2" />
                    <div className="text-2xl font-bold text-white">Real-time</div>
                    <div className="text-sm text-gray-400">Analysis</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/20">
                    <Eye className="w-8 h-8 text-blue-400 mb-2" />
                    <div className="text-2xl font-bold text-white">XAI</div>
                    <div className="text-sm text-gray-400">Powered</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
                    <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                    <div className="text-2xl font-bold text-white">Instant</div>
                    <div className="text-sm text-gray-400">Alerts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Key Features</h2>
            <p className="text-xl text-gray-400">Advanced cybersecurity powered by machine learning and explainability</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-12 h-12 text-cyan-400" />}
              title="Real-Time Detection"
              description="Analyze network traffic in real-time and detect threats as they emerge with minimal latency."
            />
            <FeatureCard
              icon={<Brain className="w-12 h-12 text-purple-400" />}
              title="Explainable AI"
              description="Understand why traffic is classified as malicious with SHAP and LIME explanations."
            />
            <FeatureCard
              icon={<AlertTriangle className="w-12 h-12 text-red-400" />}
              title="Severity Assessment"
              description="Automatically prioritize threats based on severity levels from low to critical."
            />
            <FeatureCard
              icon={<BarChart3 className="w-12 h-12 text-blue-400" />}
              title="Visual Analytics"
              description="Interactive dashboards with charts and graphs for comprehensive threat analysis."
            />
            <FeatureCard
              icon={<Lock className="w-12 h-12 text-green-400" />}
              title="Role-Based Access"
              description="Secure access control with separate interfaces for administrators and users."
            />
            <FeatureCard
              icon={<Network className="w-12 h-12 text-orange-400" />}
              title="Network Monitoring"
              description="Comprehensive visibility into network traffic patterns and anomalies."
            />
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-400">A streamlined approach to threat intelligence</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <WorkflowStep
              number="1"
              title="Capture Traffic"
              description="Network packets are captured and preprocessed for analysis"
            />
            <WorkflowStep
              number="2"
              title="Classify Threat"
              description="XGBoost model classifies traffic as normal or malicious"
            />
            <WorkflowStep
              number="3"
              title="Generate Explanation"
              description="XAI techniques explain the classification decision"
            />
            <WorkflowStep
              number="4"
              title="Alert & Report"
              description="System generates alerts and detailed reports"
            />
          </div>
        </div>
      </section>
      
      {/* Tech Stack Section */}
      <section id="tech-stack" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Technology Stack</h2>
            <p className="text-xl text-gray-400">Built with industry-leading tools and frameworks</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TechCard name="XGBoost" category="Machine Learning" />
            <TechCard name="SHAP & LIME" category="Explainable AI" />
            <TechCard name="Python" category="Backend" />
            <TechCard name="React" category="Frontend" />
            <TechCard name="Tailwind CSS" category="Styling" />
            <TechCard name="Scikit-learn" category="ML Pipeline" />
            <TechCard name="Pandas" category="Data Processing" />
            <TechCard name="Recharts" category="Visualization" />
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">About the Project</h2>
          <p className="text-lg text-gray-300 mb-8">
            CyberShield XAI is a final-year engineering project that combines cutting-edge 
            machine learning with explainable AI to create a transparent and effective threat 
            intelligence system. By making AI decisions interpretable, we empower security 
            professionals to understand and trust automated threat detection.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg px-6 py-3">
              <span className="text-gray-400 text-sm">Department of</span>
              <div className="text-white font-semibold">Cyber Security</div>
            </div>
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg px-6 py-3">
              <span className="text-gray-400 text-sm">Academic Year</span>
              <div className="text-white font-semibold">2025-2026</div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function WorkflowStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg shadow-cyan-500/30">
          {number}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function TechCard({ name, category }: { name: string; category: string }) {
  return (
    <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4 text-center hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="text-lg font-semibold text-white mb-1">{name}</div>
      <div className="text-sm text-gray-400">{category}</div>
    </div>
  );
}
