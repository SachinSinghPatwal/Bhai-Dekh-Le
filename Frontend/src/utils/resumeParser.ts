import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

try {
  if (typeof window !== "undefined" && pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
} catch {}

export interface SkillDefinition {
  canonical: string;
  patterns: (string | RegExp)[];
}

export interface ParsedResumeResult {
  text: string;
  skills: string[];
  email?: string;
  phone?: string;
  links: string[];
}

export const IT_SKILLS_CATALOG: SkillDefinition[] = [
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

  { canonical: "REST API", patterns: ["rest api", "rest apis", "restful", "restful api"] },
  { canonical: "GraphQL", patterns: ["graphql"] },
  { canonical: "gRPC", patterns: ["grpc"] },
  { canonical: "WebSockets", patterns: ["websocket", "websockets", "socket.io"] },
  { canonical: "Microservices", patterns: ["microservices", "microservice architecture"] },
  { canonical: "System Design", patterns: ["system design", "distributed systems"] },

  { canonical: "AWS", patterns: [/\baws\b/i, "amazon web services", "s3", "ec2", "lambda"] },
  { canonical: "Azure", patterns: [/\bazure\b/i, "microsoft azure"] },
  { canonical: "GCP", patterns: [/\bgcp\b/i, "google cloud", "google cloud platform"] },
  { canonical: "Docker", patterns: ["docker", "dockerfile", "containerization"] },
  { canonical: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { canonical: "CI/CD", patterns: ["ci/cd", "ci-cd", "continuous integration", "github actions"] },
  { canonical: "Terraform", patterns: ["terraform"] },
  { canonical: "Linux", patterns: [/\blinux\b/i, "ubuntu", "debian", "centos"] },
  { canonical: "Git", patterns: [/\bgit\b/i, "github", "gitlab"] },

  { canonical: "React Native", patterns: ["react native", "react-native"] },
  { canonical: "Flutter", patterns: ["flutter"] },
  { canonical: "Android", patterns: [/\bandroid\b/i, "android studio"] },
  { canonical: "iOS", patterns: [/\bios\b/i, "xcode"] },

  { canonical: "Machine Learning", patterns: ["machine learning", /\bml\b/i] },
  { canonical: "Deep Learning", patterns: ["deep learning", /\bdl\b/i] },
  { canonical: "Artificial Intelligence", patterns: [/\bai\b/i, "artificial intelligence"] },
  { canonical: "TensorFlow", patterns: ["tensorflow"] },
  { canonical: "PyTorch", patterns: ["pytorch"] },
  { canonical: "Pandas", patterns: [/\bpandas\b/i] },
  { canonical: "NumPy", patterns: ["numpy"] },

  { canonical: "Jest", patterns: [/\bjest\b/i] },
  { canonical: "Cypress", patterns: [/\bcypress\b/i] },
  { canonical: "Playwright", patterns: [/\bplaywright\b/i] },
  { canonical: "Selenium", patterns: [/\bselenium\b/i] },
  { canonical: "Unit Testing", patterns: ["unit testing", "unit tests", "tdd"] },
];

export function cleanUrl(raw: string): string {
  let url = raw.trim().replace(/[.,;:)>\]]+$/, "");
  if (url.startsWith("mailto:")) {
    return "";
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }
  return url;
}

export function extractEmailFromText(text: string): string | undefined {
  if (!text) return undefined;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
  const match = text.match(emailRegex);
  return match ? match[0].toLowerCase().trim() : undefined;
}

export function extractPhoneFromText(text: string): string | undefined {
  if (!text) return undefined;
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/g;
  const matches = text.match(phoneRegex);
  if (!matches) return undefined;
  for (const m of matches) {
    const digitsOnly = m.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return m.trim();
    }
  }
  return undefined;
}

export function extractLinksFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();

  const standardUrlRegex = /https?:\/\/[^\s,;"'()<>\\]+/gi;
  let match;
  while ((match = standardUrlRegex.exec(text)) !== null) {
    const cleaned = cleanUrl(match[0]);
    if (cleaned) found.add(cleaned);
  }

  const domainUrlRegex = /\b(?:github\.com\/[^\s,;"'()<>\\]+|linkedin\.com\/in\/[^\s,;"'()<>\\]+|gitlab\.com\/[^\s,;"'()<>\\]+|[a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io)\/?[^\s,;"'()<>\\]*)/gi;
  while ((match = domainUrlRegex.exec(text)) !== null) {
    const cleaned = cleanUrl(match[0]);
    if (cleaned) found.add(cleaned);
  }

  return Array.from(found);
}

function fallbackTextExtraction(buffer: ArrayBuffer): { text: string; links: string[] } {
  try {
    const bytes = new Uint8Array(buffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);
    const links = new Set<string>();

    const uriRegex = /\/URI\s*\(([^()]+)\)/g;
    let match;
    while ((match = uriRegex.exec(latin1)) !== null) {
      const cleaned = cleanUrl(match[1]);
      if (cleaned) links.add(cleaned);
    }

    const textPieces: string[] = [];
    const literalRegex = /\(([^()]{1,200})\)/g;
    while ((match = literalRegex.exec(latin1)) !== null) {
      const cleaned = match[1].replace(/\\[nrtbf\\()]/g, " ").trim();
      if (cleaned.length > 1) {
        textPieces.push(cleaned);
      }
    }

    const asciiWords = latin1.match(/[A-Za-z0-9#+.]{2,30}/g) || [];
    textPieces.push(...asciiWords);

    const fullText = textPieces.join(" ");
    const textLinks = extractLinksFromText(fullText);
    textLinks.forEach((l) => links.add(l));

    return { text: fullText, links: Array.from(links) };
  } catch {
    return { text: "", links: [] };
  }
}

export async function extractTextAndLinksFromPDF(
  file: File,
): Promise<{ text: string; links: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  let fullText = "";
  const collectedLinks = new Set<string>();

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

      try {
        const annotations = await page.getAnnotations();
        for (const annot of annotations) {
          if (annot?.subtype === "Link" && typeof annot?.url === "string") {
            const cleaned = cleanUrl(annot.url);
            if (cleaned) collectedLinks.add(cleaned);
          }
        }
      } catch {}
    }
  } catch (pdfErr) {
    console.warn("[PDF Parser] PDF.js standard parse failed, using fallback:", pdfErr);
  }

  const rawFallback = fallbackTextExtraction(arrayBuffer);
  rawFallback.links.forEach((l) => collectedLinks.add(l));

  if (!fullText || fullText.trim().length <= 20) {
    fullText = rawFallback.text;
  }

  const textLinks = extractLinksFromText(fullText);
  textLinks.forEach((l) => collectedLinks.add(l));

  return {
    text: fullText,
    links: Array.from(collectedLinks),
  };
}

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

export async function parseResumeFile(file: File): Promise<ParsedResumeResult> {
  let text = "";
  let links: string[] = [];

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const result = await extractTextAndLinksFromPDF(file);
    text = result.text;
    links = result.links;
  } else if (
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".json")
  ) {
    text = await file.text();
    links = extractLinksFromText(text);
  } else {
    const buffer = await file.arrayBuffer();
    const fallback = fallbackTextExtraction(buffer);
    text = fallback.text;
    links = fallback.links;
  }

  const skills = extractSkillsFromText(text);
  const email = extractEmailFromText(text);
  const phone = extractPhoneFromText(text);

  return { text, skills, email, phone, links };
}
