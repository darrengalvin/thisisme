'use client'

import { Home, BarChart3, BookOpen } from 'lucide-react'

type TabType = 'home' | 'timeline' | 'timezones'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  className?: string
}

interface Tab {
  id: TabType
  label: string
  icon: any
  description: string
}

const tabs: Tab[] = [
  {
    id: 'home',
    label: 'Feed',
    icon: Home,
    description: 'Recent memories and activity'
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: BarChart3,
    description: 'Chronological memory timeline'
  },
  {
    id: 'timezones',
    label: 'Life Chapters',
    icon: BookOpen,
    description: 'Organize memories by life periods'
  }
]

export default function TabNavigation({ activeTab, onTabChange, className = '' }: TabNavigationProps) {
  return (
    <div className={`bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative inline-flex items-center py-4 px-3 sm:px-1 border-b-2 font-medium text-sm transition-all duration-300 ease-in-out
                  ${isActive
                    ? 'border-slate-500 text-slate-900 bg-slate-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50/30'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5 transition-all duration-300 ease-in-out
                    ${isActive
                      ? 'text-slate-500 scale-110'
                      : 'text-slate-400 group-hover:text-slate-500 group-hover:scale-105'
                    }
                  `}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <div className="ml-2 w-2 h-2 bg-slate-500 rounded-full animate-pulse" />
                )}
                
                {/* Hover tooltip for mobile */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none sm:hidden whitespace-nowrap z-50">
                  {tab.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>
      

    </div>
  )
}
