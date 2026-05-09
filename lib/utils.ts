import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generatePassUrl(passId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/pass/${passId}`
}

export function formatStampCount(current: number, goal: number): string {
  return `${current} / ${goal}`
}

export function isRewardReady(stampCount: number, stampGoal: number): boolean {
  return stampCount >= stampGoal
}
