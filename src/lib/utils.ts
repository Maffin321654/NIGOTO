import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LIMITS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function clip(s: string, max: number) {
  return s.trim().slice(0, max);
}

export function errorMessage(err: unknown, fallback = "Có lỗi xảy ra") {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export function toLocalInput(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function validateName(name: string) {
  const v = name.trim();
  if (!v) throw new Error("Họ tên bắt buộc.");
  if (v.length > LIMITS.name) throw new Error(`Họ tên tối đa ${LIMITS.name} ký tự.`);
  return v;
}

export function validateStudentId(raw: string) {
  const v = raw.trim().toUpperCase();
  if (!v) throw new Error("MSSV là bắt buộc.");
  if (v.length < 4 || v.length > LIMITS.studentId) {
    throw new Error("MSSV gồm 4–10 ký tự (ví dụ 524H0087).");
  }
  if (!/^[A-Z0-9]+$/.test(v)) throw new Error("MSSV chỉ gồm chữ và số.");
  const letters = (v.match(/[A-Z]/g) ?? []).length;
  const digits = (v.match(/[0-9]/g) ?? []).length;
  if (digits < 1) throw new Error("MSSV phải có ít nhất 1 chữ số.");
  if (letters > 2) throw new Error("MSSV tối đa 2 chữ cái.");
  return v;
}

export function maskStudentId(id: string | null | undefined) {
  if (!id) return "—";
  if (id.length <= 4) return id;
  return `${id.slice(0, 2)}${"*".repeat(Math.max(2, id.length - 4))}${id.slice(-2)}`;
}

export function validatePhone(raw: string) {
  const v = raw.replace(/\s+/g, "");
  if (!v) return "";
  if (!/^\d+$/.test(v)) throw new Error("Số điện thoại chỉ gồm chữ số.");
  if (v.length > LIMITS.phone) throw new Error(`Số điện thoại tối đa ${LIMITS.phone} số.`);
  return v;
}

export function validateBirthday(raw: string) {
  const v = raw.trim().slice(0, 10);
  if (!v) throw new Error("Ngày sinh là bắt buộc.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Ngày sinh không hợp lệ.");
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Ngày sinh không hợp lệ.");
  const year = d.getFullYear();
  if (year < 1950) throw new Error("Năm sinh không hợp lệ.");
  const today = new Date();
  if (d > today) throw new Error("Ngày sinh không được ở tương lai.");
  const age =
    today.getFullYear() -
    year -
    (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate()) ? 1 : 0);
  if (age < 10) throw new Error("Thành viên phải từ 10 tuổi trở lên.");
  return v;
}

export function validateTitle(raw: string) {
  const v = clip(raw, LIMITS.title);
  if (!v) throw new Error("Tiêu đề bắt buộc.");
  return v;
}

export function validateDesc(raw: string) {
  return clip(raw, LIMITS.description);
}

export function isPersonalEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function isGoogleDriveUrl(raw: string) {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}

export function googleDrivePreviewSrc(raw: string) {
  const s = raw.trim();
  const file = s.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/);
  if (file?.[1]) return `https://drive.google.com/file/d/${file[1]}/preview`;
  const id = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (id?.[1]) return `https://drive.google.com/file/d/${id[1]}/preview`;
  return null;
}

export function compressImage(file: File, max = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Không nén được ảnh."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh."));
    };
    img.src = url;
  });
}
