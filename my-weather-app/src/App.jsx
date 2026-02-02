import { useEffect, useMemo, useState } from "react";

const WMO = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers (slight)",
  81: "Rain showers (moderate)",
  82: "Rain showers (violent)",
  95: "Thunderstorm",
};

function pickIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55].includes(code)) return "🌦️";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if (code === 95) return "⛈️";
  return "🌡️";
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed. Check your internet.");

  const data = await res.json();
  if (!data.results || data.results.length === 0)
    throw new Error("City not found. Try another name.");

  return data.results[0];
}

async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API failed. Try again.");

  const data = await res.json();
  if (!data.current) throw new Error("No current weather available.");

  return data;
}

export default function App() {
  const [query, setQuery] = useState("Chennai");
  const [city, setCity] = useState("Chennai");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [place, setPlace] = useState(null);
  const [current, setCurrent] = useState(null);
  const [lastSearched, setLastSearched] = useState("");

  const conditionText = useMemo(() => {
    if (!current) return "";
    return WMO[current.weather_code] || `Code: ${current.weather_code}`;
  }, [current]);

  const icon = useMemo(() => {
    if (!current) return "";
    return pickIcon(current.weather_code);
  }, [current]);

  const loadByCity = async (name) => {
    try {
      setLoading(true);
      setError("");
      setPlace(null);
      setCurrent(null);
      setLastSearched(name);

      const loc = await geocodeCity(name);
      setPlace(loc);

      const data = await fetchCurrentWeather(loc.latitude, loc.longitude);

      setCurrent({
        temperature: data.current.temperature_2m,
        feels: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        wind: data.current.wind_speed_10m,
        weather_code: data.current.weather_code,
        time: data.current.time,
        units: {
          temp: data.current_units?.temperature_2m ?? "°C",
          wind: data.current_units?.wind_speed_10m ?? "km/h",
          humidity: data.current_units?.relative_humidity_2m ?? "%",
        },
      });
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadByGPS = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }

    setLoading(true);
    setError("");
    setPlace(null);
    setCurrent(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const data = await fetchCurrentWeather(latitude, longitude);

          setPlace({
            name: "Your Location",
            country: "",
            admin1: "",
            latitude,
            longitude,
          });

          setCurrent({
            temperature: data.current.temperature_2m,
            feels: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            wind: data.current.wind_speed_10m,
            weather_code: data.current.weather_code,
            time: data.current.time,
            units: {
              temp: data.current_units?.temperature_2m ?? "°C",
              wind: data.current_units?.wind_speed_10m ?? "km/h",
              humidity: data.current_units?.relative_humidity_2m ?? "%",
            },
          });
        } catch (e) {
          setError(e?.message || "Failed to fetch weather.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Location permission denied.");
      }
    );
  };

  useEffect(() => {
    loadByCity(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const cleaned = query.trim();
    if (!cleaned) return;
    setCity(cleaned);
    loadByCity(cleaned);
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Weather App</h1>
        <p className="sub">Current weather using Open-Meteo (no API key)</p>

        <form className="search" onSubmit={onSubmit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter city (e.g., Mumbai)"
          />
          <button type="submit" disabled={loading}>
            Search
          </button>
          <button
            type="button"
            className="ghost"
            onClick={loadByGPS}
            disabled={loading}
          >
            Use My Location
          </button>
        </form>

        {loading && <p className="info">Loading current weather...</p>}

        {error && (
          <div className="errorBox">
            <p className="error">❌ {error}</p>
            {lastSearched ? (
              <button
                className="retry"
                onClick={() => loadByCity(lastSearched)}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        )}

        {!loading && !error && place && current && (
          <div className="result">
            <div className="top">
              <div>
                <h2 className="city">
                  {place.name}
                  {place.admin1 ? `, ${place.admin1}` : ""}{" "}
                  {place.country ? `— ${place.country}` : ""}
                </h2>
                <p className="time">Updated: {current.time}</p>
              </div>

              <div className="icon">{icon}</div>
            </div>

            <div className="grid">
              <div className="stat">
                <div className="label">Temperature</div>
                <div className="value">
                  {Math.round(current.temperature)} {current.units.temp}
                </div>
              </div>

              <div className="stat">
                <div className="label">Feels Like</div>
                <div className="value">
                  {Math.round(current.feels)} {current.units.temp}
                </div>
              </div>

              <div className="stat">
                <div className="label">Humidity</div>
                <div className="value">
                  {Math.round(current.humidity)} {current.units.humidity}
                </div>
              </div>

              <div className="stat">
                <div className="label">Wind</div>
                <div className="value">
                  {Math.round(current.wind)} {current.units.wind}
                </div>
              </div>
            </div>

            <div className="condition">
              <span className="badge">Condition</span>
              <span className="condText">{conditionText}</span>
            </div>
          </div>
        )}

        <p className="hint">
          If it still shows blank: open <b>F12 → Console</b> and copy the error
          here.
        </p>
      </div>
    </div>
  );
}
