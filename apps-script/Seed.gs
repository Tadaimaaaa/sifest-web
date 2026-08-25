function seedPanitia() {
  const ss = Utils.getSpreadsheet();
  const usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) return 'Sheet Users tidak ditemukan!';

  const rolesSheet = ss.getSheetByName('Roles');
  if (rolesSheet) {
    if (rolesSheet.getLastRow() <= 3) {
      rolesSheet.appendRow(['ROLE-004', 'PANITIA', 'Panitia / Anggota', 'Akses standar kepanitiaan', 'ACTIVE']);
      rolesSheet.appendRow(['ROLE-005', 'DOSEN', 'Dosen / Pembina', 'Akses pantau', 'ACTIVE']);
    }
  }

  const salt = 'salt123';
  // Password default: sifest2026
  const passHash = Utils.hashPassword('sifest2026', salt);

  const data = [
    [
      Utils.generateId('USR'), 'Dr. Rini Sovia, S.Kom, M.Kom', '', 'dr953', 
      passHash, salt, 'dr953@sifest.com', '', 'Pelindung', 'Dekan FILKOM', 'ROLE-005', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Hadi Syahputra, S.Kom, M.Kom', '', 'hadi862', 
      passHash, salt, 'hadi862@sifest.com', '', 'Penasihat', 'Wakil Dekan III FILKOM', 'ROLE-005', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Dr. Eva Rianti, S.Kom, M.Kom', '', 'dr929', 
      passHash, salt, 'dr929@sifest.com', '', 'Pembina', 'Ka. Prodi Sistem Informasi', 'ROLE-005', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Farras Amar Zaim Fasha Khoeroni', '23101152610332', 'farras332', 
      passHash, salt, 'farras332@sifest.com', '', 'Steering Committee', 'Bupati', 'ROLE-002', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Ahlazzikri Azamuddin', '23101152610322', 'ahlazzikri322', 
      passHash, salt, 'ahlazzikri322@sifest.com', '', 'Steering Committee', 'Wakil Bupati', 'ROLE-002', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Angelicca Rehuel Saphira', '23101152610165', 'angelicca165', 
      passHash, salt, 'angelicca165@sifest.com', '', 'Steering Committee', 'Sekretaris Umum', 'ROLE-002', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Fasya Maida Elvina', '24101152610012', 'fasya012', 
      passHash, salt, 'fasya012@sifest.com', '', 'Steering Committee', 'Bendahara Umum', 'ROLE-002', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Neil Firdaus', '24101152610176', 'neil176', 
      passHash, salt, 'neil176@sifest.com', '', 'Organazing Committee', 'Penanggung Jawab Proker', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Dilan Afri Jones', '22101152610011', 'dilan011', 
      passHash, salt, 'dilan011@sifest.com', '', 'Organazing Committee', 'Ketua Pelaksana Proker', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Helsi Serlina Aprila Saputri', '24101152610054', 'helsi054', 
      passHash, salt, 'helsi054@sifest.com', '', 'Organazing Committee', 'Sekretaris', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Zhara Delvia Putri', '24101152610261', 'zhara261', 
      passHash, salt, 'zhara261@sifest.com', '', 'Organazing Committee', 'Bendahara', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Fachratun Rahima', '25101152610292', 'fachratun292', 
      passHash, salt, 'fachratun292@sifest.com', '', 'Organazing Committee', 'Bendahara', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Reifan Mardatilla', '24101152610069', 'reifan069', 
      passHash, salt, 'reifan069@sifest.com', '', 'Divisi Kesekretariatan', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Hanafi Nur Imansyah', '25101152610089', 'hanafi089', 
      passHash, salt, 'hanafi089@sifest.com', '', 'Divisi Kesekretariatan', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Muhammad Ahda Ahlieya Akbar', '25101152610097', 'muhammad097', 
      passHash, salt, 'muhammad097@sifest.com', '', 'Divisi Kesekretariatan', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Zaskia Lestari', '25101152610361', 'zaskia361', 
      passHash, salt, 'zaskia361@sifest.com', '', 'Divisi Kesekretariatan', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Rindu Rahma Aulia', '25101152610305', 'rindu305', 
      passHash, salt, 'rindu305@sifest.com', '', 'Divisi Kesekretariatan', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Faradiva Putri', '22101152610429', 'faradiva429', 
      passHash, salt, 'faradiva429@sifest.com', '', 'Divisi Kesekretariatan', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Dimas Ade Putra', '24101152610233', 'dimas233', 
      passHash, salt, 'dimas233@sifest.com', '', 'Divisi Acara Inti', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Febrila Mardatrisna', '25101152610295', 'febrila295', 
      passHash, salt, 'febrila295@sifest.com', '', 'Divisi Acara Inti', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Naila Fauziah', '24101152610249', 'naila249', 
      passHash, salt, 'naila249@sifest.com', '', 'Divisi Acara Inti', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Raditya Al Qardhawi', '24101152610315', 'raditya315', 
      passHash, salt, 'raditya315@sifest.com', '', 'Divisi Humas', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Habibi Abdullah Hulwe', '24101152610164', 'habibi164', 
      passHash, salt, 'habibi164@sifest.com', '', 'Divisi Humas', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Try Anggara Yofa', '24101152610222', 'try222', 
      passHash, salt, 'try222@sifest.com', '', 'Divisi Humas', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Aulia Angie Anugrah', '25101152610325', 'aulia325', 
      passHash, salt, 'aulia325@sifest.com', '', 'Divisi Humas', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Asyifa Ray Yanaf', '25101152610324', 'asyifa324', 
      passHash, salt, 'asyifa324@sifest.com', '', 'Divisi Humas', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Okta Khairul Ramadhan', '24101152610177', 'okta177', 
      passHash, salt, 'okta177@sifest.com', '', 'Divisi Logistik', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Fathir Febrian R', '25101152610055', 'fathir055', 
      passHash, salt, 'fathir055@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Muhammad Adib', '25101152610222', 'muhammad222', 
      passHash, salt, 'muhammad222@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Ardian Gunawan', '25101152610200', 'ardian200', 
      passHash, salt, 'ardian200@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Daffa Arif Akbar', '25101152610008', 'daffa008', 
      passHash, salt, 'daffa008@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'M. Fachrouzy Novemjasta', '25101152610216', 'm216', 
      passHash, salt, 'm216@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Najwa Syauqi Lianoz', '23101152610307', 'najwa307', 
      passHash, salt, 'najwa307@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Nayshilla Maori Devandra', '25101152610345', 'nayshilla345', 
      passHash, salt, 'nayshilla345@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Alya Yumi Khalisa', '25101152610284', 'alya284', 
      passHash, salt, 'alya284@sifest.com', '', 'Divisi Logistik', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Salsabila Amanda', '24101152610071', 'salsabila071', 
      passHash, salt, 'salsabila071@sifest.com', '', 'Divisi Medis', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Miqdad Al Mahdi', '25101152610219', 'miqdad219', 
      passHash, salt, 'miqdad219@sifest.com', '', 'Divisi Medis', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Fajar Akbar', '25101152610126', 'fajar126', 
      passHash, salt, 'fajar126@sifest.com', '', 'Divisi Medis', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Aqilah Kaskia', '24101152610045', 'aqilah045', 
      passHash, salt, 'aqilah045@sifest.com', '', 'Divisi Medis', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Feni Deska Yandra', '25101152610328', 'feni328', 
      passHash, salt, 'feni328@sifest.com', '', 'Divisi Medis', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Rizky Dwi Darmawan', '24101152610256', 'rizky256', 
      passHash, salt, 'rizky256@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Koordinator', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Ahmad Fauzi Baehaqi', '25101152610083', 'ahmad083', 
      passHash, salt, 'ahmad083@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Hafizh Meldy Rantisi', '24101152610305', 'hafizh305', 
      passHash, salt, 'hafizh305@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'M. Rafli Hamdi', '24101152610095', 'm095', 
      passHash, salt, 'm095@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Nikesha Primaputri Faryl', '24101152610250', 'nikesha250', 
      passHash, salt, 'nikesha250@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Aisysifa Dwiyanti', '25101152610280', 'aisysifa280', 
      passHash, salt, 'aisysifa280@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Syahla Nafisah Arisma', '25101152610358', 'syahla358', 
      passHash, salt, 'syahla358@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Susan Nashwa Hanoon', '25101152610356', 'susan356', 
      passHash, salt, 'susan356@sifest.com', '', 'Divisi Publikasi dan Dokumentasi', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Zaki Fadlurrahaman', '25101152610114', 'zaki114', 
      passHash, salt, 'zaki114@sifest.com', '', 'Event MTQ', 'Ketua Pelaksana', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Indah Sri Yuliwarti', '24101152610277', 'indah277', 
      passHash, salt, 'indah277@sifest.com', '', 'Event MTQ', 'Sekretaris dan Bendahara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Waala Munafsi', '25101152610110', 'waala110', 
      passHash, salt, 'waala110@sifest.com', '', 'Event MTQ', 'Koordinator Acara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Prima Halip A. H', '25101152610188', 'prima188', 
      passHash, salt, 'prima188@sifest.com', '', 'Event MTQ', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Ivory Najwa Syaufani', '24101152610167', 'ivory167', 
      passHash, salt, 'ivory167@sifest.com', '', 'Event MTQ', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Alif Fathul Ataulah', '22101152610127', 'alif127', 
      passHash, salt, 'alif127@sifest.com', '', 'Event Bazar Ekonomi Kreatif', 'Ketua Pelaksana', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Zahwa Alwa Khairani', '25101152610320', 'zahwa320', 
      passHash, salt, 'zahwa320@sifest.com', '', 'Event Bazar Ekonomi Kreatif', 'Sekretaris dan Bendahara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Muhammad Aqil', '25101152610067', 'muhammad067', 
      passHash, salt, 'muhammad067@sifest.com', '', 'Event Bazar Ekonomi Kreatif', 'Koordinator Acara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Saskia Aprilia Putri', '25101152610307', 'saskia307', 
      passHash, salt, 'saskia307@sifest.com', '', 'Event Bazar Ekonomi Kreatif', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Mailisya Zahara Rab Yusna', '25101152610339', 'mailisya339', 
      passHash, salt, 'mailisya339@sifest.com', '', 'Event Bazar Ekonomi Kreatif', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Kevin Reviano Darma Putra', '24101152610309', 'kevin309', 
      passHash, salt, 'kevin309@sifest.com', '', 'Event Turnamen Futsal', 'Ketua Pelaksana', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Sefiolla Saputri', '25101152610352', 'sefiolla352', 
      passHash, salt, 'sefiolla352@sifest.com', '', 'Event Turnamen Futsal', 'Sekretaris dan Bendahara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Muhammad Rafadil Nafischi', '25101152610227', 'muhammad227', 
      passHash, salt, 'muhammad227@sifest.com', '', 'Event Turnamen Futsal', 'Koordinator Acara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Anggian Doli Pratama Hutapea', '25101152610199', 'anggian199', 
      passHash, salt, 'anggian199@sifest.com', '', 'Event Turnamen Futsal', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Wahyu Febrian Wiratama', '23101152610438', 'wahyu438', 
      passHash, salt, 'wahyu438@sifest.com', '', 'Event Seminar Nasional', 'Ketua Pelaksana', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Dinda Fadillah C', '24101152610048', 'dinda048', 
      passHash, salt, 'dinda048@sifest.com', '', 'Event Seminar Nasional', 'Sekretaris dan Bendahara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Nur Wahid Hafizi', '24101152610065', 'nur065', 
      passHash, salt, 'nur065@sifest.com', '', 'Event Seminar Nasional', 'Koordinator Acara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Nabilla Widya Putri D', '25101152610264', 'nabilla264', 
      passHash, salt, 'nabilla264@sifest.com', '', 'Event Seminar Nasional', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Ihsanul Al Fikri', '25101152610027', 'ihsanul027', 
      passHash, salt, 'ihsanul027@sifest.com', '', 'Event Esport Competition', 'Ketua Pelaksana', 'ROLE-003', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Nayla Syaheeda', '25101152610344', 'nayla344', 
      passHash, salt, 'nayla344@sifest.com', '', 'Event Esport Competition', 'Sekretaris dan Bendahara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Razzaaq Pratama', '24101152610254', 'razzaaq254', 
      passHash, salt, 'razzaaq254@sifest.com', '', 'Event Esport Competition', 'Koordinator Acara', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ],
    [
      Utils.generateId('USR'), 'Raihan Firdaus', '25101152610191', 'raihan191', 
      passHash, salt, 'raihan191@sifest.com', '', 'Event Esport Competition', 'Anggota', 'ROLE-004', 'ACTIVE', '', new Date(), new Date()
    ]
  ];

  usersSheet.getRange(usersSheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);

  return 'Berhasil menambahkan ' + data.length + ' panitia ke database!';
}
