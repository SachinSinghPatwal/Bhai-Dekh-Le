import { Browser, BrowserContext, Page } from 'playwright';

export interface AutomationStatus {
  isRunning: boolean;
  currentAction: string | null;
  jobsScraped: number;
  jobsApplied: number;
  errors: string[];
  startedAt: Date | null;
}

export interface JobScrapeResult {
  title: string;
  description: string;
  staticLink: string;
  externalLink?: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  employType: 'remote' | 'on-site' | 'hybrid';
  salary: number;
  platform: 'naukri' | 'linkedin' | 'indeed';
}

export interface GeminiMatchResult {
  score: number;
  reasoning: string;
  shouldApply: boolean;
}

export interface NaukriSelectors {
  jobCard: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  applyButton: string;
  nextButton: string;
}

export interface BrowserConfig {
  headless: boolean;
  storageStatePath?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface StorageStateData {
  cookies: any[];
  origins: any[];
}

export interface EncryptedData {
  iv: string;
  encryptedData: string;
}

export interface ResumeData {
  path: string;
  fileName: string;
  text: string;
  uploadedAt: Date;
}

export interface UserJobPreferences {
  keywords: string[];
  locations: string[];
  minSalary: number;
  jobTypes: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  employType: ('remote' | 'on-site' | 'hybrid')[];
}
