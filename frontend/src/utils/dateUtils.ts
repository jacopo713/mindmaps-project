import { Chat } from '../types';

export interface ChatGroup {
  title: string;
  chats: Chat[];
}

export function groupChatsByDate(chats: Chat[]): ChatGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayChats: Chat[] = [];
  const yesterdayChats: Chat[] = [];
  const last7DaysChats: Chat[] = [];
  const olderChats: Chat[] = [];

  chats.forEach(chat => {
    const ts = typeof chat.updatedAt === 'number' ? chat.updatedAt : Date.now();
    const chatDate = new Date(ts);
    if (isNaN(chatDate.getTime())) {
      // Skip malformed dates
      return;
    }
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      todayChats.push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      yesterdayChats.push(chat);
    } else if (chatDay.getTime() >= sevenDaysAgo.getTime()) {
      last7DaysChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });

  const groups: ChatGroup[] = [];

  if (todayChats.length > 0) {
    groups.push({ title: 'Oggi', chats: todayChats });
  }
  if (yesterdayChats.length > 0) {
    groups.push({ title: 'Ieri', chats: yesterdayChats });
  }
  if (last7DaysChats.length > 0) {
    groups.push({ title: 'Ultimi 7 giorni', chats: last7DaysChats });
  }
  if (olderChats.length > 0) {
    groups.push({ title: 'Più vecchie', chats: olderChats });
  }

  return groups;
}