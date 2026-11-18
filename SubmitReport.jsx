import React, { useState, useEffect } from "react";
import "./SubmitReport.css";

const CATEGORIES = [
  "Electrical",
  "Plumbing",
  "Internet / Wi-Fi",
  "Furniture",
  "Cleaning",
  "Laboratory",
  "Safety",
  "Other",
];

const URGENCY_LEVELS = [
  "Low Priority",
  "Medium Priority",
  "High Priority",
  "Urgent",
];

const MAX_DESC = 500;
const MAX_IMAGE_MB = 5;

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "",
  urgency: "Medium Priority",
  location: "",
};

function SubmitReport() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Location: null | "gps" | "manual"
  const [locMode, setLocMode] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /* ---------- Location ---------- */
  const getCurrentLocation = () => {
    setLocMode("gps");
    setErrors((prev) => ({ ...prev, location: "" }));

    if (!navigator.geolocation) {
      setErrors((prev) => ({
        ...prev,
        location: "Location is not supported by your browser",
      }));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setCoords(null);
        setErrors((prev) => ({
          ...prev,
          location: "Could not get your location. Try entering it manually.",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enterManually = () => {
    setLocMode("manual");
    setCoords(null);
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  /* ---------- Image ---------- */
  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please choose an image file" }));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: `Image must be under ${MAX_IMAGE_MB}MB`,
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, image: "" }));
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  /* ---------- Submit ---------- */
  const validate = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (form.description.trim().length < 10)
      newErrors.description = "Please describe the problem (min 10 characters)";
    if (!form.category) newErrors.category = "Please select a category";

    if (locMode === "gps") {
      if (!coords) newErrors.location = "Waiting for your current location";
    } else if (locMode === "manual") {
      if (!form.location.trim()) newErrors.location = "Please enter a location";
    } else {
      newErrors.location = "Please choose how to provide the location";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("category", form.category);
    data.append("urgency", form.urgency);
    if (locMode === "gps") {
      data.append("latitude", coords.lat);
      data.append("longitude", coords.lng);
    } else {
      data.append("location", form.location);
    }
    if (image) data.append("image", image);

    setLoading(true);
    try {
      // Replace with your real endpoint
      // const res = await fetch("/api/reports", { method: "POST", body: data });
      // if (!res.ok) throw new Error("Request failed");
      await new Promise((r) => setTimeout(r, 800)); // simulated delay
      console.log("Submitting:", Object.fromEntries(data));

      setSubmitted(true);
      setForm(INITIAL_FORM);
      setLocMode(null);
      setCoords(null);
      removeImage();
      setErrors({});
    } catch (err) {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (name) => `field${errors[name] ? " has-error" : ""}`;

  const ErrorText = ({ name }) =>
    errors[name] ? (
      <p className="error-text" role="alert">
        {errors[name]}
      </p>
    ) : null;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Report a Community Issue</h1>
        <p>Help make your community better by reporting issues that need attention.</p>
      </header>

      {submitted ? (
        <section className="card success">
          <div className="check">✓</div>
          <h2>Thank you!</h2>
          <p>
            Your report has been submitted. Our team will review it and get it
            sorted as soon as possible.
          </p>
          <button className="btn-primary" onClick={() => setSubmitted(false)}>
            Submit another report
          </button>
        </section>
      ) : (
        <form className="card" onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className={fieldClass("title")}>
            <label htmlFor="title">Issue Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Brief description of the issue"
              value={form.title}
              onChange={handleChange}
            />
            <ErrorText name="title" />
          </div>

          {/* Description */}
          <div className={fieldClass("description")}>
            <label htmlFor="description">Detailed Description *</label>
            <textarea
              id="description"
              name="description"
              placeholder="Provide more details about the issue, including when you noticed it and any relevant context"
              maxLength={MAX_DESC}
              value={form.description}
              onChange={handleChange}
            />
            <div className="counter">
              {form.description.length}/{MAX_DESC}
            </div>
            <ErrorText name="description" />
          </div>

          {/* Category + Urgency */}
          <div className="grid-2">
            <div className={fieldClass("category")}>
              <label htmlFor="category">Issue Category *</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ErrorText name="category" />
            </div>

            <div className="field">
              <label htmlFor="urgency">Urgency Level *</label>
              <select
                id="urgency"
                name="urgency"
                value={form.urgency}
                onChange={handleChange}
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className={fieldClass("location")}>
            <span className="field-label">Location *</span>
            <div className="loc-buttons">
              <button
                type="button"
                className={`loc-btn${locMode === "gps" ? " active" : ""}`}
                onClick={getCurrentLocation}
                disabled={locating}
              >
                <span>📍</span> {locating ? "Locating..." : "Get Current Location"}
              </button>
              <button
                type="button"
                className={`loc-btn${locMode === "manual" ? " active" : ""}`}
                onClick={enterManually}
              >
                <span>⌄</span> Enter Manually
              </button>
            </div>

            <div className="loc-extra">
              {locMode === "gps" && coords && (
                <div className="loc-status">
                  ✓ Location captured: {coords.lat}, {coords.lng}
                </div>
              )}
              {locMode === "gps" && locating && (
                <div className="loc-status info">
                  Getting your location. Please allow access if prompted.
                </div>
              )}
              {locMode === "manual" && (
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Block B, Room 204, near the main gate"
                  value={form.location}
                  onChange={handleChange}
                />
              )}
              <ErrorText name="location" />
            </div>
          </div>

          {/* Image */}
          <div className={fieldClass("image")}>
            <span className="field-label">Upload Image (optional)</span>
            {preview ? (
              <div className="preview">
                <img src={preview} alt="Preview of uploaded issue" />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label
                className={`dropzone${dragging ? " drag" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <span className="icon">📷</span>
                <span>
                  <strong>Click to upload</strong> or drag and drop
                </span>
                <small>PNG, JPG or GIF up to {MAX_IMAGE_MB}MB</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => processFile(e.target.files[0])}
                />
              </label>
            )}
            <ErrorText name="image" />
          </div>

          {errors.form && (
            <div className="form-error" role="alert">
              {errors.form}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      )}
    </div>
  );
}

export default SubmitReport;
