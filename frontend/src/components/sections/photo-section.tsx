"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Camera,
  Loader2,
  Sparkles,
  Check,
  ImagePlus,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/style/category-select";
import {
  uploadPhotos,
  uploadPhotoUrls,
  analyzePhotos,
  generatePhotoDraft,
  approvePhotoDraft,
  type PhotoPostScene,
} from "@/lib/api";

type Step = "upload" | "analyzing" | "scenes" | "generating" | "draft" | "approved";

export function PhotoSection() {
  const [step, setStep] = useState<Step>("upload");

  // upload
  const [files, setFiles] = useState<File[]>([]);
  const [pastedUrls, setPastedUrls] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [clientRequest, setClientRequest] = useState("");
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState("");

  // post state
  const [photoPostId, setPhotoPostId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<PhotoPostScene[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [approved, setApproved] = useState(false);
  const [styleUpdateNeeded, setStyleUpdateNeeded] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const merged = [...prev, ...newFiles].slice(0, 50);
      const urls = merged.slice(0, 12).map((f) => URL.createObjectURL(f));
      setPreviews(urls);
      return merged;
    });
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== "upload") return;
      const clip = e.clipboardData;
      if (!clip) return;

      // 1) 이미지 파일 (스크린샷, 파일 탐색기 복사)
      const images: File[] = [];
      if (clip.files.length > 0) {
        for (let i = 0; i < clip.files.length; i++) {
          const f = clip.files[i];
          if (f.type.startsWith("image/")) images.push(f);
        }
      }
      if (images.length === 0 && clip.items) {
        for (let i = 0; i < clip.items.length; i++) {
          if (clip.items[i].type.startsWith("image/")) {
            const file = clip.items[i].getAsFile();
            if (file) images.push(file);
          }
        }
      }
      if (images.length > 0) {
        e.preventDefault();
        addFiles(images);
        return;
      }

      // 2) HTML에서 img URL 추출 (네이버 블로그 등 웹 복사)
      const html = clip.getData("text/html");
      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const imgEls = doc.querySelectorAll("img");
        const urls: string[] = [];
        imgEls.forEach((img) => {
          const src = img.getAttribute("src");
          if (src && src.startsWith("http")) urls.push(src);
        });
        if (urls.length > 0) {
          e.preventDefault();
          setPastedUrls((prev) => [...prev, ...urls].slice(0, 50));
          setPreviews((prev) => [...prev, ...urls].slice(0, 12));
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [step, addFiles]);

  const totalCount = files.length + pastedUrls.length;

  const handleUploadAndAnalyze = async () => {
    if (totalCount === 0) {
      setError("사진을 선택하거나 붙여넣기 해주세요");
      return;
    }
    setError("");
    setStep("analyzing");

    try {
      let uploadRes: { photo_post_id: number; uploaded: number };
      if (pastedUrls.length > 0 && files.length === 0) {
        uploadRes = await uploadPhotoUrls(pastedUrls, category, clientRequest, keywords);
      } else if (pastedUrls.length > 0) {
        // 파일 + URL 혼합: 파일 먼저 업로드 (URL은 무시 - 복잡도 줄임)
        uploadRes = await uploadPhotos(files, category, clientRequest, keywords);
      } else {
        uploadRes = await uploadPhotos(files, category, clientRequest, keywords);
      }
      setPhotoPostId(uploadRes.photo_post_id);

      const analyzeRes = await analyzePhotos(
        uploadRes.photo_post_id,
        category,
        clientRequest,
      );
      setScenes(analyzeRes.scenes);
      setStep("scenes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드/분석 실패");
      setStep("upload");
    }
  };

  const handleGenerate = async () => {
    if (!photoPostId) return;
    setStep("generating");
    setError("");
    try {
      const res = await generatePhotoDraft(photoPostId, keywords);
      setTitle(res.title);
      setBody(res.body);
      setEditedBody(res.body);
      setStep("draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초안 생성 실패");
      setStep("scenes");
    }
  };

  const handleApprove = async () => {
    if (!photoPostId) return;
    try {
      const res = await approvePhotoDraft(photoPostId, editedBody, category);
      setApproved(true);
      setStyleUpdateNeeded(res.correction.style_update_needed);
      setStep("approved");
    } catch {
      // silent
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setPastedUrls([]);
    setPreviews([]);
    setPhotoPostId(null);
    setScenes([]);
    setTitle("");
    setBody("");
    setEditedBody("");
    setApproved(false);
    setError("");
  };

  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (droppedFiles.length > 0) addFiles(droppedFiles);
  };

  return (
    <div className="space-y-5">
      {/* Upload step */}
      {step === "upload" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              사진 업로드 (최대 50장)
            </Label>
            <label
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
                dragging
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <ImagePlus className={`size-8 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground text-center">
                {totalCount > 0
                  ? `${totalCount}장 선택됨${pastedUrls.length > 0 ? " (붙여넣기)" : ""}`
                  : "클릭 · 드래그 · Ctrl+V"}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className="hidden"
              />
            </label>

            {/* 미리보기 */}
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={src}
                      alt={`사진 ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </div>
                ))}
                {totalCount > 12 && (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">
                      +{totalCount - 12}장
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <CategorySelect value={category} onChange={setCategory} />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              업체 요청사항
            </Label>
            <textarea
              value={clientRequest}
              onChange={(e) => setClientRequest(e.target.value)}
              placeholder="예: 홍대 고기집 키워드 사용, 직원이 직접 구워주는 점 강조, 아늑한 분위기 언급..."
              rows={4}
              className="w-full resize-none rounded-lg border-0 bg-muted/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">필수 키워드</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="홍대 고기집, 홍대 삼겹살, 홍대 맛집"
              className="h-9 border-0 bg-muted/50 text-sm focus-visible:ring-1"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={handleUploadAndAnalyze}
            disabled={totalCount === 0}
            className="w-full gap-2 h-10"
          >
            <Camera className="size-4" />
            사진 업로드 & 분석
          </Button>
        </>
      )}

      {/* Analyzing step */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">
            사진 {totalCount}장 분석 중...
          </p>
          <p className="text-xs text-muted-foreground">
            장면별로 그룹화하고 있어요
          </p>
        </div>
      )}

      {/* Scenes step */}
      {step === "scenes" && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">장면 분석 완료</h3>
            <div className="space-y-1.5">
              {scenes.map((s) => (
                <div
                  key={s.scene_id}
                  className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {s.scene_id}
                  </span>
                  <span className="text-xs font-medium">{s.category}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.summary}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {s.photo_count}장
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button onClick={handleGenerate} className="w-full gap-2 h-10">
            <Sparkles className="size-4" />
            블로그 초안 생성
          </Button>
        </>
      )}

      {/* Generating step */}
      {step === "generating" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="relative">
            <Loader2 className="size-8 animate-spin text-primary" />
            <Sparkles className="absolute -right-1 -top-1 size-3 text-amber-500" />
          </div>
          <p className="text-sm font-medium">초안 작성 중...</p>
          <p className="text-xs text-muted-foreground">
            스타일을 반영해서 글을 쓰고 있어요
          </p>
        </div>
      )}

      {/* Draft step */}
      {(step === "draft" || step === "approved") && (
        <>
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">제목</Label>
            <p className="text-sm font-semibold">{title}</p>
          </div>

          {/* Approved banner */}
          {step === "approved" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Check className="size-4" />
                <span>스타일 학습 데이터로 저장됨</span>
              </div>
              {styleUpdateNeeded && (
                <p className="mt-1 text-xs text-emerald-400/70">
                  교정 데이터가 충분히 쌓였습니다. 스타일 탭에서 업데이트하세요.
                </p>
              )}
            </div>
          )}

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">본문</Label>
              {step === "draft" && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {editing && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditedBody(body);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {editing ? (
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={16}
                className="w-full resize-y rounded-lg border-0 bg-muted/30 p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            ) : (
              <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/20 p-3">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {step === "approved" ? editedBody : body}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {step === "draft" && (
            <div className="flex gap-2">
              <Button
                variant={editedBody !== body ? "default" : "secondary"}
                onClick={handleApprove}
                className="flex-1 gap-2"
              >
                <Check className="size-4" />
                {editedBody !== body ? "수정 후 승인" : "그대로 승인"}
              </Button>
            </div>
          )}

          {step === "approved" && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              새 글 작성
            </Button>
          )}
        </>
      )}
    </div>
  );
}
