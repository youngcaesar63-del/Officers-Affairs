'use server';
import { login as dbLogin } from '@/lib/data';
import type { User } from './types';

export async function login(username: string, password: string): Promise<User | null> {
    try {
        const user = await dbLogin(username, password);
        if (!user) {
           return null;
        }
        // Return a plain object, not a class instance
        return JSON.parse(JSON.stringify(user));
    } catch (error) {
        console.error("Login action failed:", error);
        throw new Error("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
    }
}
