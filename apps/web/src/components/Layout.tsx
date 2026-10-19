import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { canRequest, canReview, useAuth } from "../lib/auth";
import { roleName } from "../lib/format";

export function Layout() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const signOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign out failed");
    }
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="institution-header">
        <div className="header-shell container">
          <div className="institution-masthead">
            <a
              className="university-wordmark"
              href="https://gehu.ac.in/"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="/brand/gehu-wordmark-dark.webp"
                alt="Graphic Era Hill University"
                width="210"
                height="59"
              />
            </a>
            <Link className="service-brand" to="/" aria-label="QuickSlot home">
              <strong>QuickSlot</strong>
              <span>Room availability & allocation</span>
            </Link>
            <button
              className="mobile-toggle icon-button"
              aria-expanded={menu}
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
          <div className="navigation-bar">
            <div className="navigation-inner">
              <nav
                className={menu ? "navigation open" : "navigation"}
                aria-label="Main navigation"
                onClick={() => setMenu(false)}
              >
                <NavLink end to="/">
                  Room availability
                </NavLink>
                <NavLink to="/teachers">Teacher schedules</NavLink>
                {canRequest(user?.role) && (
                  <NavLink to="/requests">My requests</NavLink>
                )}
                {canReview(user?.role) && (
                  <NavLink to="/approvals">Review requests</NavLink>
                )}
                {user?.role === "ADMIN" && (
                  <>
                    <NavLink to="/admin/timetables">Timetables</NavLink>
                    <NavLink to="/admin/rooms">Room register</NavLink>
                  </>
                )}
                {user ? (
                  <div className="user-nav">
                    <span>
                      {user.full_name}
                      <small>{roleName(user.role)}</small>
                    </span>
                    <button
                      className="icon-button"
                      onClick={signOut}
                      aria-label="Sign out"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="staff-login">
                    Staff & club sign in <ArrowUpRight size={15} />
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      </header>
      {error && (
        <div role="alert" className="header-error">
          {error}
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>QuickSlot</strong>
            <p>Campus room availability & allocation</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link to="/">Room availability</Link>
            <Link to="/teachers">Teacher schedules</Link>
            <Link to="/requests/new">Request a room</Link>
          </nav>
          <div className="footer-campus">
            Graphic Era Hill University<span>Hill Dehradun campus</span>
            <a
              href="https://gehu.ac.in/dehradun/"
              target="_blank"
              rel="noreferrer"
            >
              University website
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          Check the room in person before use.
        </div>
      </footer>
    </>
  );
}
