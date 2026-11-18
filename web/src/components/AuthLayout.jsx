import React from 'react';
import biocuteLogo from '../assets/biocute_logo.png';
import {
  MedicalShieldPlusIcon,
  UsersIcon,
  CalendarCheckIcon,
  ClockIcon,
  BarChartIcon,
  HeartbeatIcon,
  ShieldCheckSolidIcon,
  HeartOutlineIcon,
  FooterPulseGraphic,
} from './Icons';

/**
 * Pure CSS + Vector SVG Healthcare Authentication Layout
 * Uses ONLY the standalone Bio Cute Life Care company logo (biocute_logo.png)
 * with no raster background image, ensuring crisp scaling across all viewports.
 */
export default function AuthLayout({ children, ariaLabel = 'Bio Cute Life Care Authentication' }) {
  return (
    <div className="bclc-auth-page" aria-label={ariaLabel}>
      {/* Pure Vector Atmospheric Healthcare Wave Backdrop (Zero Background Image) */}
      <svg
        className="bclc-ambient-waves"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bclcSoftWave1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D7EBFB" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="bclcSoftWave2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B8DDF8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#E6F3FC" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M720 0 C540 180, 480 420, 620 680 C720 840, 1080 900, 1440 760 L1440 0 Z"
          fill="url(#bclcSoftWave1)"
        />
        <path
          d="M1440 420 C1220 560, 1020 740, 640 830 C390 885, 160 880, 0 845 L0 900 L1440 900 Z"
          fill="url(#bclcSoftWave2)"
        />
        <path
          d="M1440 530 C1260 660, 1040 800, 740 870 L1440 900 Z"
          fill="#CBE4FA"
          fillOpacity="0.45"
        />
      </svg>

      {/* Main Split Content Grid: Left Brand Hero + Right Login Card */}
      <main className="bclc-auth-main">
        <div className="bclc-auth-container">
          {/* Left Side: Company Logo, Welcome Copy & Vector Medical Feature Hub */}
          <section className="bclc-brand-panel" aria-label="Bio Cute Life Care Branding">
            <div className="bclc-logo-wrap">
              <img
                src={biocuteLogo}
                alt="Bio Cute Life Care — Smart Solutions. Better Health"
                className="bclc-company-logo"
              />
            </div>

            <div className="bclc-welcome-block">
              <p className="bclc-welcome-kicker">Welcome to</p>
              <h2 className="bclc-welcome-brand">Attendance Management System</h2>
              <p className="bclc-welcome-tagline" aria-label="Care, Wellness, Better Living">
                <span>Care</span>
                <span className="bclc-tagline-dot" aria-hidden="true">•</span>
                <span>Wellness</span>
                <span className="bclc-tagline-dot" aria-hidden="true">•</span>
                <span>Better Living</span>
              </p>
            </div>

            {/* Clean Vector Healthcare Attendance Hub (Replaces raster doctor photo) */}
            <div className="bclc-feature-hub" aria-label="System Highlights">
              <div className="bclc-hub-visual" aria-hidden="true">
                <div className="bclc-hub-ring bclc-hub-ring-outer" />
                <div className="bclc-hub-ring bclc-hub-ring-inner" />
                <div className="bclc-hub-core">
                  <MedicalShieldPlusIcon size={38} />
                </div>

                <div className="bclc-hub-node bclc-node-top" title="Staff Directory">
                  <UsersIcon size={18} />
                </div>
                <div className="bclc-hub-node bclc-node-left" title="Attendance Logs">
                  <CalendarCheckIcon size={18} />
                </div>
                <div className="bclc-hub-node bclc-node-right" title="Shift Timing">
                  <ClockIcon size={18} />
                </div>
                <div className="bclc-hub-node bclc-node-bottom" title="Analytics & Reports">
                  <BarChartIcon size={18} />
                </div>
              </div>

              <div className="bclc-hub-pills">
                <div className="bclc-hub-pill">
                  <CalendarCheckIcon size={16} />
                  <span>Daily Attendance</span>
                </div>
                <div className="bclc-hub-pill">
                  <ClockIcon size={16} />
                  <span>Shift Scheduling</span>
                </div>
                <div className="bclc-hub-pill">
                  <UsersIcon size={16} />
                  <span>Staff Directory</span>
                </div>
                <div className="bclc-hub-pill">
                  <BarChartIcon size={16} />
                  <span>Live Analytics</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Side: Login / Recovery Card */}
          <div className="bclc-card-column">{children}</div>
        </div>
      </main>

      {/* Bottom Sweeping Navy & Red Wave Footer (100% Vector SVG + HTML) */}
      <footer className="bclc-page-footer" aria-label="Bio Cute Life Care Footer">
        <svg
          className="bclc-footer-wave"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Red ribbon accent on left */}
          <path
            d="M0 32 C125 6, 275 18, 430 50 C520 68, 600 78, 690 80 L0 80 Z"
            fill="#D6002A"
          />
          {/* Deep Navy sweeping healthcare wave */}
          <path
            d="M0 44 C150 22, 320 42, 540 60 C820 82, 1180 84, 1440 24 L1440 96 L0 96 Z"
            fill="#082D52"
          />
        </svg>

        <div className="bclc-footer-bar">
          <div className="bclc-footer-inner">
            <div className="bclc-footer-items">
              <div className="bclc-footer-item">
                <HeartbeatIcon size={22} />
                <span>Bio Cute Life Care</span>
              </div>
              <span className="bclc-footer-sep" aria-hidden="true" />
              <div className="bclc-footer-item">
                <ShieldCheckSolidIcon size={17} />
                <span>Secure &amp; Reliable</span>
              </div>
              <span className="bclc-footer-sep" aria-hidden="true" />
              <div className="bclc-footer-item">
                <HeartOutlineIcon size={17} />
                <span>Healthier People... A Happier Tomorrow...</span>
              </div>
            </div>

            <div className="bclc-footer-pulse-wrap" aria-hidden="true">
              <FooterPulseGraphic />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
