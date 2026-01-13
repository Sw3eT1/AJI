import React, { useState } from "react";
import { http } from "../api/http";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setMsg("");
        setSending(true);

        try {
            // backend MUSI mieć endpoint POST /register { username, password }
            await http.post("/register", { username, password });
            setMsg("Zarejestrowano. Teraz zaloguj się.");
            setTimeout(() => navigate("/login"), 600);
        } catch (ex) {
            setErr(ex?.response?.data?.message || "Nie udało się zarejestrować (brak /register?).");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
                <h3 className="mb-3">Rejestracja</h3>

                {msg && <div className="alert alert-success">{msg}</div>}
                {err && <div className="alert alert-danger">{err}</div>}

                <form className="card card-body" onSubmit={submit}>
                    <label className="form-label">Nazwa użytkownika</label>
                    <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />

                    <label className="form-label mt-2">Hasło</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button className="btn btn-warning mt-3" disabled={sending}>
                        {sending ? "Rejestruję..." : "Zarejestruj"}
                    </button>

                    <div className="text-muted mt-3">
                        Masz konto? <Link to="/login">Zaloguj się</Link>
                    </div>

                    <div className="form-text mt-2">
                        Jeśli backend nie ma <code>/register</code>, dodaj go aby spełnić D2 end-to-end.
                    </div>
                </form>
            </div>
        </div>
    );
}
