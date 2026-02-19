import React, { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEFAULT_MAP_CENTER = { lat: 3.139, lng: 101.6869 };
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const mapPinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const searchLocationsByText = async (query, signal) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" }, signal },
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const mapped = Array.isArray(data)
    ? data.map((item) => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }))
    : [];
  return mapped.filter(
    (item) => !Number.isNaN(item.lat) && !Number.isNaN(item.lng),
  );
};

const reverseGeocodeLocation = async (lat, lng, signal) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
    { headers: { Accept: "application/json" }, signal },
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data?.display_name || null;
};

const formatEventTime = (value) => {
  if (!value) {
    return "To be announced";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

function LocationPicker({ position, onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  return position ? <Marker position={position} icon={mapPinIcon} /> : null;
}

function RecenterMap({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView({ lat, lng }, map.getZoom(), { animate: false });
    }
  }, [lat, lng, map]);

  return null;
}

function EventList({ events, onRefresh, onEdit, onDelete }) {
  return (
    <section className="mt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Events</h2>
          <p className="mt-1 text-sm text-slate-500">
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="group relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {events.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/50"></div>
          <div className="relative">
            <svg
              className="mx-auto h-16 w-16 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No events yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Get started by creating your first event using the form
            </p>
          </div>
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((eventItem) => (
          <li
            key={eventItem.id || eventItem._id}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>

            <div className="absolute right-5 top-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                {eventItem.rsvps?.length || 0}
              </span>
            </div>

            <h3 className="pr-16 text-xl font-bold leading-tight text-slate-900">
              {eventItem.title}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {eventItem.description}
            </p>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Time
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {formatEventTime(eventItem.time)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-4 w-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {eventItem.location || "To be announced"}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="relative z-10 mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(eventItem)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(eventItem)}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-blue-500/0 transition-opacity group-hover:from-emerald-500/5 group-hover:to-blue-500/5"></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreateEvent({ onCreated }) {
  const locationBoxRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const reverseCacheRef = useRef(new Map());
  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const latestSearchQueryRef = useRef("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    time: "",
    location: "",
    capacity: "",
    lat: null,
    lng: null,
  });
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.innerWidth < 900,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        locationBoxRef.current &&
        !locationBoxRef.current.contains(event.target)
      ) {
        setLocationResults([]);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      if (reverseAbortRef.current) {
        reverseAbortRef.current.abort();
      }
    };
  }, []);

  const fetchLocationResults = async (query) => {
    const trimmedQuery = query.trim();
    const cacheKey = trimmedQuery.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey);
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const results = await searchLocationsByText(trimmedQuery, controller.signal);
    searchCacheRef.current.set(cacheKey, results);
    return results;
  };

  const resolveAddressFromCoordinates = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (reverseCacheRef.current.has(cacheKey)) {
      return reverseCacheRef.current.get(cacheKey);
    }

    if (reverseAbortRef.current) {
      reverseAbortRef.current.abort();
    }
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    const address = await reverseGeocodeLocation(lat, lng, controller.signal);
    if (address) {
      reverseCacheRef.current.set(cacheKey, address);
    }
    return address;
  };

  useEffect(() => {
    const query = form.location.trim();
    if (query.length < 3) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setLocationResults([]);
      setLocationError("");
      return;
    }

    latestSearchQueryRef.current = query;

    const timer = setTimeout(async () => {
      try {
        setLocationError("");
        setIsSearchingLocation(true);
        const mapped = await fetchLocationResults(query);
        if (latestSearchQueryRef.current !== query) {
          return;
        }
        setLocationResults(mapped);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setLocationResults([]);
        setLocationError("Location search is temporarily unavailable.");
      } finally {
        if (latestSearchQueryRef.current === query) {
          setIsSearchingLocation(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.location]);

  const runSearchFromInput = async () => {
    const query = form.location.trim();
    if (query.length < 3) {
      setLocationError("Enter at least 3 characters to search location.");
      return;
    }

    try {
      setLocationError("");
      setIsSearchingLocation(true);
      const mapped = await fetchLocationResults(query);
      setLocationResults(mapped);
      if (mapped.length === 0) {
        setLocationError("No matching location found.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      setLocationError("Location search failed. Please try again.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handlePickPoint = ({ lat, lng }) => {
    setLocationError("");
    setForm((prev) => ({ ...prev, lat, lng }));
    setMapCenter({ lat, lng });

    resolveAddressFromCoordinates(lat, lng)
      .then((displayName) => {
        if (!displayName) {
          return;
        }
        setForm((prev) => {
          if (prev.lat !== lat || prev.lng !== lng) {
            return prev;
          }
          return { ...prev, location: displayName };
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }
        setLocationError("Map pin set, but address lookup failed.");
      });
  };

  const applyLocationSuggestion = (item) => {
    setForm((prev) => ({
      ...prev,
      location: item.label,
      lat: item.lat,
      lng: item.lng,
    }));
    setLocationError("");
    setLocationResults([]);
    setMapCenter({ lat: item.lat, lng: item.lng });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (positionValue) => {
        const lat = positionValue.coords.latitude;
        const lng = positionValue.coords.longitude;
        setForm((prev) => ({ ...prev, lat, lng }));
        setMapCenter({ lat, lng });

        try {
          const displayName = await resolveAddressFromCoordinates(lat, lng);
          if (displayName) {
            setForm((prev) => ({ ...prev, location: displayName, lat, lng }));
          }
        } catch (error) {
          if (error?.name === "AbortError") {
            return;
          }
          setLocationError("Location found, but address lookup failed.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === 1) {
          setLocationError("Location permission denied.");
          return;
        }
        if (error.code === 2) {
          setLocationError("Unable to detect your location.");
          return;
        }
        setLocationError("Location request timed out. Try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleLocationInputChange = (value) => {
    setLocationError("");
    setForm((prev) => ({
      ...prev,
      location: value,
      lat: value.trim() ? prev.lat : null,
      lng: value.trim() ? prev.lng : null,
    }));
  };

  const position =
    form.lat !== null && form.lng !== null
      ? { lat: form.lat, lng: form.lng }
      : null;
  const mapZoom = position ? 14 : 10;

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description,
      time: form.time || null,
      location: form.location,
      lat: form.lat,
      lng: form.lng,
      capacity: form.capacity ? Number(form.capacity) : null,
    };

    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data);
        setForm({
          title: "",
          description: "",
          time: "",
          location: "",
          capacity: "",
          lat: null,
          lng: null,
        });
        setLocationResults([]);
        setMapCenter(DEFAULT_MAP_CENTER);
      } else {
        const err = await res.json();
        const validationError =
          Array.isArray(err.errors) && err.errors.length > 0
            ? err.errors[0].msg
            : null;
        alert(`Error: ${validationError || err.error || "unknown"}`);
      }
    } catch {
      alert("Cannot connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-blue-600 px-6 py-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative">
          <div className="inline-flex items-center justify-center rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">
            Create New Event
          </h2>
          <p className="mt-1 text-sm text-emerald-50">
            Fill in the details to get started
          </p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            required
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="e.g., Team Building Workshop"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Date & Time
            </label>
            <div className="relative mt-2">
              <input
                type="text"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="2026-02-14 19:00"
                value={form.time}
                onChange={(event) =>
                  setForm({ ...form, time: event.target.value })
                }
              />
            </div>
          </div>

          <div className="relative" ref={locationBoxRef}>
            <label className="block text-sm font-semibold text-slate-900">
              Location
            </label>
            <div className="mt-2 flex gap-2">
              <input
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Search location or type manually"
                value={form.location}
                onChange={(event) =>
                  handleLocationInputChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearchFromInput();
                  }
                }}
              />
              <button
                type="button"
                onClick={runSearchFromInput}
                disabled={isSearchingLocation}
                className="rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearchingLocation ? "..." : "Search"}
              </button>
            </div>

            {locationResults.length > 0 ? (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {locationResults.map((item) => (
                  <li key={`${item.lat}-${item.lng}-${item.label}`}>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => applyLocationSuggestion(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {isSearchingLocation ? (
              <p className="mt-1 text-xs text-slate-500">Searching places...</p>
            ) : null}
            {locationError ? (
              <p className="mt-1 text-xs text-red-600">{locationError}</p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-900">
              Pick Location on Map
            </label>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isDetectingLocation}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDetectingLocation ? "Detecting..." : "Use Current Location"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Click map to set exact coordinates.
          </p>
          <div className="mt-2 h-56 overflow-hidden rounded-lg border border-slate-300">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom
              dragging={!isMobileViewport}
              className="h-full w-full"
              style={{ overscrollBehavior: "contain" }}
            >
              <TileLayer
                attribution={OSM_TILE_ATTRIBUTION}
                url={OSM_TILE_URL}
              />
              <RecenterMap
                lat={(position || mapCenter).lat}
                lng={(position || mapCenter).lng}
              />
              <LocationPicker position={position} onPick={handlePickPoint} />
            </MapContainer>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Coordinates:{" "}
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : "Not selected"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Description
          </label>
          <textarea
            className="mt-2 block min-h-[120px] w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="What's this event about?"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Capacity{" "}
            <span className="font-normal text-slate-500">(Optional)</span>
          </label>
          <input
            type="number"
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Max attendees"
            value={form.capacity}
            onChange={(event) =>
              setForm({ ...form, capacity: event.target.value })
            }
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span className="relative flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5 transition-transform group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Event
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}

function HomePage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const editEvent = async (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId) {
      return;
    }

    const title = window.prompt("Edit title", eventItem.title || "");
    if (title === null || title.trim() === "") {
      return;
    }
    const description = window.prompt(
      "Edit description",
      eventItem.description || "",
    );
    if (description === null) {
      return;
    }
    const time = window.prompt(
      "Edit time (example: 2026-02-14 19:00)",
      eventItem.time || "",
    );
    if (time === null) {
      return;
    }
    const location = window.prompt("Edit location", eventItem.location || "");
    if (location === null) {
      return;
    }
    const capacity = window.prompt(
      "Edit capacity (leave blank for none)",
      eventItem.capacity ?? "",
    );
    if (capacity === null) {
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description,
        time: time || null,
        location,
        lat: eventItem.lat ?? null,
        lng: eventItem.lng ?? null,
        capacity: capacity ? Number(capacity) : null,
      };

      const response = await fetch(`${API_BASE}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const validationError =
          Array.isArray(errorData.errors) && errorData.errors.length > 0
            ? errorData.errors[0].msg
            : null;
        throw new Error(validationError || errorData.error || "Update failed");
      }

      await fetchEvents();
    } catch (error) {
      alert(error.message || "Update failed");
    }
  };

  const deleteEvent = async (eventItem) => {
    const eventId = eventItem.id || eventItem._id;
    if (!eventId) {
      return;
    }

    const confirmed = window.confirm(`Delete event "${eventItem.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      await fetchEvents();
    } catch (error) {
      alert(error.message || "Delete failed");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mt-8 grid gap-8 lg:grid-cols-[440px_1fr]">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <CreateEvent onCreated={fetchEvents} />
          </div>

          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 animate-spin text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="mt-4 text-sm text-slate-600">
                    Loading events...
                  </p>
                </div>
              </div>
            ) : (
              <EventList
                events={events}
                onRefresh={fetchEvents}
                onEdit={editEvent}
                onDelete={deleteEvent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}
