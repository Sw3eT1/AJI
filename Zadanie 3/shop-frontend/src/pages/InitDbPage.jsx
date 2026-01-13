import React, { useState } from "react";
import { http } from "../api/http";

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) return [];

    const header = lines[0].split(",").map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const obj = {};
        header.forEach((h, idx) => (obj[h] = cols[idx]));
        rows.push(obj);
    }
    return rows;
}

function validateProductsArray(arr) {
    const required = ["name", "description", "unit_price", "unit_weight", "category_id"];
    const errors = [];

    if (!Array.isArray(arr) || arr.length === 0) {
        return ["Plik musi zawierać tablicę produktów (min 1)."];
    }

    arr.forEach((p, idx) => {
        required.forEach((k) => {
            if (p[k] === undefined || p[k] === null || String(p[k]).trim() === "") {
                errors.push(`Rekord #${idx + 1}: brak pola ${k}`);
            }
        });

        const price = Number(p.unit_price);
        const weight = Number(p.unit_weight);
        const cat = Number(p.category_id);

        if (!(price > 0)) errors.push(`Rekord #${idx + 1}: unit_price musi być > 0`);
        if (!(weight > 0)) errors.push(`Rekord #${idx + 1}: unit_weight musi być > 0`);
        if (!(cat > 0)) errors.push(`Rekord #${idx + 1}: category_id musi być liczbą > 0`);
    });

    return errors;
}

export default function InitDbPage() {
    const [file, setFile] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [serverMsg, setServerMsg] = useState("");
    const [sending, setSending] = useState(false);

    const onPick = async (f) => {
        setServerMsg("");
        setValidationErrors([]);
        setFile(f);

        if (!f) return;

        const text = await f.text();
        let data = null;

        if (f.name.toLowerCase().endsWith(".json")) {
            try {
                data = JSON.parse(text);
            } catch {
                setValidationErrors(["Niepoprawny JSON."]);
                return;
            }
        } else if (f.name.toLowerCase().endsWith(".csv")) {
            data = parseCSV(text);
        } else {
            setValidationErrors(["Obsługiwane formaty: .json, .csv"]);
            return;
        }

        const errs = validateProductsArray(data);
        setValidationErrors(errs);
    };

    const send = async () => {
        setServerMsg("");
        if (!file) {
            setValidationErrors(["Wybierz plik."]);
            return;
        }
        if (validationErrors.length) return;

        setSending(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await http.post("/init", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setServerMsg(res.data?.message || "Zainicjalizowano bazę.");
        } catch (e) {
            setServerMsg(e?.response?.data?.message || "Błąd inicjalizacji bazy.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <h3 className="mb-3">Inicjalizacja bazy danych (D3)</h3>

            <div className="card">
                <div className="card-body">
                    <div className="mb-2">
                        <input
                            type="file"
                            className="form-control"
                            accept=".json,.csv"
                            onChange={(e) => onPick(e.target.files?.[0] || null)}
                        />
                        <div className="form-text">
                            Plik musi zawierać pola: name, description, unit_price, unit_weight, category_id.
                        </div>
                    </div>

                    {validationErrors.length > 0 && (
                        <div className="alert alert-danger">
                            <strong>Błędy walidacji pliku:</strong>
                            <ul className="mb-0">
                                {validationErrors.slice(0, 10).map((x, i) => (
                                    <li key={i}>{x}</li>
                                ))}
                            </ul>
                            {validationErrors.length > 10 && (
                                <div className="mt-2">... i {validationErrors.length - 10} więcej</div>
                            )}
                        </div>
                    )}

                    {serverMsg && <div className="alert alert-info">{serverMsg}</div>}

                    <button className="btn btn-primary" onClick={send} disabled={sending || !file || validationErrors.length}>
                        {sending ? "Wysyłam..." : "Zainicjalizuj bazę"}
                    </button>
                </div>
            </div>
        </div>
    );
}
