import { useId, useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import PropTypes from "prop-types";

const MenuIcon = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const AccountDropdown = ({ user, onAdmin, onConfiguration, onChangePassword, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuId = useId();
  const open = Boolean(anchorEl);
  const initial = user.username?.slice(0, 1).toUpperCase() || "U";
  const close = () => setAnchorEl(null);
  const runAction = (action) => {
    close();
    action();
  };

  return (
    <>
      <button
        id={`${menuId}-button`}
        type="button"
        aria-label={`Open account menu for ${user.username}`}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-slate-500 bg-slate-600 text-sm font-bold text-slate-100 transition hover:border-sky-400 hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      >
        {initial}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-800 bg-emerald-400" aria-hidden="true" />
      </button>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: { "aria-labelledby": `${menuId}-button`, sx: { py: 0.5 } },
          paper: {
            sx: {
              mt: 0.75, width: 220, maxWidth: "calc(100vw - 32px)",
              bgcolor: "#172337", color: "#e2e8f0", border: "1px solid #475569",
              borderRadius: "4px", backgroundImage: "none",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              "& .MuiMenuItem-root": { gap: 1, mx: 0.5, my: 0.25, borderRadius: "2px", fontSize: 12, minHeight: 32, px: 1, py: 0.75 },
              "& .MuiMenuItem-root:hover, & .MuiMenuItem-root.Mui-focusVisible": { bgcolor: "#334155" },
            },
          },
        }}
      >
        <li role="presentation" className="border-b border-slate-600 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-slate-600 text-sm font-bold">{initial}</span>
            <div className="min-w-0">
              <div className="break-words text-xs font-bold">{user.username}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-sky-300">{user.role}</div>
            </div>
          </div>
        </li>
        {onChangePassword && (
          <MenuItem onClick={() => runAction(onChangePassword)}>
            <MenuIcon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></MenuIcon>
            Change password
          </MenuItem>
        )}
        {user.role === "admin" && onAdmin && (
          <MenuItem onClick={() => runAction(onAdmin)}>
            <MenuIcon><path d="M12 3 4.5 6v5c0 4.8 2.9 8.1 7.5 10 4.6-1.9 7.5-5.2 7.5-10V6L12 3Z" /><path d="M8 12h8M12 8v8" /></MenuIcon>
            Administration
          </MenuItem>
        )}
        {user.role === "admin" && onConfiguration && (
          <MenuItem onClick={() => runAction(onConfiguration)}>
            <MenuIcon>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
            </MenuIcon>
            Configuration
          </MenuItem>
        )}
        {onLogout && (
          <MenuItem onClick={() => runAction(onLogout)} sx={{ color: "#fda4af" }}>
            <MenuIcon><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></MenuIcon>
            Sign out
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

MenuIcon.propTypes = { children: PropTypes.node };
AccountDropdown.propTypes = {
  user: PropTypes.shape({ username: PropTypes.string.isRequired, role: PropTypes.string }).isRequired,
  onAdmin: PropTypes.func,
  onConfiguration: PropTypes.func,
  onChangePassword: PropTypes.func,
  onLogout: PropTypes.func,
};

export default AccountDropdown;
