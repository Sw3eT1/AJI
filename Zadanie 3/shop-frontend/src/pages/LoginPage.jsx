import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [sending, setSending] = useState(false);

    const navigate = useNavigate();
    const loc = useLocation();
    const from = loc.state?.from || "/products";

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setSending(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (ex) {
            setErr(ex?.response?.data?.message || "Błędne dane logowania.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
                <h3 className="mb-3">Logowanie</h3>

                {err && <div className="alert alert-danger">{err}</div>}

                <form className="card card-body" onSubmit={submit}>
                    <label className="form-label">Login</label>
                    <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />

                    <label className="form-label mt-2">Hasło</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button className="btn btn-primary mt-3" disabled={sending}>
                        {sending ? "Loguję..." : "Zaloguj"}
                    </button>

                    <div className="text-muted mt-3">
                        Nie masz konta? <Link to="/register">Zarejestruj się</Link>
                    </div>

                    <div className="form-text mt-2">
                        Konta testowe: klient <code>klient/1234</code>, pracownik <code>admin/admin123</code>
                    </div>
                </form>
            </div>
        </div>
    );
}
