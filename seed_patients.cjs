require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const doctorId = "user-id-4ufvdg6yz";

function getId() {
  return 'id-' + Math.random().toString(36).substring(2, 10);
}

async function seedUser(email, password, name, risk) {
  const patientId = `user-id-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`Seeding ${name}... ID: ${patientId}`);

  // Create Profile
  const { error: profileError } = await supabase.from('profiles').insert({
    user_id: patientId,
    email: email,
    password: password,
    role: 'patient',
    full_name: name,
    is_verified: true,
    assigned_at: new Date().toISOString()
  });
  if (profileError) console.error("Profile error:", profileError);

  // Pair with doctor
  const { error: pairError } = await supabase.from('pairings').insert({
    id: getId(),
    doctor_id: doctorId,
    patient_id: patientId,
    status: 'active'
  });
  if (pairError) console.error("Pairing error:", pairError);

  // Generate data based on risk
  let screenings = [];
  let journals = [];
  
  const now = new Date();
  
  for(let i=0; i<5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (5 - i));
    
    let mood_scale = 5;
    let dep = 0, anx = 0, str = 0;
    let is_critical = false;
    let category = "Normal";
    let content = "";
    
    if (risk === "tinggi") {
      mood_scale = Math.floor(Math.random() * 3) + 1; // 1-3
      dep = 28 + Math.floor(Math.random() * 10);
      anx = 20 + Math.floor(Math.random() * 10);
      str = 30 + Math.floor(Math.random() * 10);
      is_critical = true;
      category = "Depresi Sangat Berat, Kecemasan Sangat Berat, Stres Sangat Berat";
      content = ["Saya merasa tidak ada harapan.", "Semuanya terasa gelap, saya ingin mengakhiri segalanya.", "Sangat lelah dengan hidup ini.", "Tidak ada yang mengerti saya.", "Rasanya sakit sekali di dada."][i];
    } else if (risk === "medium") {
      mood_scale = Math.floor(Math.random() * 3) + 4; // 4-6
      dep = 14 + Math.floor(Math.random() * 5);
      anx = 10 + Math.floor(Math.random() * 4);
      str = 19 + Math.floor(Math.random() * 6);
      category = "Depresi Sedang, Kecemasan Sedang";
      content = ["Hari ini lumayan berat, tapi saya bertahan.", "Agak cemas dengan pekerjaan.", "Merasa sedih tapi masih bisa aktivitas.", "Biasa saja, tidak terlalu baik.", "Ada sedikit harapan hari ini."][i];
    } else {
      mood_scale = Math.floor(Math.random() * 3) + 8; // 8-10
      dep = Math.floor(Math.random() * 9);
      anx = Math.floor(Math.random() * 7);
      str = Math.floor(Math.random() * 14);
      category = "Normal";
      content = ["Hari yang menyenangkan!", "Saya merasa bersemangat dan produktif.", "Cukup tenang hari ini.", "Bisa tidur nyenyak semalam.", "Merasa sangat bersyukur."][i];
    }
    
    screenings.push({
      id: getId(),
      patient_id: patientId,
      test_type: "dass21",
      raw_scores: { dep, anx, str, answers: new Array(21).fill(0) },
      dominant_category: category,
      is_critical: is_critical,
      created_at: d.toISOString()
    });
    
    journals.push({
      id: getId(),
      patient_id: patientId,
      content: content,
      mood_scale: mood_scale,
      created_at: d.toISOString()
    });
  }
  
  const { error: scrError } = await supabase.from('screenings').insert(screenings);
  if (scrError) console.error("Screening error:", scrError);
  
  const { error: jrnError } = await supabase.from('journals').insert(journals);
  if (jrnError) console.error("Journal error:", jrnError);
  
  console.log(`Finished seeding ${name}`);
}

async function run() {
  await seedUser('pasientinggi@ruangtara.com', 'pasientinggi', 'Pasien Tinggi', 'tinggi');
  await seedUser('pasienmedium@ruangtara.com', 'pasienmedium', 'Pasien Medium', 'medium');
  await seedUser('pasienrendah@ruangtara.com', 'pasientinggi', 'Pasien Rendah', 'rendah');
  console.log("All done.");
}
run();
