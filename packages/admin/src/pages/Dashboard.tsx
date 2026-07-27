import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Users, FileText, KeyRound, UserCheck } from 'lucide-react'

interface Stats {
  users: number
  customers: number
  content: number
  inviteCodes: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [users, customers, content] = await Promise.all([
          api.request<{ total: number }>('/api/users?limit=1'),
          api.request<{ total: number }>('/api/customers?limit=1'),
          api.request<any[]>('/api/content'),
        ])

        setStats({
          users: users.total,
          customers: customers.total,
          content: content.length,
          inviteCodes: 0,
        })
      } catch {
        setStats({ users: 0, customers: 0, content: 0, inviteCodes: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
      </div>
    )
  }

  const cards = [
    { label: 'Kullanıcılar', value: stats?.users || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Müşteriler', value: stats?.customers || 0, icon: UserCheck, color: 'bg-green-50 text-green-600' },
    { label: 'İçerik Blokları', value: stats?.content || 0, icon: FileText, color: 'bg-purple-50 text-purple-600' },
    { label: 'Davet Kodları', value: stats?.inviteCodes || 0, icon: KeyRound, color: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-espresso)]">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--color-ink)]/50">{card.label}</span>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[var(--color-espresso)]">{card.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
