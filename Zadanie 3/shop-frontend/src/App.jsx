import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import AppNavbar from "./components/AppNavbar";

import ProductsPage from "./pages/ProductsPage";
import CartCheckoutPage from "./pages/CartCheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import InitDbPage from "./pages/InitDbPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function ProtectedRoute({ children }) {
    const { isLoggedIn } = useAuth();
    const loc = useLocation();

    if (!isLoggedIn) {
        return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
    }
    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <BrowserRouter>
                    <AppNavbar />
                    <div className="container py-4">
                        <Routes>
                            <Route path="/" element={<Navigate to="/products" replace />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route
                                path="/checkout"
                                element={
                                    <ProtectedRoute>
                                        <CartCheckoutPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/orders" element={<OrdersPage />} />
                            <Route path="/orders/:id" element={<OrderDetailsPage />} />
                            <Route
                                path="/init"
                                element={
                                    <ProtectedRoute>
                                        <InitDbPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="*" element={<div>Nie znaleziono strony</div>} />
                        </Routes>
                    </div>
                </BrowserRouter>
            </CartProvider>
        </AuthProvider>
    );
}