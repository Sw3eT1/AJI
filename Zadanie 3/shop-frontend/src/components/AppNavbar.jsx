import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

export default function AppNavbar() {
    const { isLoggedIn, logout, auth, isEmployee } = useAuth();
    const { items } = useCart();
    const navigate = useNavigate();

    const cartCount = items.reduce((s, x) => s + x.quantity, 0);

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/products">
                    Shop
                </Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#nav"
                >
                    <span className="navbar-toggler-icon" />
                </button>

                <div className="collapse navbar-collapse" id="nav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/products">
                                Produkty
                            </NavLink>
                        </li>

                        <li className="nav-item">
                            <NavLink className="nav-link" to="/orders">
                                Zamówienia
                            </NavLink>
                        </li>

                        {isEmployee && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/init">
                                    Inicjalizacja DB
                                </NavLink>
                            </li>
                        )}
                    </ul>

                    <div className="d-flex align-items-center gap-2">
                        <NavLink className="btn btn-outline-light btn-sm" to="/checkout">
                            Koszyk ({cartCount})
                        </NavLink>

                        {!isLoggedIn ? (
                            <>
                                <NavLink className="btn btn-outline-light btn-sm" to="/login">
                                    Logowanie
                                </NavLink>
                                <NavLink className="btn btn-warning btn-sm" to="/register">
                                    Rejestracja
                                </NavLink>
                            </>
                        ) : (
                            <>
                <span className="text-light small">
                  {auth?.user?.username || "użytkownik"}
                </span>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => {
                                        logout();
                                        navigate("/login");
                                    }}
                                >
                                    Wyloguj
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
