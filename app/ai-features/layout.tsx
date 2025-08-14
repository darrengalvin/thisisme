import type { Metadata } from 'next'
import './ai-features.css'

export const metadata: Metadata = {
  title: 'AI Memory Features - ThisIsMe',
  description: 'Explore AI-powered memory management features including voice capture, smart organization, and interactive chat',
}

export default function AIFeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}