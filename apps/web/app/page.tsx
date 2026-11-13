"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Orbit,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import AcademicWorkspace from "./academic-workspace";
import { request, Profile } from "../lib/api";
type View =
  | "dashboard"
  | "kelas"
  | "mahasiswa"
  | "mata-kuliah"
  | "presensi"
  | "nilai"
  | "integrasi" | "dosen" | "akun" | "krs" | "profil" | "riwayat" | "pengaturan" | "khs" | "transkrip";
type Summary = {
  students: number;
  lecturers: number;
  courses: number;
  classes: number;
  attendances: number;
  role: string;
};
type Course = { id: string; code: string; name: string; credits: number };
type ClassItem = {
  id: string;
  code: string;
  term: string;
  room: string;
  day: string;
  startsAt: string;
  course: Course;
  lecturer: { user: { name: string } };
  _count: { enrollments: number };
};
const menu: [View, typeof LayoutDashboard, string][] = [
  ["dashboard", LayoutDashboard, "Ringkasan"],
  ["kelas", CalendarDays, "Kelas & Jadwal"],
  ["mahasiswa", Users, "Mahasiswa"],
  ["mata-kuliah", BookOpen, "Mata Kuliah"],
  ["presensi", QrCode, "Presensi QR"],
  ["nilai", GraduationCap, "Nilai & KHS"],
  ["integrasi", Shield, "Neo Feeder"], ["khs", GraduationCap, "KHS Mahasiswa"], ["transkrip", GraduationCap, "Transkrip"],
  ["dosen", Users, "Manajemen Dosen"], ["akun", Shield, "Manajemen Akun"], ["krs", ClipboardCheck, "KRS / Peserta"], ["profil", GraduationCap, "Profil Akademik"], ["riwayat", ClipboardCheck, "Riwayat / Rekap Presensi"], ["pengaturan", Shield, "Ganti Password"],
];
export default function Home() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [qr, setQr] = useState("");
  const [qrExpiry, setQrExpiry] = useState("");
  const [code, setCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState(3);
  const [selectedClass, setSelectedClass] = useState("");
  const [meetingNum, setMeetingNum] = useState(1);
  const [feeder, setFeeder] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [gradeRows, setGradeRows] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [score, setScore] = useState(85);
  async function load(jwt: string, role: string) {
    try {
      const [s, cl, co] = await Promise.all([
        request<Summary>("/academic/summary", jwt),
        request<ClassItem[]>("/academic/classes", jwt),
        request<Course[]>("/academic/courses", jwt),
      ]);
      setSummary(s);
      setClasses(cl);
      setCourses(co);
      if (cl.length && !selectedClass) setSelectedClass(cl[0].id);
      if (role === "ADMIN") {
        const [st, le, feed] = await Promise.all([
          request<any[]>("/academic/students", jwt),
          request<any[]>("/academic/lecturers", jwt),
          request("/integrations/neo-feeder/status", jwt),
        ]);
        setStudents(st);
        setLecturers(le);
        setFeeder(feed);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const expired=()=>{localStorage.removeItem('orbit-token');localStorage.removeItem('orbit-user');setToken('');setUser(null);setView('dashboard');setError('Sesi berakhir. Silakan login kembali.');setTranscript(null);setGradeRows([]);};
    window.addEventListener('orbit-session-expired',expired);
    const t=localStorage.getItem('orbit-token');
    if(t)request<Profile>('/auth/me',t).then(p=>{setToken(t);setUser(p);load(t,p.role);}).catch(expired);
    return ()=>window.removeEventListener('orbit-session-expired',expired);
  }, []);
  useEffect(()=>{if(['nilai','transkrip'].includes(view)&&token)loadGrades();},[view,selectedClass,token]);
  async function loadGrades() {
    setError("");
    try {
      if (user?.role === "MAHASISWA") {
        setTranscript(await request("/grades/transcript/me", token));
      } else if (selectedClass) {
        setGradeRows(
          await request<any[]>(`/grades/class/${selectedClass}`, token),
        );
      }
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function saveGrade() {
    setError("");
    setNotice("");
    try {
      await request("/grades", token, {
        method: "POST",
        body: JSON.stringify({
          classId: selectedClass,
          studentId: selectedStudent,
          score: Number(score),
        }),
      });
      setNotice("Nilai berhasil disimpan");
      await loadGrades();
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await request<{ accessToken: string; user: Profile }>(
        "/auth/login",
        undefined,
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      setToken(r.accessToken);
      setUser(r.user);
      setView(r.user.mustChangePassword?"pengaturan":"dashboard");
      setPassword("");
      localStorage.setItem("orbit-token", r.accessToken);
      localStorage.setItem("orbit-user", JSON.stringify(r.user));
      await load(r.accessToken, r.user.role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    if(token) request("/auth/logout",token,{method:"POST"}).catch(()=>{});
    setView("dashboard");
    setClasses([]);setStudents([]);setLecturers([]);setTranscript(null);setGradeRows([]);
    localStorage.removeItem("orbit-token");
    localStorage.removeItem("orbit-user");
    setUser(null);
    setToken("");
    setQr("");
    setError("");
  }
  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await request("/academic/courses", token, {
        method: "POST",
        body: JSON.stringify({
          code,
          name: courseName,
          credits: Number(credits),
        }),
      });
      setNotice("Mata kuliah ditambahkan.");
      setCode("");
      setCourseName("");
      await load(token, user!.role);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function openQR() {
    setError("");
    setNotice("");
    try {
      const r = await request<{ qrPayload: string; expiresAt: string }>(
        "/attendance/open",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            classId: selectedClass,
            number: Number(meetingNum),
          }),
        },
      );
      setQr(await QRCode.toDataURL(r.qrPayload, { width: 255, margin: 2 }));
      setQrExpiry(new Date(r.expiresAt).toLocaleTimeString("id-ID"));
      setNotice("QR aktif selama 90 detik.");
    } catch (e: any) {
      setError(e.message);
    }
  }
  if (!user)
    return (
      <div className="loginwrap">
        <section className="loginart">
          <div className="brand">
            <div className="mark">✦</div>
            <span>
              campus<em>orbit.</em>
            </span>
          </div>
          <div className="eyebrow">THE NEW WAY TO CAMPUS</div>
          <h1>
            Kampus bergerak.
            <br />
            <span>Kamu melesat.</span>
          </h1>
          <p>
            Semua aktivitas akademik berada dalam satu orbit. Dari ruang kelas,
            presensi, hingga perjalanan studi berikutnya.
          </p>
          <div className="loginring" />
        </section>
        <section className="loginform">
          <div className="eyebrow">YOUR ACADEMIC SPACE</div>
          <h2>
            Selamat datang
            <br />
            kembali<span style={{ color: "#c9f571" }}>.</span>
          </h2>
          <p className="hint">
            Masuk menggunakan akun yang disiapkan administrator kampus.
          </p>
          <form onSubmit={login}>
            <div className="field">
              <label>Email akademik</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@kampus.ac.id"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
              />
            </div>
            {error && <div className="message error">{error}</div>}
            <button
              className="button"
              style={{ width: "100%" }}
              disabled={busy}
            >
              {busy ? "Memverifikasi..." : "Masuk ke Orbit →"}
            </button>
          </form>
          <p className="hint" style={{ marginTop: 28 }}>
            Portal demo pengembangan. Data contoh bukan data PDDikti.
          </p>
        </section>
      </div>
    );
  const stats = user.role !== "ADMIN" ? [
    {title:user.role==='DOSEN'?'Kelas Diampu':'Kelas Diambil',value:classes.length,icon:CalendarDays,delta:'Sesuai akun Anda'},
    {title:'SKS Terdaftar',value:classes.reduce((n,c)=>n+c.course.credits,0),icon:BookOpen,delta:'Seluruh kelas terdaftar'},
    {title:'Presensi',value:summary?.attendances??0,icon:ClipboardCheck,delta:user.role==='DOSEN'?'Pada kelas diampu':'Riwayat pribadi'},
    {title:'Peran Akun',value:user.role,icon:Shield,delta:'Ditentukan server'},
  ] : [
    {
      title: "Mahasiswa",
      value: summary?.students ?? "—",
      icon: Users,
      delta: "Data terdaftar",
    },
    {
      title: "Dosen",
      value: summary?.lecturers ?? "—",
      icon: GraduationCap,
      delta: "Pengajar aktif",
    },
    {
      title: "Mata kuliah",
      value: summary?.courses ?? "—",
      icon: BookOpen,
      delta: "Katalog akademik",
    },
    {
      title: "Presensi",
      value: summary?.attendances ?? "—",
      icon: ClipboardCheck,
      delta: "Total catatan",
    },
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">✦</div>
          <span>
            campus<em>orbit.</em>
          </span>
        </div>
        <div className="sidehint">WORKSPACE</div>
        <div className="navlist">
          {menu
            .filter(([v]) => user.role === 'ADMIN' ? !['profil','transkrip'].includes(v) : user.role === 'DOSEN' ? ['dashboard','kelas','krs','presensi','riwayat','nilai','pengaturan'].includes(v) : ['dashboard','profil','krs','kelas','riwayat','nilai','transkrip','pengaturan'].includes(v))
            .map(([id, Icon, name]) => (
              <button
                key={id}
                className={"navitem " + (view === id ? "active" : "")}
                onClick={() => {
                  setView(id);
                  setError("");
                  setNotice("");
                }}
              >
                <Icon size={18} />
                {user.role==='MAHASISWA'&&id==='dashboard'?'Dashboard Mahasiswa':user.role==='DOSEN'&&id==='dashboard'?'Dashboard Dosen':user.role==='DOSEN'&&id==='kelas'?'Jadwal Mengajar / Kelas Saya':user.role==='DOSEN'&&id==='krs'?'Daftar Peserta':user.role==='MAHASISWA'&&id==='kelas'?'Jadwal Kuliah':name}
              </button>
            ))}
        </div>
        <div className="sidebarfoot">
          <div style={{ color: "#c9f571", fontSize: 25 }}>✧</div>
          <strong>Make every semester count.</strong>
          <p>Akademik lebih jernih, satu langkah lebih maju.</p>
        </div>
        <button className="logout" onClick={logout}>
          <LogOut
            size={15}
            style={{ verticalAlign: "middle", marginRight: 8 }}
          />
          Keluar akun
        </button>
      </aside>
      <main className="body">
        <header className="topbar">
          <div className="bread">
            ORBIT / {view.toUpperCase().replace("-", " ")}
          </div>
          <div className="topright">
            <div className="pill">● &nbsp;{user.role}</div>
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="greeting">Halo, {user.name} 👋</div>
        <section className="hero">
          <div className="copy">
            <div className="eyebrow">CAMPUS OPERATING SYSTEM</div>
            <h1>
              {view === "dashboard"
                ? "Hari ini, awal dari sesuatu yang besar."
                : (
                    {
                      kelas: "Semua kelas dalam satu lintasan.",
                      mahasiswa: "Talenta kampus, masa depan kita.",
                      "mata-kuliah": "Belajar hal hebat dimulai di sini.",
                      presensi: "Hadir bukan sekadar angka.",
                      nilai: "Setiap pencapaian berarti.",
                      integrasi: "Data terhubung, keputusan cerdas.", dosen:"Pengajar hebat, kelas yang bermakna.",akun:"Akun kampus dalam satu orbit.",krs:"Rencanakan perjalanan studimu.",profil:"Identitas akademikmu.",riwayat:"Setiap kehadiran tercatat.",pengaturan:"Jaga keamanan akunmu.",khs:"Hasil studi dalam satu pandangan.",transkrip:"Jejak pencapaian akademikmu.",
                    } as any
                  )[view]}
            </h1>
            <p>
              Kelola perjalanan akademik dengan pengalaman yang lebih cepat,
              jelas, dan menyenangkan. Semua data bersumber dari API kampus.
            </p>
          </div>
          <div className="orbit" />
          <div className="ringtag">✦</div>
        </section>
        {user.mustChangePassword && <div className="message">Anda menggunakan password awal. Silakan ganti melalui Pengaturan Akun.</div>}
        {error && (
          <div className="message error">
            {error}{" "}
            <button
              style={{
                float: "right",
                background: "none",
                border: 0,
                color: "inherit",
              }}
              onClick={() => setError("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {notice && <div className="message">{notice}</div>}
        {view === "dashboard" && (
          <>
            <div className="sectionrow">
              <h2>Snapshot akademik</h2>
              <div className="muted">Semester berjalan · Live database</div>
            </div>
            <div className="stats">
              {stats.map((s) => (
                <div className="stat" key={s.title}>
                  <div className="iconbox">
                    <s.icon size={18} />
                  </div>
                  <div className="tiny">{s.title}</div>
                  <div className="num">{s.value}</div>
                  <div className="foot">{s.delta}</div>
                </div>
              ))}
            </div>
            <div className="sectionrow">
              <h2>Aktivitas perkuliahan</h2>
              <button className="button ghost" onClick={() => setView("kelas")}>
                Lihat semua{" "}
                <ChevronRight size={13} style={{ verticalAlign: "middle" }} />
              </button>
            </div>
            <div className="two">
              <div className="panel">
                <h3>Kelas dalam orbitmu</h3>
                {classes.length ? (
                  classes.slice(0, 5).map((c) => (
                    <div className="courseitem" key={c.id}>
                      <div className="coursemark">
                        {c.course.code.slice(0, 2)}
                      </div>
                      <div>
                        <strong>{c.course.name}</strong>
                        <p>
                          {c.code} · {c.day}, {c.startsAt} · {c.room}
                        </p>
                      </div>
                      <div className="right">{c.course.credits} SKS</div>
                    </div>
                  ))
                ) : (
                  <p className="hint">
                    Belum ada kelas. Administrator dapat menambahkan kelas
                    melalui menu Kelas & Jadwal.
                  </p>
                )}
              </div>
              <div className="panel">
                <h3>Orbit updates</h3>
                <div className="activity">
                  <strong>Dashboard sudah terhubung</strong>
                  <p>Angka di atas diambil langsung dari API.</p>
                </div>
                <div className="activity">
                  <strong>Presensi QR dinamis</strong>
                  <p>Token berlaku 90 detik dan diperiksa oleh server.</p>
                </div>
                <div className="activity">
                  <strong>Neo Feeder mode simulasi</strong>
                  <p>Integrasi resmi belum diaktifkan.</p>
                </div>
              </div>
            </div>
          </>
        )}
        {view === "kelas" && user.role !== "ADMIN" && (
          <>
            <div className="sectionrow">
              <h2>Daftar kelas</h2>
              <div className="muted">{classes.length} kelas terdeteksi</div>
            </div>
            <div className="panel tablewrap">
              <table className="datatable">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Mata kuliah</th>
                    <th>Dosen</th>
                    <th>Jadwal</th>
                    <th>Ruang</th>
                    <th>Peserta</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="chip">{c.code}</span>
                      </td>
                      <td>
                        <strong>{c.course.name}</strong>
                        <div className="muted">{c.term}</div>
                      </td>
                      <td>{c.lecturer.user.name}</td>
                      <td>
                        {c.day} · {c.startsAt}
                      </td>
                      <td>{c.room}</td>
                      <td>{c._count.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!classes.length && (
                <p className="hint">Belum ada kelas terdaftar.</p>
              )}
            </div>
          </>
        )}
        {(["mahasiswa","dosen","akun","mata-kuliah","krs","profil","riwayat","pengaturan","khs"].includes(view)||(view==="kelas"&&user.role==="ADMIN"))&&<AcademicWorkspace key={view} view={view} token={token} user={user} onChange={()=>load(token,user.role)}/>}
        {view === "presensi" && (
          <>
            <div className="sectionrow">
              <h2>Presensi QR</h2>
              <span className="muted">QR aman dengan token sementara</span>
            </div>
            <div className="two">
              <div className="panel">
                <h3>Buka sesi presensi</h3>
                <p className="hint">
                  Dosen membuka pertemuan, mahasiswa memindai QR menggunakan
                  aplikasi Android.
                </p>
                <div className="field">
                  <label>Kelas</label>
                  <select
                    className="input"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Pertemuan ke-</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={meetingNum}
                    onChange={(e) => setMeetingNum(Number(e.target.value))}
                  />
                </div>
                <button
                  className="button"
                  disabled={!selectedClass}
                  onClick={openQR}
                >
                  Generate QR{" "}
                  <QrCode size={15} style={{ verticalAlign: "middle" }} />
                </button>
              </div>
              <div className="panel" style={{ textAlign: "center" }}>
                <h3>QR sesi aktif</h3>
                {qr ? (
                  <>
                    <div className="qrbox">
                      <img
                        src={qr}
                        width={220}
                        height={220}
                        alt="QR Presensi"
                      />
                    </div>
                    <p className="hint">Berlaku sampai {qrExpiry}</p>
                  </>
                ) : (
                  <div style={{ padding: "55px 12px", color: "#73829b" }}>
                    <ScanLine size={55} style={{ margin: "auto" }} />
                    <p>QR akan muncul di sini.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {(view === "nilai"||view==="transkrip") && (
          <>
            <div className="sectionrow">
              <h2>Nilai & transkrip akademik</h2>
              <button className="button ghost" onClick={loadGrades}>
                Muat data nilai
              </button>
            </div>
            {user.role === "MAHASISWA" ? (
              <div className="panel">
                <h3>KHS & Transkrip</h3>
                <p className="hint">
                  Hasil mata kuliah yang telah dinilai. Bobot mengikuti konfigurasi
                  penilaian server; mata kuliah tanpa nilai tidak dihitung.
                </p>
                {transcript ? (
                  <>
                    <div className="stats" style={{ marginBottom: 18 }}>
                      <div className="stat">
                        <div className="tiny">IPK</div>
                        <div className="num">{transcript.gpa ?? "—"}</div>
                      </div>
                      <div className="stat">
                        <div className="tiny">SKS dinilai</div>
                        <div className="num">{transcript.totalCredits}</div>
                      </div>
                    </div>
                    {transcript.terms?.map((t:any)=><p key={t.term}>KHS {t.term}: IPS {t.gpa ?? "—"} · {t.credits} SKS</p>)}
                    <p className="hint">{transcript.repeatPolicy}</p>
                    <div className="tablewrap">
                      <table className="datatable">
                        <thead>
                          <tr>
                            <th>Mata kuliah</th>
                            <th>Semester</th>
                            <th>SKS</th>
                            <th>Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transcript.rows.map((g: any) => (
                            <tr key={g.code + g.term}>
                              <td>{g.course}</td>
                              <td>{g.term}</td>
                              <td>{g.credits}</td>
                              <td>
                                <span className="chip">
                                  {g.letter} ({g.score})
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="hint">
                    Klik Muat data nilai untuk melihat transkrip.
                  </p>
                )}
              </div>
            ) : (
              <div className="two">
                <div className="panel">
                  <h3>Nilai peserta</h3>
                  <div className="field">
                    <label>Kelas</label>
                    <select
                      className="input"
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setGradeRows([]);
                        setSelectedStudent("");
                      }}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course.name} · {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="button ghost" onClick={loadGrades}>
                    Lihat peserta
                  </button>
                  {gradeRows.map((r) => (
                    <div className="courseitem" key={r.id}>
                      <div>
                        <strong>{r.student.user.name}</strong>
                        <p>{r.student.nim}</p>
                      </div>
                      <div className="right">
                        {r.grade?.letter ?? "Belum dinilai"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <h3>Input nilai akhir</h3>
                  <p className="hint">
                    Hanya dosen pengampu atau administrator yang berwenang.
                  </p>
                  <div className="field">
                    <label>Peserta</label>
                    <select
                      className="input"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                      <option value="">Pilih mahasiswa</option>
                      {gradeRows.map((r) => (
                        <option key={r.studentId} value={r.studentId}>
                          {r.student.nim} · {r.student.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Nilai akhir (0-100)</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                    />
                  </div>
                  <button
                    className="button"
                    disabled={!selectedStudent}
                    onClick={saveGrade}
                  >
                    Simpan nilai
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {view === "integrasi" && (
          <>
            <div className="sectionrow">
              <h2>Integrasi eksternal</h2>
            </div>
            <div className="panel">
              <div className="eyebrow">NEO FEEDER</div>
              <h3 style={{ marginTop: 12 }}>Simulasi PDDikti</h3>
              <p className="hint">
                Koneksi resmi belum tersedia. Adapter mock aktif hanya untuk
                pengembangan dan tidak mengandung data mahasiswa asli.
              </p>
              <div className="chip">
                {feeder?.mode || "MOCK"} · NOT CONNECTED
              </div>
            </div>
          </>
        )}
        <div className="muted" style={{ textAlign: "center", marginTop: 45 }}>
          CAMPUS ORBIT © 2026 · Crafted for a smarter campus · Data demo tidak
          resmi
        </div>
      </main>
    </div>
  );
}
