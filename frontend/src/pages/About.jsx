import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import "./About.css";

const capabilities = [
  ["Collect", "Capture operating data from connected equipment."],
  ["Store", "Retain historical data for review and analysis."],
  ["Visualize", "View equipment status and operating trends."],
  ["Analyze", "Interpret data using monitoring rules and equipment knowledge."],
  ["Notify", "Deliver alerts through configured notification channels."],
];
const engineering = [
  ["Hardware", [
    ["CPU Board Design & Assembly", "PCB design and component assembly for the DRUMS CPU board, tailored to the required interfaces and operating environment."],
    ["Field Panel Engineering", "Panel design, fabrication, wiring, and assembly to connect machinery with reliable field data collection."],
  ]],
  ["Platform", [
    ["Data & Server Infrastructure", "Integration of data collection, communications, storage servers, and application servers into a complete monitoring architecture."],
    ["Monitoring Applications", "Equipment views, dashboards, historical trends, alarm settings, and notification workflows built around operational needs."],
  ]],
  ["Intelligence & integration", [
    ["Local AI & Equipment Knowledge", "Project-specific local AI integration using technical documentation, operating limits, and relevant data to support equipment-specific analysis."],
    ["Integration & Commissioning", "Equipment connection, signal verification, system configuration, and commissioning to deliver a working monitoring solution."],
  ]],
];

const albumPhotos = [
  ["A close view of DRUMS CPU.jpg", "DRUMS CPU", "A close view of the DRUMS onboard processing unit."],
  ["DRUMS Testing.jpg", "System testing", "Testing the DRUMS system and connected equipment."],
  ["DRUMS QC Inspection.jpg", "Quality inspection", "Quality control inspection before deployment."],
  ["DRUMS Box.jpg", "DRUMS Ready for Delivery", "DRUMS Ready for Delivery after packaging and testing."],
  ["DRUMS Presentation in IT Dept Room.jpg", "DRUMS presentation", "Presenting the DRUMS platform in the IT department room."],

  ["Bunkering operations on Dubai Sky.jpg", "Dubai Sky bunkering operation", "Bunkering operations aboard Dubai Sky."],
  ["Dubai Eco.jpg", "Dubai Eco", "DRUMS deployment aboard Dubai Eco."],
  ["Dubai Nature.jpg", "Dubai Nature", "DRUMS deployment aboard Dubai Nature."],
  ["Dubai World Vessel (2).jpg", "Dubai World vessel", "A second onboard view of Dubai World."],
  ["Dubai World Vessel.jpg", "Dubai World onboard", "An onboard view of Dubai World."],
  ["Dubai World.jpg", "Dubai World", "DRUMS deployment aboard Dubai World."],
  
  ["Carrying out DRUMS commissioning for DB45-02 Vietnam.jpg", "DB45-02 commissioning", "Commissioning the DRUMS system aboard DB45-02 in Vietnam."],
  ["Configure data channel.jpg", "Data channel configuration", "Configuring data channels for the DRUMS monitoring system."],
  ["DB6601.jpg", "DB6601", "DRUMS installation aboard DB6601."],
  ["DB6602.jpg", "DB6602", "DRUMS installation aboard DB6602."],
  ["Doing DRUMS Commissioning.jpg", "DRUMS commissioning", "Onboard commissioning and system verification in progress."],
  ["DRUMS_EDA_DB6602.jpg", "EDA DB6602", "DRUMS equipment and data acquisition aboard DB6602."],

  ["DRUMS Commisioning Comletetion.jpg", "Commissioning completed", "The DRUMS team after completing onboard commissioning."],
  ["DRUMS DB6602 Commissioning 2.jpg", "DB6602 commissioning", "Commissioning and verification aboard DB6602."],
  
  ["DRUMS EAD Model installed under the engine control and alarm system console in ECR.jpg", "EAD installation in ECR", "The DRUMS EAD module installed below the engine control and alarm console."],
  ["DRUMS in ECR.jpg", "DRUMS in the engine control room", "The DRUMS system operating in the vessel ECR."],
  ["DRUMS Operation.jpg", "DRUMS operation", "Monitoring vessel information through DRUMS."],

  ["DRUMS EAD H429.jpg", "EAD H429", "DRUMS equipment installed aboard H429."],
  ["Shanaya Ferry - DRUMS Commissioning - Batam Indonesia.jpg", "Shanaya Ferry commissioning", "Commissioning DRUMS aboard Shanaya Ferry in Batam, Indonesia."],


  ["ECU.jpg", "Engine control unit", "Equipment integrated with the DRUMS data collection system."],
  ["Marine Queenie.jpg", "Marine Queenie", "DRUMS deployment aboard Marine Queenie."],
  
  ["Using a rope ladder to climb from the boat onto the vessel..jpg", "Boarding the vessel", "The service team boarding the vessel by rope ladder."],
  ["View of the Singapore anchorage at dawn.jpg", "Singapore anchorage at dawn", "A dawn view across the Singapore anchorage during field operations."],
].map(([file, title, description]) => ({
  file,
  title,
  description,
  src: `/DRUMS%20Album/${encodeURIComponent(file)}`,
}));

export default function About({ user, onLogout }) {
  const page = useRef(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [isAlbumPlaying, setIsAlbumPlaying] = useState(false);

  const showPreviousPhoto = () => {
    setActivePhoto((current) => (current - 1 + albumPhotos.length) % albumPhotos.length);
  };

  const showNextPhoto = () => {
    setActivePhoto((current) => (current + 1) % albumPhotos.length);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!isAlbumPlaying || reducedMotion.matches) return undefined;
    const interval = window.setInterval(showNextPhoto, 5000);
    return () => window.clearInterval(interval);
  }, [isAlbumPlaying]);

  useEffect(() => {
    const elements = page.current.querySelectorAll("[data-reveal]");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach((element) => {
      element.classList.add("reveal-pending");
      observer.observe(element);
    });
    const revealAll = () => {
      if (preference.matches) {
        elements.forEach((element) => element.classList.remove("reveal-pending"));
        observer.disconnect();
      }
    };
    preference.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", revealAll);
      elements.forEach((element) => element.classList.remove("reveal-pending"));
    };
  }, []);

  return (
    <div className="about-shell">
      <Header user={user} onLogout={onLogout} />
      <div className="about-layout">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />
        <main className="about-page" ref={page} id="about-top">
          <section className="about-hero" aria-labelledby="about-title">
            <img className="about-hero-image" src="/about/hero.jpg" alt="Container vessel sailing across blue ocean water" width="2048" height="1365" fetchPriority="high" />
            <div className="about-hero-content">
              <p className="about-eyebrow">Daikai Engineering Pte Ltd</p>
              <h1 id="about-title">Your equipment data.<br /><span>Clearer decisions.</span></h1>
              <p className="about-hero-description">DRUMS is a customizable platform for industrial data collection, storage, visualization, and intelligent monitoring.</p>
              <p className="about-hero-support">Engineered by Daikai—from CPU boards and field panels to server infrastructure and monitoring software, with local AI integration tailored to project requirements—DRUMS connects equipment data with the information needed for timely action.</p>
              <p className="about-context">Built on marine experience. Adaptable to industrial machinery and systems.</p>
              <div className="about-actions"><a className="about-button" href="#about-overview">Explore DRUMS <span aria-hidden="true">↓</span></a><a className="about-button about-button-secondary" href="#about-engineering">Our Engineering Capabilities</a></div>
            </div>
            <div className="about-hero-caption">DRUMS / DATA COLLECTION & MONITORING</div>
          </section>

          <nav className="about-chapters" aria-label="About page sections">
            {[["overview", "Overview"], ["engineering", "Engineering"], ["system", "How It Works"], ["customization", "Customization"], ["features", "Intelligent Monitoring"], ["gallery", "Installations"], ["security", "Security"]].map(([id, label]) => <a key={id} href={`#about-${id}`}>{label}</a>)}
          </nav>

          <section className="about-section" id="about-overview">
            <div className="about-intro" data-reveal>
              <p className="about-eyebrow">01 / The platform</p><h2>One Platform. From Equipment to Insight.</h2>
              <p>DRUMS (Daikai Remote Ubiquitous Monitoring System) brings equipment data into one connected monitoring system. It collects operating signals from machinery and existing control systems, stores historical records, and presents information through accessible dashboards.</p>
              <p>Configurable alarms and automated notifications help operators recognize abnormal conditions. Project-specific AI-assisted analysis can add equipment context to support investigation and decision-making.</p>
              <p>Today, most DRUMS installations serve marine applications. The same platform can be adapted to monitor individual machines, production equipment, utilities, and other industrial systems.</p>
            </div>
            <div className="about-capabilities">{capabilities.map(([title, description], i) => <article key={title}><span className="about-number">0{i + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
          </section>

          <section className="about-section about-engineering" id="about-engineering">
            <div className="about-intro" data-reveal><p className="about-eyebrow">02 / Engineered by Daikai</p><h2>From Board Design to Intelligent Monitoring</h2><p>We engineer the complete monitoring solution around your equipment.</p><p>Daikai designs, builds, and integrates the complete DRUMS solution—from CPU board design and component assembly to field panels, data servers, and monitoring software, with local AI integration tailored to project requirements.</p><p>This control over the technology allows us to customize the hardware, interfaces, dashboards, and monitoring logic for each machine or system.</p></div>
            <div className="about-engineering-grid">{engineering.map(([group, cards]) => <div key={group}><p className="about-eyebrow">{group}</p>{cards.map(([title, description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div>)}</div>
            <div className="about-photo-strip">
              {[["cpu-board.webp", "Close-up of the DRUMS circuit board, connectors, and power module", "Designed at board level"], ["panel-interior.webp", "Open DRUMS cabinet with terminal blocks, wiring, and power supplies", "Built for the installation"], ["installation.webp", "DRUMS module and wiring beneath an engine control room console", "Applied in real operating environments"]].map(([file, alt, caption]) => <figure key={file}><img src={`/about/${file}`} alt={alt} loading="lazy" width="800" height="600" /><figcaption>{caption}</figcaption></figure>)}
            </div>
          </section>

          <section className="about-section about-system" id="about-system">
            <div className="about-intro" data-reveal><p className="about-eyebrow">03 / How it works</p><h2>From Equipment Data to Timely Action</h2><p>DRUMS connects field equipment with centralized storage and monitoring applications. Operators can review current conditions, explore historical trends, and receive notifications based on configured monitoring logic.</p></div>
            <figure className="about-system-diagram" aria-label="Data flows from equipment through the field panel to server storage. Stored data feeds dashboards, monitoring rules, and project-specific AI analysis. Rules generate notifications for operators; AI supports investigation.">
              <div className="about-diagram-area"><p className="about-eyebrow">At the equipment / Field</p><div className="about-node">Machinery &amp; Existing Control Systems</div><div className="about-arrow">↓ <span>Operating signals</span></div><div className="about-node">DRUMS Field Panel</div><p>The panel connects to the machine or existing control system and collects the required signals.</p></div>
              <div className="about-arrow">↓ <span>Collected data · network connection</span></div>
              <div className="about-diagram-area"><p className="about-eyebrow">At the server / Applications</p><div className="about-node">Data Storage</div><div className="about-arrow">↓ <span>Stored operating data feeds each function</span></div>
                <div className="about-diagram-branches">
                  <div><div className="about-node">Monitoring Application</div><div className="about-arrow" aria-hidden="true">↓</div><div className="about-node">Dashboards &amp; Trends</div><p>Current conditions and historical records for operators.</p></div>
                  <div><div className="about-node">Monitoring Rules</div><div className="about-arrow" aria-hidden="true">↓</div><div className="about-node">Alerts &amp; Notifications</div><p>Configured channels deliver alerts to operators.</p></div>
                  <div className="about-ai-branch"><div className="about-node">Local AI Analysis <small>Project-specific</small></div><div className="about-arrow">↑ <span>Informed by</span></div><div className="about-node">Equipment Knowledge</div><p>Documentation, limits, and relevant data support contextual investigation. AI notification scope is defined per project.</p></div>
                </div>
              </div>
              <figcaption>Illustrative system architecture. Configuration depends on the equipment and project requirements. These are logical functions, not separate physical servers.</figcaption>
            </figure>
          </section>

          <section className="about-section about-customization" id="about-customization">
            <div className="about-intro" data-reveal><p className="about-eyebrow">04 / Customization</p><h2>Built Around the Equipment You Operate</h2><p>Every machine has different signals, operating limits, and maintenance requirements. DRUMS can be tailored to an individual asset or a wider monitoring system.</p></div>
            <ul className="about-custom-list">{["Equipment interfaces and data acquisition requirements.", "Panel layout, hardware configuration, and installation arrangements.", "Data sampling, storage, and communication settings.", "Dashboards, operating trends, and reporting.", "Alarm thresholds, notification rules, and escalation workflows.", "Project-specific AI knowledge and analysis for the monitored equipment."].map(item => <li key={item}>{item}</li>)}</ul>
            <p className="about-custom-close">The solution starts with your equipment and the information your team needs to operate and maintain it.</p>
          </section>

          <section className="about-section about-system" id="about-features">
            <div className="about-intro" data-reveal><p className="about-eyebrow">05 / Intelligent monitoring</p><h2>Equipment Knowledge. More Meaningful Alerts.</h2><p>DRUMS provides configurable monitoring rules and automated notifications. Local AI integration can be developed around equipment documentation, operating limits, and relevant historical data to support contextual analysis.</p><p>AI functions and their deployment scope are defined for each project and verified against the available equipment data.</p></div>
            <div className="about-benefits"><article><span className="about-number">Defined conditions</span><h3>Rule-Based Monitoring</h3><p>Defined limits and configured conditions trigger alarms and notifications.</p></article><article><span className="about-number">Project-specific integration</span><h3>AI-Assisted Analysis</h3><p>Equipment knowledge and operating data provide context for investigating abnormal conditions.</p></article></div>
            <aside className="about-workflow"><p className="about-eyebrow">Illustrative workflow</p><p>An operating temperature exceeds its configured limit. The monitoring rule raises an alarm. AI-assisted analysis can review relevant trends and equipment documentation to help the operator investigate.</p></aside>
          </section>

          <section className="about-section" id="about-applications">
            <div className="about-intro" data-reveal><p className="about-eyebrow">06 / Applications</p><h2>Marine Experience. Wider Industrial Possibilities.</h2><p>Our current installations demonstrate DRUMS in marine operating environments, connecting onboard equipment with centralized data collection and remote monitoring.</p><p>This engineering experience provides a foundation for adapting DRUMS to other machinery and industrial systems, with hardware, interfaces, and monitoring functions selected for each application.</p></div>
            <div className="about-benefits"><article><span className="about-number">Current experience</span><h3>Marine Installations</h3><p>Explore existing DRUMS installations and the equipment they monitor.</p><a className="about-text-link" href="#about-gallery">View installation gallery →</a><a className="about-text-link" href="#about-records">View supply records →</a></article><article><span className="about-number">Potential applications</span><h3>Adaptable Industrial Applications</h3><ul className="about-applications-list"><li>Engines &amp; Generators</li><li>Pumps &amp; Compressors</li><li>Production Machinery</li><li>Utility &amp; Auxiliary Systems</li></ul><p>Industrial applications are assessed and configured according to equipment interfaces, available signals, and project requirements.</p></article></div>
          </section>

          <section className="about-section about-gallery-section" id="about-gallery">
            <div className="about-intro" data-reveal>
              <p className="about-eyebrow">07 / Installations</p>
              <h2>Our Technology in Practice</h2>
              <p>Explore the hardware, installation work, and monitoring interfaces behind DRUMS.</p>
            </div>
            <div
              className="about-gallery"
              data-reveal
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") showPreviousPhoto();
                if (event.key === "ArrowRight") showNextPhoto();
              }}
              aria-label="DRUMS photo slideshow. Use the left and right arrow keys to change photos."
            >
              <div className="about-gallery-stage">
                <img
                  key={albumPhotos[activePhoto].file}
                  src={albumPhotos[activePhoto].src}
                  alt={albumPhotos[activePhoto].description}
                  className="about-gallery-image"
                  loading="lazy"
                  decoding="async"
                />
                </div>
              <div className="about-gallery-details">
                <div className="about-gallery-caption" aria-live={isAlbumPlaying ? "off" : "polite"}>
                  <span>{String(activePhoto + 1).padStart(2, "0")} / {String(albumPhotos.length).padStart(2, "0")}</span>
                  <h3>{albumPhotos[activePhoto].title}</h3>
                  <p>{albumPhotos[activePhoto].description}</p>
                </div>
                <div className="about-gallery-controls">
                  <button type="button" onClick={showPreviousPhoto} aria-label="Previous photo">←</button>
                  <button
                    type="button"
                    onClick={() => setIsAlbumPlaying((playing) => !playing)}
                    aria-label={isAlbumPlaying ? "Pause slideshow" : "Play slideshow"}
                  >
                    {isAlbumPlaying ? "Pause" : "Play"}
                  </button>
                  <button type="button" onClick={showNextPhoto} aria-label="Next photo">→</button>
                </div>
              </div>
              <div className="about-gallery-thumbnails" aria-label="Choose a photo">
                {albumPhotos.map((photo, index) => (
                  <button
                    type="button"
                    className={index === activePhoto ? "is-active" : ""}
                    key={photo.file}
                    onClick={() => setActivePhoto(index)}
                    aria-label={`Show ${photo.title}`}
                    aria-current={index === activePhoto ? "true" : undefined}
                  >
                    <img src={photo.src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="about-section" id="about-records">
            <div className="about-intro" data-reveal><p className="about-eyebrow">Installation evidence / Supply records</p><h2>DRUMS across fleets</h2><p>Vessel supply records listed in the March 2026 presentation.</p></div>
            <div className="about-records" data-reveal>{[["Emarat", 6, "emarat-logo.png"], ["Jemla", 1, "jemla-logo.png"], ["Vitol", 4, "vitol-logo.png"], ["Truongminh", 4, "truongminh-logo.png"]].map(([name, count, logo]) => <article key={name}><div className="about-fleet-logo"><img src={`/about/${logo}`} alt={`${name} logo`} loading="lazy" /></div><strong>{count}</strong><h3>{name}</h3><p>{count === 1 ? "vessel" : "vessels"}</p></article>)}</div>

          </section>
          <section className="about-section about-security" id="about-security">
            <div className="about-intro" data-reveal><p className="about-eyebrow">08 / Data security</p><h2>Protection throughout the data journey</h2><p>The March 2026 DRUMS presentation describes protection from vessel data transmission through central platform access and monitoring. Security configuration is defined for each deployment.</p></div>
            <ul data-reveal>{["Secure, encrypted data transmission", "Authentication and role-based access control", "Vessel-level data protection", "Audit and monitoring", "Backup and system protection"].map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
          </section>

          <section className="about-section about-contact" id="about-contact">
            <p className="about-eyebrow">Your equipment. Your requirements.</p><h2>Let's Build the Monitoring System Your Equipment Needs</h2><p>Tell us about your machinery, available signals, and monitoring requirements. We can discuss a DRUMS solution tailored to your application.</p><div className="about-actions"><a className="about-button about-button-secondary" href="#about-gallery">View Installations</a></div>
          </section>
          <footer className="about-footer"><span>DRUMS · Daikai Engineering Pte Ltd<br />Installation records: DRUMS presentation V7 · 3 March 2026</span><a href="#about-top">Back to top ↑</a></footer>
        </main>
      </div>
    </div>
  );
}
