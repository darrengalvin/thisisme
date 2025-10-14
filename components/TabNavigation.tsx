'use client'

import { Home, BarChart3, BookOpen, Users, Share2 } from 'lucide-react'

type TabType = 'home' | 'timeline' | 'timezones' | 'people' | 'collaborative'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  className?: string
  isBetaMode?: boolean
}

interface Tab {
  id: TabType
  label: string
  shortLabel: string // For mobile
  icon: any
  description: string
}

const tabs: Tab[] = [
  {
    id: 'timezones',
    label: 'Life Chapters',
    shortLabel: 'Life',
    icon: BookOpen,
    description: 'Organize memories by life periods'
  },
  {
    id: 'home',
    label: 'Feed',
    shortLabel: 'Feed',
    icon: Home,
    description: 'Recent memories and activity'
  },
  {
    id: 'timeline',
    label: 'Timeline',
    shortLabel: 'Time',
    icon: BarChart3,
    description: 'Chronological memory timeline'
  },
  {
    id: 'people',
    label: 'My People',
    shortLabel: 'People',
    icon: Users,
    description: 'Manage your personal network'
  },
  {
    id: 'collaborative',
    label: 'Shared',
    shortLabel: 'Shared',
    icon: Share2,
    description: 'Collaborative memories'
  }
]

export default function TabNavigation({ activeTab, onTabChange, className = '', isBetaMode = false }: TabNavigationProps) {
  return (
    <div className={`bg-white border-b border-slate-200/50 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <nav className="flex justify-around sm:justify-start sm:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative flex flex-col sm:flex-row items-center justify-center sm:border-b-2 py-2 sm:py-4 px-2 sm:px-1 font-medium transition-all duration-200 flex-1 sm:flex-none
                  ${isActive
                    ? 'sm:border-slate-500 text-slate-900'
                    : 'sm:border-transparent text-slate-500 hover:text-slate-700 sm:hover:border-slate-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon with active indicator ring on mobile */}
                <div className={`
                  relative p-2 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'
                  }
                `}>
                  <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
                  
                  {/* Active indicator dot - mobile only */}
                  {isActive && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-slate-600 rounded-full sm:hidden" />
                  )}
                </div>
                
                {/* Label - smaller on mobile */}
                <span className={`
                  text-[10px] sm:text-sm mt-0.5 sm:mt-0 sm:ml-2 font-medium
                  ${isActive ? 'text-slate-900' : 'text-slate-500'}
                `}>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
                
                {/* Active indicator dot - desktop only */}
                {isActive && (
                  <div className="hidden sm:block ml-2 w-2 h-2 bg-slate-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
