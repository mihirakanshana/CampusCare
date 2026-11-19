import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Layers,
  Mail,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BrandLogo } from '../components/BrandLogo';

const HERO_IMAGE = '/src/assets/images/hero_campus_architecture_1794975593180.jpg';
const INSPECTION_IMAGE = '/src/assets/images/feature_facility_inspection_1794975593490.jpg';

export function LandingPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [inspectImgFailed, setInspectImgFailed] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    university: '',
    message: '',
  });
  const [contactSent, setContactSent] = useState(false);

  const handleReportCta = () => {
    if (profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/student/report');
    } else {
      navigate('/register');
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !contactForm.name.trim() ||
      !contactForm.email.includes('@') ||
      !contactForm.message.trim()
    ) {
      showToast(
        'Check required fields',
        'Please enter your name, a valid email address, and your inquiry.',
        'error'
      );
      return;
    }
    setContactSent(true);
    showToast(
      'Inquiry recorded',
      'Thank you for reaching out to the UniFix team.',
      'success'
    );
  };

  const workflowSteps = [
    {
      num: '01',
      title: 'Report a problem',
      desc: 'Students submit location details, description, and an on-site photograph from any device.',
    },
    {
      num: '02',
      title: 'AI analyzes the issue',
      desc: 'UniFix AI multimodal diagnostics classify category, assess advisory priority, and check duplicates.',
    },
    {
      num: '03',
      title: 'Administration reviews the report',
      desc: 'Facilities coordinators verify AI recommendations, assign a department, and dispatch staff.',
    },
    {
      num: '04',
      title: 'Maintenance team resolves it',
      desc: 'Technicians execute repairs and log completion timestamps directly into Firestore.',
    },
    {
      num: '05',
      title: 'Students track the solution',
      desc: 'In-app notifications and a four-stage progress timeline keep reporters informed until closure.',
    },
  ];

  return (
    <div id="home" className="min-h-screen uf-ambient-canvas text-[#0F172A]">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#064E3B] font-display whitespace-nowrap shrink-0"
          >
            <BrandLogo size="md" />
            UniFix
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52635D]">
            <a
              href="#home"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#features"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#about"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="#contact"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Contact
            </a>
            <Link
              to={profile ? (profile.role === 'admin' ? '/admin' : '/student') : '/login'}
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              {profile ? 'Dashboard' : 'Login'}
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleReportCta}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {profile ? 'Open Workspace' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-emerald-950/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <p className="text-xs font-semibold tracking-wide text-[#059669] mb-3">
                University Facilities Operations · Powered by UniFix AI
              </p>
              <h1
                className="font-display font-extrabold text-[#064E3B] tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Making Every Campus Better, One Report at a Time.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#52635D] leading-relaxed max-w-xl">
                An intelligent campus management platform powered by AI. Report problems,
                track solutions, and help build a better university environment.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleReportCta}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  Report an Issue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#064E3B] bg-white/80 backdrop-blur-md border border-emerald-950/15 rounded-xl hover:bg-white transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-10 pt-8 border-t border-emerald-950/10 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <p className="text-xl font-bold text-[#064E3B] font-display tabular-nums">
                    9 Categories
                  </p>
                  <p className="text-xs text-[#52635D] mt-0.5">
                    Structured triage routing
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#064E3B] font-display tabular-nums">
                    4 Stages
                  </p>
                  <p className="text-xs text-[#52635D] mt-0.5">
                    Live resolution tracking
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#064E3B] font-display tabular-nums">
                    Multimodal
                  </p>
                  <p className="text-xs text-[#52635D] mt-0.5">
                    Photo + text diagnostics
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Visual Anchor: Glass Campus Preview */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="relative h-60 sm:h-72 bg-[#064E3B] overflow-hidden">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMAGE}
                      alt="Modern university campus quad and engineering facility"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#10B981]/50 flex items-center justify-center">
                      <ShieldCheck className="w-12 h-12 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#064E3B]/85 via-[#064E3B]/25 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
                    <div>
                      <p className="text-xs text-emerald-200">Campus Operations Console</p>
                      <p className="text-base font-semibold font-display">
                        Centralized Triage & Multimodal AI Diagnostics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Workflow Rows */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#52635D] pb-2 border-b border-emerald-950/10">
                    <span className="font-semibold text-[#064E3B]">
                      Sample Issue Triage Workflow
                    </span>
                    <span>Firebase + UniFix AI</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-emerald-950/5 text-xs">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-[#0F172A] truncate">
                        Exposed wiring near Building B Stairwell
                      </p>
                      <p className="text-[#52635D] mt-0.5">
                        Safety · Building B · Urgent advisory priority
                      </p>
                    </div>
                    <span className="text-rose-700 font-semibold whitespace-nowrap shrink-0">
                      Urgent
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-emerald-950/5 text-xs">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-[#0F172A] truncate">
                        Water leakage near Wet Lab B-112
                      </p>
                      <p className="text-[#52635D] mt-0.5">
                        Plumbing · Assigned to Plumbing & Water Systems
                      </p>
                    </div>
                    <span className="text-teal-700 font-medium whitespace-nowrap shrink-0">
                      Under Review
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-xs">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-[#0F172A] truncate">
                        Broken ceiling fan in Lecture Room 204
                      </p>
                      <p className="text-[#52635D] mt-0.5">
                        Electrical · Technician dispatched
                      </p>
                    </div>
                    <span className="text-[#059669] font-medium whitespace-nowrap shrink-0">
                      In Progress
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities / Features Bento Grid */}
      <section id="features" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#059669]">Platform Capabilities</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#064E3B] font-display tracking-tight">
            Built for students, facilities teams, and university leadership.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#52635D] leading-relaxed">
            Every workflow connects student submissions directly to administrative triage,
            technician routing, and real-time campus analytics.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Marquee Feature 1 */}
          <div className="md:col-span-2 glass-panel-hover rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#059669]">
                  01. Multimodal Vision & Classification
                </span>
                <Cpu className="w-5 h-5 text-[#059669]" />
              </div>
              <h3 className="mt-3 text-xl font-bold text-[#064E3B] font-display">
                AI-powered issue detection and structured reporting
              </h3>
              <p className="mt-2 text-sm text-[#52635D] leading-relaxed max-w-2xl">
                Before submission, UniFix AI analyzes both the student description and
                uploaded photographs to classify the category, improve report clarity, flag
                potential duplicates, and recommend the right maintenance department.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-emerald-950/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-semibold text-[#064E3B]">Image Diagnostics</p>
                <p className="text-[#52635D] mt-0.5">
                  Describes visible damage only, flagging unclear photos for human review.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#064E3B]">Smart Priority</p>
                <p className="text-[#52635D] mt-0.5">
                  Advisory Low to Urgent triage with transparent reasoning.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#064E3B]">Duplicate Check</p>
                <p className="text-[#52635D] mt-0.5">
                  Surfaces matching active incidents without blocking student voice.
                </p>
              </div>
            </div>
          </div>

          {/* Image Feature Card */}
          <div className="glass-panel-hover rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 bg-emerald-950/5 overflow-hidden">
              {!inspectImgFailed ? (
                <img
                  src={INSPECTION_IMAGE}
                  alt="Campus facilities technician inspecting corridor lighting and conduit"
                  referrerPolicy="no-referrer"
                  onError={() => setInspectImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-emerald-600/50" />
                </div>
              )}
            </div>
            <div className="p-6 flex-1">
              <span className="text-xs font-semibold text-[#059669]">
                02. Image-Based Reporting
              </span>
              <h3 className="mt-2 text-lg font-bold text-[#064E3B] font-display">
                Verified Firebase Storage uploads
              </h3>
              <p className="mt-2 text-sm text-[#52635D] leading-relaxed">
                Students attach JPG, PNG, or WEBP evidence directly to their ticket so
                technicians arrive prepared with the right tools.
              </p>
            </div>
          </div>

          <div className="glass-panel-hover rounded-2xl p-6">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span className="block mt-4 text-xs font-semibold text-[#52635D]">
              03. Priority Classification
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-[#064E3B] font-display">
              Urgent hazards surface immediately
            </h3>
            <p className="mt-2 text-sm text-[#52635D] leading-relaxed">
              Safety hazards like exposed wiring or corridor flooding are prioritized for
              rapid administrative review.
            </p>
          </div>

          <div className="glass-panel-hover rounded-2xl p-6">
            <ClipboardList className="w-5 h-5 text-[#059669]" />
            <span className="block mt-4 text-xs font-semibold text-[#52635D]">
              04. Real-Time Issue Tracking
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-[#064E3B] font-display">
              Four-stage transparent timeline
            </h3>
            <p className="mt-2 text-sm text-[#52635D] leading-relaxed">
              Students follow every update from Pending through Under Review, In Progress,
              and Resolved with instant notifications.
            </p>
          </div>

          <div className="glass-panel-hover rounded-2xl p-6">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <span className="block mt-4 text-xs font-semibold text-[#52635D]">
              05. Centralized Admin & Analytics
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-[#064E3B] font-display">
              Department routing & UniFix AI Intelligence
            </h3>
            <p className="mt-2 text-sm text-[#52635D] leading-relaxed">
              Assign departments and staff, calculate verified resolution times, and uncover
              building hotspots with interactive Recharts dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-16 lg:py-24 bg-white/55 backdrop-blur-md border-y border-emerald-950/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#059669]">End-to-End Lifecycle</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#064E3B] font-display tracking-tight">
              How UniFix works
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="glass-panel-hover rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-[#059669]">
                    {step.num}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[#064E3B] font-display">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs text-[#52635D] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About & Architecture Trust Section */}
      <section id="about" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold text-[#059669]">About UniFix</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#064E3B] font-display tracking-tight">
              Designed for campus accountability, security, and operational clarity.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#52635D] leading-relaxed">
              Traditional email and paper complaint channels fragment maintenance requests and
              leave students in the dark. UniFix unifies reporting on Cloud Firestore
              with strict role-based security rules, server-side UniFix AI diagnostics, and
              auditable resolution metrics.
            </p>
          </div>
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel-hover rounded-2xl p-5">
              <Layers className="w-5 h-5 text-[#059669]" />
              <h3 className="mt-3 text-sm font-bold text-[#064E3B] font-display">
                Role-Based Access Control
              </h3>
              <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
                Students see only their own reports. Administrative triage and staff
                rosters are protected by Firestore Security Rules.
              </p>
            </div>
            <div className="glass-panel-hover rounded-2xl p-5">
              <Wrench className="w-5 h-5 text-teal-600" />
              <h3 className="mt-3 text-sm font-bold text-[#064E3B] font-display">
                Human-in-the-Loop AI
              </h3>
              <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
                AI suggestions remain advisory. Both students and administrators can review,
                confirm, or override every category and priority.
              </p>
            </div>
            <div className="glass-panel-hover rounded-2xl p-5">
              <MapPin className="w-5 h-5 text-[#064E3B]" />
              <h3 className="mt-3 text-sm font-bold text-[#064E3B] font-display">
                Building Hotspot Detection
              </h3>
              <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
                Aggregate incident logs by campus hall and room to uncover recurring
                infrastructure problems early.
              </p>
            </div>
            <div className="glass-panel-hover rounded-2xl p-5">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              <h3 className="mt-3 text-sm font-bold text-[#064E3B] font-display">
                Verifiable Analytics
              </h3>
              <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
                All charts and average resolution times compute strictly from live Firestore
                documents with clear demo-record separation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="py-16 lg:py-24 bg-white/55 backdrop-blur-md border-t border-emerald-950/10"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <p className="text-xs font-semibold text-[#059669]">Campus Deployment</p>
              <h2 className="mt-2 text-2xl font-bold text-[#064E3B] font-display">
                Contact UniFix
              </h2>
              <p className="mt-3 text-sm text-[#52635D] leading-relaxed">
                Interested in piloting UniFix across your university facilities
                division? Send our team a message.
              </p>
              <div className="mt-6 space-y-3 text-xs text-[#52635D]">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#059669]" />
                  <span>facilities-support@unifix.edu</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>University Operations & Innovation Center</span>
                </p>
              </div>
            </div>

            <div className="md:col-span-7">
              {contactSent ? (
                <div className="glass-panel rounded-2xl p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto" />
                  <h3 className="mt-3 text-base font-bold text-[#064E3B] font-display">
                    Message received
                  </h3>
                  <p className="mt-1.5 text-sm text-[#52635D]">
                    Thank you, {contactForm.name}. We will respond to {contactForm.email}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setContactSent(false);
                      setContactForm({ name: '', email: '', university: '', message: '' });
                    }}
                    className="mt-5 px-4 py-2 text-xs font-semibold text-[#064E3B] bg-white border border-emerald-950/10 rounded-xl hover:bg-emerald-50"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleContactSubmit}
                  className="glass-panel rounded-2xl p-6 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Alex Rivera"
                        className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                        University Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="alex@university.edu"
                        className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                      University / Department
                    </label>
                    <input
                      type="text"
                      value={contactForm.university}
                      onChange={(e) =>
                        setContactForm((p) => ({ ...p, university: e.target.value }))
                      }
                      placeholder="Facilities & Campus Operations"
                      className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder="Tell us about your campus reporting needs..."
                      className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Forest Footer */}
      <footer className="bg-[#064E3B] text-emerald-100 py-10 border-t border-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" className="ring-1 ring-white/25" />
            <span className="font-display font-bold text-sm text-white">
              UniFix
            </span>
            <span className="text-xs text-emerald-200/80">
              · Smart Campus Issue Reporting & Management
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-emerald-200/80">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <span>© {new Date().getFullYear()} UniFix</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
