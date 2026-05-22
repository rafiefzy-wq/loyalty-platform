'use client'

import { useState } from 'react'
import { toast } from '@/lib/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Bell, Send } from 'lucide-react'

export default function BroadcastPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ count: number } | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message }),
    })
    if (res.ok) {
      const data = await res.json()
      setSent(data)
      toast({ title: 'Broadcast sent!', variant: 'success' })
      setTitle('')
      setMessage('')
    } else {
      toast({ title: 'Failed to send', variant: 'destructive' })
    }
    setSending(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Push Notifications</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Send a message to all your loyalty card holders</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Compose broadcast
          </CardTitle>
          <CardDescription>
            Your message will appear as a push notification on customers' phones when they have their Wallet card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">Notification title</Label>
              <Input
                id="notif-title"
                placeholder="e.g. Special offer today!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">{title.length}/50</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-body">Message</Label>
              <textarea
                id="notif-body"
                placeholder="e.g. Double stamps all day today. Come visit us!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={3}
                required
                className="flex w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16161e] px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 dark:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">{message.length}/200</p>
            </div>

            {/* Notification preview */}
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">Preview</p>
              <div className="bg-white dark:bg-[#16161e] rounded-xl shadow-sm px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  🎫
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title || 'Notification title'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{message || 'Your message appears here'}</p>
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={sending} className="gap-2">
              <Send className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send to all customers'}
            </Button>

            {sent && (
              <p className="text-sm text-green-600">
                ✓ Sent to {sent.count} customer{sent.count !== 1 ? 's' : ''}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-amber-50 border-amber-100">
        <CardContent className="p-5">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Push notifications require Apple Developer APN credentials for Apple Wallet passes.
            Google Wallet passes update silently. Configure <code className="font-mono text-xs">APPLE_APN_KEY</code> in your environment to enable Apple push notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
