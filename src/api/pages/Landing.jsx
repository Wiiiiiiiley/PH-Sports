import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight,
  ClipboardList, Clock3, LockKeyhole, MapPin, Trophy, Users,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { ALL_SPORTS, SPORT_ICONS } from '@/lib/sports-config';
import './Landing.css';

const features = [
  {
    id: 'training', label: 'Training log', icon: ClipboardList, path: '/training', number: '01',
    title: 'Small steps. Visible progress.',
    description: 'Record your sessions, track sport-specific results and see how your hard work adds up over time.',
    action: 'Start your training log',
  },
  {
    id: 'teams', label: 'Your teams', icon: Users, path: '/teams', number: '02',
    title: 'Find your sport. Find your people.',
    description: 'Keep up with your teammates, follow team announcements and discover your place on the leaderboard.',
    action: 'Go to your teams',
  },
  {
    id: 'booking', label: 'Venue booking', icon: CalendarDays, path: '/booking', number: '03',
    title: 'Less planning. More playing.',
    description: 'Check the venue calendar, request a time slot and keep track of your booking approvals in one place.',
    action: 'Book a venue',
  },
];

function TrainingPreview() {
  return (
    <>
      <div className="ss-preview-heading"><div><p className="ss-small-label">KEEP SHOWING UP</p><h3>Your effort, in focus.</h3></div><span className="ss-soft-tag">This week</span></div>
      <div className="ss-preview-stats">
        <div><span>Sessions</span><strong>04<span className="ss-stat-unit"> / week</span></strong></div>
        <div><span>Training time</span><strong>240<span className="ss-stat-unit"> min</span></strong></div>
      </div>
      <div className="ss-chart" role="img" aria-label="Sample weekly training chart: Monday 45, Tuesday 60, Wednesday rest, Thursday 60, Friday 75 minutes">
        {[['M', 45], ['T', 60], ['W', 0], ['T', 60], ['F', 75], ['S', 0], ['S', 0]].map(([day, minutes], index) => (
          <div className="ss-chart-column" key={index}><div className={`ss-chart-bar ${index === 4 ? 'ss-chart-bar-active' : ''}`} style={{ height: `${Math.max(minutes, 4)}%` }} /><span>{day}</span></div>
        ))}
      </div>
      <div className="ss-session-row"><span className="ss-sport-tile">🚣</span><div><strong>Rowing · Endurance</strong><span>Sample training session</span></div><span className="ss-session-time"><Clock3 size={13} aria-hidden="true" />45 min</span></div>
    </>
  );
}

function TeamsPreview() {
  return (
    <>
      <div className="ss-preview-heading"><div><p className="ss-small-label">BETTER TOGETHER</p><h3>A place on the team.</h3></div><span className="ss-sport-tile">🏀</span></div>
      <div className="ss-team-banner"><span>TEAM ANNOUNCEMENT</span><h4>See you on the court.</h4><p>Team practice · Main Gymnasium</p></div>
      <div className="ss-list-heading"><strong>Team leaderboard</strong><span>Sample standings</span></div>
      {['Athlete A', 'Athlete B', 'Athlete C'].map((name, index) => (
        <div className="ss-leader-row" key={name}><span className="ss-rank">0{index + 1}</span><span className="ss-avatar">{name.slice(-1)}</span><strong>{name}</strong><span>{8 - index * 2} sessions</span></div>
      ))}
    </>
  );
}

function BookingPreview() {
  return (
    <>
      <div className="ss-preview-heading"><div><p className="ss-small-label">MAKE TIME TO PLAY</p><h3>Your next session.</h3></div><CalendarDays size={26} className="ss-blue" aria-hidden="true" /></div>
      <div className="ss-week-strip">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => <div key={day} className={index === 2 ? 'ss-day-active' : ''}><span>{day}</span><strong>{12 + index}</strong></div>)}</div>
      <div className="ss-booking-example"><div><span className="ss-soft-tag">Sample booking</span><span aria-hidden="true">🏸</span></div><h4>Badminton practice</h4><p><MapPin size={14} aria-hidden="true" />Sports Hall A</p><p><Clock3 size={14} aria-hidden="true" />16:00 – 17:00</p><div className="ss-booking-status"><Check size={14} aria-hidden="true" />Approval status, all in one place</div></div>
    </>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [activeFeature, setActiveFeature] = useState('training');
  const selectedFeature = features.find(feature => feature.id === activeFeature);

  return (
    <div className="ss-landing font-inter">
      <a href="#main-content" className="ss-skip-link">Skip to content</a>
      <header className="ss-header">
        <Link to="/home" className="ss-brand" aria-label="PH Sports home"><span className="ss-brand-mark"><Trophy size={21} aria-hidden="true" /></span>PH Sports<span className="ss-brand-dot">.</span></Link>
        <nav className="ss-nav" aria-label="Main navigation"><a href="#features">Features</a><a href="#sports">Our sports</a><a href="#how-it-works">How it works</a></nav>
        <Link className="ss-header-login" to={user ? '/dashboard' : '/login'}>{user ? 'My dashboard' : 'Sign in'}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </header>

      <main id="main-content">
        <section className="ss-hero ss-container" aria-labelledby="hero-title">
          <div className="ss-hero-copy">
            <p className="ss-eyebrow"><span />YOUR CAMPUS. YOUR SPORT.</p>
            <h1 id="hero-title">More play.<br />More progress.<br /><span>All together.</span></h1>
            <p className="ss-hero-description">Your teams, your training, your next game.<br className="ss-desktop-break" /> Bring your sporting life together with PH Sports.</p>
            <div className="ss-hero-actions"><Link to="/dashboard" className="ss-button ss-button-primary">{user ? 'Go to dashboard' : 'Get started'}<ArrowUpRight size={18} aria-hidden="true" /></Link><a href="#features" className="ss-button ss-button-quiet">Explore the features<ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className="ss-access-note"><LockKeyhole size={13} aria-hidden="true" />Explore freely. Sign in when you’re ready to take part.</p>
          </div>
          <div className="ss-hero-art" aria-label="Illustration of a sports court with training and team highlights" role="img">
            <div className="ss-court"><div className="ss-court-outline" /><div className="ss-court-midline" /><div className="ss-court-circle" /><div className="ss-court-key ss-court-key-top" /><div className="ss-court-key ss-court-key-bottom" /><span className="ss-court-ball">✦</span></div>
            <div className="ss-art-label">A LITTLE EVERY DAY.<br /><strong>AHEAD, TOGETHER.</strong></div>
            <div className="ss-float-card ss-float-training"><span className="ss-float-icon"><ClipboardList size={20} aria-hidden="true" /></span><div><strong>Make every session count.</strong><span>Track your training journey</span></div><span className="ss-float-check"><Check size={15} aria-hidden="true" /></span></div>
            <div className="ss-float-card ss-float-team"><div className="ss-stacked-avatars"><span>R</span><span>B</span><span>T</span></div><div><strong>One sporting community.</strong><span>Find your team on campus</span></div></div>
            <span className="ss-art-caption">TRAIN · CONNECT · PLAY</span>
          </div>
        </section>

        <section className="ss-sports" id="sports" aria-label="Sports on PH Sports"><div className="ss-container"><div className="ss-sports-heading"><p className="ss-small-label">FIND YOUR GAME</p><span>{ALL_SPORTS.length} sports. Your next chapter.</span></div><div className="ss-sports-list">{ALL_SPORTS.map(sport => <span key={sport}><span aria-hidden="true">{SPORT_ICONS[sport]}</span>{sport}</span>)}</div></div></section>

        <section className="ss-features ss-container" id="features" aria-labelledby="features-title">
          <div className="ss-section-heading"><div><p className="ss-eyebrow">BUILT AROUND YOUR GAME</p><h2 id="features-title">A little less admin.<br />A lot more sport.</h2></div><p>Everything you need to stay connected,<br className="ss-desktop-break" /> stay consistent and get out there.</p></div>
          <div className="ss-feature-tabs" role="tablist" aria-label="Explore PH Sports features">{features.map(feature => <button key={feature.id} id={`tab-${feature.id}`} type="button" role="tab" aria-selected={activeFeature === feature.id} aria-controls="feature-preview" tabIndex={activeFeature === feature.id ? 0 : -1} onClick={() => setActiveFeature(feature.id)} onKeyDown={event => {
            const index = features.indexOf(feature);
            let nextIndex;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % features.length;
            if (event.key === 'ArrowLeft') nextIndex = (index + features.length - 1) % features.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = features.length - 1;
            if (nextIndex !== undefined) { event.preventDefault(); setActiveFeature(features[nextIndex].id); document.getElementById(`tab-${features[nextIndex].id}`)?.focus(); }
          }}><feature.icon size={17} aria-hidden="true" />{feature.label}<ChevronRight size={15} aria-hidden="true" /></button>)}</div>
          <div className="ss-feature-panel" id="feature-preview" role="tabpanel" aria-labelledby={`tab-${activeFeature}`} tabIndex={0}>
            <div className="ss-feature-copy"><span className="ss-feature-number">/ {selectedFeature.number}</span><h3>{selectedFeature.title}</h3><p>{selectedFeature.description}</p><Link to={selectedFeature.path} className="ss-feature-link">{selectedFeature.action}<ArrowRight size={17} aria-hidden="true" /></Link><span className="ss-feature-lock"><LockKeyhole size={12} aria-hidden="true" />{user ? 'Open in your account' : 'Sign in to use this feature'}</span></div>
            <div className="ss-demo-wrap"><div className="ss-demo-topline"><span><span className="ss-demo-dot" />FEATURE PREVIEW</span><span>Illustrative data</span></div><div className="ss-demo-card">{activeFeature === 'training' ? <TrainingPreview /> : activeFeature === 'teams' ? <TeamsPreview /> : <BookingPreview />}</div><p className="ss-demo-caption">A look inside PH Sports. Your own data appears after sign-in.</p></div>
          </div>
        </section>

        <section className="ss-how ss-container" id="how-it-works" aria-labelledby="how-title"><div><p className="ss-eyebrow">FROM HERE TO GAME ON</p><h2 id="how-title">Your next move<br /> is a simple one.</h2></div><ol><li><span>01</span><div><h3>Take a look around</h3><p>Explore the features and find the sports that feel like you.</p></div></li><li><span>02</span><div><h3>Sign in to make it yours</h3><p>Create an account with your email and complete your profile.</p></div></li><li><span>03</span><div><h3>Show up. Get moving.</h3><p>Connect with your team, log a session or request a venue.</p></div></li></ol></section>

        <section className="ss-final-cta ss-container"><div><p className="ss-small-label">THERE’S A PLACE FOR YOU HERE.</p><h2>Ready for your next chapter?</h2><p>Bring your energy. We’ll help you keep it all together.</p></div><Link to="/dashboard" className="ss-button ss-button-light">{user ? 'Open your dashboard' : 'Let’s get started'}<ArrowUpRight size={18} aria-hidden="true" /></Link></section>
      </main>

      <footer className="ss-footer ss-container"><Link to="/home" className="ss-brand"><Trophy size={19} aria-hidden="true" />PH Sports<span className="ss-brand-dot">.</span></Link><span>Made for the way you play.</span><a href="#features">Explore PH Sports<ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </div>
  );
}
