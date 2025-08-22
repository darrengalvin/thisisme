'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, Ticket, BarChart3, Plus, Shield, Users, Brain, Mail } from 'lucide-react'

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupResult, setSetupResult] = useState<string | null>(null)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/support/tickets', { 
        credentials: 'include' 
      })
      
      if (response.status === 403) {
        setIsAdmin(false)
      } else if (response.ok) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const setupAdmin = async () => {
    try {
      setSetupResult('Setting up admin access...')
      const response = await fetch('/api/admin/setup-admin', {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSetupResult('✅ Admin access granted! Please refresh the page.')
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setSetupResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setSetupResult(`❌ Error: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            You need admin privileges to access this dashboard.
          </p>
          
          <button
            onClick={setupAdmin}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mb-4"
          >
            Grant Admin Access
          </button>
          
          {setupResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              {setupResult}
            </div>
          )}
          
          <Link 
            href="/support" 
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Support Center
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your application and support system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Support Management */}
          <Link href="/admin/support" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Ticket className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
              <p className="text-gray-600">
                Manage support tickets with kanban board interface
              </p>
            </div>
          </Link>

          {/* Reports */}
          <Link href="/admin/support/reports" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
              <p className="text-gray-600">
                View support metrics and performance reports
              </p>
            </div>
          </Link>

          {/* Bulk Ticket Creation */}
          <Link href="/admin/bulk-tickets" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Plus className="w-8 h-8 text-purple-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Tickets</h3>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
              <p className="text-gray-600">
                Create multiple tickets from predefined issues
              </p>
            </div>
          </Link>

          {/* AI Support System */}
          <Link href="/admin/ai-support" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Brain className="w-8 h-8 text-indigo-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Support</h3>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
              <p className="text-gray-600">
                Intelligent ticket analysis and automated fixes
              </p>
            </div>
          </Link>

          {/* Premium Waitlist */}
          <Link href="/admin/waitlist" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Mail className="w-8 h-8 text-orange-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Premium Waitlist</h3>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
              <p className="text-gray-600">
                Manage users requesting premium access
              </p>
            </div>
          </Link>

          {/* User Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-500">User Management</h3>
              </div>
              <span className="text-gray-300">Coming Soon</span>
            </div>
            <p className="text-gray-500">
              Manage user accounts and permissions
            </p>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-gray-400 mr-3" />
                <h3 className="text-lg font-semibold text-gray-500">Settings</h3>
              </div>
              <span className="text-gray-300">Coming Soon</span>
            </div>
            <p className="text-gray-500">
              Configure application settings and preferences
            </p>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Admin Access Active</h4>
              <p className="text-sm text-blue-800">
                You have administrative privileges and can manage all system features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
