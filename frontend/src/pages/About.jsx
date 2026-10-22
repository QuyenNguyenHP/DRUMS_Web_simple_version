import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import "./About.css";

const aboutIconPaths = {
  power: "m13 2-9 12h7l-1 8 10-13h-8z",
  pump: "M16 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M11 7V3h9v4h-9M6 12H2v5h5M8 20h9M11 17v3m5-8h6",
  factory: "M3 21V10l6 3V8l6 3V3h4l2 18zM7 17h1m4 0h1m4 0h1",
  collect: "M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5",
  store: "M4 4h16v6H4zM4 14h16v6H4zM7 7h1m-1 10h1",
  chart: "M4 3v17h17M7 14l4-5 4 3 5-7",
  analyze: "M9 3 7 8l-4 1 3 4-1 5 5-1 3 4 2-5 5-2-4-3 1-5-5 1z",
  notify: "M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3zM10 21h4",
  chip: "M6 6h12v12H6zM9 9h6v6H9zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3",
  network: "M9 3h6v6H9zM3 16h6v5H3zM15 16h6v5h-6zM12 9v4M6 16v-3h12v3",
  sliders: "M5 3v4m0 4v10M12 3v10m0 4v4M19 3v4m0 4v10M2 7h6v4H2zM9 13h6v4H9zM16 7h6v4h-6z",
  ship: "M7 12V5h10v7M10 5V2h4v3M3 14l9-4 9 4-3 5H6zM3 22l3-2 3 2 3-2 3 2 3-2 3 2",
  camera: "M3 7h4l2-3h6l2 3h4v13H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
};

function AboutIcon({ name, badge = false }) {
  return (
    <span className={badge ? "about-icon about-icon-badge" : "about-icon"} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d={aboutIconPaths[name]} />
      </svg>
    </span>
  );
}

const capabilities = [
  ["Collect", "Capture operating data from connected equipment."],
  ["Store", "Retain historical data for review and analysis."],
  ["Visualize", "View equipment status and operating trends."],
  ["Analyze", "Interpret data using monitoring rules and equipment knowledge."],
  ["Notify", "Deliver alerts through configured notification channels."],
];
const engineering = [
  ["Hardware Design & Assembly", [
    ["CPU Board Design & Assembly", "chip"],
    ["Field Panel Design & Fabrication", "sliders"],
  ]],
  ["Equipment Connection & Data Infrastructure", [
    ["Equipment Integration & Commissioning", "network"],
    ["Server Deployment & Data Storage", "store"],
  ]],
  ["Monitoring Software & AI", [
    ["Dashboard Design & Development", "chart"],
    ["AI-Assisted Analysis, Reporting & Alerts", "analyze"],
  ]],
];

const engineeringPhotos = [
  {
    folder: "01-hardware-design-assembly",
    photos: [
      ["CPU PCB Design.jpg", "CPU PCB design"],
      ["CPU PCB.jpg", "CPU printed circuit board"],
      ["A Completed CPU.jpg", "Completed DRUMS CPU board"],
      ["3D Design DRUMS PANEL.jpg", "DRUMS field panel 3D design"],
      ["DRUMS Pannel.jpg", "DRUMS field panel"],
    ],
  },
  {
    folder: "02-equipment-connection-data-infrastructure",
    photos: [
      ["Configure data channel.jpg", "Data channel configuration"],
      ["DRUMS in ECR.jpg", "DRUMS in the engine control room"],
    ],
  },
  {
    folder: "03-monitoring-software-ai",
    photos: [
      ["Dashboard.png", "Equipment monitoring dashboard"],
      ["Graph Temperature.png", "Temperature trends"],
    ],
  },
];

function EngineeringPhotoGallery({ group, folder, photos }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [file, caption] = photos[activeIndex];
  const src = `/about/${folder}/${encodeURIComponent(file)}`;

  useEffect(() => {
    if (!isPlaying || photos.length < 2) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % photos.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isPlaying, photos.length]);

  return (
    <div className="about-engineering-photos" role="region" aria-label={`${group} photos`}>
      <figure>
        <div className="about-engineering-photo-frame">
        <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size image: ${caption}`}>
          <img src={src} alt={caption} loading="lazy" width="800" height="600" />
        </a>
          <button className="about-photo-arrow about-photo-previous" type="button" aria-label={`Previous ${group} photo`} onClick={() => setActiveIndex((index) => (index - 1 + photos.length) % photos.length)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button className="about-photo-arrow about-photo-next" type="button" aria-label={`Next ${group} photo`} onClick={() => setActiveIndex((index) => (index + 1) % photos.length)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <span className="about-photo-counter">{activeIndex + 1} / {photos.length}</span>
          <button className="about-photo-playback" type="button" aria-label={`${isPlaying ? "Pause" : "Play"} ${group} slideshow`} title={isPlaying ? "Pause slideshow" : "Play slideshow"} onClick={() => setIsPlaying((playing) => !playing)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{isPlaying ? <path d="M8 5v14M16 5v14" /> : <path d="m8 5 11 7-11 7z" />}</svg>
          </button>
        </div>
        <figcaption aria-live={isPlaying ? "off" : "polite"}>{caption}</figcaption>
      </figure>
    </div>
  );
}

const albumCategories = [
  ["all", "All Photos", "camera"],
  ["installations", "Vessels & Installations", "ship"],
  ["commissioning", "Commissioning", "sliders"],
  ["hardware", "Hardware & Testing", "chip"],
  ["operations", "Monitoring & Fieldwork", "chart"],
];

const albumCategoryFiles = {
  hardware: ["A close view of DRUMS CPU.jpg", "DRUMS Testing.jpg", "DRUMS QC Inspection.jpg", "DRUMS Box.jpg", "ECU.jpg"],
  commissioning: ["Carrying out DRUMS commissioning for DB45-02 Vietnam.jpg", "Configure data channel.jpg", "Doing DRUMS Commissioning.jpg", "DRUMS Commisioning Comletetion.jpg", "DRUMS DB6602 Commissioning 2.jpg", "Shanaya Ferry - DRUMS Commissioning - Batam Indonesia.jpg"],
  operations: ["DRUMS Presentation in IT Dept Room.jpg", "Bunkering operations on Dubai Sky.jpg", "DRUMS in ECR.jpg", "DRUMS Operation.jpg", "Using a rope ladder to climb from the boat onto the vessel..jpg", "View of the Singapore anchorage at dawn.jpg"],
};

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
  category: Object.entries(albumCategoryFiles).find(([, files]) => files.includes(file))?.[0] ?? "installations",
  src: `/DRUMS%20Album/${encodeURIComponent(file)}`,
})).sort((a, b) => albumCategories.findIndex(([id]) => id === a.category) - albumCategories.findIndex(([id]) => id === b.category));

export default function About({ user, onLogout }) {
  const page = useRef(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const visiblePhotos = useMemo(
    () => activeCategory === "all" ? albumPhotos : albumPhotos.filter((photo) => photo.category === activeCategory),
    [activeCategory]
  );
  const [activePhoto, setActivePhoto] = useState(0);
  const [isAlbumPlaying, setIsAlbumPlaying] = useState(false);

  const showPreviousPhoto = () => {
    setActivePhoto((current) => (current - 1 + visiblePhotos.length) % visiblePhotos.length);
  };

  const showNextPhoto = () => {
    setActivePhoto((current) => (current + 1) % visiblePhotos.length);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!isAlbumPlaying || reducedMotion.matches) return undefined;
    const interval = window.setInterval(showNextPhoto, 5000);
    return () => window.clearInterval(interval);
  }, [isAlbumPlaying, visiblePhotos.length, activeCategory]);

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
              <h1 id="about-title"><span className="about-hero-title-line">Your equipment data.</span><br /><span>Clearer decisions.</span></h1>
              <p className="about-hero-description">DRUMS is a customizable platform for industrial data collection, storage, visualization, and intelligent monitoring.</p>
              <p className="about-hero-support">Engineered from CPU boards and field panels to server infrastructure and monitoring software, with local AI integration tailored to project requirements—DRUMS connects equipment data with the information needed for timely action.</p>
              <div className="about-actions"><a className="about-button" href="#about-overview">Explore DRUMS <span aria-hidden="true">↓</span></a><a className="about-button about-button-secondary" href="#about-engineering">Our Engineering Capabilities</a></div>
            </div>
            <div className="about-hero-caption">DRUMS / DATA COLLECTION & MONITORING</div>
          </section>

          <nav className="about-chapters" aria-label="About page sections">
            {[["overview", "Overview"], ["system", "How It Works"], ["features", "Intelligent Monitoring"], ["engineering", "End-to-end Engineering"], ["customization", "Customization"], ["gallery", "Proof in Practice"]].map(([id, label]) => <a key={id} href={`#about-${id}`}>{label}</a>)}
          </nav>

          <section className="about-section" id="about-overview">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="chip" />01 / The platform</p><h2 className="about-single-line-title">One Platform. From Equipment to Insight.</h2>
            </div>
            <div className="about-capabilities">{capabilities.map(([title, description], i) => <article key={title}><div className="about-capability-marker"><AboutIcon name={["collect", "store", "chart", "analyze", "notify"][i]} badge /><span className="about-number">0{i + 1}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
          </section>

          <section className="about-section about-system" id="about-system">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="network" />02 / How it works</p>
              <h2 className="about-system-title">From Equipment Data to Timely Action</h2>
              <p className="about-system-intro-copy">DRUMS connects field equipment with centralized storage and monitoring applications.</p>
              <p className="about-system-intro-copy">Operators can review current conditions, explore historical trends, and receive notifications based on configured monitoring logic.</p>
            </div>
            <figure className="about-system-diagram" aria-label="Equipment signals flow through the DRUMS field panel to data storage, then feed monitoring applications, monitoring rules, and local AI analysis. Equipment knowledge also informs AI analysis.">
              <div className="about-system-stage">
                <p className="about-eyebrow about-icon-label"><AboutIcon name="network" />At the equipment / Field</p>
                <div className="about-field-flow">
                  <div className="about-system-node"><AboutIcon name="factory" badge /><h3>Machinery &amp; Existing Control Systems</h3></div>
                  <div className="about-system-connector"><span aria-hidden="true" className="about-flow-direction">&rarr;</span><span>Operating signals</span></div>
                  <div className="about-system-node"><AboutIcon name="chip" badge /><h3>DRUMS Field Panel</h3></div>
                </div>
                <p className="about-system-caption">The panel connects to the machine or existing control system and collects the required signals.</p>
              </div>
              <div className="about-system-transfer"><span aria-hidden="true">&darr;</span><span>Collected data &middot; network connection</span></div>
              <div className="about-system-stage">
                <p className="about-eyebrow about-icon-label"><AboutIcon name="store" />At the server / Applications</p>
                <div className="about-system-storage"><AboutIcon name="store" badge /><h3>Data Storage</h3></div>
                <div className="about-system-transfer"><span aria-hidden="true">&darr;</span><span>Stored operating data feeds each function</span></div>
                <div className="about-system-functions">
                  <article className="about-custom-card">
                    <AboutIcon name="chart" badge />
                    <p className="about-system-function-label">Monitoring Application</p>
                    <h3>Dashboards &amp; Trends</h3>
                    <p>Current conditions and historical records for operators.</p>
                  </article>
                  <article className="about-custom-card">
                    <AboutIcon name="notify" badge />
                    <p className="about-system-function-label">Monitoring Rules</p>
                    <h3>Alerts &amp; Notifications</h3>
                    <p>Configured channels deliver alerts to operators.</p>
                  </article>
                  <article className="about-custom-card about-system-ai">
                    <AboutIcon name="analyze" badge />
                    <p className="about-system-function-label">Equipment Knowledge</p>
                    <h3>Local AI Analysis</h3>
                    <p>Documentation, limits, and relevant data support contextual investigation.</p>
                    <div className="about-system-knowledge"><AboutIcon name="collect" /><span>Informed by equipment knowledge</span></div>
                    <p className="about-system-ai-note">AI notification scope is defined per project.</p>
                  </article>
                </div>
              </div>
              <figcaption>Illustrative system architecture. Configuration depends on the equipment and project requirements. These are logical functions, not separate physical servers.</figcaption>
            </figure>
          </section>

          <section className="about-section about-intelligent" id="about-features">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="analyze" />03 / INTELLIGENT MONITORING</p>
              <h2>Equipment Knowledge. More Meaningful Alerts.</h2>
              <p>DRUMS provides configurable monitoring rules and automated notifications. Local AI integration can be developed around equipment documentation, operating limits, and relevant historical data to support contextual analysis.</p>
            </div>
            <div className="about-monitoring-grid">
              <article className="about-custom-card">
                <AboutIcon name="notify" badge />
                <p className="about-monitoring-label">Defined conditions</p>
                <h3>Rule-Based Monitoring</h3>
                <p>Defined limits and configured conditions trigger alarms and notifications.</p>
              </article>
              <article className="about-custom-card">
                <AboutIcon name="analyze" badge />
                <p className="about-monitoring-label">Project-specific integration</p>
                <h3>AI-Assisted Analysis</h3>
                <p>Equipment knowledge and operating data provide context for investigating abnormal conditions.</p>
              </article>
            </div>
            <p className="about-monitoring-scope">AI functions and their deployment scope are defined for each project and verified against the available equipment data.</p>
            <aside className="about-monitoring-workflow" aria-labelledby="about-monitoring-workflow-title">
              <p className="about-eyebrow about-icon-label" id="about-monitoring-workflow-title"><AboutIcon name="network" />Illustrative workflow</p>
              <ol className="about-monitoring-steps">
                {[
                  ["chart", "01", "Limit exceeded", "An operating temperature exceeds its configured limit."],
                  ["notify", "02", "Alarm raised", "The monitoring rule raises an alarm."],
                  ["analyze", "03", "Investigation supported", "AI-assisted analysis can review relevant trends and equipment documentation to help the operator investigate."],
                ].map(([icon, number, title, description]) => (
                  <li key={number}>
                    <div className="about-monitoring-step-heading"><AboutIcon name={icon} badge /><span className="about-number">{number}</span></div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </li>
                ))}
              </ol>
            </aside>
          </section>

          <section className="about-section about-engineering" id="about-engineering">
            <div className="about-intro about-intro-wide" data-reveal><p className="about-eyebrow about-icon-label"><AboutIcon name="chip" />04 / END-TO-END ENGINEERING</p><h2 className="about-single-line-title">From PCB Design to Intelligent Monitoring</h2></div>
            <div className="about-engineering-grid">
              {engineering.map(([group, cards], index) => (
                <div className="about-engineering-column" key={group}>
                  <p className="about-eyebrow">{group}</p>
                  {cards.map(([title, icon]) => (
                    <article className="about-custom-card" key={title}>
                      <AboutIcon name={icon} badge />
                      <h3>{title}</h3>
                    </article>
                  ))}
                  <EngineeringPhotoGallery group={group} {...engineeringPhotos[index]} />
                </div>
              ))}
            </div>
          </section>

          <section className="about-section about-customization" id="about-customization">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="sliders" />05 / CUSTOMIZATION</p>
              <h2>Your Equipment. Your Requirements. Our Engineering.</h2>
              <p>From hardware to software, we tailor DRUMS to your equipment and operational needs.</p>
            </div>
            <div className="about-custom-grid">
              {[
                ["network", "Equipment Connections", "Interfaces and signals matched to your machinery."],
                ["chip", "Hardware & Panels", "Board configuration and panel layout suited to your installation."],
                ["store", "Data & Storage", "Sampling, communication, and storage tailored to your needs."],
                ["chart", "Dashboards & Reports", "Equipment views and reports built for your team."],
                ["notify", "Alarms & Notifications", "Operating limits, alert rules, and notification channels."],
                ["analyze", "AI & Equipment Knowledge", "AI-assisted analysis tailored to your equipment and documentation."],
              ].map(([icon, title, description]) => (
                <article className="about-custom-card" key={title}>
                  <AboutIcon name={icon} badge />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="about-section about-applications" id="about-applications">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="ship" />06 / APPLICATIONS</p>
              <h2>Marine Experience. Industrial Potential.</h2>
              <p>Built on marine monitoring experience, DRUMS can be adapted to other machinery and industrial systems.</p>
            </div>
            <div className="about-applications-layout">
              <article className="about-marine-installations">
                <p className="about-eyebrow about-application-status">IN OPERATION</p>
                <h3>Marine Installations</h3>
                <figure className="about-application-photo">
                  <img src="/DRUMS%20Album/Dubai%20World%20Vessel.jpg" alt="Dubai World vessel at sunset" loading="lazy" width="2560" height="1920" />
                </figure>
                <p>Connecting onboard equipment for centralized data collection and remote monitoring.</p>
                <div className="about-application-links">
                  <a className="about-text-link" href="#about-gallery">View Installations <span aria-hidden="true">&rarr;</span></a>
                  <a className="about-text-link" href="#about-records">View Supply Records <span aria-hidden="true">&rarr;</span></a>
                </div>
              </article>
              <article className="about-industrial-potential">
                <p className="about-eyebrow about-application-status">POTENTIAL APPLICATIONS</p>
                <h3>Beyond Marine</h3>
                <p>Monitoring tailored to different equipment and operating needs.</p>
                <div className="about-application-grid">
                  {[
                    ["power", "Engines & Generators"],
                    ["pump", "Pumps & Compressors"],
                    ["factory", "Production Machinery"],
                    ["sliders", "Utilities & Auxiliary Systems"],
                  ].map(([icon, category]) => (
                    <div className="about-custom-card" key={category}>
                      <AboutIcon name={icon} badge />
                      <h4>{category}</h4>
                    </div>
                  ))}
                </div>
                <p className="about-application-note">Configured to suit available signals, equipment interfaces, and project requirements.</p>
              </article>
            </div>
          </section>

          <section className="about-section about-gallery-section" id="about-gallery">
            <div className="about-intro" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="camera" />07 / Proof in practice</p>
              <h2>Our Technology in Practice</h2>
              <p>Explore DRUMS across vessels, installation work, commissioning, and everyday monitoring.</p>
            </div>
            <div className="about-gallery-filters" role="group" aria-label="Filter gallery photos">
              {albumCategories.map(([id, label, icon]) => (
                <button type="button" key={id} aria-pressed={activeCategory === id} onClick={() => { setActiveCategory(id); setActivePhoto(0); }}>
                  <AboutIcon name={icon} /><span>{label}</span>
                  <span className="about-gallery-filter-count">{id === "all" ? albumPhotos.length : albumPhotos.filter((photo) => photo.category === id).length}</span>
                </button>
              ))}
            </div>
            <div
              className="about-gallery"
              data-reveal
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") { event.preventDefault(); showPreviousPhoto(); }
                if (event.key === "ArrowRight") { event.preventDefault(); showNextPhoto(); }
              }}
              aria-label="DRUMS photo slideshow. Use the left and right arrow keys to change photos."
            >
              <div className="about-gallery-stage">
                <img
                  key={visiblePhotos[activePhoto].file}
                  src={visiblePhotos[activePhoto].src}
                  alt={visiblePhotos[activePhoto].description}
                  className="about-gallery-image"
                  loading="lazy"
                  decoding="async"
                />
                </div>
              <div className="about-gallery-details">
                <div className="about-gallery-caption" aria-live={isAlbumPlaying ? "off" : "polite"}>
                  <span>{String(activePhoto + 1).padStart(2, "0")} / {String(visiblePhotos.length).padStart(2, "0")}</span>
                  <h3>{visiblePhotos[activePhoto].title}</h3>
                  <p>{visiblePhotos[activePhoto].description}</p>
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

            </div>
          </section>

          <section className="about-section about-records-section" id="about-records">
            <div className="about-intro about-intro-wide" data-reveal>
              <p className="about-eyebrow about-icon-label"><AboutIcon name="ship" />Installation evidence / Supply records</p>
              <h2>Marine Experience. Across Fleets.</h2>
              <p>Recorded DRUMS supplies cover 15 vessels across four fleets.</p>
            </div>
            <div className="about-records" data-reveal>
              {[["Emarat", 6, "emarat-logo.png"], ["Jemla", 1, "jemla-logo.png"], ["Vitol", 4, "vitol-logo.png"], ["Truongminh", 4, "truongminh-logo.png"]].map(([name, count, logo]) => (
                <article className="about-fleet-card" key={name}>
                  <div className="about-fleet-logo"><img src={`/about/${logo}`} alt={`${name} logo`} loading="lazy" /></div>
                  <h3>{name}</h3>
                  <div className="about-fleet-count">
                    <AboutIcon name="ship" badge />
                    <p><strong>{count}</strong><span>{count === 1 ? "vessel supplied" : "vessels supplied"}</span></p>
                  </div>
                </article>
              ))}
            </div>
            <div className="about-records-footer">
              <p>Source: DRUMS presentation V7 · 3 March 2026.</p>
              <a className="about-text-link" href="#about-gallery">View Installations <span aria-hidden="true">→</span></a>
            </div>
          </section>
          <section className="about-section about-contact" id="about-contact">
            <p className="about-eyebrow">Your equipment. Your requirements.</p><h2>Let's Build the Monitoring System Your Equipment Needs</h2><p>Tell us about your machinery, available signals, and monitoring requirements. We can discuss a DRUMS solution tailored to your application.</p><div className="about-actions"><a className="about-button about-button-secondary" href="#about-gallery">View Proof in Practice</a></div>
          </section>
          <footer className="about-footer"><span>DRUMS · Daikai Engineering Pte Ltd<br />Installation records: DRUMS presentation V7 · 3 March 2026</span><a href="#about-top">Back to top ↑</a></footer>
        </main>
      </div>
    </div>
  );
}
