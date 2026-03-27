import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_MAP_CENTER = { lat: 3.139, lng: 101.6869 };
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

const EMPTY_FORM = {
  title: "",
  description: "",
  eventDate: "",
  eventTime: "",
  location: "",
  participantEmailInput: "",
  participantEmails: [],
  capacity: "",
  lat: null,
  lng: null,
};

const PARTICIPANT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const toEditableDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toEditableClockTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeParticipantEmail = (value) =>
  String(value || "").trim().toLowerCase();

const dedupeParticipantEmails = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const seen = new Set();

  return values.reduce((emails, value) => {
    const normalizedValue = normalizeParticipantEmail(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return emails;
    }

    seen.add(normalizedValue);
    emails.push(normalizedValue);
    return emails;
  }, []);
};

const parseParticipantEmailInput = (value) =>
  dedupeParticipantEmails(
    String(value || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim()),
  );

const resolveParticipantEmails = (existingEmails, rawValue) => {
  const nextExistingEmails = dedupeParticipantEmails(existingEmails);
  const parsedEmails = parseParticipantEmailInput(rawValue);

  if (parsedEmails.length === 0) {
    return { emails: nextExistingEmails, parsedEmails: [] };
  }

  const invalidEmails = parsedEmails.filter(
    (email) => !PARTICIPANT_EMAIL_PATTERN.test(email),
  );

  if (invalidEmails.length > 0) {
    return {
      emails: nextExistingEmails,
      parsedEmails,
      error:
        invalidEmails.length === 1
          ? `Enter a valid email address: ${invalidEmails[0]}`
          : `Enter valid email addresses: ${invalidEmails.join(", ")}`,
    };
  }

  return {
    emails: dedupeParticipantEmails([...nextExistingEmails, ...parsedEmails]),
    parsedEmails,
  };
};

const buildFormState = (initialValues) => ({
  title: initialValues?.title ?? EMPTY_FORM.title,
  description: initialValues?.description ?? EMPTY_FORM.description,
  eventDate: toEditableDate(initialValues?.time),
  eventTime: toEditableClockTime(initialValues?.time),
  location: initialValues?.location ?? EMPTY_FORM.location,
  participantEmailInput: EMPTY_FORM.participantEmailInput,
  participantEmails: dedupeParticipantEmails(
    initialValues?.participantEmails,
  ),
  capacity:
    initialValues?.capacity === null || initialValues?.capacity === undefined
      ? EMPTY_FORM.capacity
      : String(initialValues.capacity),
  lat: toNullableNumber(initialValues?.lat),
  lng: toNullableNumber(initialValues?.lng),
});

const openNativePicker = (input) => {
  if (!input) {
    return;
  }

  input.focus();

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      // Fall back to click for browsers that block showPicker.
    }
  }

  input.click();
};

function LocationPicker({ position, onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  return position ? <Marker position={position} icon={mapPinIcon} /> : null;
}

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)) {
      return;
    }

    map.setView(center, zoom, { animate: false });

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [center, zoom, map]);

  return null;
}

function EventLocationMap({
  position,
  mapCenter,
  zoom,
  isMobileViewport,
  onPick,
}) {
  const focusPoint = position || mapCenter;

  return (
    <MapContainer
      center={focusPoint}
      zoom={zoom}
      scrollWheelZoom
      dragging={!isMobileViewport}
      className="h-full w-full"
      style={{ overscrollBehavior: "contain" }}
    >
      <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_URL} />
      <RecenterMap center={focusPoint} zoom={zoom} />
      <LocationPicker position={position} onPick={onPick} />
    </MapContainer>
  );
}

export default function EventForm({
  initialValues,
  heading,
  subheading,
  submitLabel,
  submittingLabel,
  onSubmit,
  onSuccess = () => {},
}) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const locationBoxRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const reverseCacheRef = useRef(new Map());
  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const latestSearchQueryRef = useRef("");
  const [form, setForm] = useState(() => buildFormState(initialValues));
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [participantEmailError, setParticipantEmailError] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.innerWidth < 900,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextForm = buildFormState(initialValues);
    const nextPosition =
      nextForm.lat !== null && nextForm.lng !== null
        ? { lat: nextForm.lat, lng: nextForm.lng }
        : DEFAULT_MAP_CENTER;

    setForm(nextForm);
    setLocationResults([]);
    setLocationError("");
    setParticipantEmailError("");
    setMapCenter(nextPosition);
  }, [initialValues]);

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

  const handleParticipantInputChange = (value) => {
    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmailInput: value,
    }));
  };

  const handleAddParticipant = () => {
    const result = resolveParticipantEmails(
      form.participantEmails,
      form.participantEmailInput,
    );

    if (result.error) {
      setParticipantEmailError(result.error);
      return;
    }

    if (result.parsedEmails.length === 0) {
      setParticipantEmailError("Enter at least one participant email.");
      return;
    }

    if (result.emails.length === form.participantEmails.length) {
      setParticipantEmailError("That participant is already added.");
      return;
    }

    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmailInput: "",
      participantEmails: result.emails,
    }));
  };

  const handleRemoveParticipant = (emailToRemove) => {
    setParticipantEmailError("");
    setForm((prev) => ({
      ...prev,
      participantEmails: prev.participantEmails.filter(
        (email) => email !== emailToRemove,
      ),
    }));
  };

  const position =
    form.lat !== null && form.lng !== null
      ? { lat: form.lat, lng: form.lng }
      : null;
  const mapZoom = position ? 14 : 10;

  const submit = async (event) => {
    event.preventDefault();

    if (
      (form.eventDate && !form.eventTime) ||
      (!form.eventDate && form.eventTime)
    ) {
      alert("Please select both a date and a time.");
      return;
    }

    const participantResult = resolveParticipantEmails(
      form.participantEmails,
      form.participantEmailInput,
    );

    if (participantResult.error) {
      setParticipantEmailError(participantResult.error);
      return;
    }

    setIsSubmitting(true);
    setParticipantEmailError("");

    if (participantResult.parsedEmails.length > 0) {
      setForm((prev) => ({
        ...prev,
        participantEmailInput: "",
        participantEmails: participantResult.emails,
      }));
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      time:
        form.eventDate && form.eventTime
          ? `${form.eventDate}T${form.eventTime}`
          : null,
      location: form.location,
      participantEmails: participantResult.emails,
      lat: form.lat,
      lng: form.lng,
      capacity: form.capacity ? Number(form.capacity) : null,
    };

    try {
      const data = await onSubmit(payload);
      onSuccess(data);
    } catch (error) {
      alert(error?.message || "Unable to save event.");
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
          <h2 className="mt-4 text-2xl font-bold text-white">{heading}</h2>
          <p className="mt-1 text-sm text-emerald-50">{subheading}</p>
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
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Date & Time
            </label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    value={form.eventDate}
                    placeholder="01-JAN-99"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        eventDate: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    aria-label="Open date picker"
                    onClick={() => openNativePicker(dateInputRef.current)}
                    className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-md border-0 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M8 7V3m8 4V3m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    ref={timeInputRef}
                    type="time"
                    step="60"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="12:30 AM"
                    value={form.eventTime}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        eventTime: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    aria-label="Open time picker"
                    onClick={() => openNativePicker(timeInputRef.current)}
                    className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-md border-0 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
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
                      className="w-full rounded-md border-0 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-none transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            <EventLocationMap
              position={position}
              mapCenter={mapCenter}
              zoom={mapZoom}
              isMobileViewport={isMobileViewport}
              onPick={handlePickPoint}
            />
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
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Participants
          </label>
          <div className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Enter participant email"
              value={form.participantEmailInput}
              onChange={(event) =>
                handleParticipantInputChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddParticipant();
                }
              }}
            />

            {form.participantEmails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.participantEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                  >
                    {email}
                    <button
                      type="button"
                      aria-label={`Remove ${email}`}
                      onClick={() => handleRemoveParticipant(email)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleAddParticipant}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
            >
              Add Participant
            </button>
          </div>
          <p
            className={`mt-2 text-xs ${
              participantEmailError ? "text-red-600" : "text-slate-500"
            }`}
          >
            {participantEmailError ||
              "Enter email addresses of participants to invite to this event. Only registered users can be added in this version."}
          </p>
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
              setForm((prev) => ({ ...prev, capacity: event.target.value }))
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
                {submittingLabel}
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
                {submitLabel}
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
