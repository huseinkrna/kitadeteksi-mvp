import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Berikan interpretasi klinis." },
        { role: "user", content: "Skor dominan: Depresi (Parah)." }
      ],
      model: "llama3-8b-8192",
      temperature: 0.2
    });
    console.log("Success:", completion.choices[0]?.message?.content);
  } catch(e) {
    console.error("Error:", e);
  }
}

test();
