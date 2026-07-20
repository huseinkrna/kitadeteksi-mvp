export interface Question {
  id: number;
  text: string;
  domain?: 'D' | 'A' | 'S'; // For DASS-21: D = Depression, A = Anxiety, S = Stress
}

export interface Option {
  value: number;
  label: string;
}

export const DASS21_OPTIONS: Option[] = [
  { value: 0, label: "Tidak pernah sama sekali" },
  { value: 1, label: "Kadang-kadang / Jarang" },
  { value: 2, label: "Sering / Lumayan sering" },
  { value: 3, label: "Hampir selalu / Sangat sering" }
];

export const DASS21_QUESTIONS: Question[] = [
  { id: 1, text: "Saya merasa sulit untuk menenangkan diri.", domain: "S" },
  { id: 2, text: "Saya menyadari mulut saya terasa kering.", domain: "A" },
  { id: 3, text: "Saya sama sekali tidak dapat merasakan perasaan positif.", domain: "D" },
  { id: 4, text: "Saya mengalami kesulitan bernapas (misal: sering terengah-engah tanpa alasan fisik).", domain: "A" },
  { id: 5, text: "Saya merasa kesulitan untuk berinisiatif melakukan sesuatu.", domain: "D" },
  { id: 6, text: "Saya cenderung bereaksi berlebihan terhadap suatu situasi.", domain: "S" },
  { id: 7, text: "Saya merasa gemetar (misal: pada tangan).", domain: "A" },
  { id: 8, text: "Saya merasa menghabiskan banyak energi untuk merasa gelisah.", domain: "S" },
  { id: 9, text: "Saya khawatir dengan situasi di mana saya mungkin menjadi panik dan mempermalukan diri sendiri.", domain: "A" },
  { id: 10, text: "Saya merasa tidak ada hal yang dapat diharapkan di masa depan.", domain: "D" },
  { id: 11, text: "Saya menyadari bahwa saya mudah merasa gelisah.", domain: "S" },
  { id: 12, text: "Saya merasa sulit untuk bersantai/relaks.", domain: "S" },
  { id: 13, text: "Saya merasa sedih dan tertekan.", domain: "D" },
  { id: 14, text: "Saya sulit untuk sabar menghadapi gangguan terhadap hal yang sedang saya lakukan.", domain: "S" },
  { id: 15, text: "Saya merasa hampir panik.", domain: "A" },
  { id: 16, text: "Saya tidak merasa antusias terhadap apa pun.", domain: "D" },
  { id: 17, text: "Saya merasa tidak berharga sebagai seorang manusia.", domain: "D" },
  { id: 18, text: "Saya merasa mudah tersinggung.", domain: "S" },
  { id: 19, text: "Saya menyadari detak jantung saya berubah walau tidak habis berolahraga.", domain: "A" },
  { id: 20, text: "Saya merasa takut tanpa alasan yang jelas.", domain: "A" },
  { id: 21, text: "Saya merasa hidup ini tidak ada maknanya.", domain: "D" }
];

export const PHQ9_OPTIONS: Option[] = [
  { value: 0, label: "Tidak pernah" },
  { value: 1, label: "Beberapa hari" },
  { value: 2, label: "Lebih dari separuh waktu (Lebih dari seminggu)" },
  { value: 3, label: "Hampir setiap hari" }
];

export const PHQ9_QUESTIONS: Question[] = [
  { id: 1, text: "Kurang berminat atau bergairah dalam melakukan apapun." },
  { id: 2, text: "Merasa murung, sedih, atau putus asa." },
  { id: 3, text: "Sulit tidur/mudah terbangun, atau terlalu banyak tidur." },
  { id: 4, text: "Merasa lelah atau kurang tenaga." },
  { id: 5, text: "Kurang nafsu makan atau terlalu banyak makan." },
  { id: 6, text: "Merasa buruk tentang diri sendiri—atau merasa gagal atau mengecewakan diri atau keluarga." },
  { id: 7, text: "Sulit berkonsentrasi pada sesuatu, seperti membaca koran atau menonton televisi." },
  { id: 8, text: "Bergerak atau berbicara sangat lambat sehingga orang lain memperhatikannya. Atau sebaliknya, merasa resah atau gelisah sehingga bergerak lebih sering dari biasanya." },
  { id: 9, text: "[TRIGGER DARURAT] Pikiran bahwa Anda lebih baik mati, atau ingin melukai diri sendiri dengan cara apapun." }
];

export const GAD7_OPTIONS: Option[] = [
  { value: 0, label: "Tidak pernah" },
  { value: 1, label: "Beberapa hari" },
  { value: 2, label: "Lebih dari separuh waktu (Lebih dari seminggu)" },
  { value: 3, label: "Hampir setiap hari" }
];

export const GAD7_QUESTIONS: Question[] = [
  { id: 1, text: "Merasa gugup, cemas, atau tegang." },
  { id: 2, text: "Tidak mampu menghentikan atau mengendalikan kekhawatiran." },
  { id: 3, text: "Terlalu mengkhawatirkan berbagai hal." },
  { id: 4, text: "Sulit untuk bersantai/relaks." },
  { id: 5, text: "Merasa sangat gelisah sehingga sulit untuk duduk diam." },
  { id: 6, text: "Menjadi mudah jengkel atau gampang tersinggung." },
  { id: 7, text: "Merasa takut bahwa sesuatu yang buruk akan terjadi." }
];
