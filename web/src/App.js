import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import ReactMarkdown from 'react-markdown';
import './styles.css';

const API_URL = process.env.NODE_ENV === 'production'
  ? '' // On Vercel, API is served from the same origin 
  : 'http://localhost:3001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);

  // Data State
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [calendar, setCalendar] = useState({ events: [], freeSlot: null });
  const [traffic, setTraffic] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [locationName, setLocationName] = useState('Colombo');
  const [loading, setLoading] = useState(true);

  // Planner State
  const [planType, setPlanType] = useState('meetup');
  const [planDesc, setPlanDesc] = useState('');
  const [planning, setPlanning] = useState(false);
  const [planResult, setPlanResult] = useState(null);

  // Calendar Screen State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEvtTitle, setNewEvtTitle] = useState('');
  const [newEvtTime, setNewEvtTime] = useState('10:00');

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      setUser(tokenResponse);
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly'
  });

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchDayEvents(selectedDate);
    }
  }, [selectedDate, activeTab]);

  const fetchBaseData = async () => {
    setLoading(true);
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${API_URL}/api/weather`);
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
          setTraffic(data.traffic);
          setHolidays(data.holidays || []);
        }
      } catch (e) { console.error('Weather fetch fail', e); }
    };
    const fetchAQI = async () => {
      try {
        const res = await fetch(`${API_URL}/api/air-quality`);
        if (res.ok) setAirQuality(await res.json());
      } catch (e) { console.error('AQI fetch fail', e); }
    };
    const fetchCalendar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/calendar?date=${new Date().toISOString()}`);
        if (res.ok) setCalendar(await res.json());
      } catch (e) { console.error('Calendar fetch fail', e); }
    };
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/config`);
        if (res.ok) {
          const cfg = await res.json();
          setLocationName(cfg.location);
        }
      } catch (e) { console.error('Config fetch fail', e); }
    };
    await Promise.all([fetchWeather(), fetchAQI(), fetchCalendar(), fetchConfig()]);

    // Check if we actually got data
    if (!weather && !airQuality) {
      console.warn('Backend seems unreachable or returned no data.');
    }
    setLoading(false);
  };

  const fetchDayEvents = async (date) => {
    try {
      const res = await fetch(`${API_URL}/api/calendar?date=${date.toISOString()}`);
      if (res.ok) setCalendar(await res.json());
    } catch (e) { console.error('Day check fail', e); }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvtTitle) return;

    const start = new Date(selectedDate);
    const [h, m] = newEvtTime.split(':');
    start.setHours(parseInt(h), parseInt(m), 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try {
      await fetch(`${API_URL}/api/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEvtTitle, start, end })
      });
      setNewEvtTitle('');
      fetchDayEvents(selectedDate);
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await fetch(`${API_URL}/api/calendar/${id}`, { method: 'DELETE' });
      fetchDayEvents(selectedDate);
    } catch (err) { console.error(err); }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await fetch(`${API_URL}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'Detected Location',
              coordinates: { lat: latitude, lon: longitude }
            })
          });
          fetchBaseData();
        } catch (err) { console.error(err); }
      });
    }
  };

  const handlePlanEvent = async () => {
    if (!planDesc) return;
    setPlanning(true);
    try {
      const res = await fetch(`${API_URL}/api/plan-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: planType, description: planDesc })
      });
      const data = await res.json();
      setPlanResult(data);
    } catch (err) { console.error(err); }
    setPlanning(false);
  };

  if (loading) return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div className="stat-large" style={{ opacity: 0.5 }}>...</div>
    </div>
  );

  return (
    <div className="app section-animate">
      <header>
        <div className="brand">
          <h1>EventMind AI</h1>
          <p>Intelligence-driven coordination platform</p>
        </div>
        <div className="top-controls">
          <div className="location-chip">
            <span>📍</span> {locationName}
          </div>
          {user ? (
            <div className="badge badge-success">Google Authenticated</div>
          ) : (
            <button className="btn btn-secondary" onClick={() => login()}>
              Login with Google
            </button>
          )}
          <button className="btn btn-primary" onClick={handleGetLocation}>
            Get Location
          </button>
        </div>
      </header>

      <div className="nav-container">
        <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Overview</button>
        <button className={`nav-tab ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>AI Planner</button>
        <button className={`nav-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Calendar</button>
      </div>

      <main>
        {activeTab === 'dashboard' && (
          <div className="grid">
            <div className="card col-8">
              <div className="card-title">Live Conditions</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div className="stat-large" style={{ color: 'white' }}>{Math.round(weather?.temperature || 0)}°</div>
                  <div className="stat-label">{weather?.description}</div>
                  <div className="stat-sub">Current environmental state in {locationName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`badge ${weather?.suitable ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: '8px' }}>
                    {weather?.suitable ? 'Optimized for Outdoors' : 'High Precipitation Risk'}
                  </div>
                  <div className="stat-sub">Updated just now</div>
                </div>
              </div>
              <div className="weather-details">
                <div className="mini-stat">
                  <div className="mini-stat-label">Humidity</div>
                  <div className="stat-label">{weather?.humidity}%</div>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-label">Air Quality (AQI)</div>
                  <div className="stat-label" style={{ color: airQuality?.suitable ? 'var(--success)' : 'var(--error)' }}>
                    {airQuality?.aqi} - {airQuality?.level}
                  </div>
                </div>
              </div>
            </div>

            <div className="card col-4">
              <div className="card-title">Quick Intelligence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div className="mini-stat-label">Traffic Status</div>
                  <div className="stat-label" style={{ color: traffic?.level === 'Heavy' ? 'var(--error)' : 'var(--success)' }}>
                    {traffic?.level}
                  </div>
                  <div className="stat-sub">{traffic?.description}</div>
                </div>
                {holidays.length > 0 && (
                  <div>
                    <div className="mini-stat-label">Local Holiday</div>
                    <div className="stat-label">{holidays[0].name}</div>
                  </div>
                )}
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setActiveTab('planner')}>
                  Generate Draft Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="grid">
            <div className="card col-8">
              <div className="card-title">Event Configuration</div>
              <div className="planner-area">
                <div>
                  <div className="input-label">Select Event Category</div>
                  <div className="event-type-grid">
                    {[
                      { id: 'trip', label: 'Trip', icon: '🎒' },
                      { id: 'meetup', label: 'Meetup', icon: '👥' },
                      { id: 'function', label: 'Event', icon: '🎉' },
                      { id: 'work', label: 'Work', icon: '💼' }
                    ].map(type => (
                      <div key={type.id} className={`type-btn ${planType === type.id ? 'selected' : ''}`} onClick={() => setPlanType(type.id)}>
                        <span className="type-icon">{type.icon}</span>
                        {type.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="input-label">Objectives & Requirements</div>
                  <textarea
                    className="text-area"
                    rows="4"
                    placeholder="e.g., Planning a school trip for 5th grade students to educational spots in Colombo..."
                    value={planDesc}
                    onChange={(e) => setPlanDesc(e.target.value)}
                  ></textarea>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handlePlanEvent} disabled={planning}>
                  {planning ? 'Analyzing Intelligence...' : 'Generate AI Strategy'}
                </button>
              </div>

              {planResult && (
                <div className="result-box section-animate" style={{ padding: '0', background: 'transparent', border: 'none', marginTop: '32px' }}>
                  {(() => {
                    let data;
                    try {
                      const jsonMatch = planResult.analysis.match(/\{[\s\S]*\}/);
                      data = JSON.parse(jsonMatch ? jsonMatch[0] : planResult.analysis);
                    } catch (e) {
                      data = { verdict: 'ADVISORY', summary: '', action_plan: [], why: planResult.analysis };
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ borderLeft: `6px solid ${data.verdict === 'PROCEED' ? 'var(--success)' : data.verdict === 'CAUTION' ? 'var(--warning)' : 'var(--error)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div className="mini-stat-label">System Recommendation</div>
                              <div className="stat-label" style={{ fontSize: '1.5rem', marginBottom: '8px', color: data.verdict === 'PROCEED' ? 'var(--success)' : 'inherit' }}>
                                {data.verdict || 'AI ANALYSIS'}
                              </div>
                              <div className="stat-sub" style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                                <ReactMarkdown>{data.summary || ''}</ReactMarkdown>
                              </div>
                            </div>
                            <div className="stat-large" style={{ fontSize: '2.5rem', opacity: 0.8, marginLeft: '20px' }}>
                              {data.verdict === 'PROCEED' ? '✅' : data.verdict === 'CAUTION' ? '⚠️' : '🎯'}
                            </div>
                          </div>
                        </div>
                        <div className="grid">
                          {data.action_plan?.length > 0 && (
                            <div className="card col-7">
                              <div className="card-title">🚀 Proposed Strategy</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {data.action_plan.map((item, i) => (
                                  <div key={i} className="mini-stat" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)' }}>
                                    <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>📍</span>
                                    <span style={{ fontWeight: '500', lineHeight: '1.4' }}>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className={data.action_plan?.length > 0 ? "card col-5" : "card col-12"}>
                            <div className="card-title">🧠 Intelligence Insights</div>
                            <div className="prose" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7' }}>
                              <ReactMarkdown>{data.why || data.summary}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="card col-4">
              <div className="card-title">Contextual Factors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="mini-stat">
                  <div className="mini-stat-label">Location Knowledge</div>
                  <p className="stat-sub">AI is using Real-Time Knowledge of Colombo & surroundings.</p>
                </div>
                <div className="mini-stat">
                  <div className="mini-stat-label">Current Risk</div>
                  <div className="stat-label">{weather?.precipitationProbability}% Precipitation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid">
            <div className="card col-4">
              <div className="card-title">Select Date</div>
              <input
                type="date"
                className="text-area"
                style={{ marginBottom: '24px' }}
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
              <div className="mini-stat">
                <div className="mini-stat-label">Free Time Check</div>
                <div className="stat-label" style={{ color: 'var(--success)' }}>
                  {calendar.freeSlot ? 'Available Slot Found' : 'Day Fully Booked'}
                </div>
                {calendar.freeSlot && (
                  <div className="stat-sub">Possible start: {new Date(calendar.freeSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                )}
              </div>
            </div>

            <div className="card col-8">
              <div className="card-title">Daily Schedule: {selectedDate.toDateString()}</div>

              <form onSubmit={handleAddEvent} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                <input
                  type="text"
                  className="text-area"
                  placeholder="New Event Title..."
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                />
                <input
                  type="time"
                  className="text-area"
                  style={{ width: '130px' }}
                  value={newEvtTime}
                  onChange={(e) => setNewEvtTime(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Add</button>
              </form>

              <div className="schedule-list">
                {calendar.events.length === 0 ? (
                  <div className="stat-sub" style={{ textAlign: 'center', padding: '40px' }}>No events scheduled for this day.</div>
                ) : (
                  calendar.events.map(event => (
                    <div key={event.id} className="schedule-item">
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div className="time-badge">
                          {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="stat-label">{event.title}</div>
                      </div>
                      <button className="btn" style={{ padding: '8px', color: 'var(--error)' }} onClick={() => handleDeleteEvent(event.id)}>
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer section-animate">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand">
              <h1>EventMind AI</h1>
              <p>Intelligence-driven coordination platform</p>
            </div>
            <p className="footer-desc">
              Your autonomous agent for navigating weather, traffic, and time.
              Powered by advanced AI for precise activity planning.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <button onClick={() => setActiveTab('dashboard')}>Overview</button>
              <button onClick={() => setActiveTab('planner')}>AI Planner</button>
              <button onClick={() => setActiveTab('schedule')}>Calendar</button>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather API</a>
              <a href="https://groq.com/" target="_blank" rel="noreferrer">Intelligence</a>
              <a href="/">Documentation</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="copyright">
            © 2026 EventMind AI by Udaya C Gamage. All rights reserved.
          </div>
          <div className="api-status">
            <span className="status-dot"></span> System Online
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
