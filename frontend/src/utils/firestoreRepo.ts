import { db } from './firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Chat, Message, MindMap } from '../types';

export class FirestoreRepo {
  private static toMillis(t: any): number {
    if (!t) return Date.now();
    if (typeof t?.toMillis === 'function') return t.toMillis();
    if (typeof t === 'number') return t;
    return Date.now();
  }
  static chatsCol(uid: string) {
    return collection(db, 'users', uid, 'chats');
  }
  static chatDoc(uid: string, chatId: string) {
    return doc(db, 'users', uid, 'chats', chatId);
  }
  static messagesCol(uid: string, chatId: string) {
    return collection(db, 'users', uid, 'chats', chatId, 'messages');
  }

  static async listChats(uid: string): Promise<Chat[]> {
    const q = query(this.chatsCol(uid), orderBy('updatedAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      messages: [],
      title: d.get('title') || 'New Chat',
      createdAt: FirestoreRepo.toMillis(d.get('createdAt')),
      updatedAt: FirestoreRepo.toMillis(d.get('updatedAt')),
    }));
  }

  static async createChat(uid: string, title?: string): Promise<Chat> {
    const ref = doc(this.chatsCol(uid));
    const chat: Chat = { id: ref.id, title: title || 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    await setDoc(ref, { title: chat.title, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return chat;
  }

  static async renameChat(uid: string, chatId: string, newTitle: string): Promise<void> {
    await updateDoc(this.chatDoc(uid, chatId), { title: newTitle, updatedAt: serverTimestamp() });
  }

  static async deleteChat(uid: string, chatId: string): Promise<void> {
    await deleteDoc(this.chatDoc(uid, chatId));
    // Messages cleanup can be done via a Cloud Function if needed
  }

  static async listMessages(uid: string, chatId: string, max = 500): Promise<Message[]> {
    const q = query(this.messagesCol(uid, chatId), orderBy('timestamp', 'asc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, role: d.get('role'), content: d.get('content'), timestamp: FirestoreRepo.toMillis(d.get('timestamp')) } as Message));
  }

  static async upsertMessages(uid: string, chatId: string, messages: Message[]): Promise<void> {
    const chatRef = this.chatDoc(uid, chatId);
    await setDoc(chatRef, { title: 'New Chat', updatedAt: serverTimestamp() }, { merge: true });
    // Upsert messages (simple approach: write last one or batch write all)
    // For efficiency we only write the last message appended when streaming completes.
    const last = messages[messages.length - 1];
    if (!last) return;
    const msgRef = doc(this.messagesCol(uid, chatId), last.id);
    await setDoc(msgRef, { role: last.role, content: last.content, timestamp: last.timestamp });
  }
}

// Mind maps
export class MindMapsRepo {
  private static toMillis(t: any): number {
    if (!t) return Date.now();
    // Firestore Timestamp
    if (typeof t?.toMillis === 'function') return t.toMillis();
    if (typeof t === 'number') return t;
    return Date.now();
  }
  static mapsCol(uid: string) {
    return collection(db, 'users', uid, 'mindmaps');
  }
  static mapDoc(uid: string, mapId: string) {
    return doc(db, 'users', uid, 'mindmaps', mapId);
  }

  static async list(uid: string): Promise<Array<{ id: string; title: string; updatedAt: number; nodesCount: number; connectionsCount: number }>> {
    const q = query(this.mapsCol(uid), orderBy('updatedAt', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      title: d.get('title') || 'Mind Map',
      updatedAt: this.toMillis(d.get('updatedAt')),
      nodesCount: Array.isArray(d.get('nodes')) ? d.get('nodes').length : 0,
      connectionsCount: Array.isArray(d.get('connections')) ? d.get('connections').length : 0,
    }));
  }

  static async get(uid: string, mapId: string): Promise<MindMap | null> {
    const ref = this.mapDoc(uid, mapId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      title: data.title || 'Mind Map',
      nodes: data.nodes || [],
      connections: data.connections || [],
      createdAt: this.toMillis(data.createdAt),
      updatedAt: this.toMillis(data.updatedAt),
    } as MindMap;
  }

  static async upsert(uid: string, map: MindMap): Promise<string> {
    const hasId = !!map.id && map.id !== 'temp';
    const ref = hasId ? this.mapDoc(uid, map.id) : doc(this.mapsCol(uid));
    await setDoc(ref, {
      title: map.title,
      nodes: map.nodes,
      connections: map.connections,
      createdAt: hasId ? map.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return ref.id;
  }

  static async delete(uid: string, mapId: string): Promise<void> {
    await deleteDoc(this.mapDoc(uid, mapId));
  }
}


