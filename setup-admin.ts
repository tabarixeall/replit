
import { db } from "./server/db.ts";
import { users } from "./shared/schema.ts";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function setupAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin3545', 12);

    // Create admin user
    const adminUser = await db.insert(users).values({
      username: 'admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      credits: 1000 // Give admin some initial credits
    }).returning();

    console.log('Admin user created successfully:', {
      id: adminUser[0].id,
      username: adminUser[0].username,
      email: adminUser[0].email,
      role: adminUser[0].role,
      credits: adminUser[0].credits
    });

  } catch (error) {
    console.error('Error setting up admin user:', error);
  } finally {
    process.exit(0);
  }
}

setupAdmin();
