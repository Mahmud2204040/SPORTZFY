import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { encodeSession, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";
import { consumeAuthAttempt } from "@/lib/auth-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, role = "CUSTOMER" } = body;

    if (typeof name !== "string" || !name.trim() || name.length > 100 || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || typeof password !== "string" || password.length < 8 || password.length > 128 || (phone != null && (typeof phone !== "string" || phone.length > 30))) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Name, email, and password are required." } },
        { status: 400 }
      );
    }
    if (!(await consumeAuthAttempt(request, email.trim(), "register"))) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many registration attempts. Try again later." } }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "An account with this email already exists." } },
        { status: 409 }
      );
    }

    // Assign role (defaults to CUSTOMER, allows OWNER)
    const assignedRole = role === "OWNER" ? "OWNER" : "CUSTOMER";

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone || null,
        role: assignedRole,
        profile: {
          create: {
            preferredFormat: "7v7",
            favoritePosition: assignedRole === "OWNER" ? "Venue Operator" : "Midfielder",
          },
        },
      },
    });

    const sessionUser: SessionUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as SessionUser["role"],
      phone: newUser.phone,
      avatarUrl: newUser.avatarUrl,
    };

    const token = encodeSession(sessionUser);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json(
      {
        data: { user: sessionUser, token },
        message: "Registration successful!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to register account." } },
      { status: 500 }
    );
  }
}
