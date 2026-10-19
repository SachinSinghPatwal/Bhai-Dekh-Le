import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set worker source to Vite-bundled worker asset
try {
  if (typeof window !== "undefined" && pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
} catch {
  // Ignore in non-browser environment
}

export interface SkillDefinition {
  canonical: string;
  patterns: (string | RegExp)[];
}

export const IT_SKILLS_CATALOG: SkillDefinition[] = [
  // Languages
  { canonical: "JavaScript", patterns: ["javascript", "js", "ecmascript"] },
  { canonical: "TypeScript", patterns: ["typescript", "ts"] },
  { canonical: "Python", patterns: ["python", "python3", "py"] },
  { canonical: "Java", patterns: [/\bjava\b(?!script)/i] },
  { canonical: "C++", patterns: ["c++", "cpp"] },
  { canonical: "C#", patterns: ["c#", "c-sharp", "csharp"] },
  { canonical: "C", patterns: [/\b(c\s+programming|ansi\s+c)\b/i] },
  { canonical: "Go", patterns: [/\bgolang\b/i, /\bgo\s+language\b/i] },
  { canonical: "Rust", patterns: [/\brust\b/i, /\brustlang\b/i] },
  { canonical: "PHP", patterns: [/\bphp\b/i] },
  { canonical: "Ruby", patterns: [/\bruby\b/i] },
  { canonical: "Kotlin", patterns: ["kotlin"] },
  { canonical: "Swift", patterns: [/\bswift\b/i] },
  { canonical: "Dart", patterns: [/\bdart\b/i] },
  { canonical: "SQL", patterns: [/\bsql\b/i] },

  // Frontend & UI
  { canonical: "React", patterns: ["react", "react.js", "reactjs"] },
  { canonical: "Next.js", patterns: ["next.js", "nextjs", "next js"] },
  { canonical: "Vue.js", patterns: ["vue", "vue.js", "vuejs"] },
  { canonical: "Nuxt.js", patterns: ["nuxt", "nuxt.js", "nuxtjs"] },
  { canonical: "Angular", patterns: ["angular", "angularjs", "angular 2+"] },
  { canonical: "Svelte", patterns: ["svelte", "sveltekit"] },
  { canonical: "HTML5", patterns: ["html", "html5"] },
  { canonical: "CSS3", patterns: ["css", "css3"] },
  { canonical: "Tailwind CSS", patterns: ["tailwind", "tailwindcss", "tailwind css"] },
  { canonical: "Bootstrap", patterns: ["bootstrap", "bootstrap 5"] },
  { canonical: "Sass", patterns: ["sass", "scss"] },
  { canonical: "Redux", patterns: ["redux", "redux toolkit", "rtk"] },
  { canonical: "Zustand", patterns: ["zustand"] },
  { canonical: "Webpack", patterns: ["webpack"] },
  { canonical: "Vite", patterns: [/\bvite\b/i, /\bvitejs\b/i] },

  // Backend & Runtime
  { canonical: "Node.js", patterns: ["node.js", "nodejs", "node js", /\bnode\b/i] },
  { canonical: "Express.js", patterns: ["express", "express.js", "expressjs"] },
  { canonical: "NestJS", patterns: ["nestjs", "nest.js"] },
  { canonical: "Fastify", patterns: ["fastify"] },
  { canonical: "Django", patterns: ["django", "django rest framework", "drf"] },
  { canonical: "Flask", patterns: [/\bflask\b/i] },
  { canonical: "FastAPI", patterns: ["fastapi", "fast-api"] },
  { canonical: "Spring Boot", patterns: ["spring boot", "springboot", "spring mvc", /\bspring\b/i] },
  { canonical: "Laravel", patterns: ["laravel"] },
  { canonical: "Ruby on Rails", patterns: ["ruby on rails", "rails"] },
  { canonical: ".NET Core", patterns: [".net", ".net core", "asp.net", "dotnet"] },

  // Databases & Caching
  { canonical: "MongoDB", patterns: ["mongodb", "mongo", "mongoose"] },
  { canonical: "PostgreSQL", patterns: ["postgresql", "postgres", "psql"] },
  { canonical: "MySQL", patterns: ["mysql"] },
  { canonical: "Redis", patterns: ["redis"] },
  { canonical: "SQLite", patterns: ["sqlite", "sqlite3"] },
  { canonical: "Elasticsearch", patterns: ["elasticsearch", "elastic search"] },
  { canonical: "Cassandra", patterns: ["cassandra"] },
  { canonical: "Prisma", patterns: ["prisma", "prisma orm"] },
  { canonical: "Firebase", patterns: ["firebase", "firestore"] },
  { canonical: "Supabase", patterns: ["supabase"] },

  // APIs & Architecture
  { canonical: "REST API", patterns: ["rest api", "rest apis", "restful", "restful api"] },
  { canonical: "GraphQL", patterns: ["graphql"] },
  { canonical: "gRPC", patterns: ["grpc"] },
  { canonical: "WebSockets", patterns: ["websocket", "websockets", "socket.io"] },
  { canonical: "Microservices", patterns: ["microservices", "microservice architecture"] },
  { canonical: "System Design", patterns: ["system design", "distributed systems"] },

  // Cloud & DevOps
  { canonical: "AWS", patterns: [/\baws\b/i, "amazon web services", "s3", "ec2", "lambda"] },
  { canonical: "Azure", patterns: [/\bazure\b/i, "microsoft azure"] },
  { canonical: "GCP", patterns: [/\bgcp\b/i, "google cloud", "google cloud platform"] },
  { canonical: "Docker", patterns: ["docker", "dockerfile", "containerization"] },
  { canonical: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { canonical: "CI/CD", patterns: ["ci/cd", "ci-cd", "continuous integration", "github actions"] },
  { canonical: "Terraform", patterns: ["terraform"] },
  { canonical: "Linux", patterns: [/\blinux\b/i, "ubuntu", "debian", "centos"] },
  { canonical: "Git", patterns: [/\bgit\b/i, "github", "gitlab"] },

  // Mobile
  { canonical: "React Native", patterns: ["react native", "react-native"] },
  { canonical: "Flutter", patterns: ["flutter"] },
  { canonical: "Android", patterns: [/\bandroid\b/i, "android studio"] },
  { canonical: "iOS", patterns: [/\bios\b/i, "xcode"] },

  // AI & Data
  { canonical: "Machine Learning", patterns: ["machine learning", /\bml\b/i] },
  { canonical: "Deep Learning", patterns: ["deep learning", /\bdl\b/i] },
  { canonical: "Artificial Intelligence", patterns: [/\bai\b/i, "artificial intelligence"] },
  { canonical: "TensorFlow", patterns: ["tensorflow"] },
  { canonical: "PyTorch", patterns: ["pytorch"] },
  { canonical: "Pandas", patterns: [/\bpandas\b/i] },
  { canonical: "NumPy", patterns: ["numpy"] },

  // Testing & Quality
  { canonical: "Jest", patterns: [/\bjest\b/i] },
  { canonical: "Cypress", patterns: [/\bcypress\b/i] },
  { canonical: "Playwright", patterns: [/\bplaywright\b/i] },
  { canonical: "Selenium", patterns: [/\bselenium\b/i] },
  { canonical: "Unit Testing", patterns: ["unit testing", "unit tests", "tdd"] },
];

/**
 * Robust fallback extractor that extracts printable strings and matches skills
 * even if PDF.js fails or runs into worker/eval issues.
 */
function fallbackTextExtraction(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);
    
    // Extract textual chunks from PDF stream operators like (text) Tj or [(t) -10 (e)] TJ
    const textPieces: string[] = [];
    
    // Match literal strings: (String Here)
    const literalRegex = /\(([^()]{1,200})\)/g;
    let match;
    while ((match = literalRegex.exec(latin1)) !== null) {
      const cleaned = match[1].replace(/\\[nrtbf\\()]/g, " ").trim();
      if (cleaned.length > 1) {
        textPieces.push(cleaned);
      }
    }

    // Also include words from plain ASCII scan
    const asciiWords = latin1.match(/[A-Za-z0-9#+.]{2,30}/g) || [];
    textPieces.push(...asciiWords);

    return textPieces.join(" ");
  } catch {
    return "";
  }
}

/**
 * Extracts plain text from a PDF file using PDF.js with automated fallback.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let fullText = "";

  // Attempt 1: PDF.js
  try {
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + " ";
    }
  } catch (pdfErr) {
    console.warn("[PDF Parser] PDF.js standard parse failed, using fallback:", pdfErr);
  }

  // If PDF.js produced meaningful text (>20 chars), return it
  if (fullText.trim().length > 20) {
    return fullText;
  }

  // Attempt 2: Direct stream & ASCII fallback
  const fallbackText = fallbackTextExtraction(arrayBuffer);
  return fallbackText;
}

/**
 * Matches detected skills against the IT skills catalog.
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  const foundSkills = new Set<string>();

  for (const skill of IT_SKILLS_CATALOG) {
    for (const pattern of skill.patterns) {
      if (typeof pattern === "string") {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, "i");
        if (regex.test(text)) {
          foundSkills.add(skill.canonical);
          break;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(text)) {
          foundSkills.add(skill.canonical);
          break;
        }
      }
    }
  }

  return Array.from(foundSkills);
}

/**
 * Parses any uploaded resume file (.pdf, .txt, .md, etc.) and extracts skills.
 */
export async function parseResumeFile(file: File): Promise<{ text: string; skills: string[] }> {
  let text = "";

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    text = await extractTextFromPDF(file);
  } else if (
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".json")
  ) {
    text = await file.text();
  } else {
    // Other binary formats (e.g. .docx or unclassified)
    const buffer = await file.arrayBuffer();
    text = fallbackTextExtraction(buffer);
  }

  const skills = extractSkillsFromText(text);
  return { text, skills };
}
