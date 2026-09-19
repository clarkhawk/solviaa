"use client";

/**
 * @file header.tsx
 * @description Barre de navigation supérieure (Header) pour le tableau de bord Solvia.
 * Affiche l'organisation courante, la date du jour en français, les notifications
 * et l'avatar utilisateur.
 *
 * Conforme à la Maquette 1 : design flat, zéro emoji, zéro dégradé.
 *
 * @module components/dashboard/header
 */

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building,
  Calendar,
} from "lucide-react";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatLongDate(date: Date) {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatToday(today: Date) {
  const currentDay = startOfDay(today);
  return formatLongDate(currentDay);
}

function formatShortDate(today: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startOfDay(today));
}

interface HeaderProps {
  organizationName?: string;
  userEmail?: string;
  userDisplayName?: string;
  userRole?: string;
}

/**
 * Composant Header supérieur.
 */
export function Header({
  organizationName = "Mon Entreprise",
  userEmail = "utilisateur@solvia.app",
  userDisplayName,
  userRole = "admin",
}: HeaderProps) {
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/notifications")
      .then((response) => (response.ok ? response.json() : []))
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!notificationPanel.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  async function markAllNotificationsRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }

  const today = new Date();
  const todayTooltip = formatToday(today);
  const todayLabel = formatShortDate(today);

  // Initiales pour l'avatar
  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "SO";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      {/* Partie gauche : Organisation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5">
          <Building className="h-4 w-4 text-[#4F46E5]" />
          <span className="text-xs font-semibold text-[#0F172A]">{organizationName}</span>
          <span className="rounded-md bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4F46E5]">
            {userRole}
          </span>
        </div>

      </div>

      {/* Partie droite : Notifications & Profil */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <div className="group relative">
            <button
              type="button"
              aria-label={`Date du jour : ${todayTooltip}`}
              aria-describedby="today-date-tooltip"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/30"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{todayLabel}</span>
            </button>
            <span
              id="today-date-tooltip"
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0F172A] px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {todayTooltip}
              <span className="absolute bottom-full left-1/2 -ml-1 border-x-4 border-b-4 border-x-transparent border-b-[#0F172A]" />
            </span>
          </div>
        </div>

        {/* Cloche de notifications */}
        <div className="relative" ref={notificationPanel}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A]"
          >
            <Bell className="h-4 w-4" />
            {notifications.some((notification) => !notification.read) && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#EF4444]" />}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0F172A]">Notifications</p>
                <button onClick={markAllNotificationsRead} className="text-[11px] font-semibold text-[#4F46E5] hover:underline">Tout lire</button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {notifications.length ? notifications.map((notification) => (
                  <button key={notification.id} onClick={() => { void fetch("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: notification.id }) }); setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item)); }} className={`block w-full rounded-lg p-3 text-left text-xs ${notification.read ? "bg-white" : "bg-[#EEF2FF]"}`}>
                    <p className="font-semibold text-[#0F172A]">{notification.title}</p>
                    <p className="mt-1 text-[#64748B]">{notification.message}</p>
                  </button>
                )) : <p className="p-4 text-center text-xs text-[#64748B]">Aucune notification.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Avatar utilisateur */}
        <div className="group relative border-l border-[#E2E8F0] pl-2">
          <button
            type="button"
            aria-label={`Profil de ${userEmail}`}
            aria-describedby="user-profile-tooltip"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-bold text-[#4F46E5] transition-colors hover:bg-[#E0E7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/30"
          >
            {initials}
          </button>
          <div
            id="user-profile-tooltip"
            role="tooltip"
            className="pointer-events-none absolute right-0 top-12 z-50 w-56 rounded-lg bg-[#0F172A] p-3 text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <p className="truncate text-xs font-semibold">{userDisplayName || userEmail}</p>
            <p className="mt-1 truncate text-[11px] text-[#CBD5E1]">{userEmail}</p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">Connecté</p>
            <span className="absolute right-3 bottom-full border-x-4 border-b-4 border-x-transparent border-b-[#0F172A]" />
          </div>
        </div>
      </div>
    </header>
  );
}
