import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Cpu,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import {
  AIAnalysisResult,
  CAMPUS_BUILDINGS,
  CampusReport,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  IssueCategory,
  IssuePriority,
  UserProfile,
} from '../../types/campuscare';
import { analyzeIssueWithAI } from '../../services/aiService';
import { createReport, uploadReportPhoto } from '../../services/reportService';
import { useToast } from '../../contexts/ToastContext';

function compressImageForAI(
  file: File,
  maxDimension = 1024,
  quality = 0.82
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable.');
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to prepare image for AI.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode selected image.'));
    };
    img.src = objectUrl;
  });
}

export function ReportIssuePage({
  profile,
  existingReports,
}: {
  profile: UserProfile;
  existingReports: CampusReport[];
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Electrical');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [building, setBuilding] = useState<string>(CAMPUS_BUILDINGS[0]);
  const [customBuilding, setCustomBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiReviewed, setAiReviewed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<'uploading' | 'saving' | null>(null);
  const [photoUploadFailureMsg, setPhotoUploadFailureMsg] = useState<string | null>(null);

  const resolvedBuilding =
    building === '__custom__' ? customBuilding.trim() : building;

  const processPhotoFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast(
        'Unsupported image type',
        'Please select or drop a JPG, PNG, or WEBP image file.',
        'error'
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(
        'File too large',
        'Uploaded photos must be 5 MB or smaller.',
        'error'
      );
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
    e.target.value = '';
  };

  const handlePhotoDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingPhoto) {
      setIsDraggingPhoto(true);
    }
  };

  const handlePhotoDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingPhoto(false);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setIsDraggingPhoto(false);
  };

  const handleAnalyzeAI = async () => {
    if (!title.trim() && !description.trim() && !photoFile) {
      showToast(
        'Add issue details first',
        'Enter a title, description, or upload a photo before running AI analysis.',
        'error'
      );
      return;
    }

    setAiError('');
    setAnalyzing(true);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (photoFile) {
        const compressed = await compressImageForAI(photoFile);
        imageBase64 = compressed.base64;
        imageMimeType = compressed.mimeType;
      }

      const openCandidates = existingReports
        .filter((r) => r.status !== 'Resolved')
        .slice(0, 12)
        .map((r) => ({
          reportId: r.reportId,
          title: r.title,
          category: r.category,
          building: r.building,
          location: r.location,
          status: r.status,
        }));

      const result = await analyzeIssueWithAI({
        title: title.trim(),
        description: description.trim(),
        category,
        building: resolvedBuilding,
        roomNumber: roomNumber.trim(),
        imageBase64,
        imageMimeType,
        existingReportsSummary: openCandidates,
      });

      setAiResult(result);
      setAiReviewed(false);
      setCategory(result.category);
      setPriority(result.priority);
      showToast(
        'AI analysis complete',
        'Review the suggested category, priority, and summary below.',
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'UniFix AI analysis failed.';
      setAiError(msg);
      showToast('AI analysis error', msg, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyImprovedDescription = () => {
    if (!aiResult?.description) return;
    setDescription(aiResult.description);
    showToast(
      'Description updated',
      'Applied the AI-formatted maintenance description.',
      'info'
    );
  };

  const saveReportToFirestore = async (uploadedImageUrl: string) => {
    setSubmitStage('saving');
    const reportId = await createReport({
      title,
      description,
      category,
      building: resolvedBuilding,
      roomNumber,
      additionalInfo,
      imageUrl: uploadedImageUrl,
      priority,
      aiAnalysis: aiResult,
      profile,
    });

    showToast(
      'Issue reported',
      `Ticket ${reportId} submitted to campus facilities.`,
      'success'
    );
    navigate(`/student/reports/${reportId}`);
  };

  const formatSubmissionError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : 'Could not submit report.';
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      // Plain error message
    }
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (title.trim().length < 3) {
      showToast('Invalid title', 'Issue title must be at least 3 characters.', 'error');
      return;
    }
    if (description.trim().length < 5) {
      showToast(
        'Invalid description',
        'Please describe the campus problem in at least 5 characters.',
        'error'
      );
      return;
    }
    if (!resolvedBuilding) {
      showToast('Building required', 'Please specify the campus building.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedImageUrl = '';
      if (photoFile) {
        setSubmitStage('uploading');
        try {
          uploadedImageUrl = await uploadReportPhoto(photoFile, profile.uid);
        } catch (uploadErr) {
          const msg =
            uploadErr instanceof Error
              ? uploadErr.message
              : 'Firebase Storage photo upload failed.';
          setPhotoUploadFailureMsg(msg);
          return;
        }
      }

      await saveReportToFirestore(uploadedImageUrl);
    } catch (err) {
      showToast('Submission failed', formatSubmissionError(err), 'error');
    } finally {
      setSubmitting(false);
      setSubmitStage(null);
    }
  };

  const handleSubmitWithoutPhoto = async () => {
    setPhotoUploadFailureMsg(null);
    setSubmitting(true);
    try {
      await saveReportToFirestore('');
    } catch (err) {
      showToast('Submission failed', formatSubmissionError(err), 'error');
    } finally {
      setSubmitting(false);
      setSubmitStage(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#064E3B] font-display">
          Report a Campus Issue
        </h2>
        <p className="text-sm text-[#52635D] mt-1">
          Provide location details and an optional photograph. Use UniFix AI to
          classify the issue, verify priority, and polish your maintenance description
          before submitting.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
              Issue Title *
            </label>
            <input
              type="text"
              required
              maxLength={180}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Flickering overhead light and buzzing outlet in Room 302"
              className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                Issue Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                Suggested Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as IssuePriority)}
                className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              >
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                Campus Building *
              </label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              >
                {CAMPUS_BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__custom__">Other Building (Specify)</option>
              </select>
              {building === '__custom__' && (
                <input
                  type="text"
                  required
                  value={customBuilding}
                  onChange={(e) => setCustomBuilding(e.target.value)}
                  placeholder="Enter building name"
                  className="glass-input mt-2 w-full px-3.5 py-2 text-sm rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
                Room Number / Specific Location
              </label>
              <input
                type="text"
                maxLength={60}
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., Room 302, West Stairwell"
                className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#064E3B]">
                Detailed Description *
              </label>
              {aiResult?.description && aiResult.description !== description && (
                <button
                  type="button"
                  onClick={handleApplyImprovedDescription}
                  className="text-xs font-semibold text-[#059669] hover:underline"
                >
                  Apply AI-polished description
                </button>
              )}
            </div>
            <textarea
              rows={4}
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, visible damage, safety impact, and how long it has persisted..."
              className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
            />
          </div>

          {/* Image Upload (Click or Drag & Drop) */}
          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
              Photograph Evidence (JPG, PNG, WEBP · max 5 MB)
            </label>
            {!photoPreview ? (
              <label
                onDragEnter={handlePhotoDragEnter}
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-150 ${
                  isDraggingPhoto
                    ? 'border-[#059669] bg-emerald-50/85 ring-4 ring-[#10B981]/15 scale-[1.01]'
                    : 'border-emerald-950/15 bg-white/50 hover:border-[#059669] hover:bg-emerald-50/40'
                }`}
              >
                <ImagePlus
                  className={`w-6 h-6 transition-transform duration-150 ${
                    isDraggingPhoto ? 'text-[#047857] scale-110' : 'text-[#059669]'
                  }`}
                />
                <span className="mt-2 text-xs font-semibold text-[#064E3B]">
                  {isDraggingPhoto
                    ? 'Drop your photo here to attach'
                    : 'Drag & drop a campus issue photo, or click to browse'}
                </span>
                <span className="mt-0.5 text-[11px] text-[#52635D]">
                  Uploaded securely to Firebase Storage and analyzed by UniFix AI
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div
                onDragEnter={handlePhotoDragEnter}
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className={`relative rounded-2xl border overflow-hidden bg-emerald-950/[0.03] transition-all duration-150 ${
                  isDraggingPhoto
                    ? 'border-[#059669] ring-4 ring-[#10B981]/15'
                    : 'border-emerald-950/10'
                }`}
              >
                <img
                  src={photoPreview}
                  alt="Uploaded preview"
                  className="w-full max-h-64 object-contain"
                />
                {isDraggingPhoto && (
                  <div className="absolute inset-0 bg-emerald-900/55 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
                    <ImagePlus className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-semibold">Drop to replace photograph</span>
                  </div>
                )}
                <div className="px-4 py-2.5 bg-white/85 border-t border-emerald-950/10 flex items-center justify-between text-xs gap-3">
                  <span className="text-[#52635D] truncate pr-2">
                    {photoFile?.name} (
                    {photoFile ? (photoFile.size / 1024 / 1024).toFixed(2) : '0'} MB)
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="cursor-pointer text-[#059669] font-medium hover:text-[#047857]">
                      Replace
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="inline-flex items-center gap-1 text-rose-600 font-medium hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1.5">
              Additional Information (Optional)
            </label>
            <input
              type="text"
              maxLength={1000}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Best hours for room access, class schedule notes..."
              className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
            />
          </div>
        </div>

        {/* Right Column: UniFix AI Analysis & Submit */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#064E3B] font-display">
                  UniFix AI Diagnostics
                </h3>
                <p className="text-xs text-[#52635D] mt-0.5">
                  Analyze text and uploaded photos before submitting.
                </p>
              </div>
              <Cpu className="w-5 h-5 text-[#059669] shrink-0" />
            </div>

            <button
              type="button"
              disabled={analyzing}
              onClick={handleAnalyzeAI}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#064E3B] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing with UniFix AI...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Analyze with UniFix AI
                </>
              )}
            </button>

            {aiError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {aiError}
              </div>
            )}

            {aiResult ? (
              <div className="pt-4 border-t border-emerald-950/10 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#064E3B]">
                    AI Diagnostic Summary
                  </span>
                  <span className="text-[#52635D]">
                    Confidence: <strong className="text-[#064E3B]">{aiResult.confidence}</strong>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#52635D]">Suggested Category</span>
                    <span className="font-semibold text-[#064E3B]">
                      {aiResult.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#52635D]">Advisory Priority</span>
                    <span className="font-semibold text-[#059669]">
                      {aiResult.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#52635D]">Suggested Team</span>
                    <span className="font-semibold text-[#064E3B]">
                      {aiResult.department}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-[#064E3B]">Summary & Rationale</p>
                  <p className="text-[#52635D] mt-1 leading-relaxed">
                    {aiResult.summary} — {aiResult.priorityReason}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[#064E3B]">Visual Assessment</p>
                  <p className="text-[#52635D] mt-1 leading-relaxed">
                    {aiResult.visualFindings}
                  </p>
                  {aiResult.imageUnclear && (
                    <p className="mt-1 text-amber-700 font-medium">
                      Photo marked unclear — administrator visual verification recommended.
                    </p>
                  )}
                  {aiResult.needsHumanReview && !aiResult.imageUnclear && (
                    <p className="mt-1 text-amber-700 font-medium">
                      Flagged for administrator review due to risk level or detail ambiguity.
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-[#064E3B]">Recommended Action</p>
                  <p className="text-[#52635D] mt-1 leading-relaxed">
                    {aiResult.recommendation}
                  </p>
                </div>

                {aiResult.potentialDuplicate?.isPotentialDuplicate && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        Possible duplicate detected ({aiResult.potentialDuplicate.matchedReportId})
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        {aiResult.potentialDuplicate.reason} You may still submit for
                        human review.
                      </p>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiReviewed}
                    onChange={(e) => setAiReviewed(e.target.checked)}
                    className="mt-0.5 rounded border-emerald-950/20 text-[#059669] focus:ring-[#059669]"
                  />
                  <span className="text-xs text-[#0F172A] leading-relaxed">
                    I have reviewed the AI suggestions and confirmed or corrected the
                    category and priority fields on the left.
                  </span>
                </label>
              </div>
            ) : (
              <div className="pt-3 border-t border-emerald-950/10 text-xs text-[#52635D] leading-relaxed">
                AI analysis is optional but recommended. You can adjust every suggested
                category, priority, and description before submitting.
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {submitStage === 'uploading'
                    ? 'Uploading Photo...'
                    : submitStage === 'saving'
                    ? 'Saving Report...'
                    : 'Submitting Report...'}
                </>
              ) : (
                <>
                  {aiReviewed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Campus Issue Report
                </>
              )}
            </button>
            <p className="text-[11px] text-[#52635D] text-center">
              Initial status will be set to Pending and logged in Cloud Firestore.
            </p>
          </div>
        </div>
      </form>

      {photoUploadFailureMsg && (
        <div className="fixed inset-0 z-50 bg-[#064E3B]/25 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-emerald-950/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#064E3B] font-display">
                  Photo Upload Unavailable
                </h3>
                <p className="text-xs text-[#52635D] mt-1 leading-relaxed">
                  {photoUploadFailureMsg}
                </p>
                <p className="text-xs text-[#0F172A] mt-2 leading-relaxed">
                  You can submit your report and AI diagnostics immediately without the
                  photo file, or cancel to remove the attachment.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPhotoUploadFailureMsg(null)}
                className="px-4 py-2 text-xs font-semibold text-[#334155] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitWithoutPhoto}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition-colors"
              >
                Submit Without Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
