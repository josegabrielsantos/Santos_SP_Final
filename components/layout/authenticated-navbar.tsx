'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/lib/api/auth';
import { useSuggest } from '@/lib/api/search';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  FileText,
  BookOpen,
  MessageSquare,
  X,
} from 'lucide-react';
import { NotificationDropdown } from './notification-dropdown';
import { SusModal } from '@/components/feedback/sus-modal';

export function AuthenticatedNavbar() {
  const { user } = useAppSelector((s) => s.auth);
  const logoutMutation = useLogout();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSus, setShowSus] = useState(false);

  const { data: suggestions } = useSuggest(searchQuery);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push('/');
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (title: string) => {
    router.push(`/search?q=${encodeURIComponent(title)}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const initials =
    user?.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const showDropdown =
    showSuggestions && searchQuery.length >= 2;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-primary border-b border-primary/80">
        <div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          {/* Left – Logos + Brand */}
          <Link href="/home" className="flex shrink-0 items-center gap-2.5 group">
            <Image src="/uplb_logo.png" alt="UPLB" width={32} height={32} className="rounded-full ring-1 ring-white/30" />
            <Image src="/FaNS_logo.png" alt="FaNS" width={32} height={32} className="rounded-full ring-1 ring-white/30" />
            <span className="hidden text-[17px] font-bold tracking-tight text-white lg:block font-heading">
              UPLB FaNS Knowledge Hub
            </span>
          </Link>

          {/* Center – Search */}
          <div className="flex flex-1 justify-center px-2">
            <div className="relative w-full max-w-[500px]">
              <Search className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
              <input
                type="search"
                placeholder="Search posts, papers, organizations…"
                className="h-9 w-full rounded-lg border border-white/20 bg-white pl-10 pr-10 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-white/40 focus:ring-2 focus:ring-white/20"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleSearchSubmit}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-white shadow-lg"
                  >
                    {suggestions && suggestions.length > 0 && suggestions.slice(0, 5).map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-muted/60 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s.title); }}
                      >
                        {s.type === 'paper' ? (
                          <BookOpen className="h-4 w-4 shrink-0 text-kain-green" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                        )}
                        <span className="truncate text-foreground">{s.title}</span>
                        <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                          {s.type}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 border-t border-border/40 px-4 py-2.5 text-left text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(searchQuery); }}
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-primary" />
                      Search for <span className="ml-1 font-semibold text-foreground">&ldquo;{searchQuery}&rdquo;</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right – Notifications + Profile */}
          <div className="flex items-center gap-1">
            <NotificationDropdown />

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/20">
                  <Avatar className="h-8 w-8 ring-2 ring-white/30 transition-all hover:ring-white/50">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.displayName ?? 'User'} />
                    <AvatarFallback className="bg-white/20 text-[11px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 rounded-lg border border-border">
                <div className="px-3 py-2.5">
                  <p className="text-[14px] font-semibold text-foreground">{user?.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/profile/${user?._id}`)} className="cursor-pointer gap-2.5 text-[13px] py-2">
                  <User className="h-4 w-4 text-muted-foreground" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2.5 text-[13px] py-2">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                </DropdownMenuItem>
                {user?.role === 'website_admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer gap-2.5 text-[13px] py-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSus(true)} className="cursor-pointer gap-2.5 text-[13px] py-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" /> Give Feedback
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="cursor-pointer gap-2.5 text-[13px] py-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Logging out…' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <SusModal open={showSus} onClose={() => setShowSus(false)} />
      </header>
    </>
  );
}
