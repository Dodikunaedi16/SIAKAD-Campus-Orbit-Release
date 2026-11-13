import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:google_fonts/google_fonts.dart';

const lime = Color(0xFFC9F571);
const background = Color(0xFF0A1020);
const surface = Color(0xFF18233A);
const textMuted = Color(0xFFA5B0C8);
const apiBase = String.fromEnvironment('API_BASE',
    defaultValue: 'http://10.0.2.2:3000/api/v1');
const storage = FlutterSecureStorage();
final navigatorKey = GlobalKey<NavigatorState>();
void main() => runApp(const CampusOrbit());

class CampusOrbit extends StatelessWidget {
  const CampusOrbit({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Campus Orbit',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: background,
          colorScheme: ColorScheme.fromSeed(
              seedColor: lime, brightness: Brightness.dark),
          textTheme: GoogleFonts.dmSansTextTheme(ThemeData.dark().textTheme),
          useMaterial3: true),
      home: const EntryPage());
}

class OrbitApi {
  String token = '';
  Future<dynamic> call(String path,
      {String method = 'GET', Map<String, dynamic>? data}) async {
    final response = http.Request(method, Uri.parse('$apiBase$path'));
    response.headers.addAll({
      'Content-Type': 'application/json',
      if (token.isNotEmpty) 'Authorization': 'Bearer $token'
    });
    if (data != null) response.body = jsonEncode(data);
    final streamed = await response.send().timeout(const Duration(seconds: 15));
    final result = await http.Response.fromStream(streamed);
    final body = jsonDecode(result.body.isEmpty ? '{}' : result.body);
    if (result.statusCode == 401 && token.isNotEmpty) {
      token = '';
      await storage.delete(key: 'orbit_jwt');
      navigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const EntryPage()), (_) => false);
    }
    if (result.statusCode >= 400)
      throw Exception(body is Map
          ? (body['message'] ?? 'Permintaan gagal').toString()
          : 'Permintaan gagal');
    return body;
  }
}

final api = OrbitApi();

class EntryPage extends StatefulWidget {
  const EntryPage({super.key});
  @override
  State<EntryPage> createState() => _EntryPageState();
}

class _EntryPageState extends State<EntryPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String message = '';
  @override
  void initState() {
    super.initState();
    restore();
  }

  Future<void> restore() async {
    final t = await storage.read(key: 'orbit_jwt');
    if (t == null) return;
    api.token = t;
    try {
      final u = await api.call('/auth/me');
      if (mounted)
        Navigator.pushReplacement(
            context,
            MaterialPageRoute(
                builder: (_) => MainPage(user: Map<String, dynamic>.from(u))));
    } catch (_) {
      await storage.delete(key: 'orbit_jwt');
    }
  }

  Future<void> login() async {
    setState(() {
      busy = true;
      message = '';
    });
    try {
      final r = await api.call('/auth/login',
          method: 'POST',
          data: {'email': email.text.trim(), 'password': password.text});
      api.token = r['accessToken'];
      await storage.write(key: 'orbit_jwt', value: api.token);
      if (mounted)
        Navigator.pushReplacement(
            context,
            MaterialPageRoute(
                builder: (_) =>
                    MainPage(user: Map<String, dynamic>.from(r['user']))));
    } catch (e) {
      setState(() => message = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: SafeArea(
          child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 35),
                    const Brand(),
                    const Spacer(),
                    const Text('YOUR ACADEMIC SPACE',
                        style: TextStyle(
                            color: lime,
                            letterSpacing: 2,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 14),
                    Text('Semua langkah,\nsatu orbit.',
                        style: GoogleFonts.spaceGrotesk(
                            fontSize: 42,
                            fontWeight: FontWeight.w700,
                            height: 1.05)),
                    const SizedBox(height: 12),
                    const Text('Masuk dan lanjutkan perjalanan akademikmu.',
                        style: TextStyle(color: textMuted)),
                    const SizedBox(height: 32),
                    TextField(
                        controller: email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: decoration('Email akademik')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: password,
                        obscureText: true,
                        decoration: decoration('Password')),
                    if (message.isNotEmpty)
                      Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(message,
                              style: const TextStyle(color: Colors.redAccent))),
                    const SizedBox(height: 18),
                    FilledButton(
                        style: FilledButton.styleFrom(
                            backgroundColor: lime,
                            foregroundColor: background,
                            minimumSize: const Size(double.infinity, 52)),
                        onPressed: busy ? null : login,
                        child: Text(
                            busy ? 'Menghubungkan...' : 'Masuk ke Orbit →',
                            style:
                                const TextStyle(fontWeight: FontWeight.w800))),
                    const Spacer(),
                    const Text('CAMPUS ORBIT · PORTAL AKADEMIK',
                        style: TextStyle(
                            letterSpacing: 2, color: textMuted, fontSize: 10))
                  ]))));
}

InputDecoration decoration(String label) => InputDecoration(
    labelText: label,
    filled: true,
    fillColor: surface,
    border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.all(17));

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: lime, borderRadius: BorderRadius.circular(12)),
            child: const Text('✦',
                style: TextStyle(color: background, fontSize: 26))),
        const SizedBox(width: 12),
        Text('campus',
            style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.w700, fontSize: 23)),
        Text('orbit.',
            style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.w700, fontSize: 23, color: lime))
      ]);
}

class MainPage extends StatefulWidget {
  final Map<String, dynamic> user;
  const MainPage({super.key, required this.user});
  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  int tab = 0;
  Map<String, dynamic>? summary;
  List<dynamic> classes = [];
  List<dynamic> attendance = [];
  String error = '';
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final s = await api.call('/academic/summary');
      final c = await api.call('/academic/classes');
      if (mounted)
        setState(() {
          summary = Map<String, dynamic>.from(s);
          classes = List<dynamic>.from(c);
          error = '';
        });
      if (widget.user['role'] == 'MAHASISWA') {
        final r = await api.call('/attendance/mine');
        if (mounted) setState(() => attendance = List<dynamic>.from(r));
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await api.call('/auth/logout', method: 'POST');
    } catch (_) {}
    await storage.delete(key: 'orbit_jwt');
    api.token = '';
    if (mounted)
      Navigator.pushAndRemoveUntil(context,
          MaterialPageRoute(builder: (_) => const EntryPage()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final isStudent = widget.user['role'] == 'MAHASISWA';
    return Scaffold(
        appBar: AppBar(
            toolbarHeight: 74,
            title: const Brand(),
            backgroundColor: background,
            actions: [
              IconButton(
                  tooltip: 'Akademik dan akun',
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => AcademicPage(user: widget.user))),
                  icon: const Icon(Icons.school)),
              IconButton(onPressed: logout, icon: const Icon(Icons.logout))
            ]),
        body: SafeArea(
            child: RefreshIndicator(
                onRefresh: load,
                child: ListView(
                    padding: const EdgeInsets.fromLTRB(22, 16, 22, 25),
                    children: [
                      Text(
                          'HALO, ${(widget.user['name'] ?? 'KAMU').toString().toUpperCase()} ✦',
                          style: const TextStyle(
                              color: lime,
                              fontSize: 12,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Text(
                          tab == 0
                              ? 'Kampusmu.\nSatu orbit.'
                              : tab == 1
                                  ? 'Jadwal &\nkelas kamu.'
                                  : 'Presensi\ndigital.',
                          style: GoogleFonts.spaceGrotesk(
                              fontSize: 36,
                              fontWeight: FontWeight.w700,
                              height: 1.1)),
                      const SizedBox(height: 24),
                      if (error.isNotEmpty)
                        Text(error,
                            style: const TextStyle(color: Colors.redAccent)),
                      if (tab == 0) ...[
                        Container(
                            padding: const EdgeInsets.all(22),
                            decoration: BoxDecoration(
                                color: surface,
                                borderRadius: BorderRadius.circular(24)),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('SEMESTER AKTIF',
                                      style: TextStyle(
                                          color: lime,
                                          letterSpacing: 2,
                                          fontSize: 11)),
                                  const SizedBox(height: 12),
                                  Text(
                                      '${summary?['classes'] ?? '...'} Kelas aktif',
                                      style: GoogleFonts.spaceGrotesk(
                                          fontSize: 29,
                                          fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 6),
                                  const Text(
                                      'Belajar tanpa batas, mulai dari sini.',
                                      style: TextStyle(color: textMuted))
                                ])),
                        const SizedBox(height: 20),
                        const Text('Jadwal terbaru',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        ...classes.take(4).map((c) => ClassTile(data: c)),
                        if (classes.isEmpty)
                          const Text('Belum ada kelas',
                              style: TextStyle(color: textMuted))
                      ],
                      if (tab == 1) ...[
                        ...classes.map((c) => ClassTile(data: c)),
                        if (classes.isEmpty)
                          const Text('Belum ada jadwal',
                              style: TextStyle(color: textMuted))
                      ],
                      if (tab == 2) ...[
                        if (isStudent) ...[
                          const Text(
                              'Pindai QR yang ditampilkan dosen untuk mencatat kehadiran.',
                              style: TextStyle(color: textMuted)),
                          const SizedBox(height: 15),
                          FilledButton.icon(
                              onPressed: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (_) => const ScannerPage())),
                              icon: const Icon(Icons.qr_code_scanner),
                              label: const Text('Buka kamera pemindai'),
                              style: FilledButton.styleFrom(
                                  backgroundColor: lime,
                                  foregroundColor: background,
                                  minimumSize:
                                      const Size(double.infinity, 52))),
                          const SizedBox(height: 20),
                          const Text('Riwayat presensi',
                              style: TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold)),
                          ...attendance.map((a) => Card(
                              color: surface,
                              child: ListTile(
                                  title: Text(a['meeting']?['class']?['course']
                                          ?['name'] ??
                                      'Pertemuan'),
                                  subtitle: Text(
                                      'Pertemuan ${a['meeting']?['number'] ?? '-'}'),
                                  trailing: const Icon(Icons.check_circle,
                                      color: lime))))
                        ] else ...[
                          const Text('Pilih kelas untuk membuka QR pertemuan.',
                              style: TextStyle(color: textMuted)),
                          ...classes.map((c) => Card(
                              color: surface,
                              child: ListTile(
                                  title: Text(c['course']?['name'] ?? ''),
                                  subtitle: Text(c['code'] ?? ''),
                                  trailing:
                                      const Icon(Icons.qr_code, color: lime),
                                  onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                          builder: (_) =>
                                              QrSessionPage(clazz: c))))))
                        ]
                      ]
                    ]))),
        bottomNavigationBar: NavigationBar(
            backgroundColor: surface,
            selectedIndex: tab,
            indicatorColor: lime.withValues(alpha: .2),
            onDestinationSelected: (i) => setState(() => tab = i),
            destinations: const [
              NavigationDestination(
                  icon: Icon(Icons.grid_view_rounded), label: 'Beranda'),
              NavigationDestination(
                  icon: Icon(Icons.calendar_month), label: 'Kelas'),
              NavigationDestination(
                  icon: Icon(Icons.qr_code_scanner), label: 'Presensi')
            ]));
  }
}

class ClassTile extends StatelessWidget {
  final dynamic data;
  const ClassTile({super.key, required this.data});
  @override
  Widget build(BuildContext context) => Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: surface, borderRadius: BorderRadius.circular(17)),
      child: Row(children: [
        Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: const Color(0xFF34315A),
                borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.auto_stories, color: Color(0xFFC7B7FF))),
        const SizedBox(width: 13),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(data['course']?['name'] ?? 'Kelas',
              style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 5),
          Text(
              '${data['day'] ?? ''} · ${data['startsAt'] ?? ''} · ${data['room'] ?? ''}',
              style: const TextStyle(color: textMuted, fontSize: 12))
        ])),
        const Icon(Icons.chevron_right, color: textMuted)
      ]));
}

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  bool processing = false;
  String message = '';
  Future<void> scan(String value) async {
    if (processing || !value.startsWith('ORBIT:')) return;
    setState(() => processing = true);
    try {
      await api
          .call('/attendance/scan', method: 'POST', data: {'token': value});
      if (mounted) setState(() => message = 'Presensi berhasil disimpan ✓');
    } catch (e) {
      if (mounted)
        setState(() => message = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(
          title: const Text('Scan presensi'), backgroundColor: background),
      body: Column(children: [
        Expanded(child: MobileScanner(onDetect: (capture) {
          for (final code in capture.barcodes) {
            final value = code.rawValue;
            if (value != null) scan(value);
          }
        })),
        Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
                message.isEmpty ? 'Arahkan kamera ke QR dosen' : message,
                style:
                    const TextStyle(color: lime, fontWeight: FontWeight.bold)))
      ]));
}

class QrSessionPage extends StatefulWidget {
  final dynamic clazz;
  const QrSessionPage({super.key, required this.clazz});
  @override
  State<QrSessionPage> createState() => _QrSessionPageState();
}

class _QrSessionPageState extends State<QrSessionPage> {
  int number = 1;
  String payload = '';
  String info = '';
  Future<void> create() async {
    try {
      final r = await api.call('/attendance/open',
          method: 'POST',
          data: {'classId': widget.clazz['id'], 'number': number});
      setState(() {
        payload = r['qrPayload'];
        info = 'QR berlaku hingga ${r['expiresAt']}';
      });
    } catch (e) {
      setState(() => info = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('QR perkuliahan')),
      body: Padding(
          padding: const EdgeInsets.all(22),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.clazz['course']?['name'] ?? 'Kelas',
                style: GoogleFonts.spaceGrotesk(
                    fontSize: 26, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextField(
                keyboardType: TextInputType.number,
                decoration: decoration('Pertemuan ke-'),
                onChanged: (v) => number = int.tryParse(v) ?? 1),
            const SizedBox(height: 12),
            FilledButton(onPressed: create, child: const Text('Generate QR')),
            const SizedBox(height: 25),
            if (payload.isNotEmpty)
              Center(
                  child: Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(18),
                      child: QrImageView(data: payload, size: 220))),
            const SizedBox(height: 15),
            Text(info, style: const TextStyle(color: textMuted))
          ])));
}

class AcademicPage extends StatefulWidget {
  final Map<String, dynamic> user;
  const AcademicPage({super.key, required this.user});
  @override
  State<AcademicPage> createState() => _AcademicPageState();
}

class _AcademicPageState extends State<AcademicPage> {
  Map<String, dynamic>? profile, transcript;
  List<dynamic> enrollments = [], available = [];
  String message = '';
  bool busy = false;
  final oldPassword = TextEditingController(),
      newPassword = TextEditingController();
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    oldPassword.dispose();
    newPassword.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final p = await api.call('/academic/profile');
      if (widget.user['role'] == 'MAHASISWA') {
        final k = await api.call('/academic/enrollments');
        final c = await api.call('/academic/available-classes');
        final t = await api.call('/grades/transcript/me');
        if (mounted)
          setState(() {
            profile = Map<String, dynamic>.from(p);
            enrollments = List<dynamic>.from(k);
            available = List<dynamic>.from(c);
            transcript = Map<String, dynamic>.from(t);
          });
      } else {
        if (mounted) setState(() => profile = Map<String, dynamic>.from(p));
      }
    } catch (e) {
      if (mounted) setState(() => message = e.toString());
    }
  }

  Future<void> enroll(String classId) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await api.call('/academic/enrollments',
          method: 'POST', data: {'classId': classId});
      await load();
      if (mounted) setState(() => message = 'KRS tersimpan');
    } catch (e) {
      if (mounted) setState(() => message = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> changePassword() async {
    if (newPassword.text.length < 12 || newPassword.text.length > 72) {
      setState(() => message = 'Password baru harus 12–72 karakter');
      return;
    }
    setState(() => busy = true);
    try {
      await api.call('/auth/password', method: 'POST', data: {
        'currentPassword': oldPassword.text,
        'newPassword': newPassword.text
      });
      await storage.delete(key: 'orbit_jwt');
      api.token = '';
      navigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const EntryPage()), (_) => false);
    } catch (e) {
      if (mounted) setState(() => message = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Akademik & Akun')),
      body: RefreshIndicator(
          onRefresh: load,
          child: ListView(padding: const EdgeInsets.all(22), children: [
            if (message.isNotEmpty)
              Text(message, style: const TextStyle(color: lime)),
            Text(
                widget.user['role'] == 'MAHASISWA'
                    ? 'Profil Akademik'
                    : 'Akun Dosen',
                style:
                    const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text(profile?['user']?['name'] ?? widget.user['name'] ?? ''),
            Text(profile?['nim'] ?? profile?['nidn'] ?? ''),
            Text(profile?['program'] ?? ''),
            if (widget.user['role'] == 'MAHASISWA') ...[
              const SizedBox(height: 22),
              const Text('KRS · Status pengambilan',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              ...enrollments.map((e) => Card(
                  color: surface,
                  child: ListTile(
                      title: Text(e['class']['course']['name']),
                      subtitle: Text(
                          '${e['class']['term']} · ${e['class']['course']['credits']} SKS · Terdaftar')))),
              if (enrollments.isEmpty) const Text('Belum mengambil kelas'),
              const SizedBox(height: 15),
              const Text('Kelas tersedia', style: TextStyle(fontSize: 18)),
              ...available
                  .where(
                      (c) => !enrollments.any((e) => e['classId'] == c['id']))
                  .map((c) => Card(
                      color: surface,
                      child: ListTile(
                          title: Text(c['course']['name']),
                          subtitle: Text(
                              '${c['term']} · ${c['day']} ${c['startsAt']} · ${c['course']['credits']} SKS'),
                          trailing: TextButton(
                              onPressed: busy ? null : () => enroll(c['id']),
                              child: const Text('Ambil'))))),
              const SizedBox(height: 22),
              Text('KHS & Transkrip · IPK ${transcript?['gpa'] ?? "—"}',
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.bold)),
              ...(transcript?['terms'] as List<dynamic>? ?? []).map((t) =>
                  Text('${t['term']} · IPS ${t['gpa']} · ${t['credits']} SKS')),
              ...(transcript?['rows'] as List<dynamic>? ?? []).map((g) => Card(
                  color: surface,
                  child: ListTile(
                      title: Text(g['course']),
                      subtitle: Text('${g['term']} · ${g['credits']} SKS'),
                      trailing: Text('${g['letter']} (${g['score']})'))))
            ],
            const SizedBox(height: 25),
            const Text('Ganti password',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Text('Setelah password diganti, silakan login kembali.',
                style: TextStyle(color: textMuted)),
            const SizedBox(height: 12),
            TextField(
                controller: oldPassword,
                obscureText: true,
                decoration: decoration('Password saat ini')),
            const SizedBox(height: 12),
            TextField(
                controller: newPassword,
                obscureText: true,
                decoration: decoration('Password baru (12–72 karakter)')),
            const SizedBox(height: 12),
            FilledButton(
                onPressed: busy ? null : changePassword,
                child: const Text('Ganti password'))
          ])));
}
