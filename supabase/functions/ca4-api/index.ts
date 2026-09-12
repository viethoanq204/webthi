import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const configured = (Deno.env.get("APP_ORIGINS") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const allowed = configured.length === 0 || configured.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || "*") : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function reply(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

function cleanText(value: unknown, max = 10000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeAnswer(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("vi-VN")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "");
}

function uniqueUuidList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return [...new Set(value.map((item) => cleanText(item, 50)).filter((item) => uuid.test(item)))];
}

async function caller(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) fail("Bạn chưa đăng nhập.", 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) fail("Phiên đăng nhập không hợp lệ.", 401);
  const { data: profile } = await admin.from("profiles").select("id,email,display_name,role,active,is_root").eq("id", data.user.id).single();
  if (!profile || !profile.active) fail("Tài khoản không tồn tại hoặc đã bị khóa.", 403);
  return profile;
}

function requireAdmin(profile: any) {
  if (profile.role !== "admin" || !profile.active) fail("Bạn không có quyền quản trị.", 403);
}

function validateExam(input: any) {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return ["Dữ liệu đề không hợp lệ."];
  if (cleanText(input.format_version) !== "CA4-1.0") errors.push("Sai phiên bản định dạng.");
  if (!cleanText(input.title, 160)) errors.push("Thiếu tên bài kiểm tra.");
  if (!Number.isInteger(input.duration_minutes) || input.duration_minutes < 1 || input.duration_minutes > 300) errors.push("Thời gian không hợp lệ.");
  if (!Number.isInteger(input.max_attempts) || input.max_attempts < 0) errors.push("Số lượt làm không hợp lệ.");
  if (!["draft", "published"].includes(input.status)) errors.push("Trạng thái không hợp lệ.");
  if (!Array.isArray(input.questions) || input.questions.length !== 60) errors.push("Đề phải có đúng 60 câu.");
  if (!Array.isArray(input.passages) || input.passages.length !== 2) errors.push("Đề phải có đúng hai tình huống.");
  const passageCodes = new Set((input.passages || []).map((p: any) => cleanText(p.group_code).toUpperCase()));
  if (!passageCodes.has("N1") || !passageCodes.has("N2")) errors.push("Tình huống phải có mã N1 và N2.");
  const numbers = new Set<number>();
  const levels = { BIET: 0, HIEU: 0, VANDUNG: 0 } as Record<string, number>;
  let points = 0;
  for (const q of input.questions || []) {
    const n = Number(q.number);
    if (!Number.isInteger(n) || n < 1 || n > 60 || numbers.has(n)) errors.push(`Số câu ${n || "?"} không hợp lệ hoặc bị trùng.`);
    numbers.add(n);
    const expected = n <= 48 ? "DON" : n <= 54 ? "NHOM" : "NGAN";
    if (q.kind !== expected) errors.push(`Câu ${n}: sai loại câu.`);
    const group = n >= 49 && n <= 51 ? "N1" : n >= 52 && n <= 54 ? "N2" : null;
    if ((q.group_code || null) !== group) errors.push(`Câu ${n}: sai mã nhóm.`);
    if (!cleanText(q.stem)) errors.push(`Câu ${n}: thiếu nội dung.`);
    if (!(q.level in levels)) errors.push(`Câu ${n}: sai mức độ.`); else levels[q.level] += 1;
    const p = Number(q.points);
    if (!Number.isFinite(p) || p <= 0) errors.push(`Câu ${n}: điểm không hợp lệ.`); else points += p;
    if (expected === "NGAN") {
      if (!cleanText(q.correct_answer) && (!Array.isArray(q.accepted_answers) || q.accepted_answers.length === 0)) errors.push(`Câu ${n}: thiếu đáp án ngắn.`);
    } else {
      const opts = q.options || {};
      const values = ["A", "B", "C", "D"].map((key) => cleanText(opts[key]));
      if (values.some((x) => !x)) errors.push(`Câu ${n}: thiếu phương án.`);
      if (new Set(values.map(normalizeAnswer)).size !== 4) errors.push(`Câu ${n}: phương án bị trùng.`);
      if (!["A", "B", "C", "D"].includes(q.correct_answer)) errors.push(`Câu ${n}: đáp án đúng không hợp lệ.`);
    }
  }
  for (let n = 1; n <= 60; n += 1) if (!numbers.has(n)) errors.push(`Thiếu câu ${n}.`);
  if (levels.BIET !== 12 || levels.HIEU !== 18 || levels.VANDUNG !== 30) errors.push("Tỷ lệ mức độ phải là 12 Biết, 18 Hiểu, 30 Vận dụng.");
  if (Math.abs(points - 70) > 0.01) errors.push("Tổng điểm phải bằng 70.");
  return [...new Set(errors)].slice(0, 60);
}

async function examForUser(shareCode: string, userId: string) {
  const { data: exam, error } = await admin.from("exams").select("id,title,description,duration_minutes,max_attempts,status,share_code,total_points").eq("share_code", shareCode).maybeSingle();
  if (error || !exam || exam.status === "draft") fail("Bài kiểm tra không tồn tại hoặc chưa được mở.", 404);
  if (exam.status === "assigned") {
    const { data: assignment, error: assignmentError } = await admin.from("exam_assignments").select("exam_id").eq("exam_id", exam.id).eq("user_id", userId).maybeSingle();
    if (assignmentError) fail("Không thể kiểm tra quyền làm bài.", 500);
    if (!assignment) fail("Bài kiểm tra này chưa được giao cho tài khoản của bạn.", 403);
  } else if (exam.status !== "published") {
    fail("Bài kiểm tra không tồn tại hoặc chưa được mở.", 404);
  }
  const { data: counter } = await admin.from("attempt_counters").select("used_attempts").eq("user_id", userId).eq("exam_id", exam.id).maybeSingle();
  const used = Number(counter?.used_attempts || 0);
  return { ...exam, used_attempts: used, can_start: exam.max_attempts === 0 || used < exam.max_attempts };
}

async function fullExam(exam: any) {
  const [{ data: passages, error: pError }, { data: questions, error: qError }] = await Promise.all([
    admin.from("passages").select("id,group_code,content").eq("exam_id", exam.id).order("group_code"),
    admin.from("questions").select("id,number,kind,stem,options,topic,level,points,passage_id").eq("exam_id", exam.id).order("number"),
  ]);
  if (pError || qError) fail("Không thể tải nội dung bài kiểm tra.", 500);
  const passageById = new Map((passages || []).map((p: any) => [p.id, p.group_code]));
  return {
    ...exam,
    passages: passages || [],
    questions: (questions || []).map((q: any) => ({ ...q, group_code: q.passage_id ? passageById.get(q.passage_id) : null })),
  };
}

async function gradeAttempt(profile: any, attemptId: string, answers: Record<string, unknown>, automaticReason: string | null) {
  const { data: attempt, error } = await admin.from("active_attempts").select("id,user_id,exam_id,deadline_at,warning_count").eq("id", attemptId).eq("user_id", profile.id).single();
  if (error || !attempt) fail("Phiên làm bài không tồn tại hoặc đã được nộp.", 404);
  const { data: exam } = await admin.from("exams").select("id,title,total_points").eq("id", attempt.exam_id).single();
  const { data: questions } = await admin.from("questions").select("id,number,kind,stem,options,points").eq("exam_id", attempt.exam_id).order("number");
  const ids = (questions || []).map((q: any) => q.id);
  const { data: keys } = await admin.from("question_keys").select("question_id,correct_answer,accepted_answers,explanation").in("question_id", ids);
  if (!exam || !questions || questions.length !== 60 || !keys || keys.length !== 60) fail("Dữ liệu đáp án của đề chưa hoàn chỉnh.", 500);
  const isAutomatic = automaticReason === "time" || automaticReason === "violations" || new Date(attempt.deadline_at).getTime() <= Date.now();
  const answered = questions.filter((q: any) => normalizeAnswer(answers?.[q.number])).length;
  if (!isAutomatic && answered !== 60) fail("Bạn phải trả lời đủ 60 câu trước khi nộp.");
  const keyMap = new Map(keys.map((k: any) => [k.question_id, k]));
  let score = 0;
  let correctCount = 0;
  const review = questions.map((q: any) => {
    const key: any = keyMap.get(q.id);
    const userRaw = cleanText(answers?.[q.number], 300);
    let correct = false;
    let correctDisplay = "";
    let userDisplay = userRaw;
    if (q.kind === "NGAN") {
      const accepted = [key.correct_answer, ...(Array.isArray(key.accepted_answers) ? key.accepted_answers : [])].map(normalizeAnswer).filter(Boolean);
      correct = accepted.includes(normalizeAnswer(userRaw));
      correctDisplay = key.correct_answer;
    } else {
      correct = userRaw.toUpperCase() === key.correct_answer;
      userDisplay = userRaw ? `${userRaw.toUpperCase()}. ${q.options[userRaw.toUpperCase()] || ""}` : "";
      correctDisplay = `${key.correct_answer}. ${q.options[key.correct_answer] || ""}`;
    }
    if (correct) { score += Number(q.points); correctCount += 1; }
    return { number: q.number, stem: q.stem, is_correct: correct, user_answer_display: userDisplay, correct_answer_display: correctDisplay, explanation: key.explanation || "" };
  });
  await admin.from("active_attempts").delete().eq("id", attempt.id);
  return {
    exam_title: exam.title,
    score: Math.round(score * 100) / 100,
    total_points: Number(exam.total_points),
    correct_count: correctCount,
    automatic_reason: automaticReason || (new Date(attempt.deadline_at).getTime() <= Date.now() ? "time" : null),
    review,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, 405, { ok: false, error: "Phương thức không được hỗ trợ." });
  try {
    const profile = await caller(req);
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body.action, 60);

    if (action === "get-exam") {
      const exam = await examForUser(cleanText(body.shareCode, 80), profile.id);
      return reply(req, 200, { ok: true, data: { exam } });
    }

    if (action === "start-attempt") {
      const base = await examForUser(cleanText(body.shareCode, 80), profile.id);
      const { data: started, error } = await admin.rpc("start_exam_attempt", { p_user_id: profile.id, p_exam_id: base.id, p_duration_minutes: base.duration_minutes, p_max_attempts: base.max_attempts });
      if (error || !started?.length) fail(error?.message?.includes("ATTEMPT_LIMIT") ? "Bạn đã sử dụng hết số lượt làm." : "Không thể bắt đầu bài kiểm tra.");
      const exam = await fullExam(base);
      return reply(req, 200, { ok: true, data: { exam, attempt: started[0] } });
    }

    if (action === "save-progress") {
      const attemptId = cleanText(body.attemptId, 50);
      const { error } = await admin.from("active_attempts").update({ draft_answers: body.answers || {} }).eq("id", attemptId).eq("user_id", profile.id);
      if (error) fail("Không thể lưu tạm bài làm.");
      return reply(req, 200, { ok: true, data: { saved: true } });
    }

    if (action === "report-violation") {
      const attemptId = cleanText(body.attemptId, 50);
      const { data: attempt } = await admin.from("active_attempts").select("warning_count").eq("id", attemptId).eq("user_id", profile.id).single();
      if (!attempt) fail("Phiên làm bài không tồn tại.", 404);
      const warningCount = Math.min(3, Number(attempt.warning_count) + 1);
      await admin.from("active_attempts").update({ warning_count: warningCount, draft_answers: body.answers || {} }).eq("id", attemptId).eq("user_id", profile.id);
      if (warningCount >= 3) {
        const result = await gradeAttempt(profile, attemptId, body.answers || {}, "violations");
        return reply(req, 200, { ok: true, data: { warning_count: 3, auto_submitted: true, result } });
      }
      return reply(req, 200, { ok: true, data: { warning_count: warningCount, auto_submitted: false } });
    }

    if (action === "submit-attempt") {
      const result = await gradeAttempt(profile, cleanText(body.attemptId, 50), body.answers || {}, body.automaticReason || null);
      return reply(req, 200, { ok: true, data: result });
    }

    requireAdmin(profile);

    if (action === "admin-list-users") {
      const { data: authData, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) fail("Không thể tải danh sách tài khoản.", 500);
      const { data: profiles } = await admin.from("profiles").select("id,email,display_name,role,active,is_root,created_at");
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
      const users = authData.users.map((u: any) => byId.get(u.id)).filter(Boolean).sort((a: any, b: any) => Number(b.is_root) - Number(a.is_root) || a.display_name.localeCompare(b.display_name, "vi"));
      return reply(req, 200, { ok: true, data: { users } });
    }

    if (action === "admin-create-user") {
      const email = cleanText(body.user?.email, 200).toLowerCase();
      const password = cleanText(body.user?.password, 200);
      const displayName = cleanText(body.user?.display_name, 100);
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !displayName) fail("Thông tin tài khoản không hợp lệ.");
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
      if (error || !data.user) fail(error?.message || "Không thể tạo tài khoản.");
      await admin.from("profiles").update({ display_name: displayName, role: "student", active: true, is_root: false }).eq("id", data.user.id);
      return reply(req, 200, { ok: true, data: { id: data.user.id } });
    }

    if (action === "admin-update-user") {
      const userId = cleanText(body.userId, 50);
      const { data: target } = await admin.from("profiles").select("is_root").eq("id", userId).single();
      if (!target || target.is_root) fail("Không thể chỉnh sửa tài khoản quản trị gốc.");
      const email = cleanText(body.patch?.email, 200).toLowerCase();
      const displayName = cleanText(body.patch?.display_name, 100);
      if (!/^\S+@\S+\.\S+$/.test(email) || !displayName) fail("Thông tin tài khoản không hợp lệ.");
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true, user_metadata: { display_name: displayName } });
      if (authError) fail(authError.message);
      await admin.from("profiles").update({ email, display_name: displayName, active: Boolean(body.patch?.active), role: "student", is_root: false }).eq("id", userId);
      return reply(req, 200, { ok: true, data: { updated: true } });
    }

    if (action === "admin-reset-password") {
      const userId = cleanText(body.userId, 50);
      const password = cleanText(body.password, 200);
      const { data: target } = await admin.from("profiles").select("is_root").eq("id", userId).single();
      if (!target || target.is_root) fail("Không thể đặt lại mật khẩu quản trị gốc tại đây.");
      if (password.length < 8) fail("Mật khẩu phải có ít nhất 8 ký tự.");
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) fail(error.message);
      return reply(req, 200, { ok: true, data: { updated: true } });
    }

    if (action === "admin-delete-user") {
      const userId = cleanText(body.userId, 50);
      const { data: target } = await admin.from("profiles").select("is_root,role").eq("id", userId).single();
      if (!target || target.is_root || target.role === "admin") fail("Không thể xóa tài khoản quản trị.");
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) fail(error.message);
      return reply(req, 200, { ok: true, data: { deleted: true } });
    }

    if (action === "admin-list-catalog") {
      const [folderResult, examResult, assignmentResult, studentResult] = await Promise.all([
        admin.from("folders").select("id,name,sort_order,created_at").order("sort_order").order("name"),
        admin.from("exams").select("id,folder_id,title,description,duration_minutes,max_attempts,status,share_code,created_at").order("created_at", { ascending: false }),
        admin.from("exam_assignments").select("exam_id,user_id"),
        admin.from("profiles").select("id,email,display_name,active,created_at").eq("role", "student").order("display_name"),
      ]);
      if (folderResult.error || examResult.error || assignmentResult.error || studentResult.error) fail("Không thể tải dữ liệu quản lý bài kiểm tra.", 500);
      const folders = folderResult.data || [];
      const exams = examResult.data || [];
      const assignments = assignmentResult.data || [];
      const students = studentResult.data || [];
      const assignedByExam = new Map<string, string[]>();
      for (const row of assignments) {
        if (!assignedByExam.has(row.exam_id)) assignedByExam.set(row.exam_id, []);
        assignedByExam.get(row.exam_id)!.push(row.user_id);
      }
      const catalog = exams.map((exam: any) => {
        const assignedUserIds = assignedByExam.get(exam.id) || [];
        return { ...exam, assigned_user_ids: assignedUserIds, assigned_count: assignedUserIds.length };
      });
      return reply(req, 200, { ok: true, data: { folders, exams: catalog, students } });
    }

    if (action === "admin-save-folder") {
      const name = cleanText(body.folder?.name, 100);
      const sortOrder = Number(body.folder?.sort_order);
      if (!name || !Number.isInteger(sortOrder) || sortOrder < 0) fail("Thông tin thư mục không hợp lệ.");
      if (body.folderId) {
        const { error } = await admin.from("folders").update({ name, sort_order: sortOrder }).eq("id", cleanText(body.folderId, 50));
        if (error) fail("Không thể cập nhật thư mục.");
      } else {
        const { error } = await admin.from("folders").insert({ name, sort_order: sortOrder, created_by: profile.id });
        if (error) fail("Không thể tạo thư mục.");
      }
      return reply(req, 200, { ok: true, data: { saved: true } });
    }

    if (action === "admin-delete-folder") {
      const { error } = await admin.from("folders").delete().eq("id", cleanText(body.folderId, 50));
      if (error) fail("Không thể xóa thư mục.");
      return reply(req, 200, { ok: true, data: { deleted: true } });
    }

    if (action === "admin-update-exam") {
      const patch = body.patch || {};
      const update = {
        title: cleanText(patch.title, 160),
        description: cleanText(patch.description, 500),
        duration_minutes: Number(patch.duration_minutes),
        max_attempts: Number(patch.max_attempts),
        folder_id: patch.folder_id || null,
        status: patch.status,
      };
      const rawAssignedUserIds = Array.isArray(patch.assigned_user_ids) ? patch.assigned_user_ids.map((item: unknown) => cleanText(item, 50)) : [];
      const assignedUserIds = uniqueUuidList(rawAssignedUserIds);
      if (!update.title || !Number.isInteger(update.duration_minutes) || update.duration_minutes < 1 || update.duration_minutes > 300 || !Number.isInteger(update.max_attempts) || update.max_attempts < 0 || !["draft", "published", "assigned"].includes(update.status)) fail("Thông tin bài kiểm tra không hợp lệ.");
      if (update.status === "assigned" && assignedUserIds.length === 0) fail("Hãy chọn ít nhất một học viên để giao bài.");
      if (update.status === "assigned" && assignedUserIds.length !== new Set(rawAssignedUserIds).size) fail("Danh sách học viên được giao không hợp lệ.");
      const { error } = await admin.rpc("admin_update_exam_settings", {
        p_exam_id: cleanText(body.examId, 50),
        p_title: update.title,
        p_description: update.description,
        p_duration_minutes: update.duration_minutes,
        p_max_attempts: update.max_attempts,
        p_folder_id: update.folder_id,
        p_status: update.status,
        p_assigned_user_ids: update.status === "assigned" ? assignedUserIds : [],
        p_actor_id: profile.id,
      });
      if (error) {
        if (error.message.includes("ASSIGNEES_REQUIRED")) fail("Hãy chọn ít nhất một học viên để giao bài.");
        if (error.message.includes("INVALID_ASSIGNEES")) fail("Danh sách có tài khoản không hợp lệ hoặc đã bị khóa.");
        if (error.message.includes("EXAM_NOT_FOUND")) fail("Bài kiểm tra không tồn tại.", 404);
        console.error(error);
        fail("Không thể cập nhật bài kiểm tra.", 500);
      }
      return reply(req, 200, { ok: true, data: { updated: true, assigned_count: update.status === "assigned" ? assignedUserIds.length : 0 } });
    }

    if (action === "admin-delete-exam") {
      const { error } = await admin.from("exams").delete().eq("id", cleanText(body.examId, 50));
      if (error) fail("Không thể xóa bài kiểm tra.");
      return reply(req, 200, { ok: true, data: { deleted: true } });
    }

    if (action === "admin-import-exam") {
      const input = body.exam;
      const errors = validateExam(input);
      if (errors.length) fail(errors.join(" "));
      let folderId: string | null = null;
      const folderName = cleanText(input.folder_name, 100);
      if (folderName) {
        const { data: existing } = await admin.from("folders").select("id").ilike("name", folderName).limit(1).maybeSingle();
        if (existing) folderId = existing.id;
        else {
          const { data: created, error } = await admin.from("folders").insert({ name: folderName, sort_order: 0, created_by: profile.id }).select("id").single();
          if (error || !created) fail("Không thể tạo thư mục trong file.");
          folderId = created.id;
        }
      }
      const { data: exam, error: examError } = await admin.from("exams").insert({ folder_id: folderId, title: cleanText(input.title, 160), description: cleanText(input.description, 500), duration_minutes: input.duration_minutes, max_attempts: input.max_attempts, status: input.status, format_version: "CA4-1.0", total_questions: 60, total_points: 70, created_by: profile.id }).select("id").single();
      if (examError || !exam) fail("Không thể tạo bài kiểm tra.");
      try {
        const passageRows = input.passages.map((p: any) => ({ exam_id: exam.id, group_code: p.group_code, content: cleanText(p.content, 20000) }));
        const { data: passages, error: passageError } = await admin.from("passages").insert(passageRows).select("id,group_code");
        if (passageError || !passages) fail("Không thể lưu tình huống.");
        const passageIds = new Map(passages.map((p: any) => [p.group_code, p.id]));
        const questionRows = input.questions.map((q: any) => ({ exam_id: exam.id, passage_id: q.group_code ? passageIds.get(q.group_code) : null, number: q.number, kind: q.kind, stem: cleanText(q.stem, 10000), options: q.kind === "NGAN" ? {} : q.options, topic: cleanText(q.topic, 200), level: q.level, points: q.points }));
        const { data: questions, error: questionError } = await admin.from("questions").insert(questionRows).select("id,number");
        if (questionError || !questions || questions.length !== 60) fail("Không thể lưu câu hỏi.");
        const idByNumber = new Map(questions.map((q: any) => [q.number, q.id]));
        const keyRows = input.questions.map((q: any) => ({ question_id: idByNumber.get(q.number), correct_answer: cleanText(q.correct_answer, 300), accepted_answers: q.accepted_answers || [], explanation: cleanText(q.explanation, 5000) }));
        const { error: keyError } = await admin.from("question_keys").insert(keyRows);
        if (keyError) fail("Không thể lưu đáp án.");
      } catch (error) {
        await admin.from("exams").delete().eq("id", exam.id);
        throw error;
      }
      return reply(req, 200, { ok: true, data: { exam_id: exam.id } });
    }

    fail("Thao tác không được hỗ trợ.", 404);
  } catch (error) {
    const status = Number((error as any)?.status || 500);
    const message = status >= 500 ? "Máy chủ chưa xử lý được yêu cầu." : ((error as Error)?.message || "Yêu cầu không hợp lệ.");
    console.error(error);
    return reply(req, status, { ok: false, error: message });
  }
});
