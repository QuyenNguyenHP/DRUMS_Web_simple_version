import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: "/overview.svg" },
  { to: "/engine", label: "Pending 1", icon: "/engine.svg" },
  { to: "/pressure_trend", label: "Pending 2", icon: "/overview.svg" },
];

const NavigationSidebar = ({ className = "" }) => {
  return (
    <aside
      className={`flex flex-col border-r border-slate-700 bg-slate-800 text-slate-400 ${className}`}
    >
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Navigation
        </div>
      </div>

      <div className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {({ isActive }) => (
              <div
                className={[
                  "group mx-3 my-1 flex h-11 items-center gap-3 rounded-[10px] border border-transparent px-4 transition-all duration-300",
                  "cursor-pointer",
                  isActive
                    ? "border-l-4 border-l-sky-400 bg-blue-600 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                    : "text-slate-300 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800 hover:text-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
                ].join(" ")}
              >
                <img
                  src={item.icon}
                  alt=""
                  className={[
                    "h-[18px] w-[18px] transition-all duration-300",
                    isActive
                      ? "scale-[1.02] brightness-0 invert"
                      : "[filter:brightness(0)_saturate(100%)_invert(69%)_sepia(8%)_saturate(319%)_hue-rotate(176deg)_brightness(93%)_contrast(87%)]",
                  ].join(" ")}
                />
                <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                {item.badge ? (
                  <span
                    className={[
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[11px] font-bold",
                      isActive ? "bg-white/20" : "bg-slate-700",
                    ].join(" ")}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>
            )}
          </NavLink>
        ))}
      </div>

      <div className="border-t border-slate-700 px-4 py-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">Stations Online:</span>
          <span className="font-bold text-green-500">8/8</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Network Status:</span>
          <span className="font-bold text-green-500">Good</span>
        </div>
      </div>
    </aside>
  );
};

NavigationSidebar.propTypes = {
  className: PropTypes.string,
};

export default NavigationSidebar;
