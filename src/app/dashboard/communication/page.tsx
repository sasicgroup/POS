'use client';

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import {
    MessageSquare,
    Send,
    FileText,
    Users,
    Plus,
    Trash2,
    Edit,
    Check,
    Smartphone,
    Search,
    Bell
} from 'lucide-react';
import { sendNotification, getSMSConfig, updateSMSConfig, type SMSConfig } from '@/lib/sms';
import { useEffect } from 'react';

export default function CommunicationPage() {
    const { activeStore } = useAuth();
    const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'automations'>('compose');
    const [selectedChannel, setSelectedChannel] = useState<'sms' | 'whatsapp'>('sms');
    const [messageContent, setMessageContent] = useState('');
    const [recipientType, setRecipientType] = useState<'all' | 'group' | 'manual'>('all');
    const [config, setConfig] = useState<SMSConfig | null>(null);

    useEffect(() => {
        setConfig(getSMSConfig());
    }, []);

    const handleSaveConfig = () => {
        if (config) {
            updateSMSConfig(config);
            alert('Settings Saved Successfully!');
        }
    };

    // Mock Data
    const [templates, setTemplates] = useState([
        { id: 1, title: 'Welcome Message', content: 'Hi {Name}, welcome to {StoreName}! We are glad to have you.' },
        { id: 2, title: 'Promotional Sale', content: 'Hello {Name}, big sale starting tomorrow at {StoreName}! up to 50% off.' },
        { id: 3, title: 'Happy Birthday', content: 'Happy Birthday {Name}! Here is a special gift for you.' },
    ]);

    const placeholders = ['{Name}', '{StoreName}', '{Points}', '{LastVisit}'];

    if (!activeStore) return null;

    const insertPlaceholder = (ph: string) => {
        setMessageContent(prev => prev + ' ' + ph + ' ');
    };

    const handleSend = () => {
        // In a real app, this would iterate over customers and send
        console.log(`Sending ${selectedChannel} to ${recipientType} recipients: ${messageContent}`);

        // Simulate sending
        sendNotification('sale', {
            // Mock data structure appropriate for the bulk sender
            id: 'BULK-' + Date.now(),
            amount: 0,
            customerPhone: 'BULK'
        });

        alert(`Bulk ${selectedChannel.toUpperCase()} Sent Successfully!`);
        setMessageContent('');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customer Communication</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Send bulk SMS & WhatsApp campaigns to your customers.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar / Tabs */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'compose'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <Send className="h-5 w-5" />
                        <div className="text-left">
                            <div className="font-semibold">Compose</div>
                            <div className="text-xs opacity-80">Send new campaign</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'templates'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <FileText className="h-5 w-5" />
                        <div className="text-left">
                            <div className="font-semibold">Templates</div>
                            <div className="text-xs opacity-80">Manage saved messages</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('automations')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'automations'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <Bell className="h-5 w-5" />
                        <div className="text-left">
                            <div className="font-semibold">Automations</div>
                            <div className="text-xs opacity-80">Welcome & Receipts</div>
                        </div>
                    </button>

                    <div className="mt-8 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Credits</p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300">Balance Available</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-end border-t border-indigo-100 dark:border-indigo-800/50 pt-3 mt-3">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">1,250</div>
                            <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline dark:text-indigo-400">Top Up</button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'compose' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="space-y-6">
                                {/* Channel Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Channel</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setSelectedChannel('sms')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${selectedChannel === 'sms'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                                        >
                                            <Smartphone className="h-5 w-5" />
                                            <span className="font-semibold">SMS</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedChannel('whatsapp')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${selectedChannel === 'whatsapp'
                                                ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                            <span className="font-semibold">WhatsApp</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Recipients */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recipients</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {[
                                            { id: 'all', label: 'All Customers' },
                                            { id: 'group', label: 'Customer Groups' },
                                            { id: 'manual', label: 'Manual Input' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setRecipientType(type.id as any)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === type.id
                                                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>

                                    {recipientType === 'manual' && (
                                        <textarea
                                            placeholder="Enter phone numbers separated by commas..."
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white h-24 resize-none"
                                        />
                                    )}
                                    {recipientType === 'group' && (
                                        <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                            <option>VIP Customers</option>
                                            <option>New Signups (Last 30 Days)</option>
                                            <option>Inactive Users</option>
                                        </select>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message Content</label>
                                        <button className="text-xs text-indigo-600 hover:underline font-medium" onClick={() => setMessageContent('')}>Clear</button>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            value={messageContent}
                                            onChange={(e) => setMessageContent(e.target.value)}
                                            placeholder="Type your message here..."
                                            className="w-full h-40 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                                        />
                                        <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                                            {messageContent.length} chars
                                        </div>
                                    </div>

                                    {/* Placeholders */}
                                    <div className="mt-3">
                                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Insert Placeholder</p>
                                        <div className="flex gap-2">
                                            {placeholders.map(ph => (
                                                <button
                                                    key={ph}
                                                    onClick={() => insertPlaceholder(ph)}
                                                    className="px-2 py-1 rounded bg-slate-100 text-xs font-mono text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                                >
                                                    {ph}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-sm text-slate-500 mr-auto">
                                        Estimated cost: <span className="font-bold text-slate-900 dark:text-white">GHS {recipientType === 'all' ? '45.20' : '0.00'}</span>
                                    </div>
                                    <button className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                        Schedule Later
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={!messageContent.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        <Send className="h-4 w-4" />
                                        Send Broadcast
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="relative max-w-sm w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" placeholder="Search templates..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-800" />
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700">
                                    <Plus className="h-4 w-4" />
                                    Create Template
                                </button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {templates.map(template => (
                                    <div key={template.id} className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{template.title}</h3>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded dark:hover:bg-indigo-900/20"><Edit className="h-4 w-4" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            {template.content}
                                        </p>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setMessageContent(template.content);
                                                    setActiveTab('compose');
                                                }}
                                                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                            >
                                                Use this template
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'automations' && config && (
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-bold">Automated Notifications</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure messages sent automatically to customers.</p>
                                </div>
                                <button
                                    onClick={handleSaveConfig}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        <label className="font-semibold text-sm uppercase tracking-wide">New Customer Welcome</label>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sent when a new customer is registered during checkout.</p>
                                    <textarea
                                        value={config.templates.welcome}
                                        onChange={(e) => setConfig({ ...config, templates: { ...config.templates, welcome: e.target.value } })}
                                        className="w-full h-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Available Variables: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{`{Name}`}</span></p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        <label className="font-semibold text-sm uppercase tracking-wide">Purchase Receipt</label>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sent after every successful transaction.</p>
                                    <textarea
                                        value={config.templates.receipt}
                                        onChange={(e) => setConfig({ ...config, templates: { ...config.templates, receipt: e.target.value } })}
                                        className="w-full h-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Available Variables: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{`{Amount}`}</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{`{Id}`}</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{`{PointsEarned}`}</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{`{TotalPoints}`}</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
